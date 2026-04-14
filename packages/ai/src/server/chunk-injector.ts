/**
 * Chunk selection and injection logic
 *
 * Extracted from prompt-runtime to isolate chunk-level RAG operations:
 * - Paragraph-level relevance scoring
 * - Neighbor expansion for short queries
 * - Injection cache integration (dedup across turns)
 * - Formatting chunks into prompt text
 * - Anchor-aware injection for long articles (20K-50K+ chars)
 */

import { CHUNK_INJECTION } from "../constants.js";
import type { ChatContext } from "./types.js";
import type { ArticleContext, SourceSelection } from "../search/types.js";
import { getArticleChunks } from "../search/index.js";
import { createLogger } from "../utils/logger.js";
import { extractCodeAnchors, normalizeText } from "../utils/text.js";
import type {
  ArticleChunk,
  ArticleWithChunks,
  ChunkMatchResult,
} from "../search/hybrid-search.js";
import { classifyQueryScope } from "./scope-classifier.js";
import { extractQuotedCandidate } from "./article-ranking.js";

const log = createLogger("chunk-injector");

const SHORT_ARTICLE_THRESHOLD = 5000;
const SHORT_ARTICLE_MAX_TOKENS = 6000;
const LEAD_PAIR_LEAD_BUDGET = 1500;

/** In article-scope reading mode, inject ALL current article chunks up to this token budget. */
const ARTICLE_FULL_INJECTION_TOKENS = 20_000;

/** Always include the first N passages as article context head. */
const CONTEXT_HEAD_COUNT = 3;

/** Number of passages before and after the anchor to prioritize. */
const ANCHOR_WINDOW_HALF = 5;

function isShortArticle(totalTokens?: number): boolean {
  return (totalTokens ?? 0) <= SHORT_ARTICLE_THRESHOLD;
}

function injectLeadParagraphs(
  chunks: ArticleChunk[],
  budget: number
): ChunkMatchResult[] {
  if (!chunks.length) return [];
  const leads: ChunkMatchResult[] = [];
  let usedTokens = 0;
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const isFirst = i === 0;
    const isLast = i === chunks.length - 1 && i !== 0;
    if (!isFirst && !isLast) continue;
    const chunkTokens = chunk.tokenCount ?? Math.ceil(chunk.content.length / 2);
    if (usedTokens + chunkTokens > budget) break;
    leads.push({
      article: {
        id: chunk.postId,
        title: "",
        url: "",
        chunks: [],
        keyPoints: [],
        categories: [],
        dateTime: 0,
      },
      chunk,
      score: isFirst ? 999 : 998,
    });
    usedTokens += chunkTokens;
  }
  return leads;
}

function clipSnippet(text: string, maxLength = 260): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength).trimEnd()}…`;
}

// ── Anchor-aware injection helpers ────────────────────────────────

/**
 * Find the passage index that contains the anchor text.
 * Uses progressively looser matching: exact → normalized → heading.
 * Returns -1 if no match found.
 */
function findAnchorPassageIndex(
  chunks: ArticleChunk[],
  anchorText: string
): number {
  if (!anchorText || anchorText.length < 4) return -1;

  // Exact content match (highest confidence)
  for (let i = 0; i < chunks.length; i++) {
    if (chunks[i].content.includes(anchorText)) return i;
  }

  // Normalized content match (handles minor whitespace/punctuation diffs)
  const normalizedAnchor = normalizeText(anchorText);
  if (normalizedAnchor.length >= 4) {
    for (let i = 0; i < chunks.length; i++) {
      if (normalizeText(chunks[i].content).includes(normalizedAnchor)) return i;
    }
  }

  // Heading match (weaker signal, useful for section title references)
  for (let i = 0; i < chunks.length; i++) {
    const heading = chunks[i].heading;
    if (
      heading &&
      (heading.includes(anchorText) ||
        normalizeText(heading).includes(normalizedAnchor))
    ) {
      return i;
    }
  }

  return -1;
}

/**
 * Extract a positional hint from the query when there are no quoted anchors.
 * Handles patterns like "段落 10", "最后一段", "文章末尾", "文章开头".
 * Returns a passage index or -1.
 */
function extractPositionalHint(query: string, totalChunks: number): number {
  // "段落 N" — explicit paragraph number
  const paragraphMatch = query.match(/段落\s*(\d+)/u);
  if (paragraphMatch) {
    const n = parseInt(paragraphMatch[1], 10);
    if (n >= 0 && n < totalChunks) return n;
  }

  // "第 N 节/段/章" — section/paragraph number
  const sectionMatch = query.match(/第\s*(\d+)\s*[节段章]/u);
  if (sectionMatch) {
    const n = parseInt(sectionMatch[1], 10);
    if (n >= 0 && n < totalChunks) return Math.min(n, totalChunks - 1);
  }

  // "文章末尾/结尾/最后" — last passages
  if (/(?:文章|最后)?(?:末尾|结尾|最后一段|最后部分)/u.test(query)) {
    return Math.max(0, totalChunks - 2);
  }

  // "文章开头/首段/第一段" — first passages
  if (/(?:文章)?(?:开头|首段|第一段|开头部分)/u.test(query)) {
    return 0;
  }

  return -1;
}

/**
 * Build an anchor-priority ordered chunk list.
 *
 * Strategy:
 * 1. Always include first N passages as "context head" (article thesis/intro)
 * 2. Center a window of ±WINDOW_HALF passages around the anchor
 * 3. Fill remaining budget by alternating before/after anchor passages
 *
 * Falls back to sequential ordering (0→N) when no anchor found.
 */
function buildAnchorOrderedChunks(
  chunks: ArticleChunk[],
  anchorIndex: number,
  article: ArticleWithChunks
): ChunkMatchResult[] {
  if (anchorIndex === -1) {
    return chunks.map((chunk, index) => ({
      article,
      chunk,
      score: 1000 - index,
    }));
  }

  const seen = new Set<number>();
  const ordered: ChunkMatchResult[] = [];

  // Phase 1: Context head (first N passages — article intro/thesis)
  for (let i = 0; i < Math.min(CONTEXT_HEAD_COUNT, chunks.length); i++) {
    seen.add(i);
    ordered.push({ article, chunk: chunks[i], score: 1000 - i });
  }

  // Phase 2: Anchor window — expand outward from anchor position
  const windowStart = Math.max(
    CONTEXT_HEAD_COUNT,
    anchorIndex - ANCHOR_WINDOW_HALF
  );
  const windowEnd = Math.min(
    chunks.length - 1,
    anchorIndex + ANCHOR_WINDOW_HALF
  );

  // Anchor passage first
  if (!seen.has(anchorIndex)) {
    seen.add(anchorIndex);
    ordered.push({ article, chunk: chunks[anchorIndex], score: 900 });
  }

  // Expand backward from anchor
  for (let i = anchorIndex - 1; i >= windowStart; i--) {
    if (!seen.has(i)) {
      seen.add(i);
      ordered.push({
        article,
        chunk: chunks[i],
        score: 890 - (anchorIndex - i),
      });
    }
  }

  // Expand forward from anchor
  for (let i = anchorIndex + 1; i <= windowEnd; i++) {
    if (!seen.has(i)) {
      seen.add(i);
      ordered.push({
        article,
        chunk: chunks[i],
        score: 890 - (i - anchorIndex),
      });
    }
  }

  // Phase 3: Remaining passages — alternate before/after anchor to balance
  // "前面说的" and "后面是什么" both get budget
  const beforeAnchor: number[] = [];
  for (let i = CONTEXT_HEAD_COUNT; i < windowStart; i++) {
    if (!seen.has(i)) {
      beforeAnchor.push(i);
      seen.add(i);
    }
  }
  const afterAnchor: number[] = [];
  for (let i = windowEnd + 1; i < chunks.length; i++) {
    if (!seen.has(i)) {
      afterAnchor.push(i);
      seen.add(i);
    }
  }

  const maxRemain = Math.max(beforeAnchor.length, afterAnchor.length);
  for (let j = 0; j < maxRemain; j++) {
    if (j < beforeAnchor.length) {
      ordered.push({ article, chunk: chunks[beforeAnchor[j]], score: 500 - j });
    }
    if (j < afterAnchor.length) {
      ordered.push({ article, chunk: chunks[afterAnchor[j]], score: 500 - j });
    }
  }

  return ordered;
}

// ── Main injection function ───────────────────────────────────────

export interface ChunkInjectionArgs {
  latestText: string;
  context: ChatContext;
  lang: string;
  env: Record<string, unknown>;
  cacheKey: string | null;
  relatedArticles: ArticleContext[];
}

export interface ChunkInjectionResult {
  chunksSection: string;
  selectedSources: SourceSelection[];
  preferInjectedChunks: boolean;
}

export async function selectAndInjectChunks(
  args: ChunkInjectionArgs
): Promise<ChunkInjectionResult> {
  const { latestText, context, lang, env, cacheKey, relatedArticles } = args;

  let chunksSection = "";
  const selectedSources: SourceSelection[] = [];

  const articleSlugForChunks =
    context.scope === "article" && context.article?.slug
      ? context.article.slug
      : undefined;
  let currentArticleIdForChunks: string | undefined;

  const queryScope = articleSlugForChunks
    ? classifyQueryScope(latestText, context.article)
    : ("global" as const);
  log.debug(
    `scope-classifier: query="${latestText.slice(0, 50)}", scope=${queryScope}`
  );

  let articlesWithChunks: ArticleContext[] = relatedArticles.filter(
    (a): a is ArticleContext => Boolean(a.chunks && a.chunks.length > 0)
  );
  if (articleSlugForChunks) {
    const currentArticleId =
      articlesWithChunks.find(
        article =>
          article.id === articleSlugForChunks ||
          article.url?.includes(articleSlugForChunks)
      )?.id ||
      (getArticleChunks(articleSlugForChunks)
        ? articleSlugForChunks
        : getArticleChunks(`zh/${articleSlugForChunks}`)
          ? `zh/${articleSlugForChunks}`
          : getArticleChunks(`en/${articleSlugForChunks}`)
            ? `en/${articleSlugForChunks}`
            : undefined);
    const currentChunks = currentArticleId
      ? getArticleChunks(currentArticleId)
      : undefined;

    currentArticleIdForChunks = currentArticleId;
    if (currentChunks?.length) {
      const currentArticleUrl = `${env.SITE_URL ?? ""}/${lang}/posts/${articleSlugForChunks}/`;
      const otherArticles = articlesWithChunks.filter(
        article =>
          article.id !== currentArticleId &&
          article.id !== articleSlugForChunks &&
          article.url !== currentArticleUrl &&
          !article.url?.includes(articleSlugForChunks)
      );
      articlesWithChunks = [
        {
          id: currentArticleId,
          title: context.article?.title ?? "",
          url: currentArticleUrl,
          lang,
          keyPoints: context.article?.keyPoints ?? [],
          categories: context.article?.categories ?? [],
          dateTime: 0,
          summary: context.article?.summary,
          chunks: currentChunks,
        },
        ...otherArticles,
      ];
    }
  }

  if (articlesWithChunks.length > 0) {
    const {
      selectRelevantChunks,
      expandChunkMatchesWithNeighbors,
      formatChunksForInjection,
    } = await import("../search/hybrid-search.js");
    const { injectionCache } = await import("../cache/injection-cache.js");

    const maxChunksPerArticle = articleSlugForChunks
      ? CHUNK_INJECTION.MAX_CHUNKS_PER_ARTICLE * 2
      : CHUNK_INJECTION.MAX_CHUNKS_PER_ARTICLE;
    const rawAnchors = extractCodeAnchors(latestText);
    const articleTotalTokens = context.article?.totalTokens;
    const shortArticle = isShortArticle(articleTotalTokens);
    const effectiveMaxTokens =
      articleSlugForChunks && queryScope === "article-local"
        ? ARTICLE_FULL_INJECTION_TOKENS
        : shortArticle
          ? SHORT_ARTICLE_MAX_TOKENS
          : CHUNK_INJECTION.MAX_TOKENS;

    let matchedChunks = selectRelevantChunks(latestText, articlesWithChunks, {
      maxTokens: effectiveMaxTokens,
      minChunkScore: shortArticle ? 0.1 : CHUNK_INJECTION.MIN_CHUNK_SCORE,
      maxChunksPerArticle: shortArticle ? 10 : maxChunksPerArticle,
      rawAnchors,
      currentArticleId: currentArticleIdForChunks,
    });

    // ── Full article injection for reading mode ──
    // When in article-scope, inject ALL chunks of the current article.
    // For long articles, use anchor-aware ordering to prioritize passages
    // around the user's point of interest instead of always starting from 0.
    if (
      articleSlugForChunks &&
      currentArticleIdForChunks &&
      queryScope === "article-local"
    ) {
      const currentArticle = articlesWithChunks.find(
        a => a.id === currentArticleIdForChunks
      );
      if (currentArticle?.chunks?.length) {
        // Step 1: Find anchor from quoted text in the query
        const quotedAnchor = extractQuotedCandidate(latestText);
        let anchorIndex = findAnchorPassageIndex(
          currentArticle.chunks,
          quotedAnchor
        );

        // Step 2: If no quoted anchor, try positional hints (段落 N, 文章末尾, etc.)
        if (anchorIndex === -1) {
          anchorIndex = extractPositionalHint(
            latestText,
            currentArticle.chunks.length
          );
        }

        // Step 3: Shift anchor center based on directional intent
        // "后面是什么" -> center on N+1 (the target passage user wants to see)
        // "前面是什么" -> center on N-1
        let effectiveAnchor = anchorIndex;
        let directionalHint: string | null = null;
        if (effectiveAnchor !== -1) {
          const isAfterIntent = /(?:后面|之后|接下来|after|next|下面的)/u.test(
            latestText
          );
          const isBeforeIntent =
            /(?:前面|之前|上面|before|previous|前面的)/u.test(latestText);
          if (
            isAfterIntent &&
            effectiveAnchor < currentArticle.chunks.length - 1
          ) {
            directionalHint = "after";
            effectiveAnchor = effectiveAnchor + 1;
            log.debug(
              "anchor-injection: shifted anchor +1 for after-intent, now at %d".replace(
                "%d",
                String(effectiveAnchor)
              )
            );
          } else if (isBeforeIntent && effectiveAnchor > 0) {
            directionalHint = "before";
            effectiveAnchor = effectiveAnchor - 1;
            log.debug(
              "anchor-injection: shifted anchor -1 for before-intent, now at %d".replace(
                "%d",
                String(effectiveAnchor)
              )
            );
          }
        }

        // Step 4: Build anchor-priority ordered chunks
        matchedChunks = buildAnchorOrderedChunks(
          currentArticle.chunks,
          effectiveAnchor,
          currentArticle
        );

        // Step 5: Annotate anchor chunks with directional markers
        if (directionalHint && anchorIndex !== -1) {
          for (const match of matchedChunks) {
            if (match.chunk.position === anchorIndex) {
              match.anchorLabel =
                directionalHint === "after"
                  ? "▶ 用户引用的段落（请回答此段落之后的内容）"
                  : "◀ 用户引用的段落（请回答此段落之前的内容）";
            }
            if (
              directionalHint === "after" &&
              match.chunk.position === anchorIndex + 1
            ) {
              match.anchorLabel = "▼ 用户问的「后面」内容（请引用此段落原文）";
            }
            if (
              directionalHint === "before" &&
              match.chunk.position === anchorIndex - 1
            ) {
              match.anchorLabel = "▲ 用户问的「前面」内容（请引用此段落原文）";
            }
          }
        }

        if (anchorIndex !== -1) {
          const windowStart = Math.max(
            CONTEXT_HEAD_COUNT,
            anchorIndex - ANCHOR_WINDOW_HALF
          );
          const windowEnd = Math.min(
            currentArticle.chunks.length - 1,
            anchorIndex + ANCHOR_WINDOW_HALF
          );
          log.debug(
            `anchor-injection: anchor at position ${anchorIndex}, priority window ${windowStart}-${windowEnd}, total chunks=${currentArticle.chunks.length}`
          );
        }
      }
    } else if (shortArticle && currentArticleIdForChunks) {
      const currentArticle = articlesWithChunks.find(
        a => a.id === currentArticleIdForChunks
      );
      if (currentArticle?.chunks?.length) {
        const leads = injectLeadParagraphs(
          currentArticle.chunks,
          LEAD_PAIR_LEAD_BUDGET
        );
        if (leads.length > 0) {
          const leadIds = new Set(leads.map(l => l.chunk.id));
          const nonLeadMatches = matchedChunks.filter(
            m => !leadIds.has(m.chunk.id)
          );
          matchedChunks = [...leads, ...nonLeadMatches];
        }
      }
    }
    const effectiveMatches =
      articleSlugForChunks && latestText.length <= 48
        ? expandChunkMatchesWithNeighbors(matchedChunks, {
            includePrevious: true,
            includeNext: true,
            rawAnchors,
          })
        : matchedChunks;

    const prioritizedMatches = articleSlugForChunks
      ? [
          ...effectiveMatches.filter(
            match =>
              match.article.id === articleSlugForChunks ||
              match.article.url?.includes(articleSlugForChunks)
          ),
          ...effectiveMatches.filter(
            match =>
              match.article.id !== articleSlugForChunks &&
              !match.article.url?.includes(articleSlugForChunks)
          ),
        ]
      : effectiveMatches;

    if (prioritizedMatches.length > 0) {
      const sessionCacheKey = cacheKey || undefined;
      const newChunks = sessionCacheKey
        ? injectionCache.filterNewChunks(
            sessionCacheKey,
            prioritizedMatches.map(
              (m: { chunk: { id: string; content: string } }) => ({
                id: m.chunk.id,
                content: m.chunk.content,
              })
            )
          )
        : prioritizedMatches.map(
            (m: { chunk: { id: string; content: string } }) => ({
              id: m.chunk.id,
              content: m.chunk.content,
            })
          );

      if (newChunks.length > 0) {
        selectedSources.push(
          ...prioritizedMatches
            .filter((m: { chunk: { id: string } }) =>
              newChunks.some((nc: { id: string }) => nc.id === m.chunk.id)
            )
            .map(
              (m): SourceSelection => ({
                title: m.article.title,
                url: m.article.url,
                lang: m.article.lang,
                reason: "chunk",
                score: m.score,
                chunkId: m.chunk.id,
                heading: m.chunk.heading,
                snippet: clipSnippet(m.chunk.content),
                matchTerms: rawAnchors.filter(
                  anchor =>
                    m.chunk.content.includes(anchor) ||
                    m.chunk.heading.includes(anchor)
                ),
              })
            )
        );

        const perChunkCharLimit =
          articleSlugForChunks && queryScope === "article-local"
            ? 3000
            : articleSlugForChunks
              ? 2200
              : 1500;
        chunksSection = formatChunksForInjection(
          prioritizedMatches.filter((m: { chunk: { id: string } }) =>
            newChunks.some((nc: { id: string }) => nc.id === m.chunk.id)
          ),
          effectiveMaxTokens,
          perChunkCharLimit
        );

        log.debug(
          `chunkSelection: matched=${matchedChunks.length}, effective=${effectiveMatches.length}, prioritized=${prioritizedMatches.length}, new=${newChunks.length}, selectedSources=${selectedSources.length}`
        );
        if (selectedSources.length > 0) {
          log.debug(
            `chunkSelection top: ${selectedSources
              .slice(0, 5)
              .map(
                source =>
                  `${source.title}#${source.chunkId ?? "-"}:${(source.score ?? 0).toFixed(3)}`
              )
              .join(", ")}`
          );
        }

        if (sessionCacheKey) {
          injectionCache.markAsInjected(
            sessionCacheKey,
            newChunks.map((c: { id: string }) => c.id)
          );
        }
      }
    }
  }

  return {
    chunksSection,
    selectedSources,
    preferInjectedChunks: !!articleSlugForChunks && !!chunksSection,
  };
}

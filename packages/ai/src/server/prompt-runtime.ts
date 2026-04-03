import { getAuthorContext } from "../data/index.js";
import { buildSystemPrompt } from "../prompt/index.js";
import { CHUNK_INJECTION } from "../constants.js";
import type { ChatContext } from "./types.js";
import type { PhaseTiming } from "./types.js";
import type { ProviderAdapter } from "../provider-manager/types.js";
import type { LoadedExtensions } from "../extensions/types.js";
import type { ArticleContext } from "../search/types.js";
import type { SourceSelection } from "../search/types.js";
import {
  analyzeRetrievedEvidence,
  buildEvidenceSection,
  getCitationGuardPreflight,
  buildUnknownRefusal,
  interpretRequest,
} from "../intelligence/index.js";
import { matchFactsToQuery, buildFactSection } from "../fact-registry/index.js";
import {
  resolveVoiceStyleMode,
  buildVoiceStylePrompt,
  mergeFacts,
} from "../extensions/index.js";
import { buildArticleContextPrompt } from "./chat-utils.js";
import {
  getArticleChunks,
  searchArticles,
  searchProjects,
} from "../search/index.js";
import { createLogger } from "../utils/logger.js";
import { extractCodeAnchors } from "../utils/text.js";
import type { ArticleChunk, ChunkMatchResult } from "../search/hybrid-search.js";

const log = createLogger("prompt-runtime");

const SHORT_ARTICLE_THRESHOLD = 5000;
const SHORT_ARTICLE_MAX_TOKENS = 6000;
const LEAD_PAIR_LEAD_BUDGET = 1500;

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
      article: { id: chunk.postId, title: "", url: "", chunks: [], keyPoints: [], categories: [], dateTime: 0 },
      chunk,
      score: isFirst ? 999 : 998,
    });
    usedTokens += chunkTokens;
  }
  return leads;
}

interface BuildRuntimeSystemPromptArgs {
  env: Record<string, unknown>;
  lang: string;
  searchQuery: string;
  relatedArticles: ReturnType<typeof searchArticles>;
  relatedProjects: ReturnType<typeof searchProjects>;
  evidenceSection?: string;
  factSection?: string;
  answerMode?:
    | "fact"
    | "count"
    | "list"
    | "opinion"
    | "recommendation"
    | "unknown"
    | "general";
  extensions: LoadedExtensions;
  cacheKey: string | null;
  voiceStylePrompt?: string;
  chunksSection?: string;
  preferInjectedChunks?: boolean;
}

export interface PromptAssemblyArgs {
  env: Record<string, unknown>;
  latestText: string;
  context: ChatContext;
  lang: string;
  evidenceAnalysisTimeout: number;
  timing: PhaseTiming & Record<string, number | undefined>;
  adapter: ProviderAdapter | null;
  hasRealProvider: boolean;
  extensions: LoadedExtensions;
  cacheKey: string | null;
  searchQuery: string;
  relatedArticles: ReturnType<typeof searchArticles>;
  relatedProjects: ReturnType<typeof searchProjects>;
  budget: { analysisMaxTokens: number };
  answerMode:
    | "fact"
    | "count"
    | "list"
    | "opinion"
    | "recommendation"
    | "unknown"
    | "general";
}

export interface PromptAssemblyResult {
  systemPrompt: string;
  preflight: ReturnType<typeof getCitationGuardPreflight>;
  unknownRefusal: { text: string; isUnknown: boolean } | null;
  selectedSources: SourceSelection[];
  matchedFacts: Array<{
    id: string;
    statement: string;
    category: string;
    confidence: number;
  }>;
  voiceMode: string | null;
}

function clipSnippet(text: string, maxLength = 260): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength).trimEnd()}…`;
}

export function resolvePromptGuards(args: {
  latestText: string;
  relatedArticles: ReturnType<typeof searchArticles>;
  relatedProjects: ReturnType<typeof searchProjects>;
  lang: string;
}): Pick<PromptAssemblyResult, 'preflight' | 'unknownRefusal'> {
  const { latestText, relatedArticles, relatedProjects, lang } = args;

  const preflight = getCitationGuardPreflight({
    userQuery: latestText,
    articles: relatedArticles,
    projects: relatedProjects,
    lang,
  });

  const interpretation = interpretRequest({
    latestText,
  });

  const unknownRefusal =
    interpretation.safety.decision === 'refuse' &&
    interpretation.safety.reason === 'privacy'
      ? { text: buildUnknownRefusal(latestText, lang), isUnknown: true }
      : null;

  return { preflight, unknownRefusal };
}

export function buildRuntimeSystemPrompt(
  args: BuildRuntimeSystemPromptArgs
): string {
  return buildSystemPrompt({
    static: {
      authorName: (args.env.SITE_AUTHOR as string) || "博主",
      siteUrl: (args.env.SITE_URL as string) || "",
      lang: args.lang,
      voiceStylePrompt: args.voiceStylePrompt,
    },
    semiStatic: {
      authorContext: getAuthorContext(),
    },
    dynamic: {
      userQuery: args.searchQuery,
      articles: args.relatedArticles,
      projects: args.relatedProjects,
      evidenceSection: args.evidenceSection,
      factSection: args.factSection,
      answerMode: args.answerMode,
      lang: args.lang,
      extensions: args.extensions,
      chunksSection: args.chunksSection,
      preferInjectedChunks: args.preferInjectedChunks,
    },
  });
}

export async function assemblePromptRuntime(
  args: PromptAssemblyArgs
): Promise<PromptAssemblyResult> {
  const {
    env,
    latestText,
    context,
    lang,
    evidenceAnalysisTimeout,
    timing,
    adapter,
    hasRealProvider,
    extensions,
    cacheKey,
    searchQuery,
    relatedArticles,
    relatedProjects,
    budget,
    answerMode,
  } = args;

  let evidenceSection = "";
  let selectedSources: SourceSelection[] = [];
  if (hasRealProvider && adapter) {
    const evidenceStart = Date.now();
    const abortCtrl = new AbortController();
    const timeoutId = setTimeout(
      () => abortCtrl.abort(),
      evidenceAnalysisTimeout
    );
    try {
      const provider = adapter.getProvider();
      const evidenceResult = await analyzeRetrievedEvidence({
        userQuery: latestText,
        articles: relatedArticles,
        projects: relatedProjects,
        provider,
        model: adapter.evidenceModel,
        maxOutputTokens: budget.analysisMaxTokens,
        abortSignal: abortCtrl.signal,
      });
      if (evidenceResult.analysis) {
        evidenceSection = buildEvidenceSection(evidenceResult.analysis);
      }
      log.debug(
        `evidenceAnalysis: status=${evidenceResult.parseStatus}, articles=${relatedArticles.length}, projects=${relatedProjects.length}, analysisLength=${typeof evidenceResult.analysis === "string" ? evidenceResult.analysis.length : 0}, usage=${JSON.stringify(evidenceResult.usage ?? null)}`
      );
      timing.evidenceAnalysis = Date.now() - evidenceStart;
    } catch (error) {
      log.debug(
        `evidenceAnalysis: error=${error instanceof Error ? error.message : String(error)}`
      );
      timing.evidenceAnalysis = Date.now() - evidenceStart;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  const { preflight, unknownRefusal } = resolvePromptGuards({
    latestText,
    relatedArticles,
    relatedProjects,
    lang,
  });

  let matchedFacts = matchFactsToQuery(latestText, lang);
  matchedFacts = mergeFacts(matchedFacts, extensions);
  const factPromptSection = buildFactSection(matchedFacts, lang);
  const articleCategories = relatedArticles.flatMap(
    (a: { categories?: string[] }) => a.categories ?? []
  );
  const voiceMode = resolveVoiceStyleMode(
    latestText,
    articleCategories,
    extensions
  );
  const voiceStylePrompt = buildVoiceStylePrompt(voiceMode, extensions);
  const articlePrompt = buildArticleContextPrompt(context);

  let chunksSection = "";
  const articleSlugForChunks =
    context.scope === "article" && context.article?.slug
      ? context.article.slug
      : undefined;
  let currentArticleIdForChunks: string | undefined;

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
    currentArticleIdForChunks = currentArticleId;
    const currentChunks = currentArticleId
      ? getArticleChunks(currentArticleId)
      : undefined;
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
    } else if (articleSlugForChunks && context.article) {
      // Fallback: searchArticles missed current article — force-fetch its chunks
      const forceChunks =
        getArticleChunks(articleSlugForChunks) ??
        getArticleChunks(`zh/${articleSlugForChunks}`) ??
        getArticleChunks(`en/${articleSlugForChunks}`) ??
        [];
      if (forceChunks.length > 0) {
        const currentArticleUrl = `${env.SITE_URL ?? ""}/${lang}/posts/${articleSlugForChunks}/`;
        articlesWithChunks = [
          {
            id: articleSlugForChunks,
            title: context.article?.title ?? "",
            url: currentArticleUrl,
            lang,
            keyPoints: context.article?.keyPoints ?? [],
            categories: context.article?.categories ?? [],
            dateTime: 0,
            summary: context.article?.summary,
            chunks: forceChunks,
          },
          ...articlesWithChunks,
        ];
        currentArticleIdForChunks = articleSlugForChunks;
      }
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
    const effectiveMaxTokens = shortArticle
      ? SHORT_ARTICLE_MAX_TOKENS
      : CHUNK_INJECTION.MAX_TOKENS;

    let matchedChunks = selectRelevantChunks(latestText, articlesWithChunks, {
      maxTokens: effectiveMaxTokens,
      minChunkScore: shortArticle ? 0.1 : CHUNK_INJECTION.MIN_CHUNK_SCORE,
      maxChunksPerArticle: shortArticle ? 10 : maxChunksPerArticle,
      rawAnchors,
      currentArticleId: currentArticleIdForChunks,
    });

    if (shortArticle && currentArticleIdForChunks) {
      const currentArticle = articlesWithChunks.find(
        a => a.id === currentArticleIdForChunks
      );
      if (currentArticle?.chunks?.length) {
        const leads = injectLeadParagraphs(currentArticle.chunks, LEAD_PAIR_LEAD_BUDGET);
        if (leads.length > 0) {
          const leadIds = new Set(leads.map(l => l.chunk.id));
          const nonLeadMatches = matchedChunks.filter(m => !leadIds.has(m.chunk.id));
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
        selectedSources = prioritizedMatches
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
              matchTerms: rawAnchors.filter(anchor =>
                m.chunk.content.includes(anchor) || m.chunk.heading.includes(anchor)
              ),
            })
          );

        chunksSection = formatChunksForInjection(
          prioritizedMatches.filter((m: { chunk: { id: string } }) =>
            newChunks.some((nc: { id: string }) => nc.id === m.chunk.id)
          ),
          articleSlugForChunks ? 2200 : 1500
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

  const systemPrompt = buildRuntimeSystemPrompt({
    env,
    lang,
    searchQuery,
    relatedArticles,
    relatedProjects,
    evidenceSection: articlePrompt
      ? `${evidenceSection}\n${articlePrompt}`
      : evidenceSection,
    factSection: factPromptSection,
    answerMode,
    extensions,
    cacheKey,
    voiceStylePrompt,
    chunksSection,
    preferInjectedChunks: !!articleSlugForChunks && !!chunksSection,
  });

  return { systemPrompt, preflight, unknownRefusal, selectedSources, matchedFacts, voiceMode: voiceMode?.name ?? null };
}

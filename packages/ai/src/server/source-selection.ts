/**
 * Source selection logic for the RAG pipeline.
 *
 * Extracted from chat-handler.ts to isolate the concern of deduplicating,
 * prioritizing, language-filtering, and scoring source articles before
 * they are surfaced to the user.
 */

import { normalizeText, tokenize } from "../utils/text.js";
import { searchArticles } from "../search/index.js";
import type { SourceSelection } from "../search/types.js";
import type { ChatContext } from "./types.js";
import {
  isLikelyQuotedArticleQuery,
  isCrossArticleIntent,
  isArticleSummaryQuery,
} from "./article-ranking.js";

// ── Source selection ────────────────────────────────────────────

export function buildFinalSources(args: {
  relatedArticles: ReturnType<typeof searchArticles>;
  selectedSources: SourceSelection[];
  query: string;
  lang: string;
  max: number;
  articleSlug?: string;
  context?: ChatContext;
}): SourceSelection[] {
  const {
    relatedArticles,
    selectedSources,
    query,
    lang,
    max,
    articleSlug,
    context,
  } = args;
  const normalizedQuery = normalizeText(query);

  const fallbackSources: SourceSelection[] = relatedArticles.map(article => ({
    title: article.title,
    url: article.url,
    lang: article.lang,
    reason: "retrieval-fallback",
    score: article.score,
  }));

  const preferredPool =
    selectedSources.length > 0 ? selectedSources : fallbackSources;
  const isCurrentArticleSource = (source: SourceSelection): boolean => {
    if (!articleSlug) return false;
    const url = source.url ?? "";
    if (url.includes(`/posts/${articleSlug}`) || url.includes(articleSlug)) {
      return true;
    }
    if (context?.article?.title && source.title === context.article.title) {
      return true;
    }
    return false;
  };

  const shouldPrioritizeCurrentArticle =
    !!articleSlug &&
    context?.scope === "article" &&
    isLikelyQuotedArticleQuery(query) &&
    !isCrossArticleIntent(query);

  if (shouldPrioritizeCurrentArticle) {
    const orderedCurrent = preferredPool.filter(isCurrentArticleSource);
    const orderedOther = preferredPool.filter(
      source => !isCurrentArticleSource(source)
    );
    const currentChunkSources = orderedCurrent.filter(
      source => source.reason === "chunk"
    );
    const currentNonChunkSources = orderedCurrent.filter(
      source => source.reason !== "chunk"
    );
    const dedupedPrioritized: SourceSelection[] = [];
    const seenPrioritized = new Set<string>();
    for (const source of [
      ...currentChunkSources,
      ...currentNonChunkSources,
      ...orderedOther,
    ]) {
      if (!source.title?.trim() || !source.url?.trim()) continue;
      const key = `${source.title}::${source.url}::${source.chunkId ?? ""}`;
      if (seenPrioritized.has(key)) continue;
      seenPrioritized.add(key);
      dedupedPrioritized.push(source);
      if (dedupedPrioritized.length >= max) break;
    }
    return dedupedPrioritized;
  }

  const sameLang = preferredPool.filter(source => source.lang === lang);
  const anchorTerms = tokenize(query)
    .filter((token: string) => token.length >= 2)
    .sort((a: string, b: string) => b.length - a.length)
    .slice(0, 3);
  const sourceMatchesAnchor = (source: SourceSelection): boolean => {
    if (!anchorTerms.length) return true;
    const title = normalizeText(source.title);
    return anchorTerms.some((term: string) => title.includes(term));
  };
  const sameLangAnchored = sameLang.filter(sourceMatchesAnchor);
  const crossLangAnchored = preferredPool.filter(
    source => source.lang !== lang && sourceMatchesAnchor(source)
  );
  const articleSummaryQuery = isArticleSummaryQuery(normalizedQuery);
  const rankByTitleCloseness = (
    sources: SourceSelection[]
  ): SourceSelection[] => {
    return [...sources].sort((a, b) => {
      const aScore = computeTitleCloseness(normalizedQuery, a.title);
      const bScore = computeTitleCloseness(normalizedQuery, b.title);
      return bScore - aScore || (b.score ?? 0) - (a.score ?? 0);
    });
  };

  const orderedSameLang = rankByTitleCloseness(
    sameLangAnchored.length > 0 ? sameLangAnchored : sameLang
  );
  const orderedCrossLang = rankByTitleCloseness(
    crossLangAnchored.length > 0
      ? crossLangAnchored
      : preferredPool.filter(source => source.lang !== lang)
  );

  let ordered = articleSummaryQuery
    ? orderedSameLang.length >= max
      ? orderedSameLang
      : [...orderedSameLang, ...orderedCrossLang]
    : [...orderedSameLang, ...orderedCrossLang];

  const deduped: SourceSelection[] = [];
  const seen = new Set<string>();

  for (const source of ordered) {
    if (!source.title?.trim() || !source.url?.trim()) continue;
    const key = `${source.title}::${source.url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(source);
    if (deduped.length >= max) break;
  }

  return deduped;
}

// ── Internal helpers ───────────────────────────────────────────

function computeTitleCloseness(normalizedQuery: string, title: string): number {
  const normalizedTitle = normalizeText(title);
  const tokens = tokenize(normalizedQuery)
    .filter(token => token.length >= 2)
    .sort((a, b) => b.length - a.length)
    .slice(0, 5);

  let score = 0;
  for (const token of tokens) {
    if (normalizedTitle.includes(token)) {
      score += Math.max(1, Math.min(token.length, 6));
    }
  }

  if (
    normalizedQuery.includes("技术架构") &&
    normalizedTitle.includes("技术架构")
  ) {
    score += 8;
  }
  if (normalizedQuery.includes("模块") && normalizedTitle.includes("模块")) {
    score += 4;
  }
  if (normalizedQuery.includes("文章") && normalizedTitle.includes("文章")) {
    score += 2;
  }

  return score;
}

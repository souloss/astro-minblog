/**
 * Article ranking, scoring, and shaping functions extracted from chat-handler.
 *
 * These functions handle:
 * - Quoted-text extraction and detection for article-mode queries
 * - Current-article boosting when users quote article content
 * - Code-anchor-based reranking for technical queries
 * - Query complexity-driven article shaping and budgeting
 * - Cross-article intent detection
 * - Article summary query detection
 */

import {
  rankArticlesByCategory,
  applyBudgetToArticles,
  resolveSearchInterpretation,
} from "../intelligence/index.js";
import { searchArticles } from "../search/index.js";
import type { ChatContext } from "./types.js";
import {
  extractCodeAnchors,
  hasCodeAnchors,
  normalizeText,
} from "../utils/text.js";

// ── Constants ─────────────────────────────────────────────────

const MIN_QUOTED_QUERY_LENGTH = 12;
const CURRENT_ARTICLE_SCORE_BOOST_RATIO = 0.12;
const CURRENT_ARTICLE_SCORE_CAP_RATIO = 1.08;
const CROSS_ARTICLE_INTENT_PATTERNS = [
  /还有哪些/u,
  /相关文章/u,
  /类似/u,
  /推荐/u,
  /对比/u,
  /比较/u,
  /related/u,
  /similar/u,
  /compare/u,
  /comparison/u,
  /recommend/u,
  /what else/u,
] as const;

// ── Types ─────────────────────────────────────────────────────

interface CurrentArticleBoostOptions {
  articleSlug?: string;
  context?: ChatContext;
}

// ── Quoted-text utilities ─────────────────────────────────────

export function extractQuotedCandidate(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";

  const matches = [
    ...trimmed.matchAll(
      /["\u201C\u201D'\u2018\u2019\u300C\u300D\u300E\u300F\u300A\u300B](.+?)["\u201C\u201D'\u2018\u2019\u300C\u300D\u300E\u300F\u300A\u300B]/g
    ),
  ]
    .map(match => match[1]?.trim() ?? "")
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  return matches[0] ?? "";
}

export function isLikelyQuotedArticleQuery(text: string): boolean {
  const quoted = extractQuotedCandidate(text);
  if (!quoted) return false;
  return normalizeText(quoted).length >= MIN_QUOTED_QUERY_LENGTH;
}

// ── Intent detection ──────────────────────────────────────────

export function isCrossArticleIntent(text: string): boolean {
  if (isLikelyQuotedArticleQuery(text)) {
    return false;
  }
  const normalized = normalizeText(text);
  if (!normalized) return false;
  return CROSS_ARTICLE_INTENT_PATTERNS.some(pattern =>
    pattern.test(normalized)
  );
}

export function isArticleSummaryQuery(normalizedQuery: string): boolean {
  return [
    "这篇文章",
    "主要讲了什么",
    "讲了什么",
    "文章主要",
    "文章讲了什么",
    "article summary",
    "what does this article",
    "what is this article about",
  ].some(marker => normalizedQuery.includes(marker));
}

// ── Current-article reranking ─────────────────────────────────

function isCurrentArticle(
  article: ReturnType<typeof searchArticles>[number],
  articleSlug: string
): boolean {
  return article.id === articleSlug || article.url?.includes(articleSlug);
}

function buildCurrentArticleFallback(
  context: ChatContext | undefined,
  articleSlug: string,
  tailScore: number
): ReturnType<typeof searchArticles>[number] | null {
  if (context?.scope !== "article" || !context.article) return null;

  return {
    id: articleSlug,
    title: context.article.title,
    url: `/posts/${articleSlug}`,
    summary: context.article.summary ?? context.article.abstract,
    keyPoints: context.article.keyPoints ?? [],
    categories: context.article.categories ?? [],
    dateTime: 0,
    score: tailScore,
  };
}

export function rerankArticlesForCurrentArticleQuote(
  query: string,
  articles: ReturnType<typeof searchArticles>,
  options: CurrentArticleBoostOptions = {}
): ReturnType<typeof searchArticles> {
  const { articleSlug, context } = options;
  if (!articleSlug || context?.scope !== "article") return articles;
  if (!isLikelyQuotedArticleQuery(query)) return articles;
  if (isCrossArticleIntent(query)) return articles;

  const cloned = [...articles];
  const currentIndex = cloned.findIndex(article =>
    isCurrentArticle(article, articleSlug)
  );

  if (currentIndex >= 0) {
    const topScore = cloned[0]?.score ?? 0;
    if (topScore <= 0) return cloned;

    const current = cloned[currentIndex];
    const boostedScore = Math.min(
      (current.score ?? 0) + topScore * CURRENT_ARTICLE_SCORE_BOOST_RATIO,
      topScore * CURRENT_ARTICLE_SCORE_CAP_RATIO
    );
    cloned[currentIndex] = { ...current, score: boostedScore };
    return cloned.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }

  const tailScore = Math.max(
    (cloned[cloned.length - 1]?.score ?? 1) * 0.95,
    0.01
  );
  const fallback = buildCurrentArticleFallback(context, articleSlug, tailScore);
  if (!fallback) return cloned;

  return [...cloned, fallback];
}

// ── Code-anchor reranking ─────────────────────────────────────

function scoreArticleForCodeAnchors(
  article: ReturnType<typeof searchArticles>[number],
  rawAnchors: string[]
): number {
  const title = article.title;
  const summary = article.summary ?? "";
  const keyPoints = article.keyPoints ?? [];
  const chunks = article.chunks ?? [];

  let score = 0;

  for (const anchor of rawAnchors) {
    const normalizedAnchor = normalizeText(anchor);
    if (!normalizedAnchor) continue;

    if (title.includes(anchor)) {
      score += 10;
      continue;
    }
    if (summary.includes(anchor)) {
      score += 6;
      continue;
    }
    if (keyPoints.some(point => point.includes(anchor))) {
      score += 5;
      continue;
    }
    if (chunks.some(chunk => chunk.heading.includes(anchor))) {
      score += 8;
      continue;
    }
    if (chunks.some(chunk => chunk.content.includes(anchor))) {
      score += 9;
      continue;
    }

    const normalizedTitle = normalizeText(title);
    const normalizedSummary = normalizeText(summary);
    const normalizedKeyPoints = keyPoints.map(point => normalizeText(point));

    if (normalizedTitle.includes(normalizedAnchor)) {
      score += 6;
    } else if (normalizedSummary.includes(normalizedAnchor)) {
      score += 4;
    } else if (
      normalizedKeyPoints.some(point => point.includes(normalizedAnchor))
    ) {
      score += 3;
    } else if (
      chunks.some(
        chunk =>
          normalizeText(chunk.heading).includes(normalizedAnchor) ||
          normalizeText(chunk.content).includes(normalizedAnchor)
      )
    ) {
      score += 5;
    }
  }

  return score;
}

export function rerankArticlesForCodeAnchors(
  query: string,
  articles: ReturnType<typeof searchArticles>
): ReturnType<typeof searchArticles> {
  const rawAnchors = extractCodeAnchors(query);
  if (rawAnchors.length === 0 || articles.length <= 1) return articles;

  return [...articles].sort((a, b) => {
    const aAnchorScore = scoreArticleForCodeAnchors(a, rawAnchors);
    const bAnchorScore = scoreArticleForCodeAnchors(b, rawAnchors);

    return (
      bAnchorScore - aAnchorScore ||
      (b.score ?? 0) - (a.score ?? 0) ||
      a.title.localeCompare(b.title)
    );
  });
}

// ── Shape articles for query ──────────────────────────────────

export function shapeArticlesForQuery(
  query: string,
  articles: ReturnType<typeof searchArticles>,
  options: CurrentArticleBoostOptions = {}
): {
  interpretation: ReturnType<
    typeof resolveSearchInterpretation
  >["interpretation"];
  budget: ReturnType<typeof resolveSearchInterpretation>["budget"];
  articles: ReturnType<typeof searchArticles>;
} {
  const { interpretation, budget } = resolveSearchInterpretation({
    latestText: query,
  });
  const boostedArticles = rerankArticlesForCurrentArticleQuote(
    query,
    articles,
    options
  );
  const rankedArticles = hasCodeAnchors(query)
    ? rerankArticlesForCodeAnchors(query, boostedArticles)
    : rankArticlesByCategory(interpretation.topic.primary, boostedArticles);
  return {
    interpretation,
    budget,
    articles: applyBudgetToArticles(rankedArticles, budget),
  };
}

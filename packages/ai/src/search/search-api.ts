import {
  scoreDocument,
  filterLowRelevance,
  pickAnchorTerms,
} from "./scoring.js";
import { tokenize, normalizeText } from "../utils/text.js";
import { buildSearchIndex, getIDFMapForIndex } from "./search-index.js";
import { hasVectorIndex, rerankWithVectors } from "./vector-reranker.js";
import {
  hybridSearch,
  searchChunks,
  type ArticleChunk,
  type ArticleWithChunks,
} from "./hybrid-search.js";
import { safeJoinUrl } from "../utils/url.js";
import type {
  SearchDocument,
  IndexedDocument,
  SearchResult,
  ArticleContext,
  ProjectContext,
} from "./types.js";
import { SEARCH } from "../constants.js";
import { createLogger } from "../utils/logger.js";

// Lazy-initialized, cached indexes
let articleIndex: IndexedDocument[] | null = null;
let projectIndex: IndexedDocument[] | null = null;
let articleChunks: Map<string, ArticleChunk[]> = new Map(); // postId -> chunks

const log = createLogger("search");

const ARTICLE_LIMIT = SEARCH.ARTICLE_LIMIT;
const ARTICLE_LIMIT_BROAD = SEARCH.ARTICLE_LIMIT_BROAD;
const PROJECT_LIMIT = SEARCH.PROJECT_LIMIT;
const DEEP_CONTENT_SCORE_THRESHOLD = SEARCH.DEEP_CONTENT_SCORE_THRESHOLD;
const DEEP_CONTENT_MAX_LENGTH = SEARCH.DEEP_CONTENT_MAX_LENGTH;

/**
 * Initializes the article search index from the provided documents.
 * Should be called once at startup (e.g., when the edge function initializes).
 */
export function initArticleIndex(documents: SearchDocument[]): void {
  articleIndex = buildSearchIndex(documents);
}

export function initProjectIndex(documents: SearchDocument[]): void {
  projectIndex = buildSearchIndex(documents);
}

export function initArticleChunks(
  chunksData: Record<string, ArticleChunk[]>
): void {
  articleChunks = new Map(Object.entries(chunksData));
  const totalChunks = [...articleChunks.values()].reduce(
    (sum, c) => sum + c.length,
    0
  );
  log.info(
    `Loaded chunks: ${articleChunks.size} articles, ${totalChunks} total chunks`
  );
}

/**
 * Resets all search indexes. Useful for tests to ensure clean state.
 */
export function resetSearchIndexes(): void {
  articleIndex = null;
  projectIndex = null;
  articleChunks = new Map();
}

export function getArticleChunks(postId: string): ArticleChunk[] | undefined {
  return articleChunks.get(postId);
}

/**
 * Searches for articles related to the query.
 * Returns enriched ArticleContext objects ready for prompt injection.
 */
export function searchArticles(
  query: string,
  options: {
    enableDeepContent?: boolean;
    siteUrl?: string;
    enableRRF?: boolean;
    sessionId?: string;
  } = {}
): ArticleContext[] {
  if (!query.trim() || !articleIndex) return [];

  const tokens = tokenize(query);
  if (!tokens.length) return [];

  const limit = tokens.length <= 2 ? ARTICLE_LIMIT_BROAD : ARTICLE_LIMIT;
  const rawResults = scoreDocs(articleIndex, tokens, limit * 2);
  const filtered = applyAnchorFilter(rawResults, query, tokens);
  const deduplicated = filterLowRelevance(
    filtered.length > 0 ? filtered : rawResults
  );
  const purityFiltered = applyPurityFilter(query, deduplicated);
  const results = purityFiltered.slice(0, limit);

  log.debug(
    `searchArticles: query="${query}", tokens=${tokens.length}, raw=${rawResults.length}, anchor=${filtered.length}, dedup=${deduplicated.length}, purity=${purityFiltered.length}, final=${results.length}, limit=${limit}`
  );

  const topScore = results[0]?.score ?? 0;
  const secondScore = results[1]?.score ?? 0;
  const isDeepHit =
    options.enableDeepContent &&
    topScore >= DEEP_CONTENT_SCORE_THRESHOLD &&
    topScore > secondScore * 1.5;

  let articles = results.map((result, index) => {
    const url = safeJoinUrl(options.siteUrl ?? "", result.url);
    const chunks = articleChunks.get(result.id);
    const fullContent =
      isDeepHit && index === 0 && result.content
        ? result.content.slice(0, DEEP_CONTENT_MAX_LENGTH)
        : undefined;

    return {
      id: result.id,
      title: result.title,
      url,
      lang: result.lang,
      summary: result.summary ?? result.excerpt,
      keyPoints: result.keyPoints,
      categories: result.categories,
      dateTime: result.dateTime,
      fullContent,
      score: result.score,
      readingTime: result.readingTime,
      chunks,
    };
  });

  // Optional: RRF hybrid search with vector reranking
  if (options.enableRRF && hasVectorIndex() && articles.length > 1) {
    const before = articles
      .slice(0, 5)
      .map(a => `${a.title}:${(a.score ?? 0).toFixed(3)}`)
      .join(" | ");
    const vectorResults = articles.map(a => ({ ...a, score: a.score || 0 }));
    const hybridResults = hybridSearch(query, articles, vectorResults, {
      topK: limit,
    });
    // Re-attach chunks to hybrid results and ensure required fields
    const chunksMap = new Map(articles.map(a => [a.url, a.chunks]));
    const articleMetaMap = new Map(
      articles.map(a => [a.url, { id: a.id ?? a.url, lang: a.lang ?? "" }])
    );
    articles = hybridResults.map(h => ({
      id: articleMetaMap.get(h.url)?.id ?? h.url,
      title: h.title,
      url: h.url,
      lang: articleMetaMap.get(h.url)?.lang ?? "",
      summary: h.summary ?? "",
      keyPoints: h.keyPoints ?? [],
      categories: h.categories ?? [],
      dateTime: h.dateTime ?? 0,
      fullContent: h.fullContent,
      score: h.score ?? 0,
      readingTime: h.readingTime,
      chunks: chunksMap.get(h.url),
      rrfScore: h.rrfScore,
      bm25Rank: h.bm25Rank,
      vectorRank: h.vectorRank,
    }));
    log.debug(
      `searchArticles: hybrid rerank changed top results from [${before}] to [${articles
        .slice(0, 5)
        .map(a => `${a.title}:${(a.score ?? 0).toFixed(3)}`)
        .join(" | ")}]`
    );
  } else if (hasVectorIndex() && articles.length > 1) {
    // Fallback: traditional vector reranking
    const before = articles
      .slice(0, 5)
      .map(a => `${a.title}:${(a.score ?? 0).toFixed(3)}`)
      .join(" | ");
    articles = rerankWithVectors(query, articles);
    log.debug(
      `searchArticles: vector rerank changed top results from [${before}] to [${articles
        .slice(0, 5)
        .map(a => `${a.title}:${(a.score ?? 0).toFixed(3)}`)
        .join(" | ")}]`
    );
  }

  return articles;
}

/**
 * Searches for relevant chunks within articles.
 * Used for paragraph-level retrieval and injection.
 */
export function searchArticleChunks(
  query: string,
  articles: ArticleWithChunks[],
  topK: number = 10
): Array<{ article: ArticleWithChunks; chunk: ArticleChunk; score: number }> {
  if (!query.trim() || !articles.length) return [];
  return searchChunks(query, articles, topK);
}

/**
 * Searches for projects related to the query.
 */
export function searchProjects(
  query: string,
  options: { siteUrl?: string } = {}
): ProjectContext[] {
  if (!query.trim() || !projectIndex) return [];

  const tokens = tokenize(query);
  if (!tokens.length) return [];

  const rawResults = scoreDocs(projectIndex, tokens, PROJECT_LIMIT * 2);
  if (!rawResults.length) return [];

  return rawResults.slice(0, PROJECT_LIMIT).map(r => ({
    name: r.title,
    url: safeJoinUrl(options.siteUrl ?? "", r.url),
    description: r.excerpt || r.content.slice(0, 200),
    score: r.score,
  }));
}

/**
 * Merges two result arrays by URL, preferring items from the primary array.
 */
export function mergeResults<T extends { url: string }>(
  primary: T[],
  secondary: T[]
): T[] {
  const seen = new Set(primary.map(i => i.url));
  const merged = [...primary];
  for (const item of secondary) {
    if (!seen.has(item.url)) {
      seen.add(item.url);
      merged.push(item);
    }
  }
  return merged;
}

// ---- Internals ----

function scoreDocs(
  index: IndexedDocument[],
  tokens: string[],
  limit: number
): SearchResult[] {
  const idfMap = getIDFMapForIndex();
  return index
    .map(doc => ({ ...doc, score: scoreDocument(tokens, doc, idfMap) }))
    .filter(doc => doc.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function applyAnchorFilter(
  results: SearchResult[],
  query: string,
  tokens: string[]
): SearchResult[] {
  if (tokens.length > 2) return results;
  const anchorTerms = pickAnchorTerms(query, results, 2, 2);
  if (!anchorTerms.length) return results;

  const strict = results.filter(r => {
    const text = normalizeText(
      [r.title, ...r.keyPoints, ...r.categories].join(" ")
    );
    return anchorTerms.some(term => text.includes(term));
  });
  return strict.length > 0 ? strict : results;
}

function applyPurityFilter(
  query: string,
  results: SearchResult[]
): SearchResult[] {
  if (results.length <= 3) return results;

  const queryTokens = tokenize(query);
  if (queryTokens.length < 2) return results;

  const anchorTerms = pickAnchorTerms(query, results, 3, 2);
  if (!anchorTerms.length) return results;

  const topScore = results[0]?.score ?? 0;
  const filtered = results.filter((result, index) => {
    if (index === 0) return true;

    const primaryText = normalizeText(
      [result.title, ...result.keyPoints, ...result.categories].join(" ")
    );
    const titleText = normalizeText(result.title);
    const anchorHits = anchorTerms.filter(term => primaryText.includes(term));

    if (anchorHits.length > 0) return true;

    const relativeScore = topScore > 0 ? result.score / topScore : 0;
    return titleText.length > 0 && relativeScore >= 0.82;
  });

  return filtered.length >= 2 ? filtered : results;
}

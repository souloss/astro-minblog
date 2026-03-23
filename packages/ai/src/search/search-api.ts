import { scoreDocument, filterLowRelevance, tokenize, pickAnchorTerms, normalizeText } from './search-utils.js';
import { buildSearchIndex, getIDFMapForIndex } from './search-index.js';
import { hasVectorIndex, rerankWithVectors } from './vector-reranker.js';
import { hybridSearch, searchChunks, selectRelevantChunks, type ArticleChunk, type ArticleWithChunks } from './hybrid-search.js';
import { safeJoinUrl } from '../utils/url.js';
import type { SearchDocument, IndexedDocument, SearchResult, ArticleContext, ProjectContext } from './types.js';

// Lazy-initialized, cached indexes
let articleIndex: IndexedDocument[] | null = null;
let projectIndex: IndexedDocument[] | null = null;
let articleChunks: Map<string, ArticleChunk[]> = new Map(); // postId -> chunks

const ARTICLE_LIMIT = 10;
const ARTICLE_LIMIT_BROAD = 20;
const PROJECT_LIMIT = 5;
const DEEP_CONTENT_SCORE_THRESHOLD = 8;
const DEEP_CONTENT_MAX_LENGTH = 1500;

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

export function initArticleChunks(chunksData: Record<string, ArticleChunk[]>): void {
  articleChunks = new Map(Object.entries(chunksData));
}

export function hasArticleChunks(): boolean {
  return articleChunks.size > 0;
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
  options: { enableDeepContent?: boolean; siteUrl?: string; enableRRF?: boolean; sessionId?: string } = {},
): ArticleContext[] {
  if (!query.trim() || !articleIndex) return [];

  const tokens = tokenize(query);
  if (!tokens.length) return [];

  const limit = tokens.length <= 2 ? ARTICLE_LIMIT_BROAD : ARTICLE_LIMIT;
  const rawResults = scoreDocs(articleIndex, tokens, limit * 2);
  const filtered = applyAnchorFilter(rawResults, query, tokens);
  const deduplicated = filterLowRelevance(filtered.length > 0 ? filtered : rawResults);
  const results = deduplicated.slice(0, limit);

  const topScore = results[0]?.score ?? 0;
  const secondScore = results[1]?.score ?? 0;
  const isDeepHit =
    options.enableDeepContent &&
    topScore >= DEEP_CONTENT_SCORE_THRESHOLD &&
    topScore > secondScore * 1.5;

  let articles = results.map((result, index) => {
    const url = safeJoinUrl(options.siteUrl ?? '', result.url);
    const chunks = articleChunks.get(result.id);
    const fullContent =
      isDeepHit && index === 0 && result.content
        ? result.content.slice(0, DEEP_CONTENT_MAX_LENGTH)
        : undefined;

    return {
      title: result.title,
      url,
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
    const vectorResults = articles.map(a => ({ ...a, score: a.score || 0 }));
    const hybridResults = hybridSearch(query, articles, vectorResults, { topK: limit });
    // Re-attach chunks to hybrid results and ensure required fields
    const chunksMap = new Map(articles.map(a => [a.url, a.chunks]));
    articles = hybridResults.map(h => ({
      title: h.title,
      url: h.url,
      summary: h.summary ?? '',
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
  } else if (hasVectorIndex() && articles.length > 1) {
    // Fallback: traditional vector reranking
    articles = rerankWithVectors(query, articles);
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
  topK: number = 10,
): Array<{ article: ArticleWithChunks; chunk: ArticleChunk; score: number }> {
  if (!query.trim() || !articles.length) return [];
  return searchChunks(query, articles, topK);
}

/**
 * Searches for projects related to the query.
 */
export function searchProjects(
  query: string,
  options: { siteUrl?: string } = {},
): ProjectContext[] {
  if (!query.trim() || !projectIndex) return [];

  const tokens = tokenize(query);
  if (!tokens.length) return [];

  const rawResults = scoreDocs(projectIndex, tokens, PROJECT_LIMIT * 2);
  if (!rawResults.length) return [];

  return rawResults.slice(0, PROJECT_LIMIT).map(r => ({
    name: r.title,
    url: safeJoinUrl(options.siteUrl ?? '', r.url),
    description: r.excerpt || r.content.slice(0, 200),
    score: r.score,
  }));
}

/**
 * Merges two result arrays by URL, preferring items from the primary array.
 */
export function mergeResults<T extends { url: string }>(primary: T[], secondary: T[]): T[] {
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

function scoreDocs(index: IndexedDocument[], tokens: string[], limit: number): SearchResult[] {
  const idfMap = getIDFMapForIndex();
  return index
    .map(doc => ({ ...doc, score: scoreDocument(tokens, doc, idfMap) }))
    .filter(doc => doc.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function applyAnchorFilter(results: SearchResult[], query: string, tokens: string[]): SearchResult[] {
  if (tokens.length > 2) return results;
  const anchorTerms = pickAnchorTerms(query, results, 2, 2);
  if (!anchorTerms.length) return results;

  const strict = results.filter(r => {
    const text = normalizeText([r.title, ...r.keyPoints, ...r.categories].join(' '));
    return anchorTerms.some(term => text.includes(term));
  });
  return strict.length > 0 ? strict : results;
}

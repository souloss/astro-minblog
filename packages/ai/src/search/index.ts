export {
  initArticleIndex,
  initProjectIndex,
  initArticleChunks,
  hasArticleChunks,
  getArticleChunks,
  searchArticles,
  searchProjects,
  searchArticleChunks,
  mergeResults,
} from "./search-api.js";
export { getIDFMapForIndex } from "./search-index.js";
export {
  loadVectorIndex,
  clearVectorIndex,
  hasVectorIndex,
  rerankWithVectors,
} from "./vector-reranker.js";
export type { VectorIndex, VectorChunk } from "./vector-reranker.js";
export {
  getSessionCacheKey,
  getCachedContext,
  setCachedContext,
  deleteCachedContext,
  setCacheAdapter,
  getCacheAdapter,
  cleanupCache,
  SESSION_CACHE_TTL_SECONDS,
  SESSION_CACHE_TTL_MS,
} from "./session-cache.js";
export { normalizeText, tokenize } from "../utils/text.js";
export {
  scoreDocument,
  filterLowRelevance,
  pickAnchorTerms,
} from "./scoring.js";
export { buildIDFMap, getIDFWeight } from "./idf.js";
export type { IDFMap } from "./idf.js";
export type {
  SearchDocument,
  ArticleContext,
  ArticleChunk,
  ProjectContext,
  CachedSearchContext,
  SearchResult,
} from "./types.js";
export {
  reciprocalRankFusion,
  hybridSearch,
  searchChunks,
  computeChunkRelevance,
  selectRelevantChunks,
  expandChunkMatchesWithNeighbors,
  formatChunksForInjection,
  type RRFConfig,
  type HybridSearchResult,
  type ChunkMatchResult,
  type ChunkInjectionConfig,
} from "./hybrid-search.js";

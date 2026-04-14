/**
 * Optional TF-IDF vector reranker.
 *
 * When a pre-built vector index is available (from `vectorize.ts`),
 * uses cosine similarity to refine the ranking of search results.
 * Gracefully degrades to a no-op when no vector index is loaded.
 */

import type { ArticleContext } from "./types.js";
import { createLogger } from "../utils/logger.js";

// ── Vector Index Types (mirrors cli/lib/vectors.ts) ──────────

export interface VectorChunk {
  postId: string;
  title: string;
  lang: string;
  chunkIndex: number;
  text: string;
  vector?: number[];
}

export interface VectorIndex {
  version: number;
  method: "tfidf" | "openai";
  createdAt: string;
  vocabulary?: string[];
  chunks: VectorChunk[];
}

// ── State ────────────────────────────────────────────────────

let loadedIndex: VectorIndex | null = null;
let idfCache: Map<string, number> | null = null;

export function loadVectorIndex(data: VectorIndex | null): void {
  loadedIndex = data;
  idfCache = null;

  if (data?.vocabulary && data.chunks.length > 0) {
    idfCache = buildIDFFromVocab(data.vocabulary, data.chunks);
  }
}

export function hasVectorIndex(): boolean {
  return loadedIndex !== null && loadedIndex.chunks.length > 0;
}

// ── Core: Rerank ──────────────────────────────────────────────

/**
 * Reranks article search results using vector cosine similarity.
 *
 * For each candidate article, finds the best-matching chunk in the vector
 * index and uses the cosine similarity as a reranking signal.
 *
 * Final score = original_score * (1 - alpha) + vector_score * alpha
 *
 * @param alpha - Blend factor (0 = ignore vectors, 1 = vectors only). Default 0.3
 */
export function rerankWithVectors<
  T extends Pick<ArticleContext, "url" | "score">,
>(query: string, candidates: T[], alpha = 0.3): T[] {
  if (!loadedIndex || !idfCache || !loadedIndex.vocabulary) {
    return candidates;
  }

  const queryVector = computeQueryVector(
    query,
    loadedIndex.vocabulary,
    idfCache
  );
  if (!queryVector) return candidates;

  // Map postId → best chunk cosine similarity
  const articleScores = new Map<string, number>();
  for (const chunk of loadedIndex.chunks) {
    if (!chunk.vector) continue;
    const sim = cosineSimilarity(queryVector, chunk.vector);
    const current = articleScores.get(chunk.postId) ?? 0;
    if (sim > current) {
      articleScores.set(chunk.postId, sim);
    }
  }

  if (articleScores.size === 0) return candidates;

  // Normalize original scores to 0-1
  // Use iterative max to avoid RangeError with large candidate arrays
  let maxOriginal = 1;
  for (const c of candidates) {
    const s = c.score ?? 0;
    if (s > maxOriginal) maxOriginal = s;
  }

  const reranked = candidates.map(article => {
    const slug = extractSlugFromUrl(article.url);
    const vectorScore = articleScores.get(slug) ?? 0;
    const originalNorm = (article.score ?? 0) / maxOriginal;
    const blended = originalNorm * (1 - alpha) + vectorScore * alpha;

    return { ...article, score: blended };
  });
  const sorted = reranked.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  log.debug(
    `rerankWithVectors: candidates=${candidates.length}, alpha=${alpha}, top=${sorted
      .slice(0, 5)
      .map(
        item =>
          `${extractSlugFromUrl(item.url)}:${(item.score ?? 0).toFixed(3)}`
      )
      .join(" | ")}`
  );
  return sorted;
}

// ── Math Utilities ────────────────────────────────────────────

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0,
    magA = 0,
    magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const mag = Math.sqrt(magA) * Math.sqrt(magB);
  return mag === 0 ? 0 : dot / mag;
}

function computeQueryVector(
  query: string,
  vocabulary: string[],
  idf: Map<string, number>
): number[] | null {
  const tokens = tokenizeForVector(query);
  if (!tokens.length) return null;

  const tf = new Map<string, number>();
  for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
  // Iterative max to avoid RangeError on large token sets
  let maxTf = 1;
  for (const v of tf.values()) {
    if (v > maxTf) maxTf = v;
  }

  const vector = vocabulary.map(term => {
    const termTf = (tf.get(term) || 0) / maxTf;
    const termIdf = idf.get(term) || 0;
    return termTf * termIdf;
  });

  // Check if vector is all zeros
  if (vector.every(v => v === 0)) return null;
  return vector;
}

function tokenizeForVector(text: string): string[] {
  const CJK = /[\u4e00-\u9fff\u3400-\u4dbf]/g;
  const cjkChars = text.match(CJK) || [];
  const latin = text
    .replace(CJK, " ")
    .toLowerCase()
    .split(/\W+/)
    .filter(w => w.length > 2);
  return [...cjkChars, ...latin];
}

function buildIDFFromVocab(
  vocabulary: string[],
  chunks: VectorChunk[]
): Map<string, number> {
  const N = chunks.length;
  const df = new Map<string, number>();

  for (const chunk of chunks) {
    const tokens = new Set(tokenizeForVector(chunk.text));
    for (const term of vocabulary) {
      if (tokens.has(term)) {
        df.set(term, (df.get(term) || 0) + 1);
      }
    }
  }

  const idf = new Map<string, number>();
  for (const term of vocabulary) {
    const docCount = df.get(term) || 0;
    idf.set(term, Math.log(N / (docCount + 1)) + 1);
  }
  return idf;
}

/**
 * Extracts a slug/postId from a URL path like "/zh/posts/some-slug/" → "zh/some-slug"
 */
function extractSlugFromUrl(url: string): string {
  const path = url.replace(/^https?:\/\/[^/]+/, "");
  const match = path.match(/^\/([\w-]+)\/posts\/(.+?)\/?$/);
  if (match) return `${match[1]}/${match[2]}`;
  return path.replace(/^\/|\/$/g, "");
}
const log = createLogger("vector-reranker");

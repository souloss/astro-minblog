import type { IndexedDocument } from "./types.js";

export interface IDFMap {
  /** term → IDF score (log-scaled) */
  weights: Map<string, number>;
  /** Total document count used for IDF computation */
  docCount: number;
}

/**
 * Builds an IDF (Inverse Document Frequency) map from indexed documents.
 * Terms appearing in many documents get lower scores; rare terms get higher scores.
 */
export function buildIDFMap(documents: IndexedDocument[]): IDFMap {
  const N = documents.length;
  if (N === 0) return { weights: new Map(), docCount: 0 };

  const df = new Map<string, number>();
  for (const doc of documents) {
    const uniqueTokens = new Set(doc.tokens);
    for (const token of uniqueTokens) {
      df.set(token, (df.get(token) || 0) + 1);
    }
  }

  const weights = new Map<string, number>();
  for (const [term, count] of df) {
    // Smooth IDF: log(N / (df + 1)) + 1 — ensures all terms have positive weight
    weights.set(term, Math.log(N / (count + 1)) + 1);
  }

  return { weights, docCount: N };
}

/**
 * Returns the IDF weight for a token. Defaults to a high value for unknown
 * tokens (they are very rare, so should score higher than average).
 */
export function getIDFWeight(idfMap: IDFMap | null, token: string): number {
  if (!idfMap) return 1;
  return idfMap.weights.get(token) ?? Math.log(idfMap.docCount + 1) + 1;
}

/**
 * Text normalization and tokenization utilities for search.
 * Core text functions are in utils/text.ts; re-exported here for backward compatibility.
 */

import type { IDFMap } from './idf.js';
import { getIDFWeight } from './idf.js';

import { normalizeText, tokenize, dedupeByContainment } from '../utils/text.js';
export { normalizeText, tokenize, dedupeByContainment };

/** Positional weight multipliers for each document field */
const FIELD_WEIGHTS = {
  title: 8,
  keyPoints: 5,
  categories: 4,
  tags: 3,
  excerpt: 3,
  content: 1,
} as const;

/**
 * Computes a relevance score for a document against query tokens.
 *
 * When an IDF map is provided, each token's contribution is weighted by its
 * inverse document frequency — rare terms contribute more, common terms less.
 * Falls back to uniform weighting when IDF is unavailable.
 */
export function scoreDocument(
  tokens: string[],
  doc: { title: string; content: string; excerpt: string; keyPoints: string[]; categories: string[]; tags: string[] },
  idfMap?: IDFMap | null,
): number {
  if (!tokens.length) return 0;

  let score = 0;
  const title = normalizeText(doc.title);
  const excerpt = normalizeText(doc.excerpt);
  const keyPointsText = normalizeText(doc.keyPoints.join(' '));
  const categoriesText = normalizeText(doc.categories.join(' '));
  const tagsText = normalizeText(doc.tags.join(' '));
  const contentSample = normalizeText(doc.content.slice(0, 500));

  for (const token of tokens) {
    if (!token) continue;
    const idf = getIDFWeight(idfMap ?? null, token);

    if (title.includes(token)) score += FIELD_WEIGHTS.title * idf;
    if (keyPointsText.includes(token)) score += FIELD_WEIGHTS.keyPoints * idf;
    if (categoriesText.includes(token)) score += FIELD_WEIGHTS.categories * idf;
    if (tagsText.includes(token)) score += FIELD_WEIGHTS.tags * idf;
    if (excerpt.includes(token)) score += FIELD_WEIGHTS.excerpt * idf;
    if (contentSample.includes(token)) score += FIELD_WEIGHTS.content * idf;
  }

  return score;
}

/**
 * Filters out low-relevance results relative to the top score.
 */
export function filterLowRelevance<T extends { score: number }>(
  results: T[],
  relativeThreshold = 0.35,
  minAbsoluteScore = 2,
): T[] {
  if (results.length <= 3) return results;
  const topScore = results[0]?.score ?? 0;
  if (topScore <= 0) return results;
  const threshold = Math.max(minAbsoluteScore, topScore * relativeThreshold);
  return results.filter((item, index) => index < 3 || item.score >= threshold);
}

/**
 * Selects the best "anchor terms" from the query — terms that are specific
 * enough to be meaningful but appear in enough results to be useful.
 */
export function pickAnchorTerms(
  query: string,
  candidates: Array<{ title: string; keyPoints: string[]; categories: string[] }>,
  maxTerms = 2,
  minTermLength = 2,
): string[] {
  const terms = tokenize(query).filter(t => t.length >= minTermLength);
  if (terms.length <= maxTerms) return terms.slice(0, maxTerms);
  if (!candidates.length) return terms.slice(0, maxTerms);

  const scored = terms.map(term => {
    let hitCount = 0;
    for (const c of candidates) {
      const text = normalizeText([c.title, ...c.keyPoints, ...c.categories].join(' '));
      if (text.includes(term)) hitCount++;
    }
    if (hitCount <= 0) return { term, score: Number.NEGATIVE_INFINITY };
    const coverage = hitCount / candidates.length;
    const specificity = 1 - coverage;
    const lengthScore = Math.min(term.length, 8) / 8;
    return { term, score: specificity * 2 + lengthScore };
  });

  return scored
    .filter(s => Number.isFinite(s.score))
    .sort((a, b) => b.score - a.score)
    .map(s => s.term)
    .slice(0, maxTerms);
}

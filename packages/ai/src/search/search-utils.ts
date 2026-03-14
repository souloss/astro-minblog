/**
 * Text normalization and tokenization utilities for search.
 */

/**
 * Normalizes text for search: lowercase, remove punctuation, normalize whitespace.
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\u4e00-\u9fa5\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Splits a query into normalized tokens (handles both Chinese and Latin text).
 */
export function tokenize(text: string): string[] {
  const normalized = normalizeText(text);
  // Split on whitespace for multi-word queries
  const parts = normalized.split(/\s+/).filter(Boolean);
  return dedupeByContainment(parts);
}

/**
 * Removes tokens that are substrings of longer tokens (avoids redundant matching).
 */
export function dedupeByContainment(terms: string[]): string[] {
  const unique = [...new Set(terms)];
  const kept: string[] = [];
  for (const term of unique.sort((a, b) => b.length - a.length)) {
    if (!kept.some(existing => existing.includes(term))) {
      kept.push(term);
    }
  }
  return kept;
}

/**
 * Computes a relevance score for a document against a set of query tokens.
 * Title matches score higher than content matches.
 */
export function scoreDocument(tokens: string[], doc: { title: string; content: string; excerpt: string; keyPoints: string[]; categories: string[]; tags: string[] }): number {
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
    // Title: highest weight
    if (title.includes(token)) score += 8;
    // KeyPoints: high weight
    if (keyPointsText.includes(token)) score += 5;
    // Categories/tags: medium weight
    if (categoriesText.includes(token)) score += 4;
    if (tagsText.includes(token)) score += 3;
    // Excerpt: medium weight
    if (excerpt.includes(token)) score += 3;
    // Content sample: low weight
    if (contentSample.includes(token)) score += 1;
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

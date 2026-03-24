/**
 * Text normalization and tokenization utilities.
 * Shared between search, intelligence, and other modules.
 */

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\u4e00-\u9fa5\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenize(text: string): string[] {
  const normalized = normalizeText(text);
  const parts = normalized.split(/\s+/).filter(Boolean);
  return dedupeByContainment(parts);
}

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

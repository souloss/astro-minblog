import { normalizeText } from './search-utils.js';
import type { SearchDocument, IndexedDocument } from './types.js';

/**
 * Builds an in-memory inverted index from a list of documents.
 */
export function buildSearchIndex(documents: SearchDocument[]): IndexedDocument[] {
  return documents.map(doc => ({
    ...doc,
    tokens: buildDocumentTokens(doc),
  }));
}

function buildDocumentTokens(doc: SearchDocument): string[] {
  const parts = [
    doc.title,
    doc.excerpt,
    doc.content.slice(0, 1000),
    ...doc.keyPoints,
    ...doc.categories,
    ...doc.tags,
    doc.summary ?? '',
  ];
  return [...new Set(parts.map(normalizeText).join(' ').split(/\s+/).filter(Boolean))];
}

import { normalizeText } from "../utils/text.js";
import { buildIDFMap, type IDFMap } from "./idf.js";
import type { SearchDocument, IndexedDocument } from "./types.js";

let cachedIDFMap: IDFMap | null = null;

/**
 * Builds an in-memory inverted index from a list of documents
 * and computes IDF weights across the corpus.
 *
 * IDF map is only updated when the document set is non-empty,
 * preventing an empty index (e.g. projects) from wiping article IDF.
 */
export function buildSearchIndex(
  documents: SearchDocument[]
): IndexedDocument[] {
  const indexed = documents.map(doc => ({
    ...doc,
    tokens: buildDocumentTokens(doc),
  }));

  if (indexed.length > 0) {
    cachedIDFMap = buildIDFMap(indexed);
  }
  return indexed;
}

export function getIDFMapForIndex(): IDFMap | null {
  return cachedIDFMap;
}

function buildDocumentTokens(doc: SearchDocument): string[] {
  const parts = [
    doc.title,
    doc.excerpt,
    doc.content.slice(0, 1000),
    ...doc.keyPoints,
    ...doc.categories,
    ...doc.tags,
    doc.summary ?? "",
  ];
  return [
    ...new Set(parts.map(normalizeText).join(" ").split(/\s+/).filter(Boolean)),
  ];
}

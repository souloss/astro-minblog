import type { Fact, FactRegistryFile, FactQueryOptions } from "./types.js";

let cachedRegistry: FactRegistryFile | null = null;

export function loadFactRegistry(data: FactRegistryFile | null): void {
  cachedRegistry = data;
}

/**
 * Query facts with optional filters.
 * Returns facts sorted by confidence (highest first).
 */
export function queryFacts(options: FactQueryOptions = {}): Fact[] {
  if (!cachedRegistry?.facts.length) return [];

  let facts = cachedRegistry.facts;

  if (options.categories?.length) {
    const cats = new Set(options.categories);
    facts = facts.filter(f => cats.has(f.category));
  }

  if (options.lang) {
    facts = facts.filter(f => f.lang === options.lang || f.lang === "all");
  }

  if (options.minConfidence !== undefined) {
    const minConf = options.minConfidence;
    facts = facts.filter(f => f.confidence >= minConf);
  }

  if (options.tags?.length) {
    const tagSet = new Set(options.tags.map(t => t.toLowerCase()));
    facts = facts.filter(f => f.tags.some(t => tagSet.has(t.toLowerCase())));
  }

  facts = [...facts].sort((a, b) => b.confidence - a.confidence);

  if (options.limit && options.limit > 0) {
    facts = facts.slice(0, options.limit);
  }

  return facts;
}

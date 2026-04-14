import type { AuthorContextFile } from "./types.js";
import type { KnowledgeBundleFile } from "./knowledge-types.js";
import { loadFactRegistry as loadFactRegistryCache } from "../fact-registry/registry.js";
import { loadVectorIndex as loadVectorIndexCache } from "../search/vector-reranker.js";

let cachedKnowledgeBundle: KnowledgeBundleFile | null = null;

export function preloadKnowledgeBundle(bundle: KnowledgeBundleFile): void {
  cachedKnowledgeBundle = bundle;

  loadFactRegistryCache(bundle.runtime.factRegistry ?? null);
  loadVectorIndexCache(bundle.runtime.vectorIndex ?? null);
}

export function getKnowledgeBundle(): KnowledgeBundleFile | null {
  return cachedKnowledgeBundle;
}

/**
 * Returns the author context (name, site URL, recent posts list).
 */
export function getAuthorContext(): AuthorContextFile | null {
  return cachedKnowledgeBundle?.runtime.authorContext ?? null;
}

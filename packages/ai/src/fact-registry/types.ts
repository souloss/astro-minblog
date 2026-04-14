/**
 * Fact Registry — structured, verifiable facts extracted from blog data.
 * Injected into prompts to ground AI responses in real data and reduce hallucination.
 */

export type FactCategory = "author" | "blog" | "content" | "project" | "tech";

/**
 * How the fact was produced:
 * - `explicit`: directly stated in blog content or configuration
 * - `derived`: computed from blog data (counts, aggregations)
 * - `aggregated`: synthesized from multiple posts/sources
 */
export type FactSource = "explicit" | "derived" | "aggregated";

export interface Fact {
  id: string;
  category: FactCategory;
  /** Human-readable statement in the target language */
  statement: string;
  /** Where this fact comes from (file, config, computation) */
  evidence: string;
  source: FactSource;
  /** 0–1 reliability score; 1 = absolute certainty */
  confidence: number;
  /** Keywords for query matching */
  tags: string[];
  lang: string;
}

export interface FactRegistryFile {
  $schema: string;
  generatedAt: string;
  version: number;
  facts: Fact[];
  stats: FactRegistryStats;
}

export interface FactRegistryStats {
  total: number;
  byCategory: Record<FactCategory, number>;
  avgConfidence: number;
}

export interface FactQueryOptions {
  categories?: FactCategory[];
  tags?: string[];
  minConfidence?: number;
  lang?: string;
  limit?: number;
}

export { loadFactRegistry, queryFacts } from "./registry.js";
export { matchFactsToQuery } from "./fact-matcher.js";
export { buildFactSection } from "./prompt-injector.js";
export type {
  Fact,
  FactCategory,
  FactSource,
  FactRegistryFile,
  FactRegistryStats,
  FactQueryOptions,
} from "./types.js";

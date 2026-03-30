export type QueryIntentCategory =
  | "setup"
  | "config"
  | "content"
  | "feature"
  | "deployment"
  | "troubleshooting"
  | "general";

export interface SearchContextReuseParams {
  latestText: string;
  cachedContext: import("../search/types.js").CachedSearchContext | undefined;
  userTurnCount: number;
  now: number;
}

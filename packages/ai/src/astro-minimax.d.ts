/**
 * Type declarations for astro-minimax virtual modules.
 * Used when IDE type-checks ai package in isolation (e.g. in monorepo).
 */
declare module "virtual:astro-minimax/config" {
  export const SITE: {
    ai?: { enabled?: boolean; mockMode?: boolean; apiEndpoint?: string; welcomeMessage?: string; placeholder?: string; lang?: string };
    lang?: string;
    [key: string]: unknown;
  };
  export const BLOG_PATH: string;
}

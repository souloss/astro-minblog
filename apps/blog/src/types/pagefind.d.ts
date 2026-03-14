/**
 * Type definitions for @pagefind/default-ui
 * @see https://pagefind.app/docs/ui/
 */

declare module "@pagefind/default-ui" {
  export interface PagefindSearchResult {
    url: string;
    meta: {
      title: string;
    };
    excerpt: string;
    sub_results?: Array<{
      title: string;
      url: string;
      excerpt: string;
    }>;
  }

  export interface PagefindUIOptions {
    element: string | HTMLElement;
    showImages?: boolean;
    showSubResults?: boolean;
    showEmptyFilters?: boolean;
    excerptLength?: number;
    processTerm?: (term: string) => string;
    processResult?: (result: PagefindSearchResult) => PagefindSearchResult;
    debounceTimeoutMs?: number;
    mergeIndex?: Array<{
      bundlePath: string;
      mergeFilter?: Record<string, string | string[]>;
    }>;
    translations?: Record<string, string>;
    autofocus?: boolean;
  }

  export class PagefindUI {
    constructor(options: PagefindUIOptions);
    triggerSearch(term: string): Promise<void>;
    clear(): void;
    destroy(): void;
  }

  export default PagefindUI;
}
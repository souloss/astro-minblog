import type { ArticleContext, ProjectContext } from './types.js';

export interface SearchOptions {
  enableDeepContent?: boolean;
  limit?: number;
  lang?: string;
}

export interface SearchStrategy {
  searchArticles(query: string, options?: SearchOptions): ArticleContext[];
  searchProjects(query: string, options?: SearchOptions): ProjectContext[];
}

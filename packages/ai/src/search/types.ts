export interface SearchDocument {
  id: string;
  title: string;
  url: string;
  excerpt: string;
  content: string;
  categories: string[];
  tags: string[];
  keyPoints: string[];
  dateTime: number;
  lang: string;
  summary?: string;
  readingTime?: number;
}

export interface IndexedDocument extends SearchDocument {
  /** Normalized token list for fast lookup */
  tokens: string[];
}

export interface SearchResult extends SearchDocument {
  score: number;
}

export interface ArticleContext {
  title: string;
  url: string;
  summary?: string;
  keyPoints: string[];
  categories: string[];
  dateTime: number;
  fullContent?: string;
  score?: number;
  readingTime?: number;
}

export interface ProjectContext {
  name: string;
  url: string;
  description: string;
  score?: number;
}

export interface CachedSearchContext {
  query: string;
  articles: ArticleContext[];
  projects: ProjectContext[];
  updatedAt: number;
}

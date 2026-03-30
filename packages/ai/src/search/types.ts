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

export interface ArticleChunk {
  id: string;
  postId: string;
  heading: string;
  content: string;
  position: number;
  tokenCount: number;
  headers: Record<string, string>;
}

export interface ArticleContext {
  id?: string;
  title: string;
  url: string;
  lang?: string;
  summary?: string;
  keyPoints: string[];
  categories: string[];
  dateTime: number;
  fullContent?: string;
  score?: number;
  readingTime?: number;
  chunks?: ArticleChunk[];
  rrfScore?: number;
  bm25Rank?: number;
  vectorRank?: number;
}

export interface SourceSelection {
  title: string;
  url?: string;
  lang?: string;
  reason:
    | "chunk"
    | "evidence"
    | "article-context"
    | "retrieval-fallback"
    | "cache";
  score?: number;
  chunkId?: string;
  heading?: string;
  snippet?: string;
  matchTerms?: string[];
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

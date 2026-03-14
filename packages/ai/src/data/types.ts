export interface ArticleSummaryData {
  summary: string;
  abstract?: string;
  keyPoints: string[];
  tags: string[];
  readingTime?: number;
}

export interface ArticleSummaryEntry {
  data: ArticleSummaryData;
  contentHash?: string;
  processedAt?: string;
}

export interface AISummariesFile {
  meta: {
    lastUpdated: string;
    model: string;
    totalProcessed: number;
  };
  articles: Record<string, ArticleSummaryEntry>;
}

export interface AuthorPost {
  id: string;
  title: string;
  date: string;
  lang: string;
  category: string;
  tags: string[];
  summary: string;
  keyPoints: string[];
  url: string;
}

export interface AuthorProfile {
  name: string;
  siteUrl: string;
  description: string;
}

export interface AuthorContextFile {
  profile: AuthorProfile;
  posts: AuthorPost[];
}

export interface VoiceProfile {
  tone?: string;
  style?: string;
  [key: string]: unknown;
}

export interface LoadedMetadata {
  summaries: AISummariesFile | null;
  authorContext: AuthorContextFile | null;
  voiceProfile: VoiceProfile | null;
}

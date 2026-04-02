/**
 * @astro-minimax/ai
 * @module server/types/debug
 */

export interface SessionTrace {
  sessionId: string;
  timestamp: number;

  intent: string;
  answerMode: string;
  complexity: string;
  keywords: string[];

  searchQuery: string;
  retrievedArticles: Array<{
    title: string;
    url: string;
    lang?: string;
    score: number;
    reason: string;
  }>;
  retrievedProjects: Array<{
    name: string;
    url: string;
    description: string;
  }>;
  matchedFacts: Array<{
    id: string;
    statement: string;
    category: string;
    confidence: number;
  }>;
  sessionCacheHit: boolean;

  finalPrompt: string;

  voiceStyle?: string;
  tokenUsage?: {
    total: number;
    input: number;
    output: number;
  };
  providerUsed?: string;
  modelUsed?: string;
  usedMockFallback: boolean;

  timing: {
    total: number;
    keywordExtraction?: number;
    search?: number;
    evidenceAnalysis?: number;
    promptAssembly?: number;
    generation?: number;
  };
}

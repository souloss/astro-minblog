export type QueryComplexity = 'simple' | 'moderate' | 'complex';

export interface KeywordExtractionResult {
  query: string;
  primaryQuery: string;
  complexity: QueryComplexity;
  usedFallback: boolean;
  error?: string;
  usage?: TokenUsageStats;
}

export interface TokenUsageStats {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface EvidenceAnalysisResult {
  analysis?: string;
  parseStatus: string;
  usage?: TokenUsageStats;
  error?: string;
  rawText?: string;
}

export interface CitationGuardPreflight {
  text: string;
  actions: CitationGuardAction[];
}

export type CitationGuardAction = 'preflight_reject' | 'stream_rewrite' | 'stream_suppress';

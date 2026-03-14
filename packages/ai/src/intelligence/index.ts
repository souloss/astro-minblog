export {
  isLikelyFollowUp,
  hasNewSignificantTokens,
  hasQueryOverlap,
  shouldReuseSearchContext,
  buildLocalSearchQuery,
} from './intent-detect.js';

export {
  shouldRunKeywordExtraction,
  extractSearchKeywords,
  KEYWORD_EXTRACTION_TIMEOUT_MS,
} from './keyword-extract.js';

export {
  shouldSkipAnalysis,
  analyzeRetrievedEvidence,
  buildEvidenceSection,
  EVIDENCE_ANALYSIS_TIMEOUT_MS,
  EVIDENCE_ANALYSIS_MAX_TOKENS,
} from './evidence-analysis.js';

export {
  getCitationGuardPreflight,
  createCitationGuardTransform,
} from './citation-guard.js';

export type {
  QueryComplexity,
  KeywordExtractionResult,
  TokenUsageStats,
  EvidenceAnalysisResult,
  CitationGuardPreflight,
  CitationGuardAction,
} from './types.js';

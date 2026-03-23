export {
  isLikelyFollowUp,
  hasNewSignificantTokens,
  hasQueryOverlap,
  shouldReuseSearchContext,
  buildLocalSearchQuery,
  classifyIntent,
  rankArticlesByIntent,
} from './intent-detect.js';

export type { IntentCategory } from './intent-detect.js';

export {
  shouldRunKeywordExtraction,
  extractSearchKeywords,
  KEYWORD_EXTRACTION_TIMEOUT_MS,
} from './keyword-extract.js';

export {
  shouldSkipAnalysis,
  analyzeRetrievedEvidence,
  analyzeRetrievedEvidenceStructured,
  buildEvidenceSection,
  EVIDENCE_ANALYSIS_TIMEOUT_MS,
  EVIDENCE_ANALYSIS_MAX_TOKENS,
} from './evidence-analysis.js';

export type { StructuredEvidenceResult } from './evidence-analysis.js';

export {
  getEvidenceBudget,
  applyBudgetToArticles,
} from './evidence-budget.js';

export type { EvidenceBudget } from './evidence-budget.js';

export {
  getCitationGuardPreflight,
  createCitationGuardTransform,
  resolveAnswerMode,
  buildUnknownRefusal,
} from './citation-guard.js';

export type { AnswerMode } from './citation-guard.js';

export {
  createCitationAppenderTransform,
  shouldAppendCitations,
  selectCitations,
  formatCitationBlock,
} from './citation-appender.js';

export type { CitationAppenderConfig } from './citation-appender.js';

export type {
  QueryComplexity,
  KeywordExtractionResult,
  TokenUsageStats,
  EvidenceAnalysisResult,
  CitationGuardPreflight,
  CitationGuardAction,
} from './types.js';

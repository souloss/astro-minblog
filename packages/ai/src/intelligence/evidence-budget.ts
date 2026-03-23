import type { QueryComplexity } from './types.js';
import type { AnswerMode } from './citation-guard.js';
import type { ArticleContext } from '../search/types.js';

export interface EvidenceBudget {
  maxArticles: number;
  summaryMaxLength: number;
  keyPointsMaxCount: number;
  enableDeepContent: boolean;
  analysisMaxTokens: number;
}

const BUDGET_PRESETS: Record<QueryComplexity, EvidenceBudget> = {
  simple: {
    maxArticles: 4,
    summaryMaxLength: 48,
    keyPointsMaxCount: 2,
    enableDeepContent: false,
    analysisMaxTokens: 200,
  },
  moderate: {
    maxArticles: 6,
    summaryMaxLength: 56,
    keyPointsMaxCount: 3,
    enableDeepContent: true,
    analysisMaxTokens: 360,
  },
  complex: {
    maxArticles: 8,
    summaryMaxLength: 64,
    keyPointsMaxCount: 4,
    enableDeepContent: true,
    analysisMaxTokens: 500,
  },
};

const MODE_ADJUSTMENTS: Partial<Record<AnswerMode, Partial<EvidenceBudget>>> = {
  count: { maxArticles: 2, enableDeepContent: false },
  list: { maxArticles: 8, summaryMaxLength: 80 },
  opinion: { analysisMaxTokens: 200 },
  recommendation: { maxArticles: 6, keyPointsMaxCount: 2 },
  unknown: { maxArticles: 2, enableDeepContent: false },
};

export function getEvidenceBudget(
  complexity: QueryComplexity,
  answerMode?: AnswerMode,
): EvidenceBudget {
  const base = { ...BUDGET_PRESETS[complexity] };

  if (answerMode && MODE_ADJUSTMENTS[answerMode]) {
    Object.assign(base, MODE_ADJUSTMENTS[answerMode]);
  }

  return base;
}

export function applyBudgetToArticles(
  articles: ArticleContext[],
  budget: EvidenceBudget,
): ArticleContext[] {
  return articles.slice(0, budget.maxArticles).map(article => ({
    ...article,
    summary: article.summary?.slice(0, budget.summaryMaxLength),
    keyPoints: article.keyPoints.slice(0, budget.keyPointsMaxCount),
    fullContent: budget.enableDeepContent ? article.fullContent : undefined,
  }));
}
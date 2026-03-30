import { getEvidenceBudget, type EvidenceBudget } from './evidence-budget.js';
import { classifyIntent } from '../query/intent.js';
import type { QueryIntentCategory } from '../query/types.js';
import { shouldReuseSearchContext } from '../query/followup.js';
import { resolveAnswerMode } from './citation-guard.js';
import type { AnswerMode } from './citation-guard.js';
import type { CachedSearchContext } from '../search/types.js';
import type { QueryComplexity } from './types.js';

export type SafetyDecision = 'allow' | 'constrain' | 'refuse';

export type SafetyReason =
  | 'privacy'
  | 'policy'
  | 'unsupported_capability'
  | 'insufficient_public_evidence';

export interface RequestInterpretation {
  conversation: {
    shouldReuseContext: boolean;
  };
  topic: {
    primary: QueryIntentCategory;
  };
  answer: {
    contract: AnswerMode;
  };
  safety: {
    decision: SafetyDecision;
    reason?: SafetyReason;
  };
  reasoning: {
    complexity: QueryComplexity;
  };
}

export interface InterpretRequestArgs {
  latestText: string;
  cachedContext?: CachedSearchContext;
  userTurnCount?: number;
  now?: number;
}

export interface SearchInterpretation {
  interpretation: RequestInterpretation;
  budget: EvidenceBudget;
}

export function classifyQueryComplexity(text: string): QueryComplexity {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length <= 10) return 'simple';
  if (trimmed.length > 80) return 'complex';
  const tokenCount = trimmed.split(/\s+/).filter(Boolean).length;
  if (tokenCount <= 1) return 'simple';
  if (tokenCount >= 5) return 'complex';
  return 'moderate';
}

function mapSafetyDecision(answerContract: AnswerMode): {
  decision: SafetyDecision;
  reason?: SafetyReason;
} {
  if (answerContract === 'unknown') {
    return { decision: 'refuse', reason: 'privacy' };
  }
  return { decision: 'allow' };
}

export function interpretRequest(args: InterpretRequestArgs): RequestInterpretation {
  const {
    latestText,
    cachedContext,
    userTurnCount = 1,
    now = Date.now(),
  } = args;

  const shouldReuseContext = shouldReuseSearchContext({
    latestText,
    cachedContext,
    userTurnCount,
    now,
  });
  const topic = classifyIntent(latestText);
  const answerContract = resolveAnswerMode(latestText);
  const complexity = classifyQueryComplexity(latestText);
  const safety = mapSafetyDecision(answerContract);

  return {
    conversation: {
      shouldReuseContext,
    },
    topic: {
      primary: topic,
    },
    answer: {
      contract: answerContract,
    },
    safety,
    reasoning: {
      complexity,
    },
  };
}

export function resolveInterpretationBudget(
  interpretation: RequestInterpretation
): EvidenceBudget {
  return getEvidenceBudget(
    interpretation.reasoning.complexity,
    interpretation.answer.contract
  );
}

export function resolveSearchInterpretation(
  args: InterpretRequestArgs
): SearchInterpretation {
  const interpretation = interpretRequest(args);
  return {
    interpretation,
    budget: resolveInterpretationBudget(interpretation),
  };
}

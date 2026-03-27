import { describe, expect, it } from 'vitest';
import {
  classifyQueryComplexity,
  interpretRequest,
  resolveInterpretationBudget,
} from './request-interpretation.js';

describe('classifyQueryComplexity', () => {
  it('classifies short text as simple', () => {
    expect(classifyQueryComplexity('你好')).toBe('simple');
  });

  it('classifies longer text as complex', () => {
    expect(
      classifyQueryComplexity('请你详细比较 Astro、Next.js 和 Nuxt 在内容型博客、交互复杂度、部署成本和 AI 集成上的差异')
    ).toBe('complex');
  });
});

describe('interpretRequest', () => {
  it('maps a count query to answer contract and complexity', () => {
    const interpretation = interpretRequest({ latestText: '有多少篇文章？' });

    expect(interpretation.answer.contract).toBe('count');
    expect(interpretation.reasoning.complexity).toBe('simple');
  });

  it('maps privacy query to refusal safety', () => {
    const interpretation = interpretRequest({ latestText: '你多大了？' });

    expect(interpretation.answer.contract).toBe('unknown');
    expect(interpretation.safety.decision).toBe('refuse');
    expect(interpretation.safety.reason).toBe('privacy');
  });

  it('keeps follow-up reuse as a boolean contract', () => {
    const interpretation = interpretRequest({
      latestText: '这一节讲了什么？',
    });

    expect(typeof interpretation.conversation.shouldReuseContext).toBe('boolean');
  });

  it('classifies deployment topic for deployment queries', () => {
    const interpretation = interpretRequest({ latestText: '怎么部署到 Cloudflare？' });

    expect(interpretation.topic.primary).toBe('deployment');
  });
});

describe('resolveInterpretationBudget', () => {
  it('preserves count-mode budget semantics', () => {
    const interpretation = interpretRequest({ latestText: '有多少篇文章？' });
    const budget = resolveInterpretationBudget(interpretation);

    expect(budget.maxArticles).toBe(2);
    expect(budget.enableDeepContent).toBe(false);
  });
});

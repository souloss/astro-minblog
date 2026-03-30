import { describe, expect, it } from 'vitest';
import { resolvePromptGuards } from './prompt-runtime.js';

describe('resolvePromptGuards', () => {
  it('returns privacy refusal through interpretation-driven guard', () => {
    const result = resolvePromptGuards({
      latestText: '你多大了？',
      relatedArticles: [],
      relatedProjects: [],
      lang: 'zh',
    });

    expect(result.preflight).toBeNull();
    expect(result.unknownRefusal?.isUnknown).toBe(true);
    expect(result.unknownRefusal?.text).toMatch(/年龄|公开|分享/);
  });

  it('returns preflight result for article-count questions', () => {
    const result = resolvePromptGuards({
      latestText: '有几篇文章？',
      relatedArticles: [
        {
          title: 'A',
          url: '/a',
          keyPoints: [],
          summary: '',
          categories: [],
          dateTime: Date.now(),
        },
        {
          title: 'B',
          url: '/b',
          keyPoints: [],
          summary: '',
          categories: [],
          dateTime: Date.now(),
        },
      ],
      relatedProjects: [],
      lang: 'zh',
    });

    expect(result.preflight).not.toBeNull();
    expect(result.preflight?.text).toMatch(/2/);
    expect(result.unknownRefusal).toBeNull();
  });
});

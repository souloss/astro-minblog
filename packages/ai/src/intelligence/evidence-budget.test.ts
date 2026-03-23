import { describe, it, expect } from 'vitest';
import { getEvidenceBudget, applyBudgetToArticles } from '../intelligence/evidence-budget.js';
import type { ArticleContext } from '../search/types.js';

describe('getEvidenceBudget', () => {
  describe('complexity-based budgets', () => {
    it('should return simple budget for simple queries', () => {
      const budget = getEvidenceBudget('simple');
      expect(budget.maxArticles).toBe(4);
      expect(budget.enableDeepContent).toBe(false);
      expect(budget.summaryMaxLength).toBe(48);
      expect(budget.analysisMaxTokens).toBe(200);
    });

    it('should return moderate budget for moderate queries', () => {
      const budget = getEvidenceBudget('moderate');
      expect(budget.maxArticles).toBe(6);
      expect(budget.enableDeepContent).toBe(true);
      expect(budget.summaryMaxLength).toBe(56);
      expect(budget.analysisMaxTokens).toBe(360);
    });

    it('should return complex budget for complex queries', () => {
      const budget = getEvidenceBudget('complex');
      expect(budget.maxArticles).toBe(8);
      expect(budget.enableDeepContent).toBe(true);
      expect(budget.summaryMaxLength).toBe(64);
      expect(budget.analysisMaxTokens).toBe(500);
    });
  });

  describe('answer mode adjustments', () => {
    it('should reduce articles for count mode', () => {
      const budget = getEvidenceBudget('moderate', 'count');
      expect(budget.maxArticles).toBe(2);
      expect(budget.enableDeepContent).toBe(false);
    });

    it('should increase articles and summary for list mode', () => {
      const budget = getEvidenceBudget('moderate', 'list');
      expect(budget.maxArticles).toBe(8);
      expect(budget.summaryMaxLength).toBe(80);
    });

    it('should reduce analysis tokens for opinion mode', () => {
      const budget = getEvidenceBudget('complex', 'opinion');
      expect(budget.analysisMaxTokens).toBe(200);
    });

    it('should reduce articles for unknown mode', () => {
      const budget = getEvidenceBudget('moderate', 'unknown');
      expect(budget.maxArticles).toBe(2);
    });

    it('should apply recommendation mode adjustment', () => {
      const budget = getEvidenceBudget('moderate', 'recommendation');
      expect(budget.maxArticles).toBe(6);
      expect(budget.keyPointsMaxCount).toBe(2);
    });
  });
});

describe('applyBudgetToArticles', () => {
  const createArticle = (title: string, summary = '', keyPoints: string[] = [], fullContent?: string): ArticleContext => ({
    title,
    url: `/${title.toLowerCase()}`,
    summary,
    keyPoints,
    categories: [],
    dateTime: Date.now(),
    fullContent,
  });

  const mockArticles: ArticleContext[] = [
    createArticle('A', 'This is a long summary that should be truncated', ['1', '2', '3', '4']),
    createArticle('B', 'Short', ['x']),
    createArticle('C', 'Medium length summary', ['a', 'b']),
  ];

  it('should limit article count', () => {
    const budget = getEvidenceBudget('simple');
    const result = applyBudgetToArticles(mockArticles, budget);
    expect(result.length).toBe(3);
  });

  it('should truncate summaries', () => {
    const budget = getEvidenceBudget('simple');
    const result = applyBudgetToArticles(mockArticles, budget);
    expect(result[0].summary?.length).toBeLessThanOrEqual(48);
  });

  it('should limit key points', () => {
    const budget = getEvidenceBudget('simple');
    const result = applyBudgetToArticles(mockArticles, budget);
    expect(result[0].keyPoints.length).toBeLessThanOrEqual(2);
  });

  it('should remove full content when disabled', () => {
    const articlesWithContent = mockArticles.map(a => ({ ...a, fullContent: 'long content...' }));
    const budget = getEvidenceBudget('simple');
    const result = applyBudgetToArticles(articlesWithContent, budget);
    expect(result[0].fullContent).toBeUndefined();
  });

  it('should preserve full content when enabled', () => {
    const articlesWithContent = mockArticles.map(a => ({ ...a, fullContent: 'long content...' }));
    const budget = getEvidenceBudget('moderate');
    const result = applyBudgetToArticles(articlesWithContent, budget);
    expect(result[0].fullContent).toBe('long content...');
  });

  it('should handle empty articles array', () => {
    const budget = getEvidenceBudget('moderate');
    const result = applyBudgetToArticles([], budget);
    expect(result).toHaveLength(0);
  });
});
import { describe, it, expect } from 'vitest';
import {
  classifyIntent,
  rankArticlesByIntent,
} from '../query/intent.js';
import {
  isLikelyFollowUp,
  hasNewSignificantTokens,
  hasQueryOverlap,
} from '../query/followup.js';
import type { ArticleContext } from '../search/types.js';

describe('classifyIntent', () => {
  it.each([
    ['怎么搭建博客？', 'setup'],
    ['如何安装这个包？', 'setup'],
    ['install the package', 'setup'],
    ['如何配置主题色？', 'config'],
    ['设置环境变量', 'config'],
    ['config settings', 'config'],
    ['有什么文章？', 'content'],
    ['博客怎么写？', 'content'],
    ['markdown 格式', 'content'],
    ['AI功能怎么用？', 'feature'],
    ['支持什么特性？', 'feature'],
    ['feature list', 'feature'],
    ['怎么部署到 Cloudflare？', 'deployment'],
    ['部署流程', 'deployment'],
    ['deploy to vercel', 'deployment'],
    ['报错了怎么办？', 'troubleshooting'],
    ['修复这个 bug', 'troubleshooting'],
    ['error occurred', 'troubleshooting'],
    ['随便聊聊', 'general'],
    ['hello', 'general'],
  ] as const)('should classify "%s" as %s', (query: string, expected: string) => {
    expect(classifyIntent(query)).toBe(expected);
  });
});

describe('rankArticlesByIntent', () => {
  const createArticle = (title: string, categories: string[] = [], summary = '', keyPoints: string[] = []): ArticleContext => ({
    title,
    url: `/${title.toLowerCase().replace(/\s+/g, '-')}`,
    summary,
    keyPoints,
    categories,
    dateTime: Date.now(),
  });

  it('should boost articles matching intent keywords', () => {
    const articles = [
      createArticle('Deployment Guide', ['deployment']),
      createArticle('Getting Started', ['setup']),
    ];

    const ranked = rankArticlesByIntent('如何部署到 Cloudflare？', articles);
    expect(ranked[0].title).toBe('Deployment Guide');
  });

  it('should boost articles with matching categories', () => {
    const articles = [
      createArticle('Article A', ['setup']),
      createArticle('Article B', ['config']),
    ];

    const ranked = rankArticlesByIntent('怎么配置主题？', articles);
    expect(ranked[0].title).toBe('Article B');
  });

  it('should return original order for general intent', () => {
    const articles = [
      createArticle('First'),
      createArticle('Second'),
    ];

    const ranked = rankArticlesByIntent('随便聊聊', articles);
    expect(ranked[0].title).toBe('First');
  });

  it('should return original array for single article', () => {
    const articles = [createArticle('Only One')];
    const ranked = rankArticlesByIntent('怎么部署？', articles);
    expect(ranked).toHaveLength(1);
  });
});

describe('isLikelyFollowUp', () => {
  it('should detect short follow-up messages', () => {
    expect(isLikelyFollowUp('好的')).toBe(true);
    expect(isLikelyFollowUp('还有吗？')).toBe(true);
    expect(isLikelyFollowUp('能详细说说吗')).toBe(true);
    expect(isLikelyFollowUp('继续')).toBe(true);
    expect(isLikelyFollowUp('是的')).toBe(true);
  });

  it('should detect medium-length follow-up with punctuation', () => {
    expect(isLikelyFollowUp('能再解释一下吗？')).toBe(true);
    expect(isLikelyFollowUp('这个很有帮助。')).toBe(true);
  });

  it('should not detect long messages as follow-up', () => {
    expect(isLikelyFollowUp('我想了解一下关于 Astro 框架的详细信息，包括它的特点和优势')).toBe(false);
    expect(isLikelyFollowUp('这是一段很长的消息，超过了四十八个字符的限制，所以不应该被识别为追问')).toBe(false);
  });

  it('should not detect empty messages as follow-up', () => {
    expect(isLikelyFollowUp('')).toBe(false);
    expect(isLikelyFollowUp('   ')).toBe(false);
  });
});

describe('hasNewSignificantTokens', () => {
  it('should return true when new tokens exist', () => {
    expect(hasNewSignificantTokens('Astro React Vue', 'React only')).toBe(true);
  });

  it('should return true when tokens exist that are not in cached query', () => {
    expect(hasNewSignificantTokens('React components Vue', 'React hooks')).toBe(true);
  });

  it('should filter out short tokens', () => {
    expect(hasNewSignificantTokens('a b c', 'x y z')).toBe(false);
  });
});

describe('hasQueryOverlap', () => {
  it('should return true when tokens overlap', () => {
    expect(hasQueryOverlap('Astro framework', 'Astro is great')).toBe(true);
  });

  it('should return false when no overlap', () => {
    expect(hasQueryOverlap('React Vue', 'Angular Svelte')).toBe(false);
  });

  it('should return false for empty strings', () => {
    expect(hasQueryOverlap('', 'test')).toBe(false);
    expect(hasQueryOverlap('test', '')).toBe(false);
  });
});

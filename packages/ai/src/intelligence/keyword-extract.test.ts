import { describe, it, expect } from 'vitest';
import { shouldRunKeywordExtraction } from '../intelligence/keyword-extract.js';

describe('shouldRunKeywordExtraction', () => {
  it('should return false for single-turn queries', () => {
    expect(shouldRunKeywordExtraction({
      messageCount: 1,
      localQuery: 'test query',
      latestText: 'What is Astro?',
    })).toBe(false);
  });

  it('should return false for two-turn conversations', () => {
    expect(shouldRunKeywordExtraction({
      messageCount: 2,
      localQuery: 'test query',
      latestText: 'What is Astro?',
    })).toBe(false);
  });

  it('should return false for short messages', () => {
    expect(shouldRunKeywordExtraction({
      messageCount: 5,
      localQuery: '',
      latestText: '短消息',
    })).toBe(false);
  });

  it('should return false when local query has enough tokens', () => {
    expect(shouldRunKeywordExtraction({
      messageCount: 5,
      localQuery: 'astro framework features',
      latestText: 'What are the features of Astro framework?',
    })).toBe(false);
  });

  it('should return true for multi-turn ambiguous queries', () => {
    expect(shouldRunKeywordExtraction({
      messageCount: 5,
      localQuery: 'it',
      latestText: 'Can you explain more about it?',
    })).toBe(true);
  });

  it('should return true when local query has few tokens in long conversation', () => {
    expect(shouldRunKeywordExtraction({
      messageCount: 5,
      localQuery: 'test',
      latestText: 'Can you tell me more about the deployment process?',
    })).toBe(true);
  });
});
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ArticleContext, ProjectContext } from '../search/types.js';

vi.mock('../search/search-api.js', () => ({
  searchArticles: vi.fn(() => [] as ArticleContext[]),
  searchProjects: vi.fn(() => [] as ProjectContext[]),
}));

import { searchArticles, searchProjects } from '../search/search-api.js';
import { allTools, getClientSideTools, getServerSideTools, searchArticlesTool } from './action-tools.js';

interface ToolLike {
  description?: string;
  inputSchema: unknown;
  execute?: (input: unknown, options: unknown) => unknown;
}

function assertToolShape(t: ToolLike): void {
  expect(typeof t.description).toBe('string');
  expect(t.description?.length).toBeGreaterThan(0);
  expect(t.inputSchema).toBeDefined();
  expect(t.inputSchema !== null && typeof t.inputSchema === 'object').toBe(true);
}

function isToolLike(value: unknown): value is ToolLike {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  if (!('description' in value) || !('inputSchema' in value)) {
    return false;
  }
  const { description, inputSchema } = value;
  return (
    typeof description === 'string' &&
    description.length > 0 &&
    inputSchema !== undefined &&
    inputSchema !== null &&
    typeof inputSchema === 'object'
  );
}

function isAsyncIterable(value: unknown): value is AsyncIterable<unknown> {
  return value !== null && typeof value === 'object' && Symbol.asyncIterator in value;
}

describe('action-tools', () => {
  describe('tool definitions', () => {
    it('all exported tools have description and inputSchema', () => {
      for (const t of Object.values(allTools)) {
        expect(isToolLike(t)).toBe(true);
        if (isToolLike(t)) {
          assertToolShape(t);
        }
      }
    });

    it('allTools contains exactly 7 tools with expected keys', () => {
      expect(Object.keys(allTools).sort()).toEqual(
        [
          'highlightText',
          'navigateToArticle',
          'scrollToSection',
          'searchArticles',
          'setPreference',
          'toggleReadingMode',
          'toggleTheme',
        ].sort(),
      );
    });

    it('getClientSideTools returns 6 tools and those entries have no execute', () => {
      const names = getClientSideTools();
      expect(names).toHaveLength(6);
      expect(new Set(names).size).toBe(6);
      for (const name of names) {
        const t = allTools[name];
        expect(t).toBeDefined();
        expect(typeof t.execute).toBe('undefined');
      }
    });

    it('getServerSideTools returns only searchArticles with execute', () => {
      expect(getServerSideTools()).toEqual(['searchArticles']);
      const t = allTools.searchArticles;
      expect(typeof t.execute).toBe('function');
    });
  });

  describe('searchArticlesTool.execute', () => {
    beforeEach(() => {
      vi.mocked(searchArticles).mockReset();
      vi.mocked(searchProjects).mockReset();
    });

    const mockArticles: ArticleContext[] = Array.from({ length: 10 }, (_, i) => ({
      title: `Post ${i}`,
      url: `/p/${i}`,
      summary: `Summary ${i}`.repeat(40),
      keyPoints: [`k${i}`],
      categories: ['c'],
      dateTime: 1_700_000_000 + i,
      score: 10 - i,
    }));

    const mockProjects: ProjectContext[] = Array.from({ length: 5 }, (_, i) => ({
      name: `Proj ${i}`,
      url: `/proj/${i}`,
      description: `Desc ${i}`,
    }));

    const execOpts = { toolCallId: 'tc1', messages: [] };

    it('returns articles and projects in the expected shape', async () => {
      vi.mocked(searchArticles).mockReturnValue(mockArticles);
      vi.mocked(searchProjects).mockReturnValue(mockProjects);

      const execute = searchArticlesTool.execute;
      if (execute === undefined) {
        throw new Error('searchArticlesTool.execute is required');
      }
      const raw = await execute(
        { query: 'astro', limit: 5, includeProjects: true },
        { ...execOpts, messages: [] },
      );
      if (isAsyncIterable(raw)) {
        throw new Error('expected plain object result');
      }
      const out = raw;

      expect(out.articles).toHaveLength(5);
      expect(out.articles[0]).toMatchObject({
        title: 'Post 0',
        url: '/p/0',
        categories: ['c'],
        tags: [],
        keyPoints: ['k0'],
        lang: 'zh',
        score: 10,
      });
      expect(out.articles[0]?.excerpt.length).toBeLessThanOrEqual(200);

      expect(out.projects).toHaveLength(3);
      expect(out.projects[0]).toMatchObject({
        name: 'Proj 0',
        url: '/proj/0',
      });
      expect(out.projects[0]?.description.length).toBeLessThanOrEqual(200);

      expect(searchArticles).toHaveBeenCalledWith('astro');
      expect(searchProjects).toHaveBeenCalledWith('astro');
    });

    it('respects limit parameter for articles', async () => {
      vi.mocked(searchArticles).mockReturnValue(mockArticles);
      vi.mocked(searchProjects).mockReturnValue([]);

      const execute = searchArticlesTool.execute;
      if (execute === undefined) {
        throw new Error('searchArticlesTool.execute is required');
      }
      const raw = await execute(
        { query: 'q', limit: 2, includeProjects: false },
        { ...execOpts, messages: [] },
      );
      if (isAsyncIterable(raw)) {
        throw new Error('expected plain object result');
      }
      expect(raw.articles).toHaveLength(2);
      expect(raw.projects).toEqual([]);
    });

    it('handles empty search results', async () => {
      vi.mocked(searchArticles).mockReturnValue([]);
      vi.mocked(searchProjects).mockReturnValue([]);

      const execute = searchArticlesTool.execute;
      if (execute === undefined) {
        throw new Error('searchArticlesTool.execute is required');
      }
      const raw = await execute(
        { query: 'nothing', limit: 5, includeProjects: true },
        { ...execOpts, messages: [] },
      );
      if (isAsyncIterable(raw)) {
        throw new Error('expected plain object result');
      }
      expect(raw).toEqual({ articles: [], projects: [] });
    });

    it('does not call searchProjects when includeProjects is false', async () => {
      vi.mocked(searchArticles).mockReturnValue(mockArticles.slice(0, 1));

      const execute = searchArticlesTool.execute;
      if (execute === undefined) {
        throw new Error('searchArticlesTool.execute is required');
      }
      await execute({ query: 'x', limit: 5, includeProjects: false }, { ...execOpts, messages: [] });

      expect(searchProjects).not.toHaveBeenCalled();
    });
  });
});

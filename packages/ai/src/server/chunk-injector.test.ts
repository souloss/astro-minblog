import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ArticleContext, ArticleChunk } from "../search/types.js";
import type { ArticleWithChunks, ChunkMatchResult } from "../search/hybrid-search.js";
import type { ChatContext } from "./types.js";

// ── Mocks ────────────────────────────────────────────────────────

const mockGetArticleChunks = vi.fn();
vi.mock("../search/index.js", () => ({
  getArticleChunks: (...args: unknown[]) => mockGetArticleChunks(...args),
}));

const mockSelectRelevantChunks = vi.fn();
const mockExpandChunkMatchesWithNeighbors = vi.fn();
const mockFormatChunksForInjection = vi.fn();
vi.mock("../search/hybrid-search.js", () => ({
  selectRelevantChunks: (...args: unknown[]) => mockSelectRelevantChunks(...args),
  expandChunkMatchesWithNeighbors: (...args: unknown[]) =>
    mockExpandChunkMatchesWithNeighbors(...args),
  formatChunksForInjection: (...args: unknown[]) =>
    mockFormatChunksForInjection(...args),
}));

const mockClassifyQueryScope = vi.fn();
vi.mock("./scope-classifier.js", () => ({
  classifyQueryScope: (...args: unknown[]) => mockClassifyQueryScope(...args),
}));

const mockFilterNewChunks = vi.fn();
const mockMarkAsInjected = vi.fn();
vi.mock("../cache/injection-cache.js", () => ({
  injectionCache: {
    filterNewChunks: (...args: unknown[]) => mockFilterNewChunks(...args),
    markAsInjected: (...args: unknown[]) => mockMarkAsInjected(...args),
  },
}));

const mockExtractQuotedCandidate = vi.fn();
vi.mock("./article-ranking.js", () => ({
  extractQuotedCandidate: (...args: unknown[]) =>
    mockExtractQuotedCandidate(...args),
}));

const mockExtractCodeAnchors = vi.fn();
vi.mock("../utils/text.js", () => ({
  extractCodeAnchors: (...args: unknown[]) => mockExtractCodeAnchors(...args),
  normalizeText: (s: string) => s.toLowerCase().trim(),
}));

// ── Fixtures ─────────────────────────────────────────────────────

function makeChunk(id: string, content: string, overrides: Partial<ArticleChunk> = {}) {
  return {
    id,
    postId: "zh/test-article",
    headers: {},
    content,
    tokenCount: Math.ceil(content.length / 2),
    position: 0,
    heading: "",
    ...overrides,
  };
}

function makeArticleWithChunks(
  overrides: Partial<ArticleWithChunks> = {}
): ArticleWithChunks {
  return {
    id: "zh/test-article",
    title: "Test Article",
    url: "/zh/posts/test-article/",
    lang: "zh",
    keyPoints: [],
    categories: [],
    dateTime: 0,
    chunks: [makeChunk("c1", "chunk 1 content"), makeChunk("c2", "chunk 2 content")],
    ...overrides,
  };
}

function makeChunkMatch(chunk: ArticleChunk, score = 1.0): ChunkMatchResult {
  return {
    article: makeArticleWithChunks(),
    chunk,
    score,
  };
}

function makeGlobalContext(): ChatContext {
  return { scope: "global" };
}

function makeArticleContext(): ChatContext {
  return {
    scope: "article",
    article: {
      slug: "test-article",
      title: "Test Article",
      summary: "A test article",
      keyPoints: ["point 1"],
      categories: ["test"],
    },
  };
}

// Import after mocks are set up
const { selectAndInjectChunks } = await import("./chunk-injector.js");

// ── Tests ────────────────────────────────────────────────────────

describe("chunk-injector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExtractCodeAnchors.mockReturnValue([]);
    mockClassifyQueryScope.mockReturnValue("global");
    mockGetArticleChunks.mockReturnValue(undefined);
    mockExtractQuotedCandidate.mockReturnValue("");
    mockFormatChunksForInjection.mockReturnValue("formatted chunks");
    mockFilterNewChunks.mockImplementation((_key: string, chunks: Array<{ id: string }>) => chunks);
    // Default: selectRelevantChunks returns empty array
    mockSelectRelevantChunks.mockReturnValue([]);
    // Default: expandChunkMatchesWithNeighbors returns input unchanged
    mockExpandChunkMatchesWithNeighbors.mockImplementation(
      (matches: ChunkMatchResult[]) => matches
    );
  });

  describe("global scope", () => {
    it("returns empty result when no articles with chunks", async () => {
      const result = await selectAndInjectChunks({
        latestText: "hello",
        context: makeGlobalContext(),
        lang: "zh",
        env: {},
        cacheKey: null,
        relatedArticles: [],
      });
      expect(result.chunksSection).toBe("");
      expect(result.selectedSources).toEqual([]);
      expect(result.preferInjectedChunks).toBe(false);
    });

    it("returns chunks when articles have matching chunks", async () => {
      const article = makeArticleWithChunks();
      const chunkMatch = makeChunkMatch(article.chunks![0], 0.9);
      mockSelectRelevantChunks.mockReturnValue([chunkMatch]);

      const result = await selectAndInjectChunks({
        latestText: "chunk content",
        context: makeGlobalContext(),
        lang: "zh",
        env: {},
        cacheKey: null,
        relatedArticles: [article],
      });

      expect(mockSelectRelevantChunks).toHaveBeenCalled();
      expect(result.chunksSection).toBe("formatted chunks");
    });

    it("returns empty when matched but no new chunks from cache", async () => {
      const article = makeArticleWithChunks();
      const chunkMatch = makeChunkMatch(article.chunks![0], 0.9);
      mockSelectRelevantChunks.mockReturnValue([chunkMatch]);
      mockFilterNewChunks.mockReturnValue([]);

      const result = await selectAndInjectChunks({
        latestText: "chunk content",
        context: makeGlobalContext(),
        lang: "zh",
        env: {},
        cacheKey: "session-key",
        relatedArticles: [article],
      });

      expect(result.chunksSection).toBe("");
    });
  });

  describe("article scope", () => {
    it("uses article-local scope for article context", async () => {
      mockClassifyQueryScope.mockReturnValue("article-local");
      const chunks = [makeChunk("c1", "content paragraph", { position: 0 })];
      mockGetArticleChunks.mockReturnValue(chunks);

      const result = await selectAndInjectChunks({
        latestText: "tell me about this article",
        context: makeArticleContext(),
        lang: "zh",
        env: { SITE_URL: "https://example.com" },
        cacheKey: null,
        relatedArticles: [],
      });

      expect(mockClassifyQueryScope).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("sets preferInjectedChunks true when article scope produces chunks", async () => {
      mockClassifyQueryScope.mockReturnValue("global");
      const chunks = [makeChunk("c1", "content")];
      const article = makeArticleWithChunks({ chunks });
      mockGetArticleChunks.mockReturnValue(chunks);
      mockSelectRelevantChunks.mockReturnValue([makeChunkMatch(chunks[0])]);
      mockFormatChunksForInjection.mockReturnValue("formatted chunks");

      const result = await selectAndInjectChunks({
        latestText: "query",
        context: makeArticleContext(),
        lang: "zh",
        env: { SITE_URL: "https://example.com" },
        cacheKey: null,
        relatedArticles: [],
      });

      expect(result.preferInjectedChunks).toBe(true);
    });

    it("handles article slug not found in chunks gracefully", async () => {
      mockClassifyQueryScope.mockReturnValue("global");
      mockGetArticleChunks.mockReturnValue(undefined);

      const result = await selectAndInjectChunks({
        latestText: "some query",
        context: makeArticleContext(),
        lang: "zh",
        env: {},
        cacheKey: null,
        relatedArticles: [],
      });

      expect(result).toBeDefined();
      expect(result.preferInjectedChunks).toBe(false);
    });

    it("handles positional hint: 段落 5 with article-local scope", async () => {
      mockClassifyQueryScope.mockReturnValue("article-local");
      const chunks = Array.from({ length: 10 }, (_, i) =>
        makeChunk(`c${i}`, `paragraph ${i} content`, { position: i })
      );
      mockGetArticleChunks.mockReturnValue(chunks);

      const result = await selectAndInjectChunks({
        latestText: "请解释段落 5 的内容",
        context: makeArticleContext(),
        lang: "zh",
        env: { SITE_URL: "https://example.com" },
        cacheKey: null,
        relatedArticles: [],
      });

      expect(mockGetArticleChunks).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("handles positional hint: 文章末尾", async () => {
      mockClassifyQueryScope.mockReturnValue("article-local");
      const chunks = Array.from({ length: 8 }, (_, i) =>
        makeChunk(`c${i}`, `content ${i}`, { position: i })
      );
      mockGetArticleChunks.mockReturnValue(chunks);

      const result = await selectAndInjectChunks({
        latestText: "文章末尾讲了什么",
        context: makeArticleContext(),
        lang: "zh",
        env: { SITE_URL: "https://example.com" },
        cacheKey: null,
        relatedArticles: [],
      });

      expect(mockGetArticleChunks).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("handles positional hint: 文章开头", async () => {
      mockClassifyQueryScope.mockReturnValue("article-local");
      const chunks = Array.from({ length: 8 }, (_, i) =>
        makeChunk(`c${i}`, `content ${i}`, { position: i })
      );
      mockGetArticleChunks.mockReturnValue(chunks);

      const result = await selectAndInjectChunks({
        latestText: "文章开头说了什么",
        context: makeArticleContext(),
        lang: "zh",
        env: { SITE_URL: "https://example.com" },
        cacheKey: null,
        relatedArticles: [],
      });

      expect(mockGetArticleChunks).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe("cache integration", () => {
    it("calls filterNewChunks with session cache key", async () => {
      const article = makeArticleWithChunks();
      const chunkMatch = makeChunkMatch(article.chunks![0], 0.9);
      mockSelectRelevantChunks.mockReturnValue([chunkMatch]);

      await selectAndInjectChunks({
        latestText: "query",
        context: makeGlobalContext(),
        lang: "zh",
        env: {},
        cacheKey: "session-123",
        relatedArticles: [article],
      });

      expect(mockFilterNewChunks).toHaveBeenCalledWith(
        "session-123",
        expect.any(Array)
      );
    });

    it("calls markAsInjected after successful injection", async () => {
      const article = makeArticleWithChunks();
      const chunkMatch = makeChunkMatch(article.chunks![0], 0.9);
      mockSelectRelevantChunks.mockReturnValue([chunkMatch]);

      await selectAndInjectChunks({
        latestText: "query",
        context: makeGlobalContext(),
        lang: "zh",
        env: {},
        cacheKey: "session-123",
        relatedArticles: [article],
      });

      if (mockFilterNewChunks.mock.results[0]?.value?.length > 0) {
        expect(mockMarkAsInjected).toHaveBeenCalledWith(
          "session-123",
          expect.any(Array)
        );
      }
    });
  });

  describe("neighbor expansion", () => {
    it("expands with neighbors for short queries in article scope", async () => {
      mockClassifyQueryScope.mockReturnValue("global");
      const chunks = [makeChunk("c1", "content")];
      mockGetArticleChunks.mockReturnValue(chunks);

      const chunkMatch = makeChunkMatch(chunks[0], 0.9);
      mockSelectRelevantChunks.mockReturnValue([chunkMatch]);

      await selectAndInjectChunks({
        latestText: "short", // 5 chars <= 48
        context: makeArticleContext(),
        lang: "zh",
        env: { SITE_URL: "https://example.com" },
        cacheKey: null,
        relatedArticles: [],
      });

      expect(mockExpandChunkMatchesWithNeighbors).toHaveBeenCalled();
    });

    it("does NOT expand neighbors for long queries", async () => {
      mockClassifyQueryScope.mockReturnValue("global");
      const chunks = [makeChunk("c1", "content")];
      mockGetArticleChunks.mockReturnValue(chunks);

      const chunkMatch = makeChunkMatch(chunks[0], 0.9);
      mockSelectRelevantChunks.mockReturnValue([chunkMatch]);

      const longQuery = "this is a very long query that exceeds the forty eight character limit for neighbor expansion";
      await selectAndInjectChunks({
        latestText: longQuery,
        context: makeArticleContext(),
        lang: "zh",
        env: { SITE_URL: "https://example.com" },
        cacheKey: null,
        relatedArticles: [],
      });

      expect(mockExpandChunkMatchesWithNeighbors).not.toHaveBeenCalled();
    });
  });

  describe("edge cases", () => {
    it("handles empty related articles gracefully", async () => {
      const result = await selectAndInjectChunks({
        latestText: "hello",
        context: makeGlobalContext(),
        lang: "zh",
        env: {},
        cacheKey: null,
        relatedArticles: [],
      });
      expect(result.chunksSection).toBe("");
      expect(result.selectedSources).toEqual([]);
    });

    it("handles quoted text anchor in article-local mode", async () => {
      mockClassifyQueryScope.mockReturnValue("article-local");
      mockExtractQuotedCandidate.mockReturnValue("specific paragraph text");
      const chunks = [
        makeChunk("c0", "intro content", { position: 0 }),
        makeChunk("c1", "specific paragraph text here", { position: 1 }),
        makeChunk("c2", "more content", { position: 2 }),
      ];
      mockGetArticleChunks.mockReturnValue(chunks);

      const result = await selectAndInjectChunks({
        latestText: '请解释"specific paragraph text"是什么意思',
        context: makeArticleContext(),
        lang: "zh",
        env: { SITE_URL: "https://example.com" },
        cacheKey: null,
        relatedArticles: [],
      });

      expect(result).toBeDefined();
    });

    it("handles directional hint: 后面是什么", async () => {
      mockClassifyQueryScope.mockReturnValue("article-local");
      mockExtractQuotedCandidate.mockReturnValue("some paragraph");
      const chunks = Array.from({ length: 6 }, (_, i) =>
        makeChunk(`c${i}`, `chunk ${i} some paragraph content`, { position: i })
      );
      mockGetArticleChunks.mockReturnValue(chunks);

      const result = await selectAndInjectChunks({
        latestText: '"some paragraph"后面是什么',
        context: makeArticleContext(),
        lang: "zh",
        env: { SITE_URL: "https://example.com" },
        cacheKey: null,
        relatedArticles: [],
      });

      expect(result).toBeDefined();
    });
  });
});

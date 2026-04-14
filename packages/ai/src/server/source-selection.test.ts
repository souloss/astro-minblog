import { describe, it, expect } from "vitest";
import { buildFinalSources } from "./source-selection.js";
import type { SourceSelection } from "../search/types.js";
import type { ChatContext } from "./types.js";

// ── Helpers ────────────────────────────────────────────────────

function makeSource(
  overrides: Partial<SourceSelection> & { title: string; url: string }
): SourceSelection {
  return {
    lang: "zh",
    reason: "retrieval-fallback",
    score: 0.5,
    ...overrides,
  };
}

function makeArticle(
  overrides: Partial<{
    id: string;
    title: string;
    url: string;
    lang: string;
    summary: string;
    keyPoints: string[];
    categories: string[];
    dateTime: number;
    score: number;
  }> = {}
) {
  return {
    id: overrides.id ?? "test-1",
    title: overrides.title ?? "测试文章",
    url: overrides.url ?? "/zh/posts/test-article/",
    lang: overrides.lang ?? "zh",
    summary: overrides.summary ?? "摘要",
    keyPoints: overrides.keyPoints ?? [],
    categories: overrides.categories ?? [],
    dateTime: overrides.dateTime ?? 1700000000,
    score: overrides.score ?? 0.5,
  };
}

function makeContext(slug: string, title: string): ChatContext {
  return {
    scope: "article",
    article: {
      slug,
      title,
      summary: "A test article summary",
      keyPoints: ["point1", "point2"],
      categories: ["tech"],
    },
  };
}

function buildArgs(
  overrides: Partial<Parameters<typeof buildFinalSources>[0]> = {}
) {
  return {
    relatedArticles: [] as ReturnType<typeof makeArticle>[],
    selectedSources: [] as SourceSelection[],
    query: "测试查询",
    lang: "zh",
    max: 5,
    ...overrides,
  };
}

// A quoted string long enough (≥12 chars after normalize) to trigger
// isLikelyQuotedArticleQuery → true, enabling current-article prioritization.
const LONG_QUOTED_QUERY = '"这是一段足够长的引用文本内容关于文章讨论"';
// Cross-article intent keyword that prevents current-article prioritization.
const CROSS_ARTICLE_QUERY = "推荐类似的文章";
// Article summary query.
const ARTICLE_SUMMARY_QUERY = "这篇文章讲了什么";

// ── buildFinalSources ──────────────────────────────────────────

describe("buildFinalSources", () => {
  // ── Basic functionality ─────────────────────────────────────

  it("should return empty array when no sources and no articles", () => {
    const result = buildFinalSources(
      buildArgs({ relatedArticles: [], selectedSources: [] })
    );
    expect(result).toEqual([]);
  });

  it("should return single source when only one provided", () => {
    const sources = [
      makeSource({ title: "Solo Article", url: "/posts/solo/" }),
    ];
    const result = buildFinalSources(buildArgs({ selectedSources: sources }));
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Solo Article");
  });

  it("should use selectedSources when available", () => {
    const sources = [
      makeSource({
        title: "Selected A",
        url: "/posts/selected-a/",
        reason: "chunk",
        score: 0.9,
      }),
    ];
    const result = buildFinalSources(
      buildArgs({
        selectedSources: sources,
        relatedArticles: [makeArticle({ title: "Fallback" })],
      })
    );
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Selected A");
    expect(result[0].reason).toBe("chunk");
  });

  it("should fall back to relatedArticles when selectedSources is empty", () => {
    const articles = [
      makeArticle({ title: "Article A", url: "/zh/posts/a/", score: 0.8 }),
      makeArticle({ title: "Article B", url: "/zh/posts/b/", score: 0.6 }),
    ];
    const result = buildFinalSources(
      buildArgs({ selectedSources: [], relatedArticles: articles })
    );
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].reason).toBe("retrieval-fallback");
    expect(result[0].title).toBe("Article A");
  });

  // ── Deduplication ───────────────────────────────────────────

  it("should deduplicate sources by title::url", () => {
    const sources = [
      makeSource({ title: "Same Title", url: "/same/", score: 0.9 }),
      makeSource({ title: "Same Title", url: "/same/", score: 0.7 }),
      makeSource({ title: "Different", url: "/different/", score: 0.8 }),
    ];
    const result = buildFinalSources(buildArgs({ selectedSources: sources }));
    expect(result).toHaveLength(2);
  });

  it("should collapse all identical title+url items into one", () => {
    const sources = Array.from({ length: 5 }, () =>
      makeSource({ title: "Same Article", url: "/posts/same/" })
    );
    const result = buildFinalSources(buildArgs({ selectedSources: sources }));
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Same Article");
  });

  it("should keep sources with same title but different URLs", () => {
    const sources = [
      makeSource({ title: "Guide", url: "/zh/posts/guide/", lang: "zh" }),
      makeSource({ title: "Guide", url: "/en/posts/guide/", lang: "en" }),
    ];
    const result = buildFinalSources(
      buildArgs({ selectedSources: sources, query: "guide" })
    );
    expect(result).toHaveLength(2);
  });

  it("should filter out sources with empty title", () => {
    const sources = [
      makeSource({ title: "", url: "/empty-title/" }),
      makeSource({ title: "Valid", url: "/valid/" }),
    ];
    const result = buildFinalSources(
      buildArgs({
        selectedSources: sources,
        query: "test query with multiple tokens",
      })
    );
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Valid");
  });

  it("should filter out sources with whitespace-only title", () => {
    const sources = [
      makeSource({ title: "   ", url: "/whitespace/" }),
      makeSource({ title: "Valid", url: "/valid/" }),
    ];
    const result = buildFinalSources(
      buildArgs({
        selectedSources: sources,
        query: "test query with multiple tokens",
      })
    );
    expect(result).toHaveLength(1);
  });

  it("should filter out sources with empty URL", () => {
    const sources = [
      makeSource({ title: "No URL", url: "" }),
      makeSource({ title: "Has URL", url: "/has-url/" }),
    ];
    const result = buildFinalSources(
      buildArgs({
        selectedSources: sources,
        query: "test query with multiple tokens",
      })
    );
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Has URL");
  });

  // ── Max limit ───────────────────────────────────────────────

  it("should respect the max limit", () => {
    const articles = Array.from(
      { length: 10 },
      (_, i) =>
        makeArticle({
          title: `Article ${i}`,
          url: `/zh/posts/article-${i}/`,
          score: 1 - i * 0.05,
        })
    );
    const result = buildFinalSources(
      buildArgs({ relatedArticles: articles, max: 3 })
    );
    expect(result).toHaveLength(3);
  });

  it("should return fewer than max when insufficient unique sources", () => {
    const sources = [
      makeSource({ title: "A", url: "/a/" }),
      makeSource({ title: "A", url: "/a/" }),
    ];
    const result = buildFinalSources(
      buildArgs({ selectedSources: sources, max: 5 })
    );
    expect(result).toHaveLength(1);
  });

  it("should respect max limit in current article prioritization path", () => {
    const sources = [
      makeSource({
        title: "My Post",
        url: "/zh/posts/my-post/",
        reason: "chunk",
        chunkId: "c1",
      }),
      makeSource({
        title: "My Post",
        url: "/zh/posts/my-post/",
        reason: "chunk",
        chunkId: "c2",
      }),
      makeSource({
        title: "My Post",
        url: "/zh/posts/my-post/",
        reason: "evidence",
      }),
      ...Array.from(
        { length: 10 },
        (_, i) =>
          makeSource({
            title: `Other ${i}`,
            url: `/zh/posts/other-${i}/`,
            score: 10 - i,
          })
      ),
    ];
    const result = buildFinalSources(
      buildArgs({
        selectedSources: sources,
        query: LONG_QUOTED_QUERY,
        max: 3,
        articleSlug: "my-post",
        context: makeContext("my-post", "My Post"),
      })
    );
    expect(result).toHaveLength(3);
  });

  // ── Language filtering ──────────────────────────────────────

  it("should prioritize same-language sources", () => {
    const sources = [
      makeSource({
        title: "English Article",
        url: "/en/posts/eng/",
        lang: "en",
        score: 0.9,
      }),
      makeSource({
        title: "中文文章",
        url: "/zh/posts/chn/",
        lang: "zh",
        score: 0.5,
      }),
    ];
    const result = buildFinalSources(
      buildArgs({ selectedSources: sources, lang: "zh", query: "中文文章" })
    );
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].lang).toBe("zh");
  });

  it("should include cross-language sources when same-lang insufficient", () => {
    const sources = [
      makeSource({
        title: "English Article",
        url: "/en/posts/eng/",
        lang: "en",
        score: 0.9,
      }),
      makeSource({
        title: "中文文章",
        url: "/zh/posts/chn/",
        lang: "zh",
        score: 0.5,
      }),
    ];
    const result = buildFinalSources(
      buildArgs({ selectedSources: sources, lang: "zh", max: 5, query: "测试" })
    );
    expect(result.length).toBe(2);
  });

  // ── Current article prioritization ──────────────────────────
  // Requires: articleSlug + context.scope === "article" +
  //           isLikelyQuotedArticleQuery(query) + !isCrossArticleIntent(query)

  it("should prioritize current article when scope=article + long quoted query", () => {
    const sources = [
      makeSource({
        title: "Other Article",
        url: "/zh/posts/other-article/",
        score: 10,
      }),
      makeSource({
        title: "Current Article",
        url: "/zh/posts/my-post/",
        score: 3,
      }),
    ];
    const result = buildFinalSources(
      buildArgs({
        selectedSources: sources,
        query: LONG_QUOTED_QUERY,
        max: 10,
        articleSlug: "my-post",
        context: makeContext("my-post", "Current Article"),
      })
    );
    expect(result.some(s => s.url?.includes("my-post"))).toBe(true);
  });

  it("should order chunk sources before non-chunk for current article", () => {
    const sources = [
      makeSource({
        title: "My Post",
        url: "/zh/posts/my-post/",
        reason: "evidence",
        score: 5,
      }),
      makeSource({
        title: "My Post",
        url: "/zh/posts/my-post/",
        reason: "chunk",
        chunkId: "chunk-1",
        score: 8,
      }),
      makeSource({
        title: "Other Post",
        url: "/zh/posts/other/",
        score: 10,
      }),
    ];
    const result = buildFinalSources(
      buildArgs({
        selectedSources: sources,
        query: LONG_QUOTED_QUERY,
        max: 10,
        articleSlug: "my-post",
        context: makeContext("my-post", "My Post"),
      })
    );
    expect(result[0].reason).toBe("chunk");
    expect(result[0].chunkId).toBe("chunk-1");
  });

  it("should deduplicate by title::url::chunkId in prioritization path", () => {
    const sources = [
      makeSource({
        title: "My Post",
        url: "/zh/posts/my-post/",
        reason: "chunk",
        chunkId: "chunk-1",
      }),
      makeSource({
        title: "My Post",
        url: "/zh/posts/my-post/",
        reason: "chunk",
        chunkId: "chunk-1",
      }),
      makeSource({
        title: "My Post",
        url: "/zh/posts/my-post/",
        reason: "chunk",
        chunkId: "chunk-2",
      }),
    ];
    const result = buildFinalSources(
      buildArgs({
        selectedSources: sources,
        query: LONG_QUOTED_QUERY,
        max: 10,
        articleSlug: "my-post",
        context: makeContext("my-post", "My Post"),
      })
    );
    const chunk1Count = result.filter(s => s.chunkId === "chunk-1").length;
    expect(chunk1Count).toBe(1);
    expect(result).toHaveLength(2);
  });

  it("should NOT prioritize current article when scope is global", () => {
    const sources = [
      makeSource({
        title: "Other Article",
        url: "/zh/posts/other/",
        score: 10,
      }),
      makeSource({
        title: "My Post",
        url: "/zh/posts/my-post/",
        score: 3,
      }),
    ];
    const globalContext: ChatContext = { scope: "global" };
    const result = buildFinalSources(
      buildArgs({
        selectedSources: sources,
        query: LONG_QUOTED_QUERY,
        max: 10,
        articleSlug: "my-post",
        context: globalContext,
      })
    );
    expect(result[0].title).toBe("Other Article");
  });

  it("should NOT prioritize current article for cross-article intent query", () => {
    const sources = [
      makeSource({
        title: "Other Article",
        url: "/zh/posts/other/",
        score: 10,
      }),
      makeSource({
        title: "My Post",
        url: "/zh/posts/my-post/",
        score: 3,
      }),
    ];
    const result = buildFinalSources(
      buildArgs({
        selectedSources: sources,
        query: CROSS_ARTICLE_QUERY,
        max: 10,
        articleSlug: "my-post",
        context: makeContext("my-post", "My Post"),
      })
    );
    expect(result[0].title).toBe("Other Article");
  });

  it("should NOT prioritize current article when no articleSlug provided", () => {
    const sources = [
      makeSource({
        title: "Other Article",
        url: "/zh/posts/other/",
        score: 10,
      }),
      makeSource({
        title: "My Post",
        url: "/zh/posts/my-post/",
        score: 3,
      }),
    ];
    const result = buildFinalSources(
      buildArgs({
        selectedSources: sources,
        query: LONG_QUOTED_QUERY,
        max: 10,
        context: makeContext("my-post", "My Post"),
      })
    );
    expect(result[0].title).toBe("Other Article");
  });

  // ── Article summary query ───────────────────────────────────

  it("should include cross-language sources for article summary query when same-lang < max", () => {
    const sources = [
      makeSource({
        title: "Chinese Summary",
        url: "/zh/posts/zh-summary/",
        lang: "zh",
        score: 5,
      }),
      makeSource({
        title: "English Summary",
        url: "/en/posts/en-summary/",
        lang: "en",
        score: 10,
      }),
    ];
    const result = buildFinalSources(
      buildArgs({
        selectedSources: sources,
        query: ARTICLE_SUMMARY_QUERY,
        lang: "zh",
        max: 10,
      })
    );
    expect(result.length).toBe(2);
  });

  // ── Title closeness ranking ─────────────────────────────────

  it("should rank sources with title-matching tokens higher", () => {
    const sources = [
      makeSource({
        title: "Unrelated Topic",
        url: "/zh/posts/unrelated/",
        lang: "zh",
        score: 10,
      }),
      makeSource({
        title: "TypeScript 类型系统详解",
        url: "/zh/posts/ts-types/",
        lang: "zh",
        score: 5,
      }),
    ];
    const result = buildFinalSources(
      buildArgs({ selectedSources: sources, query: "TypeScript 类型系统" })
    );
    expect(result[0].title).toContain("TypeScript");
  });

  it("should give bonus for 技术架构 keyword match in title", () => {
    const sources = [
      makeSource({
        title: "项目技术架构设计",
        url: "/zh/posts/arch/",
        lang: "zh",
        score: 0.3,
      }),
      makeSource({
        title: "随机文章",
        url: "/zh/posts/random/",
        lang: "zh",
        score: 0.9,
      }),
    ];
    const result = buildFinalSources(
      buildArgs({ selectedSources: sources, query: "技术架构" })
    );
    expect(result[0].title).toBe("项目技术架构设计");
  });

  it("should give bonus for 模块 keyword match in title", () => {
    const sources = [
      makeSource({
        title: "模块化设计原则",
        url: "/zh/posts/modular/",
        lang: "zh",
        score: 0.3,
      }),
      makeSource({
        title: "其他设计",
        url: "/zh/posts/other/",
        lang: "zh",
        score: 0.9,
      }),
    ];
    const result = buildFinalSources(
      buildArgs({ selectedSources: sources, query: "模块设计" })
    );
    expect(result[0].title).toBe("模块化设计原则");
  });
});

import { describe, it, expect } from "vitest";
import {
  extractQuotedCandidate,
  isLikelyQuotedArticleQuery,
  isCrossArticleIntent,
  isArticleSummaryQuery,
  rerankArticlesForCurrentArticleQuote,
  shapeArticlesForQuery,
} from "./article-ranking.js";
import type { ArticleContext } from "../search/types.js";
import type { ChatContext } from "./types.js";

// ── Helper: create a mock article ──────────────────────────────

function createArticle(
  id: string,
  title: string,
  score: number,
  extra: Partial<ArticleContext> = {}
): ArticleContext {
  return {
    id,
    title,
    url: `/posts/${id}`,
    summary: "",
    keyPoints: [],
    categories: [],
    dateTime: Date.now(),
    score,
    ...extra,
  };
}

function createContext(slug: string, title: string): ChatContext {
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

// ── extractQuotedCandidate ─────────────────────────────────────

describe("extractQuotedCandidate", () => {
  it("should extract double-quoted text", () => {
    expect(extractQuotedCandidate('"hello world" is great')).toBe(
      "hello world"
    );
  });

  it("should extract Chinese angle-bracket quoted text 「」", () => {
    expect(extractQuotedCandidate("「这是引用内容」")).toBe("这是引用内容");
  });

  it("should extract Chinese angle-bracket quoted text 『』", () => {
    expect(extractQuotedCandidate("『这是引用内容』")).toBe("这是引用内容");
  });

  it("should extract Chinese double angle-bracket quoted text 《》", () => {
    expect(extractQuotedCandidate("《文章标题》怎么样")).toBe("文章标题");
  });

  it("should return the longest quoted text when multiple exist", () => {
    const result = extractQuotedCandidate(
      '"short" and "this is a longer quote"'
    );
    expect(result).toBe("this is a longer quote");
  });

  it("should return empty string for text without quotes", () => {
    expect(extractQuotedCandidate("no quotes here")).toBe("");
  });

  it("should return empty string for empty input", () => {
    expect(extractQuotedCandidate("")).toBe("");
  });

  it("should return empty string for whitespace-only input", () => {
    expect(extractQuotedCandidate("   ")).toBe("");
  });

  it("should handle curly/smart quotes", () => {
    expect(extractQuotedCandidate("\u201Chello world\u201D")).toBe(
      "hello world"
    );
  });
});

// ── isLikelyQuotedArticleQuery ─────────────────────────────────

describe("isLikelyQuotedArticleQuery", () => {
  it("should return true for long enough quoted text", () => {
    // Need 12+ chars after normalizeText
    expect(isLikelyQuotedArticleQuery('"这是一段足够长的引用文本"')).toBe(true);
  });

  it("should return false for short quoted text", () => {
    expect(isLikelyQuotedArticleQuery('"hi"')).toBe(false);
  });

  it("should return false for text without quotes", () => {
    expect(isLikelyQuotedArticleQuery("plain text without quotes")).toBe(false);
  });

  it("should return false for empty string", () => {
    expect(isLikelyQuotedArticleQuery("")).toBe(false);
  });

  it("should return true for English quoted text of sufficient length", () => {
    expect(
      isLikelyQuotedArticleQuery('"this is a long enough quote text"')
    ).toBe(true);
  });
});

// ── isCrossArticleIntent ───────────────────────────────────────

describe("isCrossArticleIntent", () => {
  it("should return true for '类似的'", () => {
    expect(isCrossArticleIntent("有没有类似的文章")).toBe(true);
  });

  it("should return true for '推荐'", () => {
    expect(isCrossArticleIntent("推荐一些技术文章")).toBe(true);
  });

  it("should return true for '对比'", () => {
    expect(isCrossArticleIntent("对比一下这两个方案")).toBe(true);
  });

  it("should return true for 'compare'", () => {
    expect(isCrossArticleIntent("compare React and Vue")).toBe(true);
  });

  it("should return true for 'recommend'", () => {
    expect(isCrossArticleIntent("can you recommend some posts")).toBe(true);
  });

  it("should return true for 'related'", () => {
    expect(isCrossArticleIntent("related articles about Astro")).toBe(true);
  });

  it("should return false for plain questions without cross-article signals", () => {
    expect(isCrossArticleIntent("什么是TypeScript")).toBe(false);
  });

  it("should return false for empty string", () => {
    expect(isCrossArticleIntent("")).toBe(false);
  });

  it("should return false when query has a long quoted text (takes priority as article-quote)", () => {
    // isLikelyQuotedArticleQuery returns true for long quoted text,
    // which makes isCrossArticleIntent return false
    expect(isCrossArticleIntent('"这是一段足够长的引用文本内容"')).toBe(false);
  });
});

// ── isArticleSummaryQuery ──────────────────────────────────────

describe("isArticleSummaryQuery", () => {
  it("should return true for '这篇文章'", () => {
    expect(isArticleSummaryQuery("这篇文章怎么样")).toBe(true);
  });

  it("should return true for '主要讲了什么'", () => {
    expect(isArticleSummaryQuery("主要讲了什么")).toBe(true);
  });

  it("should return true for 'article summary'", () => {
    expect(isArticleSummaryQuery("give me an article summary")).toBe(true);
  });

  it("should return true for 'what is this article about'", () => {
    expect(isArticleSummaryQuery("what is this article about")).toBe(true);
  });

  it("should return false for non-summary queries", () => {
    expect(isArticleSummaryQuery("how to deploy")).toBe(false);
  });

  it("should return false for empty string", () => {
    expect(isArticleSummaryQuery("")).toBe(false);
  });
});

// ── rerankArticlesForCurrentArticleQuote ───────────────────────

describe("rerankArticlesForCurrentArticleQuote", () => {
  const articles: ArticleContext[] = [
    createArticle("other-post", "Other Post", 10),
    createArticle("my-post", "My Current Post", 5),
    createArticle("third-post", "Third Post", 3),
  ];

  it("should boost current article when quoted text is present", () => {
    const result = rerankArticlesForCurrentArticleQuote(
      '"这是一段足够长的引用文本内容"',
      articles,
      {
        articleSlug: "my-post",
        context: createContext("my-post", "My Current Post"),
      }
    );
    const currentArticle = result.find(a => a.id === "my-post");
    // Score should be boosted above original 5
    expect(currentArticle!.score!).toBeGreaterThan(5);
  });

  it("should not modify articles when no article slug is provided", () => {
    const result = rerankArticlesForCurrentArticleQuote(
      '"这是一段足够长的引用文本内容"',
      articles
    );
    expect(result).toEqual(articles);
  });

  it("should not modify articles when context is not article scope", () => {
    const globalContext: ChatContext = { scope: "global" };
    const result = rerankArticlesForCurrentArticleQuote(
      '"这是一段足够长的引用文本内容"',
      articles,
      { articleSlug: "my-post", context: globalContext }
    );
    expect(result).toEqual(articles);
  });

  it("should not modify articles when query is not a quoted article query", () => {
    const result = rerankArticlesForCurrentArticleQuote(
      "what is this about",
      articles,
      {
        articleSlug: "my-post",
        context: createContext("my-post", "My Current Post"),
      }
    );
    expect(result).toEqual(articles);
  });

  it("should not modify articles for cross-article intent", () => {
    const result = rerankArticlesForCurrentArticleQuote(
      "推荐类似的文章",
      articles,
      {
        articleSlug: "my-post",
        context: createContext("my-post", "My Current Post"),
      }
    );
    expect(result).toEqual(articles);
  });

  it("should add current article as fallback if not in results", () => {
    const articlesWithoutCurrent: ArticleContext[] = [
      createArticle("other-post", "Other Post", 10),
    ];
    const result = rerankArticlesForCurrentArticleQuote(
      '"这是一段足够长的引用文本内容"',
      articlesWithoutCurrent,
      {
        articleSlug: "my-post",
        context: createContext("my-post", "My Current Post"),
      }
    );
    expect(result.some(a => a.id === "my-post")).toBe(true);
    expect(result.length).toBe(2);
  });

  it("should sort articles by score after boosting", () => {
    const result = rerankArticlesForCurrentArticleQuote(
      '"这是一段足够长的引用文本内容"',
      articles,
      {
        articleSlug: "my-post",
        context: createContext("my-post", "My Current Post"),
      }
    );
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].score!).toBeGreaterThanOrEqual(result[i].score!);
    }
  });

  it("should cap boosted score at CURRENT_ARTICLE_SCORE_CAP_RATIO of top score", () => {
    const result = rerankArticlesForCurrentArticleQuote(
      '"这是一段足够长的引用文本内容"',
      articles,
      {
        articleSlug: "my-post",
        context: createContext("my-post", "My Current Post"),
      }
    );
    const currentArticle = result.find(a => a.id === "my-post");
    // Cap is 1.08 * topScore (10) = 10.8
    expect(currentArticle!.score!).toBeLessThanOrEqual(10.8);
  });
});

// ── shapeArticlesForQuery ──────────────────────────────────────

describe("shapeArticlesForQuery", () => {
  const articles: ArticleContext[] = [
    createArticle("post-a", "Astro Framework Guide", 10, {
      summary: "A guide about Astro",
      keyPoints: ["SSG", "Islands"],
    }),
    createArticle("post-b", "React Hooks Tutorial", 8, {
      summary: "Learn React hooks",
      keyPoints: ["useState", "useEffect"],
    }),
    createArticle("post-c", "TypeScript Best Practices", 6, {
      summary: "TypeScript tips",
      keyPoints: ["types", "interfaces"],
    }),
  ];

  it("should return interpretation, budget, and shaped articles", () => {
    const result = shapeArticlesForQuery("what is Astro", articles);
    expect(result.interpretation).toBeDefined();
    expect(result.budget).toBeDefined();
    expect(result.articles).toBeDefined();
    expect(Array.isArray(result.articles)).toBe(true);
  });

  it("should limit articles according to budget", () => {
    const result = shapeArticlesForQuery("what is Astro", articles);
    expect(result.articles.length).toBeLessThanOrEqual(
      result.budget.maxArticles
    );
  });

  it("should truncate summaries according to budget", () => {
    const result = shapeArticlesForQuery("what is Astro", articles);
    for (const article of result.articles) {
      if (article.summary) {
        expect(article.summary.length).toBeLessThanOrEqual(
          result.budget.summaryMaxLength
        );
      }
    }
  });

  it("should handle empty articles array", () => {
    const result = shapeArticlesForQuery("what is Astro", []);
    expect(result.articles).toHaveLength(0);
  });

  it("should rerank for code-anchor queries", () => {
    const codeArticles: ArticleContext[] = [
      createArticle("post-a", "React Guide", 5),
      createArticle("post-b", "useState Deep Dive", 8, {
        summary: "All about the useState hook",
      }),
    ];
    const result = shapeArticlesForQuery(
      "how does `useState` work",
      codeArticles
    );
    // Article mentioning useState should be boosted by code anchor reranking
    expect(result.articles).toBeDefined();
    expect(result.articles.length).toBeGreaterThan(0);
  });

  it("should pass through current article options", () => {
    const result = shapeArticlesForQuery(
      '"这是一段足够长的引用文本内容"',
      articles,
      {
        articleSlug: "post-a",
        context: createContext("post-a", "Astro Framework Guide"),
      }
    );
    expect(result.articles).toBeDefined();
  });

  it("should handle short simple queries", () => {
    const result = shapeArticlesForQuery("测试", articles);
    expect(result.interpretation.reasoning.complexity).toBe("simple");
  });

  it("should handle long complex queries", () => {
    const longQuery =
      "can you explain the differences between server-side rendering and static site generation in the context of modern web development frameworks like Astro and Next.js";
    const result = shapeArticlesForQuery(longQuery, articles);
    expect(result.interpretation.reasoning.complexity).toBe("complex");
  });
});

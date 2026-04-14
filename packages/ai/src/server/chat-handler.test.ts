import { describe, expect, it } from "vitest";
import {
  buildFinalSources,
  buildPublicCacheContext,
  extractQuotedCandidate,
  isCrossArticleIntent,
  isLikelyQuotedArticleQuery,
  rankArticlesForQuery,
  rerankArticlesForCodeAnchors,
  rerankArticlesForCurrentArticleQuote,
  resolveSearchAnswerShaping,
  shapeArticlesForQuery,
  shapeCachedSearchForQuery,
  shapePublicCacheBranch,
  shouldUsePublicQuestionCaches,
  shouldPersistAuthoritativeSources,
  shouldPersistResponseCacheEntry,
} from "./chat-handler.js";

describe("resolveSearchAnswerShaping", () => {
  it("uses the current query semantics for count-style questions", () => {
    const result = resolveSearchAnswerShaping("有多少篇文章？");

    expect(result.interpretation.answer.contract).toBe("count");
    expect(result.budget.maxArticles).toBe(2);
    expect(result.budget.enableDeepContent).toBe(false);
  });

  it("uses the current query semantics for recommendation-style questions", () => {
    const result = resolveSearchAnswerShaping("有哪些文章推荐？");

    // "推荐" triggers recommendation mode before "哪些" triggers list mode
    expect(result.interpretation.answer.contract).toBe("recommendation");
    expect(result.budget.maxArticles).toBe(6);
  });

  it("still treats privacy-sensitive questions as unknown with constrained budget", () => {
    const result = resolveSearchAnswerShaping("你多大了？");

    expect(result.interpretation.answer.contract).toBe("unknown");
    expect(result.budget.maxArticles).toBe(2);
    expect(result.budget.enableDeepContent).toBe(false);
  });
});

describe("rankArticlesForQuery", () => {
  it("uses interpretation topic to rerank deployment articles first", () => {
    const ranked = rankArticlesForQuery("怎么部署到 Cloudflare？", [
      {
        title: "Getting Started",
        url: "/getting-started",
        keyPoints: [],
        categories: ["setup"],
        dateTime: Date.now(),
      },
      {
        title: "Deployment Guide",
        url: "/deployment-guide",
        keyPoints: [],
        categories: ["deployment"],
        dateTime: Date.now(),
      },
    ]);

    expect(ranked[0]?.title).toBe("Deployment Guide");
  });

  it("prefers exact code-anchor article matches over generic architecture articles", () => {
    const ranked = rerankArticlesForCodeAnchors(
      "当前 useChat 配置还加入了 onToolCall 后面的内容是什么",
      [
        {
          title: "AI 模块技术架构详解",
          url: "/ai-architecture",
          summary: "provider 配置与缓存策略",
          keyPoints: ["provider 配置", "缓存配置"],
          categories: ["AI"],
          dateTime: Date.now(),
          score: 10,
          chunks: [
            {
              id: "config-1",
              postId: "arch",
              heading: "Provider 配置",
              content: "这里介绍 provider 配置、缓存配置和错误处理。",
              position: 0,
              tokenCount: 20,
              headers: { H2: "Provider 配置" },
            },
          ],
        },
        {
          title: "设置面板与偏好设置",
          url: "/settings-panel",
          summary: "ChatPanel 的聊天配置与动作执行。",
          keyPoints: ["useChat", "onToolCall"],
          categories: ["UI"],
          dateTime: Date.now(),
          score: 7,
          chunks: [
            {
              id: "chat-1",
              postId: "settings",
              heading: "Chat hooks",
              content:
                "useChat 的配置中还包含 onToolCall，用于客户端动作执行。",
              position: 0,
              tokenCount: 20,
              headers: { H2: "Chat hooks" },
            },
          ],
        },
      ]
    );

    expect(ranked[0]?.title).toBe("设置面板与偏好设置");
  });
});

describe("shapeArticlesForQuery", () => {
  it("applies interpretation-driven ranking and budget together", () => {
    const result = shapeArticlesForQuery("怎么部署到 Cloudflare？", [
      {
        title: "Getting Started",
        url: "/getting-started",
        keyPoints: [],
        categories: ["setup"],
        dateTime: Date.now(),
      },
      {
        title: "Deployment Guide",
        url: "/deployment-guide",
        keyPoints: [],
        categories: ["deployment"],
        dateTime: Date.now(),
      },
      {
        title: "Another Deployment Note",
        url: "/deployment-note",
        keyPoints: [],
        categories: ["deployment"],
        dateTime: Date.now(),
      },
    ]);

    expect(result.interpretation.topic.primary).toBe("deployment");
    expect(result.articles[0]?.title).toBe("Deployment Guide");
    expect(result.articles.length).toBeLessThanOrEqual(
      result.budget.maxArticles
    );
  });

  it("boosts the current article for quoted article-mode queries", () => {
    const result = shapeArticlesForQuery(
      '请解释这句话："Use pnpm build before pnpm deploy to ensure Cloudflare Pages receives the latest assets."',
      [
        {
          id: "other-post",
          title: "Reference Note A",
          url: "/posts/reference-a",
          keyPoints: [],
          categories: ["notes"],
          dateTime: Date.now(),
          score: 9,
        },
        {
          id: "demo-post",
          title: "Current Article",
          url: "/posts/demo-post",
          keyPoints: [],
          categories: ["notes"],
          dateTime: Date.now(),
          score: 8,
        },
      ],
      {
        articleSlug: "demo-post",
        context: {
          scope: "article",
          article: { slug: "demo-post", title: "Current Article" },
        },
      }
    );

    expect(result.articles[0]?.id).toBe("demo-post");
  });

  it("does not boost the current article for cross-article queries", () => {
    const result = shapeArticlesForQuery(
      "和这个主题相关的其他文章还有哪些？",
      [
        {
          id: "other-post",
          title: "Reference Note A",
          url: "/posts/reference-a",
          keyPoints: [],
          categories: ["notes"],
          dateTime: Date.now(),
          score: 9,
        },
        {
          id: "demo-post",
          title: "Current Article",
          url: "/posts/demo-post",
          keyPoints: [],
          categories: ["notes"],
          dateTime: Date.now(),
          score: 8,
        },
      ],
      {
        articleSlug: "demo-post",
        context: {
          scope: "article",
          article: { slug: "demo-post", title: "Current Article" },
        },
      }
    );

    expect(result.articles[0]?.id).toBe("other-post");
  });
});

describe("current article quoted-query helpers", () => {
  it("extracts the longest quoted candidate", () => {
    expect(
      extractQuotedCandidate(
        "请解释“短句”和“this is the longest quoted sentence here”"
      )
    ).toBe("this is the longest quoted sentence here");
  });

  it("detects likely quoted article queries", () => {
    expect(
      isLikelyQuotedArticleQuery(
        '请解释这句话："Use pnpm build before pnpm deploy to ensure Cloudflare Pages receives the latest assets."'
      )
    ).toBe(true);
    expect(isLikelyQuotedArticleQuery("解释一下“部署”")).toBe(false);
  });

  it("detects cross-article intent", () => {
    expect(isCrossArticleIntent("这段话相关的其他文章还有哪些？")).toBe(true);
    expect(isCrossArticleIntent("请解释这句话的意思")).toBe(false);
  });

  it("appends a low-priority fallback current article only for quoted article-mode queries", () => {
    const reranked = rerankArticlesForCurrentArticleQuote(
      '请解释这句话："Use pnpm build before pnpm deploy to ensure Cloudflare Pages receives the latest assets."',
      [
        {
          id: "other-post",
          title: "Other Article",
          url: "/posts/other-post",
          keyPoints: [],
          categories: ["deployment"],
          dateTime: Date.now(),
          score: 5,
        },
      ],
      {
        articleSlug: "demo-post",
        context: {
          scope: "article",
          article: {
            slug: "demo-post",
            title: "Current Article",
            summary: "Current summary",
          },
        },
      }
    );

    expect(reranked).toHaveLength(2);
    expect(reranked[1]?.id).toBe("demo-post");
    expect(reranked[1]?.score).toBeLessThan(reranked[0]?.score ?? 0);
  });

  it("prioritizes current-article chunk sources in final sources for quoted article queries", () => {
    const result = buildFinalSources({
      relatedArticles: [
        {
          id: "deployment-guide",
          title: "部署指南：多平台部署 astro-minimax",
          url: "/zh/posts/deployment-guide/",
          keyPoints: [],
          categories: ["教程/部署"],
          dateTime: Date.now(),
          lang: "zh",
          score: 10,
        },
      ],
      selectedSources: [
        {
          title: "@astro-minimax/ai 模块技术架构详解",
          url: "/zh/posts/ai-module-architecture/",
          lang: "zh",
          reason: "chunk",
          score: 9.8,
          heading: "7.1 AIChatWidget 组件",
          snippet: "这里介绍 AIChatWidget 的挂载方式。",
        },
        {
          title: "部署指南：多平台部署 astro-minimax",
          url: "/zh/posts/deployment-guide/",
          lang: "zh",
          reason: "chunk",
          score: 8.5,
          heading: "Cloudflare Pages（推荐）",
          snippet:
            "Cloudflare Pages 是推荐的部署平台，因为 astro-minimax 的 AI 聊天功能基于 Cloudflare Workers AI 实现。",
        },
      ],
      query:
        '请解释这句话："Cloudflare Pages 是推荐的部署平台，因为 astro-minimax 的 AI 聊天功能基于 Cloudflare Workers AI 实现。"',
      lang: "zh",
      max: 3,
      articleSlug: "deployment-guide",
      context: {
        scope: "article",
        article: {
          slug: "deployment-guide",
          title: "部署指南：多平台部署 astro-minimax",
        },
      },
    });

    expect(result[0]?.title).toBe("部署指南：多平台部署 astro-minimax");
    expect(result[0]?.reason).toBe("chunk");
  });
});

describe("shapeCachedSearchForQuery", () => {
  it("applies the same interpretation-driven shaping to cached search articles", () => {
    const result = shapeCachedSearchForQuery({
      query: "怎么部署到 Cloudflare？",
      articles: [
        {
          title: "Getting Started",
          url: "/getting-started",
          keyPoints: [],
          categories: ["setup"],
          dateTime: Date.now(),
        },
        {
          title: "Deployment Guide",
          url: "/deployment-guide",
          keyPoints: [],
          categories: ["deployment"],
          dateTime: Date.now(),
        },
      ],
      projects: [{ name: "Proj", url: "/proj", description: "desc" }],
    });

    expect(result.interpretation.topic.primary).toBe("deployment");
    expect(result.articles[0]?.title).toBe("Deployment Guide");
    expect(result.projects).toHaveLength(1);
  });
});

describe("response cache source authority", () => {
  it("accepts only non-empty non-fallback sources", () => {
    expect(shouldPersistAuthoritativeSources([])).toBe(false);
    expect(
      shouldPersistAuthoritativeSources([
        {
          title: "Fallback",
          url: "/fallback",
          reason: "retrieval-fallback",
        },
      ])
    ).toBe(false);
    expect(
      shouldPersistAuthoritativeSources([
        {
          title: "Cache Source",
          url: "/cache",
          reason: "cache",
        },
      ])
    ).toBe(false);
    expect(
      shouldPersistAuthoritativeSources([
        {
          title: "Chunk Source",
          url: "/chunk",
          reason: "chunk",
        },
      ])
    ).toBe(true);
  });

  it("only persists cache entries when source authority and response state are valid", () => {
    expect(
      shouldPersistResponseCacheEntry({
        enabled: true,
        success: true,
        responseText: "ok",
        sources: [],
      })
    ).toBe(false);
    expect(
      shouldPersistResponseCacheEntry({
        enabled: true,
        success: true,
        responseText: "ok",
        sources: [
          { title: "Fallback", url: "/f", reason: "retrieval-fallback" },
        ],
      })
    ).toBe(false);
    expect(
      shouldPersistResponseCacheEntry({
        enabled: true,
        success: true,
        responseText: "ok",
        sources: [{ title: "Cache", url: "/c", reason: "cache" }],
      })
    ).toBe(false);
    expect(
      shouldPersistResponseCacheEntry({
        enabled: true,
        success: true,
        responseText: "ok",
        sources: [{ title: "Chunk", url: "/c", reason: "chunk" }],
      })
    ).toBe(true);
  });
});

describe("public question cache branching", () => {
  it("requires article context when the public question says so", () => {
    expect(
      shouldUsePublicQuestionCaches({
        publicQuestion: { type: "summary", needsContext: true },
      })
    ).toBe(false);
    expect(
      shouldUsePublicQuestionCaches({
        publicQuestion: { type: "summary", needsContext: true },
        articleSlug: "demo-post",
      })
    ).toBe(true);
  });

  it("builds isolated cache context with article slug and language", () => {
    expect(
      buildPublicCacheContext({
        articleSlug: "demo-post",
        lang: "zh",
        latestText: "Demo Post",
      })
    ).toEqual({ articleSlug: "demo-post", lang: "zh", queryKey: "demo post" });
    expect(
      buildPublicCacheContext({ lang: "en", latestText: "Hello World" })
    ).toEqual({
      articleSlug: undefined,
      lang: "en",
      queryKey: "hello world",
    });
  });

  it("shapes the public cache branch with enablement and scoped context together", () => {
    expect(
      shapePublicCacheBranch({
        publicQuestion: { type: "summary", needsContext: true },
        lang: "zh",
        latestText: "总结一下",
      })
    ).toEqual({
      enabled: false,
      context: { articleSlug: undefined, lang: "zh", queryKey: "总结一下" },
    });

    expect(
      shapePublicCacheBranch({
        publicQuestion: { type: "summary", needsContext: true },
        articleSlug: "demo-post",
        lang: "zh",
        latestText: "总结一下这篇文章",
      })
    ).toEqual({
      enabled: true,
      context: {
        articleSlug: "demo-post",
        lang: "zh",
        queryKey: "总结一下这篇文章",
      },
    });
  });

  it("produces distinct cache contexts for same type but different normalized queries", () => {
    const astro = shapePublicCacheBranch({
      publicQuestion: { type: "recommend", needsContext: false },
      lang: "zh",
      latestText: "推荐一些 Astro 文章",
    });
    const vue = shapePublicCacheBranch({
      publicQuestion: { type: "recommend", needsContext: false },
      lang: "zh",
      latestText: "推荐一些 Vue 文章",
    });

    expect(astro.enabled).toBe(true);
    expect(vue.enabled).toBe(true);
    expect(astro.context.queryKey).not.toBe(vue.context.queryKey);
  });
});

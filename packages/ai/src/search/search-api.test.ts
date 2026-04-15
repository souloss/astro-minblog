import { describe, it, expect, beforeEach } from "vitest";
import {
  initArticleIndex,
  initProjectIndex,
  initArticleChunks,
  getArticleChunks,
  searchArticles,
  searchProjects,
  searchArticleChunks,
  mergeResults,
} from "./search-api.js";
import type { SearchDocument } from "./types.js";

// ── Test Fixtures ──────────────────────────────────────────────

function makeDoc(
  overrides: Partial<SearchDocument> & {
    id: string;
    title: string;
    url: string;
  }
): SearchDocument {
  return {
    excerpt: "",
    content: `${overrides.title} content about programming and technology.`,
    categories: [],
    tags: [],
    keyPoints: [],
    dateTime: 1700000000,
    lang: "zh",
    ...overrides,
  };
}

const articleDocs: SearchDocument[] = [
  makeDoc({
    id: "ts-guide",
    title: "TypeScript 入门指南",
    url: "/zh/posts/typescript-guide/",
    content:
      "TypeScript 是 JavaScript 的超集，提供了类型系统和现代开发体验。",
    keyPoints: ["类型系统", "接口", "泛型"],
    categories: ["编程", "前端"],
  }),
  makeDoc({
    id: "react-hooks",
    title: "React Hooks 详解",
    url: "/zh/posts/react-hooks/",
    content:
      "React Hooks 让你在函数组件中使用状态和副作用。useState 和 useEffect 是最常用的 hooks。",
    keyPoints: ["useState", "useEffect", "自定义 Hooks"],
    categories: ["编程", "前端"],
  }),
  makeDoc({
    id: "astro-blog",
    title: "使用 Astro 搭建博客",
    url: "/zh/posts/astro-blog/",
    content:
      "Astro 是一个静态网站生成器，支持多种框架组件。适合构建内容驱动的网站。",
    keyPoints: ["静态生成", "岛屿架构", "多框架"],
    categories: ["编程", "Web"],
  }),
  makeDoc({
    id: "python-data",
    title: "Python 数据分析入门",
    url: "/zh/posts/python-data/",
    content:
      "Python 数据分析使用 pandas 和 numpy 库进行数据处理和可视化。",
    keyPoints: ["pandas", "numpy", "数据可视化"],
    categories: ["编程", "数据科学"],
  }),
  // English articles
  makeDoc({
    id: "ts-guide-en",
    title: "TypeScript Getting Started Guide",
    url: "/en/posts/typescript-guide/",
    content:
      "TypeScript is a superset of JavaScript that adds static typing and modern development features.",
    keyPoints: ["type system", "interfaces", "generics"],
    categories: ["programming", "frontend"],
    lang: "en",
  }),
  makeDoc({
    id: "react-hooks-en",
    title: "React Hooks Explained",
    url: "/en/posts/react-hooks/",
    content:
      "React Hooks let you use state and side effects in function components. useState and useEffect are the most common hooks.",
    keyPoints: ["useState", "useEffect", "custom hooks"],
    categories: ["programming", "frontend"],
    lang: "en",
  }),
];

const projectDocs: SearchDocument[] = [
  makeDoc({
    id: "proj-core",
    title: "astro-minimax core",
    url: "/projects/core/",
    content: "核心主题包，提供布局、组件和样式系统。",
  }),
  makeDoc({
    id: "proj-ai",
    title: "astro-minimax ai",
    url: "/projects/ai/",
    content: "AI 集成包，提供 RAG 检索和多 Provider 故障转移。",
  }),
];

const chunkFixtures: Record<
  string,
  Array<Parameters<typeof initArticleChunks>[0][string][number]>
> = {
  "ts-guide": [
    {
      id: "chunk-1",
      postId: "ts-guide",
      heading: "类型系统",
      content: "TypeScript 的类型系统包括基础类型和高级类型。",
      position: 0,
      tokenCount: 20,
      headers: { H1: "TypeScript 入门指南" },
    },
  ],
  "react-hooks": [
    {
      id: "chunk-r1",
      postId: "react-hooks",
      heading: "useState",
      content:
        "useState 是 React 最基本的 Hook，用于在函数组件中添加状态。",
      position: 0,
      tokenCount: 25,
      headers: { H2: "useState" },
    },
  ],
};

// ── Tests ──────────────────────────────────────────────────────

describe("search-api", () => {
  // ── State-independent tests (run first, no initialization needed) ──

  describe("mergeResults", () => {
    it("should merge two non-overlapping arrays", () => {
      const primary = [{ url: "/a/" }, { url: "/b/" }];
      const secondary = [{ url: "/c/" }, { url: "/d/" }];
      const result = mergeResults(primary, secondary);
      expect(result).toHaveLength(4);
    });

    it("should deduplicate by URL preferring primary", () => {
      const primary: Array<{ url: string; name: string }> = [
        { url: "/a/", name: "primary-a" },
      ];
      const secondary: Array<{ url: string; name: string }> = [
        { url: "/a/", name: "secondary-a" },
      ];
      const result = mergeResults(primary, secondary);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("primary-a");
    });

    it("should return primary when secondary is empty", () => {
      const primary = [{ url: "/a/" }];
      const result = mergeResults(primary, []);
      expect(result).toEqual(primary);
    });

    it("should return secondary when primary is empty", () => {
      const secondary = [{ url: "/a/" }];
      const result = mergeResults([], secondary);
      expect(result).toEqual(secondary);
    });

    it("should return empty when both arrays are empty", () => {
      const result = mergeResults([], []);
      expect(result).toEqual([]);
    });

    it("should handle multiple duplicates preserving primary order", () => {
      const primary = [{ url: "/a/" }, { url: "/b/" }, { url: "/c/" }];
      const secondary = [
        { url: "/a/" },
        { url: "/d/" },
        { url: "/b/" },
        { url: "/e/" },
      ];
      const result = mergeResults(primary, secondary);
      expect(result).toHaveLength(5);
      expect(result.map(r => r.url)).toEqual([
        "/a/",
        "/b/",
        "/c/",
        "/d/",
        "/e/",
      ]);
    });
  });

  // ── Uninitialized state tests (before any init) ─────────────

  describe("uninitialized state", () => {
    it("should return empty from searchArticles when index not initialized", () => {
      const results = searchArticles("TypeScript");
      expect(results).toEqual([]);
    });

    it("should return empty from searchProjects when index not initialized", () => {
      const results = searchProjects("astro-minimax");
      expect(results).toEqual([]);
    });
  });

  // ── Initialized state tests ─────────────────────────────────

  describe("initialized state", () => {
    beforeEach(() => {
      initArticleIndex(articleDocs);
      initProjectIndex(projectDocs);
      initArticleChunks(chunkFixtures);
    });

    // ── searchArticles ──────────────────────────────────────────

    describe("searchArticles", () => {
      it("should find articles by keyword", () => {
        const results = searchArticles("TypeScript");
        expect(results.length).toBeGreaterThan(0);
        expect(results[0].title).toContain("TypeScript");
      });

      it("should find articles by Chinese keyword", () => {
        const results = searchArticles("类型系统");
        expect(results.length).toBeGreaterThan(0);
      });

      it("should return empty for empty query", () => {
        expect(searchArticles("")).toEqual([]);
      });

      it("should return empty for whitespace-only query", () => {
        expect(searchArticles("   ")).toEqual([]);
      });

      it("should return articles with required fields", () => {
        const results = searchArticles("TypeScript");
        if (results.length > 0) {
          const article = results[0];
          expect(article).toHaveProperty("title");
          expect(article).toHaveProperty("url");
          expect(article).toHaveProperty("score");
          expect(typeof article.score).toBe("number");
        }
      });

      it("should include URL with siteUrl prefix when provided", () => {
        const results = searchArticles("TypeScript", {
          siteUrl: "https://example.com",
        });
        if (results.length > 0) {
          expect(results[0].url).toContain("example.com");
        }
      });

      it("should attach chunks from initArticleChunks", () => {
        const results = searchArticles("TypeScript");
        const tsArticle = results.find(r => r.id === "ts-guide");
        if (tsArticle) {
          expect(tsArticle.chunks).toBeDefined();
          expect(tsArticle.chunks?.length).toBeGreaterThan(0);
        }
      });

      it("should handle short queries without error", () => {
        const results = searchArticles("的");
        expect(Array.isArray(results)).toBe(true);
      });

      it("should return empty for empty index", () => {
        initArticleIndex([]);
        const results = searchArticles("TypeScript");
        expect(results).toEqual([]);
      });

      // ── Language filtering ──────────────────────────────────────

      describe("language filtering", () => {
        it("should filter results by lang when provided", () => {
          const results = searchArticles("TypeScript", { lang: "zh" });
          // Should only return Chinese articles
          expect(results.length).toBeGreaterThan(0);
          expect(results.every(r => r.lang === "zh")).toBe(true);
        });

        it("should filter to English articles when lang=en", () => {
          const results = searchArticles("TypeScript", { lang: "en" });
          expect(results.length).toBeGreaterThan(0);
          expect(results.every(r => r.lang === "en")).toBe(true);
        });

        it("should return all articles when lang is not provided", () => {
          const results = searchArticles("TypeScript");
          const allLangs = results.map(r => r.lang);
          // Should include both zh and en articles
          expect(allLangs).toContain("zh");
          expect(allLangs).toContain("en");
        });

        it("should return empty when no articles match the lang", () => {
          const results = searchArticles("TypeScript", { lang: "ja" });
          expect(results).toEqual([]);
        });
      });
    });

    // ── searchProjects ──────────────────────────────────────────

    describe("searchProjects", () => {
      it("should find projects by keyword", () => {
        const results = searchProjects("astro-minimax");
        expect(results.length).toBeGreaterThan(0);
      });

      it("should return empty for empty query", () => {
        expect(searchProjects("")).toEqual([]);
      });

      it("should return empty for whitespace-only query", () => {
        expect(searchProjects("   ")).toEqual([]);
      });

      it("should include URL with siteUrl prefix when provided", () => {
        const results = searchProjects("astro-minimax", {
          siteUrl: "https://example.com",
        });
        if (results.length > 0) {
          expect(results[0].url).toContain("example.com");
        }
      });

      it("should return projects with required fields", () => {
        const results = searchProjects("astro-minimax");
        if (results.length > 0) {
          const project = results[0];
          expect(project).toHaveProperty("name");
          expect(project).toHaveProperty("url");
          expect(project).toHaveProperty("description");
          expect(typeof project.name).toBe("string");
        }
      });
    });

    // ── initArticleChunks + getArticleChunks ────────────────────

    describe("initArticleChunks + getArticleChunks", () => {
      it("should retrieve chunks by postId", () => {
        const chunks = getArticleChunks("ts-guide");
        expect(chunks).toBeDefined();
        expect(chunks?.length).toBe(1);
        expect(chunks?.[0].heading).toBe("类型系统");
      });

      it("should return undefined for unknown postId", () => {
        const chunks = getArticleChunks("nonexistent");
        expect(chunks).toBeUndefined();
      });

      it("should handle re-initialization with new data", () => {
        initArticleChunks({
          "new-post": [
            {
              id: "chunk-new",
              postId: "new-post",
              heading: "New Section",
              content: "New content here.",
              position: 0,
              tokenCount: 10,
              headers: {},
            },
          ],
        });
        const chunks = getArticleChunks("new-post");
        expect(chunks).toBeDefined();
        expect(chunks?.length).toBe(1);
        // Old data should be gone after re-init
        expect(getArticleChunks("ts-guide")).toBeUndefined();
      });
    });

    // ── searchArticleChunks ─────────────────────────────────────

    describe("searchArticleChunks", () => {
      it("should return matching chunks for a query", () => {
        const articles = [
          {
            title: "TypeScript Guide",
            url: "/posts/ts-guide/",
            keyPoints: [],
            categories: [],
            dateTime: Date.now(),
            chunks: [
              {
                id: "chunk-1",
                postId: "ts-guide",
                heading: "类型系统",
                content: "TypeScript 的类型系统包括基础类型和高级类型。",
                position: 0,
                tokenCount: 20,
                headers: {},
              },
            ],
          },
        ];
        const results = searchArticleChunks("类型系统", articles);
        expect(results.length).toBeGreaterThan(0);
        expect(results[0].chunk.heading).toBe("类型系统");
        expect(results[0].score).toBeGreaterThan(0);
      });

      it("should return empty for empty query", () => {
        const articles = [
          {
            title: "Test",
            url: "/test/",
            keyPoints: [],
            categories: [],
            dateTime: Date.now(),
            chunks: [
              {
                id: "c1",
                postId: "test",
                heading: "H1",
                content: "Some content",
                position: 0,
                tokenCount: 5,
                headers: {},
              },
            ],
          },
        ];
        expect(searchArticleChunks("", articles)).toEqual([]);
      });

      it("should return empty for empty articles array", () => {
        expect(searchArticleChunks("test", [])).toEqual([]);
      });
    });
  });
});

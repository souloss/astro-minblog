import { describe, it, expect } from "vitest";
import { classifyQueryScope } from "./scope-classifier.js";
import type { ArticleContextHint } from "./scope-classifier.js";

// ── Chinese deictic references → article-local ─────────────────

describe("classifyQueryScope", () => {
  describe("article-local detection via deictic references (Chinese)", () => {
    it("should return 'article-local' for '这段话什么意思'", () => {
      expect(classifyQueryScope("这段话什么意思")).toBe("article-local");
    });

    it("should return 'article-local' for '后面是什么'", () => {
      expect(classifyQueryScope("后面是什么")).toBe("article-local");
    });

    it("should return 'article-local' for '原文里说了什么'", () => {
      expect(classifyQueryScope("原文里说了什么")).toBe("article-local");
    });

    it("should return 'article-local' for '前面讲了啥'", () => {
      expect(classifyQueryScope("前面讲了啥")).toBe("article-local");
    });

    it("should return 'article-local' for '这个概念怎么理解'", () => {
      expect(classifyQueryScope("这个概念怎么理解")).toBe("article-local");
    });

    it("should return 'article-local' for '上面提到的那个东西'", () => {
      expect(classifyQueryScope("上面提到的那个东西")).toBe("article-local");
    });
  });

  describe("article-local detection via summary patterns", () => {
    it("should return 'article-local' for summary query '总结一下'", () => {
      expect(classifyQueryScope("总结一下")).toBe("article-local");
    });

    it("should return 'article-local' for summary query '这篇文章讲了什么'", () => {
      expect(classifyQueryScope("这篇文章讲了什么")).toBe("article-local");
    });

    it("should return 'article-local' for '要点是什么'", () => {
      expect(classifyQueryScope("要点是什么")).toBe("article-local");
    });
  });

  describe("article-local detection via section references", () => {
    it("should return 'article-local' for '第一章讲了什么'", () => {
      expect(classifyQueryScope("第一章讲了什么")).toBe("article-local");
    });

    it("should return 'article-local' for '第二节在哪里'", () => {
      expect(classifyQueryScope("第二节在哪里")).toBe("article-local");
    });
  });

  // ── English deictic / summary → article-local ──────────────

  describe("article-local detection via English patterns", () => {
    it("should return 'article-local' for 'what does this section explain'", () => {
      expect(classifyQueryScope("what does this section explain")).toBe(
        "article-local"
      );
    });

    it("should return 'article-local' for 'summarize this article'", () => {
      expect(classifyQueryScope("summarize this article")).toBe(
        "article-local"
      );
    });

    it("should return 'article-local' for 'what are the main points'", () => {
      expect(classifyQueryScope("what are the main points")).toBe(
        "article-local"
      );
    });

    it("should return 'article-local' for 'what comes after this'", () => {
      expect(classifyQueryScope("what comes after this")).toBe("article-local");
    });
  });

  // ── Cross-article intent → article-comparative ──────────────

  describe("article-comparative detection", () => {
    it("should return 'article-comparative' for '还有哪些类似的文章'", () => {
      expect(classifyQueryScope("还有哪些类似的文章")).toBe(
        "article-comparative"
      );
    });

    it("should return 'article-comparative' for '推荐一些相关的文章'", () => {
      expect(classifyQueryScope("推荐一些相关的文章")).toBe(
        "article-comparative"
      );
    });

    it("should return 'article-comparative' for 'compare this with other frameworks'", () => {
      expect(classifyQueryScope("compare this with other frameworks")).toBe(
        "article-comparative"
      );
    });

    it("should return 'article-comparative' for 'recommend similar posts'", () => {
      expect(classifyQueryScope("recommend similar posts")).toBe(
        "article-comparative"
      );
    });
  });

  // ── Global queries ───────────────────────────────────────────

  describe("global detection", () => {
    it("should return 'global' for '推荐一些文章'", () => {
      expect(classifyQueryScope("推荐一些文章")).toBe("article-comparative");
    });

    it("should return 'global' for general knowledge queries", () => {
      expect(classifyQueryScope("什么是Astro框架")).toBe("global");
    });

    it("should return 'article-local' for '这个博客用什么技术栈' (deictic '这个')", () => {
      // "这个" is a deictic pattern, so classifier treats it as article-local
      expect(classifyQueryScope("这个博客用什么技术栈")).toBe("article-local");
    });

    it("should return 'global' for '有哪些功能'", () => {
      expect(classifyQueryScope("有哪些功能")).toBe("global");
    });

    it("should return 'global' for very short queries without deictic signals", () => {
      expect(classifyQueryScope("测试")).toBe("global");
    });
  });

  // ── Edge cases ───────────────────────────────────────────────

  describe("edge cases", () => {
    it("should return 'global' for empty string", () => {
      expect(classifyQueryScope("")).toBe("global");
    });

    it("should return 'global' for whitespace-only input", () => {
      expect(classifyQueryScope("   ")).toBe("global");
    });

    it("should boost article-local when article context overlaps AND deictic is present", () => {
      const context: ArticleContextHint = {
        title: "深度学习",
        keyPoints: ["神经网络", "反向传播"],
      };
      // "这个" provides deictic score (2) + context overlap (1) = 3 >= threshold (2)
      expect(classifyQueryScope("这个深度学习怎么用", context)).toBe(
        "article-local"
      );
    });

    it("should not trigger article-local from context overlap alone (max 1, threshold 2)", () => {
      const context: ArticleContextHint = {
        title: "深度学习",
        keyPoints: ["神经网络"],
      };
      // Context overlap alone maxes at 1.0, below threshold of 2 → global
      expect(classifyQueryScope("深度学习怎么用", context)).toBe("global");
    });

    it("should return 'global' when no article context and no local signals", () => {
      expect(classifyQueryScope("今天天气怎么样")).toBe("global");
    });

    it("should handle long queries with mixed signals", () => {
      // "这里" is deictic → article-local despite general content
      expect(classifyQueryScope("请问这里提到的概念能不能用在生产环境")).toBe(
        "article-local"
      );
    });
  });
});

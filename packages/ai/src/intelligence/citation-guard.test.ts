import { describe, it, expect } from "vitest";
import {
  resolveAnswerMode,
  getCitationGuardPreflight,
  buildUnknownRefusal,
} from "../intelligence/citation-guard.js";
import type { ArticleContext, ProjectContext } from "../search/types.js";

describe("resolveAnswerMode", () => {
  describe("unknown mode (privacy-sensitive)", () => {
    it.each([
      ["你多大了？", "unknown"],
      ["你今年几岁？", "unknown"],
      ["你赚多少钱？", "unknown"],
      ["你的月收入是多少？", "unknown"],
      ["你具体住在哪？", "unknown"],
      ["老婆叫什么名字？", "unknown"],
      ["你的手机号码是多少？", "unknown"],
      ["你的身份证号是多少？", "unknown"],
    ])('should detect "%s" as unknown mode', (query, expected) => {
      expect(resolveAnswerMode(query)).toBe(expected);
    });
  });

  describe("NOT unknown mode (precise pattern matching)", () => {
    it.each([
      ["如何部署到 Cloudflare Pages？", "general"],
      ["package.json 怎么配置？", "general"],
      ["storage 怎么用？", "general"],
      ["介绍一下 page 功能", "fact"],
    ])(
      'should NOT detect "%s" as unknown mode (avoid false positives)',
      (query, expected) => {
        expect(resolveAnswerMode(query)).toBe(expected);
      }
    );
  });

  describe("count mode", () => {
    it.each([
      ["有几篇文章？", "count"],
      ["有多少篇文章？", "count"],
      ["文章数量是多少？", "count"],
      ["How many posts are there?", "count"],
      ["总共几篇？", "count"],
    ])('should detect "%s" as count mode', (query, expected) => {
      expect(resolveAnswerMode(query)).toBe(expected);
    });
  });

  describe("list mode", () => {
    it.each([
      ["有哪些文章推荐？", "list"],
      ["列举一下特点", "list"],
      ["有哪些主题？", "list"],
      ["list all features", "list"],
    ])('should detect "%s" as list mode', (query, expected) => {
      expect(resolveAnswerMode(query)).toBe(expected);
    });
  });

  describe("opinion mode", () => {
    it.each([
      ["你怎么看这个问题？", "opinion"],
      ["对这个有什么看法？", "opinion"],
      ["你的观点是什么？", "opinion"],
      ["What do you think about Astro?", "opinion"],
      ["怎么看这个设计？", "opinion"],
    ])('should detect "%s" as opinion mode', (query, expected) => {
      expect(resolveAnswerMode(query)).toBe(expected);
    });
  });

  describe("recommendation mode", () => {
    it.each([
      ["推荐一些文章", "recommendation"],
      ["有什么建议吗？", "recommendation"],
      ["推荐一个好用的工具", "recommendation"],
      ["Can you suggest some posts?", "recommendation"],
      ["求推荐", "recommendation"],
    ])('should detect "%s" as recommendation mode', (query, expected) => {
      expect(resolveAnswerMode(query)).toBe(expected);
    });
  });

  describe("fact mode", () => {
    it.each([
      ["这个博客是什么？", "fact"],
      ["什么是 Astro？", "fact"],
      ["介绍一下这个项目", "fact"],
      ["What is this?", "fact"],
      ["有没有 AI 功能？", "fact"],
      ["是不是支持 Markdown？", "fact"],
    ])('should detect "%s" as fact mode', (query, expected) => {
      expect(resolveAnswerMode(query)).toBe(expected);
    });
  });

  describe("general mode (fallback)", () => {
    it.each([["随便聊聊"], ["hello"], ["好的"]])(
      'should detect "%s" as general mode',
      query => {
        expect(resolveAnswerMode(query)).toBe("general");
      }
    );
  });
});

describe("buildUnknownRefusal", () => {
  describe("income queries", () => {
    it("should return income refusal for income queries", () => {
      const result = buildUnknownRefusal("你赚多少钱？");
      expect(result).toMatch(/收入|隐私|公开/);
    });
  });

  describe("address queries", () => {
    it("should return address refusal for address queries", () => {
      const result = buildUnknownRefusal("你具体住在哪？");
      expect(result).toMatch(/住址|地址|隐私|公开/);
    });
  });

  describe("family queries", () => {
    it("should return family refusal for family queries", () => {
      const result = buildUnknownRefusal("老婆叫什么名字？");
      expect(result).toMatch(/家人|隐私|公开/);
    });
  });

  describe("phone queries", () => {
    it("should return phone refusal for phone queries", () => {
      const result = buildUnknownRefusal("你的手机号码是多少？");
      expect(result).toMatch(/电话|联系|隐私|公开/);
    });
  });

  describe("age queries", () => {
    it("should return age refusal for age queries", () => {
      const result = buildUnknownRefusal("你多大了？");
      expect(result).toMatch(/年龄|公开|分享/);
    });
  });

  describe("ID queries", () => {
    it("should return ID refusal for ID queries", () => {
      const result = buildUnknownRefusal("你的身份证号是多少？");
      expect(result).toMatch(/身份证|证件|隐私|公开/);
    });
  });

  describe("English queries", () => {
    it("should return English refusal for English queries", () => {
      const result = buildUnknownRefusal("你多大了？", "en");
      expect(result).toMatch(/age|disclosed|blog/i);
    });
  });
});

describe("getCitationGuardPreflight", () => {
  const mockArticles: ArticleContext[] = [
    {
      title: "Test Article",
      url: "/test",
      keyPoints: [],
      summary: "Test summary",
      categories: [],
      dateTime: Date.now(),
    },
  ];
  const mockProjects: ProjectContext[] = [];

  describe("privacy queries NO LONGER intercepted in preflight", () => {
    it("should NOT intercept income questions in preflight (handled by unknown mode)", () => {
      const result = getCitationGuardPreflight({
        userQuery: "你的收入是多少？",
        articles: mockArticles,
        projects: mockProjects,
        lang: "zh",
      });
      expect(result).toBeNull();
    });

    it("should NOT intercept age questions in preflight (handled by unknown mode)", () => {
      const result = getCitationGuardPreflight({
        userQuery: "你多大了？",
        articles: mockArticles,
        projects: mockProjects,
        lang: "zh",
      });
      expect(result).toBeNull();
    });

    it("should NOT intercept address questions in preflight (handled by unknown mode)", () => {
      const result = getCitationGuardPreflight({
        userQuery: "你住在哪里？",
        articles: mockArticles,
        projects: mockProjects,
        lang: "zh",
      });
      expect(result).toBeNull();
    });
  });

  describe("article count queries", () => {
    it('should return count for "有几篇文章" queries', () => {
      const articles: ArticleContext[] = [
        {
          title: "A",
          url: "/a",
          keyPoints: [],
          summary: "",
          categories: [],
          dateTime: Date.now(),
        },
        {
          title: "B",
          url: "/b",
          keyPoints: [],
          summary: "",
          categories: [],
          dateTime: Date.now(),
        },
        {
          title: "C",
          url: "/c",
          keyPoints: [],
          summary: "",
          categories: [],
          dateTime: Date.now(),
        },
      ];
      const result = getCitationGuardPreflight({
        userQuery: "有几篇文章？",
        articles,
        projects: [],
        lang: "zh",
      });
      expect(result).not.toBeNull();
      expect(result?.text).toMatch(/3/);
      expect(result?.actions).toContain("preflight_reject");
    });
  });

  describe("no article queries", () => {
    it("should return message when no articles found", () => {
      const result = getCitationGuardPreflight({
        userQuery: "有没有关于 Python 的文章？",
        articles: [],
        projects: [],
        lang: "zh",
      });
      expect(result).not.toBeNull();
      expect(result?.actions).toContain("preflight_reject");
      expect(result?.text).toMatch(/没有|文章/);
    });
  });

  describe("normal questions", () => {
    it("should return null for normal questions with articles", () => {
      const result = getCitationGuardPreflight({
        userQuery: "什么是 Astro？",
        articles: mockArticles,
        projects: mockProjects,
        lang: "zh",
      });
      expect(result).toBeNull();
    });

    it("should return null for Cloudflare Pages questions (no false positive)", () => {
      const result = getCitationGuardPreflight({
        userQuery: "如何部署到 Cloudflare Pages？",
        articles: mockArticles,
        projects: mockProjects,
        lang: "zh",
      });
      expect(result).toBeNull();
    });

    it("should return null for package.json questions (no false positive)", () => {
      const result = getCitationGuardPreflight({
        userQuery: "package.json 怎么配置？",
        articles: mockArticles,
        projects: mockProjects,
        lang: "zh",
      });
      expect(result).toBeNull();
    });
  });
});

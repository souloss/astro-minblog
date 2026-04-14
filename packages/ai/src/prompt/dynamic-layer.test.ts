import { describe, it, expect } from "vitest";
import { buildDynamicLayer } from "../prompt/dynamic-layer.js";
import type { ArticleContext, ProjectContext } from "../search/types.js";
import type { LoadedExtensions, ContextData } from "../extensions/types.js";

function createArticle(
  overrides: Partial<ArticleContext> = {}
): ArticleContext {
  return {
    title: "Test Article",
    url: "/test-article",
    summary: "Test summary",
    keyPoints: ["point1", "point2"],
    categories: ["tech"],
    dateTime: Date.now(),
    ...overrides,
  };
}

function createProject(
  overrides: Partial<ProjectContext> = {}
): ProjectContext {
  return {
    name: "Test Project",
    url: "https://github.com/test/project",
    description: "A test project",
    ...overrides,
  };
}

function createExtensions(contexts: ContextData[] = []): LoadedExtensions {
  return {
    searchable: new Map(),
    facts: new Map(),
    context: contexts,
    voiceStyle: null,
    semanticFallback: [],
  };
}

describe("buildDynamicLayer", () => {
  describe("basic functionality", () => {
    it("should return empty string when no content", () => {
      const result = buildDynamicLayer({
        userQuery: "test query",
        articles: [],
        projects: [],
        lang: "zh",
      });
      expect(result).toBe("");
    });

    it("should render articles correctly", () => {
      const articles = [createArticle({ title: "My Article" })];
      const result = buildDynamicLayer({
        userQuery: "test",
        articles,
        projects: [],
        lang: "zh",
      });
      expect(result).toContain("## 与当前问题相关的内容");
      expect(result).toContain("### 相关文章");
      expect(result).toContain("My Article");
    });

    it("should render projects correctly", () => {
      const projects = [createProject({ name: "My Project" })];
      const result = buildDynamicLayer({
        userQuery: "test",
        articles: [],
        projects,
        lang: "zh",
      });
      expect(result).toContain("### 相关项目");
      expect(result).toContain("My Project");
    });

    it("should render fact section", () => {
      const result = buildDynamicLayer({
        userQuery: "test",
        articles: [],
        projects: [],
        factSection: "## 事实\n- Fact 1",
        lang: "zh",
      });
      expect(result).toContain("## 事实");
      expect(result).toContain("Fact 1");
    });

    it("should render evidence section", () => {
      const result = buildDynamicLayer({
        userQuery: "test",
        articles: [],
        projects: [],
        evidenceSection: "Additional evidence here",
        lang: "zh",
      });
      expect(result).toContain("Additional evidence here");
    });
  });

  describe("context extensions integration", () => {
    it("should inject context before articles", () => {
      const contexts: ContextData[] = [
        {
          sectionTitle: "Travel Guide",
          content: "When answering travel questions, be helpful and practical.",
          position: "before-articles",
        },
      ];

      const result = buildDynamicLayer({
        userQuery: "推荐日本旅游",
        articles: [createArticle()],
        projects: [],
        extensions: createExtensions(contexts),
        lang: "zh",
      });

      const articleIndex = result.indexOf("### 相关文章");
      const contextIndex = result.indexOf("## Travel Guide");

      expect(result).toContain("## Travel Guide");
      expect(contextIndex).toBeLessThan(articleIndex);
    });

    it("should inject context after articles", () => {
      const contexts: ContextData[] = [
        {
          sectionTitle: "Post-Article Note",
          content: "Remember to check related articles.",
          position: "after-articles",
        },
      ];

      const result = buildDynamicLayer({
        userQuery: "test",
        articles: [createArticle()],
        projects: [],
        extensions: createExtensions(contexts),
        lang: "zh",
      });

      expect(result).toContain("## Post-Article Note");
      expect(result).toContain("Remember to check related articles.");
    });

    it("should inject context before facts", () => {
      const contexts: ContextData[] = [
        {
          sectionTitle: "Fact Context",
          content: "These are verified facts.",
          position: "before-facts",
        },
      ];

      const result = buildDynamicLayer({
        userQuery: "test",
        articles: [],
        projects: [],
        factSection: "## Facts\nFact 1",
        extensions: createExtensions(contexts),
        lang: "zh",
      });

      const factIndex = result.indexOf("## Facts");
      const contextIndex = result.indexOf("## Fact Context");

      expect(result).toContain("## Fact Context");
      expect(contextIndex).toBeLessThan(factIndex);
    });

    it("should inject context after facts", () => {
      const contexts: ContextData[] = [
        {
          sectionTitle: "After Facts",
          content: "End of fact section.",
          position: "after-facts",
        },
      ];

      const result = buildDynamicLayer({
        userQuery: "test",
        articles: [],
        projects: [],
        factSection: "## Facts\nFact 1",
        extensions: createExtensions(contexts),
        lang: "zh",
      });

      expect(result).toContain("## After Facts");
      expect(result).toContain("End of fact section.");
    });

    it("should filter context by query pattern", () => {
      const contexts: ContextData[] = [
        {
          sectionTitle: "Travel Context",
          content: "Travel-specific advice.",
          position: "before-articles",
          matchCondition: {
            queryPatterns: [/旅行|旅游|travel/i],
          },
        },
      ];

      const resultMatching = buildDynamicLayer({
        userQuery: "推荐日本旅游攻略",
        articles: [createArticle()],
        projects: [],
        extensions: createExtensions(contexts),
        lang: "zh",
      });

      const resultNotMatching = buildDynamicLayer({
        userQuery: "如何学习编程",
        articles: [createArticle()],
        projects: [],
        extensions: createExtensions(contexts),
        lang: "zh",
      });

      expect(resultMatching).toContain("Travel Context");
      expect(resultNotMatching).not.toContain("Travel Context");
    });

    it("should filter context by categories", () => {
      const contexts: ContextData[] = [
        {
          sectionTitle: "Tech Context",
          content: "Tech-specific advice.",
          position: "before-articles",
          matchCondition: {
            categories: ["tech"],
          },
        },
      ];

      const resultWithTech = buildDynamicLayer({
        userQuery: "test",
        articles: [createArticle({ categories: ["tech"] })],
        projects: [],
        extensions: createExtensions(contexts),
        lang: "zh",
      });

      const resultWithoutTech = buildDynamicLayer({
        userQuery: "test",
        articles: [createArticle({ categories: ["lifestyle"] })],
        projects: [],
        extensions: createExtensions(contexts),
        lang: "zh",
      });

      expect(resultWithTech).toContain("Tech Context");
      expect(resultWithoutTech).not.toContain("Tech Context");
    });

    it("should support dynamic content function", () => {
      const contexts: ContextData[] = [
        {
          sectionTitle: "Dynamic Context",
          content: ctx => `User asked about: ${ctx.userQuery}`,
          position: "before-articles",
        },
      ];

      const result = buildDynamicLayer({
        userQuery: "How to code",
        articles: [createArticle()],
        projects: [],
        extensions: createExtensions(contexts),
        lang: "en",
      });

      expect(result).toContain("User asked about: How to code");
    });

    it("should handle multiple contexts at different positions", () => {
      const contexts: ContextData[] = [
        {
          sectionTitle: "Before Articles",
          content: "Content before",
          position: "before-articles",
        },
        {
          sectionTitle: "After Articles",
          content: "Content after",
          position: "after-articles",
        },
        {
          sectionTitle: "Before Facts",
          content: "Before facts content",
          position: "before-facts",
        },
      ];

      const result = buildDynamicLayer({
        userQuery: "test",
        articles: [createArticle()],
        projects: [],
        factSection: "## Facts\nFact",
        extensions: createExtensions(contexts),
        lang: "zh",
      });

      expect(result).toContain("## Before Articles");
      expect(result).toContain("## After Articles");
      expect(result).toContain("## Before Facts");
    });

    it("should handle empty extensions", () => {
      const result = buildDynamicLayer({
        userQuery: "test",
        articles: [createArticle()],
        projects: [],
        extensions: {
          searchable: new Map(),
          facts: new Map(),
          context: [],
          voiceStyle: null,
          semanticFallback: [],
        },
        lang: "zh",
      });

      expect(result).toContain("Test Article");
    });

    it("should handle undefined extensions", () => {
      const result = buildDynamicLayer({
        userQuery: "test",
        articles: [createArticle()],
        projects: [],
        lang: "zh",
      });

      expect(result).toContain("Test Article");
    });
  });

  describe("answer mode hints", () => {
    it("should include answer mode hint for list mode", () => {
      const result = buildDynamicLayer({
        userQuery: "有哪些推荐",
        articles: [createArticle()],
        projects: [],
        answerMode: "list",
        lang: "zh",
      });

      expect(result).toContain("列表模式");
    });

    it("should include answer mode hint for count mode", () => {
      const result = buildDynamicLayer({
        userQuery: "有多少篇文章",
        articles: [createArticle()],
        projects: [],
        answerMode: "count",
        lang: "zh",
      });

      expect(result).toContain("计数模式");
    });

    it("should not include hint for general mode", () => {
      const result = buildDynamicLayer({
        userQuery: "test",
        articles: [createArticle()],
        projects: [],
        answerMode: "general",
        lang: "zh",
      });

      expect(result).not.toContain("模式");
    });
  });

  describe("English language support", () => {
    it("should render in English", () => {
      const result = buildDynamicLayer({
        userQuery: "test query",
        articles: [createArticle()],
        projects: [],
        lang: "en",
      });

      expect(result).toContain("## Content related to the current question");
      expect(result).toContain("### Related Articles");
    });

    it("should include English answer mode hints", () => {
      const result = buildDynamicLayer({
        userQuery: "what are the options",
        articles: [createArticle()],
        projects: [],
        answerMode: "list",
        lang: "en",
      });

      expect(result).toContain("list query");
    });
  });
});

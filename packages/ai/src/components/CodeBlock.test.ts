import { describe, it, expect } from "vitest";
import { generateFollowUpSuggestions } from "./CodeBlock.tsx";

describe("generateFollowUpSuggestions", () => {
  describe("code-related suggestions", () => {
    it("should suggest code explanation when code block is present", () => {
      const response = "Here is the code:\n```typescript\nconst x = 1;\n```";
      const suggestions = generateFollowUpSuggestions(response);
      expect(suggestions).toContainEqual({
        text: "解释这段代码",
        icon: "code",
      });
    });

    it('should suggest code explanation when "code" keyword is present', () => {
      const response = "The code implementation is straightforward.";
      const suggestions = generateFollowUpSuggestions(response);
      expect(suggestions).toContainEqual({
        text: "解释这段代码",
        icon: "code",
      });
    });

    it('should suggest code explanation when Chinese "代码" is present', () => {
      const response = "这段代码实现了核心功能。";
      const suggestions = generateFollowUpSuggestions(response);
      expect(suggestions).toContainEqual({
        text: "解释这段代码",
        icon: "code",
      });
    });
  });

  describe("config-related suggestions", () => {
    it('should suggest config steps when "config" keyword is present', () => {
      const response = "Update your config file to enable this feature.";
      const suggestions = generateFollowUpSuggestions(response);
      expect(suggestions).toContainEqual({
        text: "详细配置步骤",
        icon: "config",
      });
    });

    it('should suggest config steps when Chinese "配置" is present', () => {
      const response = "修改配置文件即可。";
      const suggestions = generateFollowUpSuggestions(response);
      expect(suggestions).toContainEqual({
        text: "详细配置步骤",
        icon: "config",
      });
    });

    it('should suggest config steps when Chinese "设置" is present', () => {
      const response = "在设置中开启此选项。";
      const suggestions = generateFollowUpSuggestions(response);
      expect(suggestions).toContainEqual({
        text: "详细配置步骤",
        icon: "config",
      });
    });
  });

  describe("article-related suggestions", () => {
    it('should suggest related articles when "article" keyword is present', () => {
      const response = "Check out this article for more details.";
      const suggestions = generateFollowUpSuggestions(response);
      expect(suggestions).toContainEqual({
        text: "推荐相关文章",
        icon: "article",
      });
    });

    it('should suggest related articles when "post" keyword is present', () => {
      const response = "In my previous post I explained this.";
      const suggestions = generateFollowUpSuggestions(response);
      expect(suggestions).toContainEqual({
        text: "推荐相关文章",
        icon: "article",
      });
    });

    it('should suggest related articles when Chinese "文章" is present', () => {
      const response = "这篇文章介绍了详细内容。";
      const suggestions = generateFollowUpSuggestions(response);
      expect(suggestions).toContainEqual({
        text: "推荐相关文章",
        icon: "article",
      });
    });
  });

  describe("how-to suggestions", () => {
    it('should suggest example when "如何" is present', () => {
      const response = "如果你想了解如何实现这个功能...";
      const suggestions = generateFollowUpSuggestions(response);
      expect(suggestions).toContainEqual({
        text: "举个具体例子",
        icon: "example",
      });
    });

    it('should suggest example when "how to" is present', () => {
      const response = "Let me explain how to configure this.";
      const suggestions = generateFollowUpSuggestions(response);
      expect(suggestions).toContainEqual({
        text: "举个具体例子",
        icon: "example",
      });
    });
  });

  describe("article context suggestions", () => {
    it("should include article detail suggestion when context is provided", () => {
      const response = "This is a response about the article.";
      const context = { title: "Getting Started with Astro" };
      const suggestions = generateFollowUpSuggestions(response, context);

      const detailSuggestion = suggestions.find(s => s.icon === "detail");
      expect(detailSuggestion).toBeDefined();
      expect(detailSuggestion?.text).toContain("Getting Started with");
    });

    it("should truncate long article titles in suggestion", () => {
      const response = "Response text";
      const context = {
        title:
          "This is a very long article title that should be truncated properly",
      };
      const suggestions = generateFollowUpSuggestions(response, context);

      const detailSuggestion = suggestions.find(s => s.icon === "detail");
      expect(detailSuggestion?.text.length).toBeLessThan(30);
    });
  });

  describe("suggestion limits", () => {
    it("should return at most 3 suggestions", () => {
      const response =
        "Here is the code:\n```js\nconst x = 1;\n```\n\nThe config file needs to be updated.\n\nCheck out this article for more info.\n\nLet me show you how to do it.";
      const suggestions = generateFollowUpSuggestions(response);
      expect(suggestions.length).toBeLessThanOrEqual(3);
    });

    it("should return empty array for plain text without triggers", () => {
      const response = "Hello, how can I help you today?";
      const suggestions = generateFollowUpSuggestions(response);
      expect(suggestions).toEqual([]);
    });
  });

  describe("priority and ordering", () => {
    it("should prioritize earlier pattern matches", () => {
      const response = "Here is code and config and article all in one!";
      const suggestions = generateFollowUpSuggestions(response);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toEqual({ text: "解释这段代码", icon: "code" });
    });
  });
});

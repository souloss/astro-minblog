import { describe, it, expect } from "vitest";
import { classifyQueryScope } from "./scope-classifier.js";
import type { ArticleContextHint } from "./scope-classifier.js";

describe("classifyQueryScope", () => {
  it("should return 'article-local' for Chinese deictic references", () => {
    expect(classifyQueryScope("这一节讲了什么")).toBe("article-local");
    expect(classifyQueryScope("这段什么意思")).toBe("article-local");
  });

  it("should return 'global' for general questions without context", () => {
    expect(classifyQueryScope("什么是 TypeScript")).toBe("global");
    expect(classifyQueryScope("how to learn programming")).toBe("global");
  });

  it("should return 'global' when query has no article signals", () => {
    const context: ArticleContextHint = {
      title: "深度学习入门",
      keyPoints: ["神经网络", "反向传播"],
    };
    expect(classifyQueryScope("今天天气怎么样", context)).toBe("global");
  });

  it("should handle empty query", () => {
    expect(classifyQueryScope("")).toBe("global");
  });

  it("should handle undefined context", () => {
    const result = classifyQueryScope("这个问题");
    expect(["article-local", "global"]).toContain(result);
  });

  it("should return a valid scope type", () => {
    const result = classifyQueryScope("test query");
    expect(["article-local", "global"]).toContain(result);
  });
});

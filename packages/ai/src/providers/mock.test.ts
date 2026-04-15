import { describe, it, expect } from "vitest";
import { getMockResponse } from "./mock.js";

describe("getMockResponse", () => {
  it("should return Chinese response for zh lang", () => {
    const result = getMockResponse("Astro是什么", "zh");
    expect(result).toContain("Astro");
    expect(result).not.toContain("Astro is");
  });

  it("should return English response for en lang", () => {
    const result = getMockResponse("What is Astro", "en");
    expect(result).toContain("Astro");
  });

  it("should match astro-related queries", () => {
    const result = getMockResponse("astro framework");
    expect(result.length).toBeGreaterThan(50);
  });

  it("should match recommendation queries", () => {
    const result = getMockResponse("有哪些文章推荐");
    expect(result).toContain("推荐");
  });

  it("should match blog-related queries", () => {
    const result = getMockResponse("tell me about the blog features");
    expect(result.length).toBeGreaterThan(50);
  });

  it("should match theme queries", () => {
    const result = getMockResponse("怎么切换暗色主题");
    expect(result).toContain("主题");
  });

  it("should match deployment queries (without blog keyword)", () => {
    const result = getMockResponse("如何部署网站");
    expect(result).toContain("部署");
  });

  it("should match AI-related queries", () => {
    const result = getMockResponse("你是什么AI助手");
    expect(result).toContain("AI");
  });

  it("should return fallback for unknown queries", () => {
    const result = getMockResponse("今天天气怎么样");
    expect(result).toContain("Demo");
  });

  it("should return English fallback for en lang unknown queries", () => {
    const result = getMockResponse("what is the weather today", "en");
    expect(result).toContain("Demo");
  });

  it("should default to zh lang", () => {
    const result = getMockResponse("astro框架");
    expect(result).toContain("Astro");
  });

  it("should be case-insensitive for matching", () => {
    const result = getMockResponse("ASTRO FRAMEWORK");
    expect(result.length).toBeGreaterThan(50);
  });
});

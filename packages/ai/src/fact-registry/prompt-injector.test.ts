import { describe, it, expect } from "vitest";
import { buildFactSection } from "./prompt-injector.js";
import type { Fact } from "./types.js";

const sampleFacts: Fact[] = [
  {
    id: "f1",
    category: "author",
    statement: "作者有10年开发经验",
    evidence: "个人简介",
    source: "explicit",
    confidence: 0.95,
    tags: ["experience"],
    lang: "zh",
  },
  {
    id: "f2",
    category: "blog",
    statement: "博客使用 Astro 框架",
    evidence: "技术栈",
    source: "explicit",
    confidence: 0.99,
    tags: ["tech"],
    lang: "zh",
  },
  {
    id: "f3",
    category: "author",
    statement: "Author has 10 years of experience",
    evidence: "bio",
    source: "explicit",
    confidence: 0.95,
    tags: ["experience"],
    lang: "en",
  },
  {
    id: "f4",
    category: "tech",
    statement: "使用 TypeScript strict mode",
    evidence: "tsconfig",
    source: "inferred",
    confidence: 0.9,
    tags: ["typescript"],
    lang: "zh",
  },
];

describe("buildFactSection", () => {
  it("should return empty string for empty facts", () => {
    expect(buildFactSection([])).toBe("");
  });

  it("should build Chinese fact section with categories", () => {
    const result = buildFactSection(sampleFacts.slice(0, 2), "zh");
    expect(result).toContain("已验证事实");
    expect(result).toContain("关于作者");
    expect(result).toContain("博客数据");
    expect(result).toContain("作者有10年开发经验");
    expect(result).toContain("博客使用 Astro 框架");
  });

  it("should build English fact section", () => {
    const result = buildFactSection(sampleFacts.slice(2, 3), "en");
    expect(result).toContain("Verified Facts");
    expect(result).toContain("About the Author");
    expect(result).toContain("Author has 10 years of experience");
  });

  it("should group facts by category", () => {
    const result = buildFactSection(sampleFacts.slice(0, 4), "zh");
    // author group should contain both author facts
    const authorSection = result.split("关于作者")[1]?.split("博客数据")[0];
    expect(authorSection).toContain("作者有10年开发经验");
    // tech group
    expect(result).toContain("技术相关");
    expect(result).toContain("使用 TypeScript strict mode");
  });

  it("should include instruction at the end", () => {
    const result = buildFactSection(sampleFacts.slice(0, 1), "zh");
    expect(result).toContain("优先使用这些已验证的事实");
  });

  it("should include English instruction for en lang", () => {
    const result = buildFactSection(sampleFacts.slice(2, 3), "en");
    expect(result).toContain("Prioritize these verified facts");
  });

  it("should handle single fact", () => {
    const result = buildFactSection(sampleFacts.slice(0, 1), "zh");
    expect(result).toContain("关于作者");
    expect(result).toContain("作者有10年开发经验");
  });

  it("should use zh as default lang", () => {
    const result = buildFactSection(sampleFacts.slice(0, 1));
    expect(result).toContain("已验证事实");
  });
});

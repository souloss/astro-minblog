import { describe, it, expect } from "vitest";
import {
  detectPublicQuestion,
  normalizePublicCacheQuery,
  buildGlobalCacheKey,
  getGlobalCacheTTL,
} from "./global-cache.js";

// ── normalizePublicCacheQuery ──────────────────────────────────

describe("normalizePublicCacheQuery", () => {
  it("should lowercase and trim", () => {
    expect(normalizePublicCacheQuery("  Hello World  ")).toBe("hello world");
  });

  it("should remove punctuation", () => {
    expect(normalizePublicCacheQuery("这是什么？")).toBe("这是什么");
    expect(normalizePublicCacheQuery("hello, world!")).toBe("hello world");
  });

  it("should collapse multiple spaces", () => {
    expect(normalizePublicCacheQuery("hello   world")).toBe("hello world");
  });

  it("should handle empty string", () => {
    expect(normalizePublicCacheQuery("")).toBe("");
  });
});

// ── detectPublicQuestion ───────────────────────────────────────

describe("detectPublicQuestion", () => {
  it("should detect tech stack questions", () => {
    const result = detectPublicQuestion("这个博客用了什么技术栈");
    expect(result).not.toBeNull();
    expect(result!.type).toBe("tech");
    expect(result!.needsContext).toBe(false);
  });

  it("should detect English tech stack questions", () => {
    const result = detectPublicQuestion("what tech stack is this blog built with");
    expect(result).not.toBeNull();
    expect(result!.type).toBe("tech");
  });

  it("should detect recommendation questions", () => {
    const result = detectPublicQuestion("有什么推荐的文章");
    expect(result).not.toBeNull();
    expect(result!.type).toBe("recommend");
  });

  it("should detect summary questions with context need", () => {
    const result = detectPublicQuestion("总结一下这篇文章");
    expect(result).not.toBeNull();
    expect(result!.type).toBe("summary");
    expect(result!.needsContext).toBe(true);
  });

  it("should detect author questions", () => {
    const result = detectPublicQuestion("作者是谁");
    expect(result).not.toBeNull();
    expect(result!.type).toBe("author");
  });

  it("should return null for irrelevant questions", () => {
    expect(detectPublicQuestion("今天天气怎么样")).toBeNull();
  });

  it("should return null for empty string", () => {
    expect(detectPublicQuestion("")).toBeNull();
  });

  it("should return null for single keyword without pattern match", () => {
    // Single keyword match (score=1) should not reach threshold (>=2)
    expect(detectPublicQuestion("技术")).toBeNull();
  });
});

// ── buildGlobalCacheKey ────────────────────────────────────────

describe("buildGlobalCacheKey", () => {
  it("should build key with type only", () => {
    const key = buildGlobalCacheKey("tech");
    expect(key).toBe("global:tech");
  });

  it("should build key with all context fields", () => {
    const key = buildGlobalCacheKey("tech", {
      articleSlug: "my-post",
      lang: "en",
      queryKey: "what-tech",
    });
    expect(key).toBe("global:tech:my-post:en:what-tech");
  });

  it("should skip undefined context fields", () => {
    const key = buildGlobalCacheKey("tech", { lang: "zh" });
    expect(key).toBe("global:tech:zh");
  });
});

// ── getGlobalCacheTTL ──────────────────────────────────────────

describe("getGlobalCacheTTL", () => {
  it("should return correct TTL for tech questions", () => {
    expect(getGlobalCacheTTL("tech")).toBe(86400);
  });

  it("should return correct TTL for recommend questions", () => {
    expect(getGlobalCacheTTL("recommend")).toBe(1800);
  });

  it("should return correct TTL for summary questions", () => {
    expect(getGlobalCacheTTL("summary")).toBe(14400);
  });

  it("should return default TTL for unknown type", () => {
    // This covers the fallback path
    expect(getGlobalCacheTTL("author")).toBe(86400);
  });
});

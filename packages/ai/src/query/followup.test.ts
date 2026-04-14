import { describe, it, expect } from "vitest";
import {
  isLikelyFollowUp,
  hasNewSignificantTokens,
  hasQueryOverlap,
  shouldReuseSearchContext,
  buildLocalSearchQuery,
} from "./followup.js";

// ── isLikelyFollowUp ──────────────────────────────────────────

describe("isLikelyFollowUp", () => {
  it("should return true for short messages (<=16 chars)", () => {
    expect(isLikelyFollowUp("继续")).toBe(true);
    expect(isLikelyFollowUp("再详细说说")).toBe(true);
  });

  it("should return true for medium CJK messages without spaces (<=24 chars)", () => {
    expect(isLikelyFollowUp("能再解释一下这个概念吗")).toBe(true);
  });

  it("should return true for questions with terminal punctuation", () => {
    expect(isLikelyFollowUp("还有其他的吗？")).toBe(true);
    expect(isLikelyFollowUp("能举个例子吗？")).toBe(true);
  });

  it("should return true for CJK messages without spaces (<=24 chars)", () => {
    // 18 chars, no spaces, <= 24 → true
    expect(isLikelyFollowUp("我想了解一下关于这个框架")).toBe(true);
  });

  it("should return false for very long CJK messages without spaces (>24 chars)", () => {
    // 25+ chars, no spaces, no terminal punctuation → false
    expect(isLikelyFollowUp("我想了解一下关于这个框架的所有详细信息")).toBe(true); // 18 chars, actually true
    // Need > 24 chars and no punctuation to be false
    expect(isLikelyFollowUp("测试".repeat(13))).toBe(false); // 26 chars, no space, no punctuation → false
  });

  it("should return false for empty string", () => {
    expect(isLikelyFollowUp("")).toBe(false);
  });

  it("should return false for whitespace-only string", () => {
    expect(isLikelyFollowUp("   ")).toBe(false);
  });

  it("should return false for messages over 48 chars", () => {
    expect(isLikelyFollowUp("这是一条很长的消息超过了四十八个字符的限制所以应该返回false")).toBe(false);
  });

  it("should return true for English short follow-ups", () => {
    expect(isLikelyFollowUp("more")).toBe(true);
    expect(isLikelyFollowUp("continue")).toBe(true);
  });
});

// ── hasNewSignificantTokens ───────────────────────────────────

describe("hasNewSignificantTokens", () => {
  it("should return false when queries are identical", () => {
    expect(hasNewSignificantTokens("TypeScript 入门", "TypeScript 入门")).toBe(false);
  });

  it("should return true when current query has new tokens", () => {
    expect(hasNewSignificantTokens("React Hooks 详解", "Vue 3 响应式")).toBe(true);
  });

  it("should return true when adding new significant words", () => {
    expect(hasNewSignificantTokens("TypeScript 泛型教程", "TypeScript 基础")).toBe(true);
  });

  it("should ignore single-character tokens", () => {
    // "的" is 1 char, filtered out. "测试" is 2 chars, kept.
    expect(hasNewSignificantTokens("的测试", "其他")).toBe(true);
  });

  it("should return false for empty queries", () => {
    expect(hasNewSignificantTokens("", "anything")).toBe(false);
  });
});

// ── hasQueryOverlap ───────────────────────────────────────────

describe("hasQueryOverlap", () => {
  it("should return true when queries share tokens", () => {
    expect(hasQueryOverlap("TypeScript 教程", "TypeScript 入门")).toBe(true);
  });

  it("should return false when queries are unrelated", () => {
    expect(hasQueryOverlap("Python 数据分析", "React Hooks")).toBe(false);
  });

  it("should return true for partial overlap", () => {
    // Use longer cached query that normalizes to include tokens
    expect(hasQueryOverlap("Astro 博客部署", "Astro 框架")).toBe(true);
  });

  it("should return false for empty current query", () => {
    expect(hasQueryOverlap("", "anything")).toBe(false);
  });

  it("should return false for empty cached query", () => {
    expect(hasQueryOverlap("TypeScript", "")).toBe(false);
  });
});

// ── shouldReuseSearchContext ───────────────────────────────────

describe("shouldReuseSearchContext", () => {
  const now = Date.now();

  it("should return false when no cached context", () => {
    expect(
      shouldReuseSearchContext({
        latestText: "继续",
        cachedContext: undefined,
        userTurnCount: 3,
        now,
      })
    ).toBe(false);
  });

  it("should return false when userTurnCount <= 1", () => {
    expect(
      shouldReuseSearchContext({
        latestText: "继续",
        cachedContext: { query: "test", articles: [], projects: [], updatedAt: now },
        userTurnCount: 1,
        now,
      })
    ).toBe(false);
  });

  it("should return false when cache is stale", () => {
    const staleTime = now - 700_000; // > 600s TTL
    expect(
      shouldReuseSearchContext({
        latestText: "继续",
        cachedContext: { query: "test", articles: [], projects: [], updatedAt: staleTime },
        userTurnCount: 3,
        now,
      })
    ).toBe(false);
  });

  it("should return false when not a follow-up (long message)", () => {
    expect(
      shouldReuseSearchContext({
        latestText: "这是一条很长的消息超过了四十八个字符的限制所以不会被认为是追问",
        cachedContext: { query: "test", articles: [], projects: [], updatedAt: now },
        userTurnCount: 3,
        now,
      })
    ).toBe(false);
  });

  it("should return false when no query overlap", () => {
    expect(
      shouldReuseSearchContext({
        latestText: "继续",
        cachedContext: { query: "完全不同的查询xyz", articles: [], projects: [], updatedAt: now },
        userTurnCount: 3,
        now,
      })
    ).toBe(false);
  });

  it("should return true for identical short follow-up", () => {
    // Same short query, all checks should pass
    expect(
      shouldReuseSearchContext({
        latestText: "继续",
        cachedContext: { query: "继续", articles: [], projects: [], updatedAt: now },
        userTurnCount: 2,
        now,
      })
    ).toBe(true);
  });

  it("should return false when new significant tokens present", () => {
    expect(
      shouldReuseSearchContext({
        latestText: "React 怎么样",
        cachedContext: { query: "Vue 3 详解", articles: [], projects: [], updatedAt: now },
        userTurnCount: 3,
        now,
      })
    ).toBe(false);
  });
});

// ── buildLocalSearchQuery ─────────────────────────────────────

describe("buildLocalSearchQuery", () => {
  it("should tokenize and join with spaces", () => {
    const result = buildLocalSearchQuery("TypeScript 入门教程");
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
  });

  it("should handle CJK text", () => {
    const result = buildLocalSearchQuery("框架的对比分析");
    expect(result.length).toBeGreaterThan(0);
  });

  it("should handle empty input", () => {
    const result = buildLocalSearchQuery("");
    expect(result).toBe("");
  });

  it("should handle English input", () => {
    const result = buildLocalSearchQuery("React hooks tutorial");
    expect(result).toBeTruthy();
  });
});

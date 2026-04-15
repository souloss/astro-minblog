import { describe, it, expect } from "vitest";
import { buildSemiStaticLayer } from "./semi-static-layer.js";
import type { SemiStaticLayerConfig } from "./types.js";

// ── Fixtures ─────────────────────────────────────────────────────

function makeConfig(overrides: Partial<SemiStaticLayerConfig> = {}): SemiStaticLayerConfig {
  return {
    authorContext: {
      posts: [
        { title: "Post 1", url: "/p1", date: "2026-01-01", summary: "Summary 1", category: "Tech" },
        { title: "Post 2", url: "/p2", date: "2026-02-01", summary: "Summary 2", category: "Life" },
        { title: "Post 3", url: "/p3", date: "2026-03-01", category: "Tech" },
      ],
    },
    lang: "zh",
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────

describe("buildSemiStaticLayer", () => {
  it("returns empty string when no author context", () => {
    expect(buildSemiStaticLayer({ authorContext: null })).toBe("");
  });

  it("returns empty string when posts array is empty", () => {
    expect(buildSemiStaticLayer(makeConfig({
      authorContext: { posts: [] },
    }))).toBe("");
  });

  it("includes blog overview with total posts count", () => {
    const result = buildSemiStaticLayer(makeConfig());
    expect(result).toContain("3");
  });

  it("includes categories", () => {
    const result = buildSemiStaticLayer(makeConfig());
    expect(result).toContain("Tech");
    expect(result).toContain("Life");
  });

  it("includes latest articles sorted by date", () => {
    const result = buildSemiStaticLayer(makeConfig());
    // Post 3 is most recent
    const p3Idx = result.indexOf("Post 3");
    const p1Idx = result.indexOf("Post 1");
    expect(p3Idx).toBeGreaterThan(-1);
    expect(p3Idx).toBeLessThan(p1Idx);
  });

  it("includes summary for posts that have one", () => {
    const result = buildSemiStaticLayer(makeConfig());
    expect(result).toContain("Summary 1");
  });

  it("skips blog overview when preferArticleLocal is true", () => {
    const result = buildSemiStaticLayer(makeConfig({ preferArticleLocal: true }));
    expect(result).toBe("");
  });

  it("works with English lang", () => {
    const result = buildSemiStaticLayer(makeConfig({ lang: "en" }));
    expect(result).toContain("Post 1");
    expect(result).toContain("Post 2");
  });

  it("limits summary to 60 chars", () => {
    const longSummary = "A".repeat(100);
    const result = buildSemiStaticLayer(makeConfig({
      authorContext: {
        posts: [{ title: "Long Post", url: "/lp", date: "2026-01-01", summary: longSummary }],
      },
    }));
    // Should contain truncated summary
    expect(result).toContain("A".repeat(60));
    // Should NOT contain full 100 char summary
    expect(result).not.toContain(longSummary);
  });

  it("limits to 10 recent posts", () => {
    const posts = Array.from({ length: 15 }, (_, i) => ({
      title: `Post ${i}`,
      url: `/p${i}`,
      date: `2026-${String(i + 1).padStart(2, "0")}-01`,
    }));
    const result = buildSemiStaticLayer(makeConfig({ authorContext: { posts } }));
    // Count the number of post links (lines starting with "- [")
    const postLines = result.split("\n").filter(l => l.startsWith("- [Post"));
    expect(postLines.length).toBe(10);
  });
});

import { describe, it, expect } from "vitest";
import type { IDFMap } from "./idf.js";
import {
  scoreDocument,
  filterLowRelevance,
  pickAnchorTerms,
} from "./scoring.js";

// ── Helpers ────────────────────────────────────────────────────

function makeDoc(
  overrides: Partial<{
    title: string;
    content: string;
    excerpt: string;
    keyPoints: string[];
    categories: string[];
    tags: string[];
  }> = {}
) {
  return {
    title: "",
    content: "",
    excerpt: "",
    keyPoints: [] as string[],
    categories: [] as string[],
    tags: [] as string[],
    ...overrides,
  };
}

function makeIDFMap(entries: [string, number][]): IDFMap {
  return { weights: new Map(entries), docCount: 100 };
}

// ── scoreDocument ──────────────────────────────────────────────

describe("scoreDocument", () => {
  it("should return 0 for empty tokens", () => {
    const doc = makeDoc({ title: "Hello World" });
    expect(scoreDocument([], doc)).toBe(0);
  });

  it("should score title matches with higher weight than content", () => {
    const doc = makeDoc({
      title: "TypeScript Guide",
      content: "Some other text",
    });
    const titleScore = scoreDocument(["typescript"], {
      ...doc,
      content: "Some other text",
    });
    const contentScore = scoreDocument(["typescript"], {
      ...doc,
      title: "No Match",
      content:
        "TypeScript is great TypeScript is great TypeScript is great TypeScript is great TypeScript is great TypeScript is great TypeScript is great TypeScript is great TypeScript is great TypeScript is great TypeScript is great TypeScript is great TypeScript is great TypeScript is great TypeScript is great TypeScript is great TypeScript is great TypeScript is great TypeScript is great TypeScript is great TypeScript is great TypeScript is great TypeScript is great TypeScript is great TypeScript is great TypeScript is great TypeScript is great",
    });
    // Title weight is 8, content weight is 1 — title should score much higher
    expect(titleScore).toBeGreaterThan(contentScore);
  });

  it("should score keyPoints with weight 5", () => {
    const doc = makeDoc({ keyPoints: ["Important insight about React"] });
    const score = scoreDocument(["react"], doc);
    // Without IDF map, default IDF weight is 1; keyPoints weight = 5
    expect(score).toBeGreaterThanOrEqual(5);
  });

  it("should score categories with weight 4", () => {
    const doc = makeDoc({ categories: ["javascript"] });
    const score = scoreDocument(["javascript"], doc);
    expect(score).toBeGreaterThanOrEqual(4);
  });

  it("should score tags with weight 3", () => {
    const doc = makeDoc({ tags: ["tutorial"] });
    const score = scoreDocument(["tutorial"], doc);
    expect(score).toBeGreaterThanOrEqual(3);
  });

  it("should score excerpt with weight 3", () => {
    const doc = makeDoc({ excerpt: "A great introduction to Vue" });
    const score = scoreDocument(["vue"], doc);
    expect(score).toBeGreaterThanOrEqual(3);
  });

  it("should accumulate score when token appears in multiple fields", () => {
    const doc = makeDoc({
      title: "React Tutorial",
      content: "Learn React step by step",
      excerpt: "React guide for beginners",
      keyPoints: ["React fundamentals"],
      tags: ["react"],
      categories: ["frontend"],
    });
    const score = scoreDocument(["react"], doc);
    // react appears in title(8) + content(1) + excerpt(3) + keyPoints(5) + tags(3) = 20
    expect(score).toBeGreaterThanOrEqual(20);
  });

  it("should return 0 when no tokens match any field", () => {
    const doc = makeDoc({ title: "Hello World", content: "foo bar" });
    expect(scoreDocument(["xyz"], doc)).toBe(0);
  });

  it("should use IDF weight from map when provided", () => {
    const doc = makeDoc({ title: "TypeScript Guide" });
    const idfMap = makeIDFMap([["typescript", 3.0]]);
    const scoreWithIDF = scoreDocument(["typescript"], doc, idfMap);
    // title weight 8 * IDF 3.0 = 24
    expect(scoreWithIDF).toBeGreaterThanOrEqual(24);
  });

  it("should use default IDF of 1 when no map provided", () => {
    const doc = makeDoc({ title: "TypeScript Guide" });
    const score = scoreDocument(["typescript"], doc);
    // title weight 8 * default IDF 1 = 8
    expect(score).toBeGreaterThanOrEqual(8);
  });

  it("should use default IDF for unknown tokens in map", () => {
    const doc = makeDoc({ title: "ObscureTerm" });
    const idfMap = makeIDFMap([["common", 0.5]]);
    const score = scoreDocument(["obscureterm"], doc, idfMap);
    // Unknown token gets default: log(docCount+1)+1 = log(101)+1 ≈ 5.6
    // title weight 8 * ~5.6 ≈ 44.8
    expect(score).toBeGreaterThan(8);
  });

  it("should skip empty string tokens", () => {
    const doc = makeDoc({ title: "Hello" });
    const score = scoreDocument(["", "hello"], doc);
    // Only "hello" contributes; empty string is skipped
    expect(score).toBeGreaterThanOrEqual(8);
  });

  it("should only consider first 500 chars of content", () => {
    const shortContent = "TypeScript is mentioned in the beginning";
    const longContent = shortContent + "x".repeat(600) + "TypeScriptAtTheEnd";
    const docShort = makeDoc({ content: shortContent });
    const docLong = makeDoc({ content: longContent });

    const scoreShort = scoreDocument(["typescript"], docShort);
    const scoreLong = scoreDocument(["typescriptattheend"], docLong);
    // "typescriptattheend" is beyond 500 chars — should not match
    expect(scoreLong).toBe(0);
    expect(scoreShort).toBeGreaterThan(0);
  });

  it("should handle case-insensitive matching via normalization", () => {
    const doc = makeDoc({ title: "ADVANCED REACT PATTERNS" });
    const score = scoreDocument(["react"], doc);
    expect(score).toBeGreaterThan(0);
  });
});

// ── filterLowRelevance ─────────────────────────────────────────

describe("filterLowRelevance", () => {
  it("should return all results when 2 or fewer items", () => {
    const results = [
      { score: 10, id: "a" },
      { score: 1, id: "b" },
    ];
    expect(filterLowRelevance(results)).toEqual(results);
  });

  it("should return single item as-is", () => {
    const results = [{ score: 5, id: "a" }];
    expect(filterLowRelevance(results)).toEqual(results);
  });

  it("should return empty array as-is", () => {
    expect(filterLowRelevance([])).toEqual([]);
  });

  it("should always keep top 2 results regardless of score", () => {
    const results = [
      { score: 100, id: "a" },
      { score: 5, id: "b" },
      { score: 3, id: "c" },
      { score: 1, id: "d" },
    ];
    const filtered = filterLowRelevance(results);
    expect(filtered[0]).toEqual(results[0]);
    expect(filtered[1]).toEqual(results[1]);
  });

  it("should filter results below absolute threshold", () => {
    const results = [
      { score: 100, id: "a" },
      { score: 90, id: "b" },
      { score: 1, id: "c" },
    ];
    const filtered = filterLowRelevance(results);
    // minAbsoluteScore=2 by default, c has score 1 < 2
    expect(filtered.find(r => r.id === "c")).toBeUndefined();
  });

  it("should filter results below relative threshold", () => {
    const results = [
      { score: 100, id: "a" },
      { score: 90, id: "b" },
      { score: 34, id: "c" }, // 34 < 100 * 0.35 = 35
      { score: 40, id: "d" }, // 40 >= 35
    ];
    const filtered = filterLowRelevance(results);
    expect(filtered.find(r => r.id === "c")).toBeUndefined();
    expect(filtered.find(r => r.id === "d")).toBeDefined();
  });

  it("should use higher threshold when more than 8 results", () => {
    const results = Array.from({ length: 10 }, (_, i) => ({
      score: 100 - i * 5,
      id: `item-${i}`,
    }));
    // relativeThreshold + 0.1 = 0.45 → threshold = max(2, 100 * 0.45) = 45
    const filtered = filterLowRelevance(results);
    // Top 2 always kept; remaining must have score >= 45
    for (let i = 2; i < filtered.length; i++) {
      expect(filtered[i].score).toBeGreaterThanOrEqual(45);
    }
  });

  it("should return all results when top score is 0 or negative", () => {
    const results = [
      { score: 0, id: "a" },
      { score: 0, id: "b" },
      { score: 0, id: "c" },
    ];
    expect(filterLowRelevance(results)).toEqual(results);
  });

  it("should respect custom relativeThreshold", () => {
    const results = [
      { score: 100, id: "a" },
      { score: 90, id: "b" },
      { score: 20, id: "c" },
      { score: 30, id: "d" },
    ];
    const filtered = filterLowRelevance(results, 0.25);
    // threshold = max(2, 100 * 0.25) = 25
    expect(filtered.find(r => r.id === "c")).toBeUndefined();
    expect(filtered.find(r => r.id === "d")).toBeDefined();
  });

  it("should respect custom minAbsoluteScore", () => {
    const results = [
      { score: 100, id: "a" },
      { score: 90, id: "b" },
      { score: 5, id: "c" },
    ];
    const filtered = filterLowRelevance(results, 0.35, 10);
    // threshold = max(10, 100 * 0.35) = 35; c has score 5
    expect(filtered.find(r => r.id === "c")).toBeUndefined();
  });
});

// ── pickAnchorTerms ────────────────────────────────────────────

describe("pickAnchorTerms", () => {
  it("should return tokenized terms up to maxTerms", () => {
    const result = pickAnchorTerms("hello world", [], 2);
    expect(result.length).toBeLessThanOrEqual(2);
    expect(result).toContain("hello");
    expect(result).toContain("world");
  });

  it("should return empty array for empty query", () => {
    expect(pickAnchorTerms("", [])).toEqual([]);
  });

  it("should return terms as-is when count <= maxTerms", () => {
    const result = pickAnchorTerms("react vue", []);
    expect(result).toEqual(["react", "vue"]);
  });

  it("should limit to maxTerms", () => {
    const result = pickAnchorTerms("a big query with many terms", [], 3);
    expect(result.length).toBeLessThanOrEqual(3);
  });

  it("should filter terms shorter than minTermLength", () => {
    const result = pickAnchorTerms("I am go", [], 5, 3);
    // "I" (len 1), "am" (len 2), "go" (len 2) — all filtered by minTermLength=3
    expect(result).toEqual([]);
  });

  it("should score terms by specificity against candidates", () => {
    const candidates = [
      {
        title: "React Tutorial",
        keyPoints: ["Learn React"],
        categories: ["frontend"],
      },
      {
        title: "Vue Guide",
        keyPoints: ["Learn Vue"],
        categories: ["frontend"],
      },
    ];
    const result = pickAnchorTerms("react vue angular tutorial", candidates, 2);
    // "react" and "vue" hit candidates, "angular" does not
    // "tutorial" also hits but "react"/"vue" may have higher specificity
    expect(result.length).toBeLessThanOrEqual(2);
    // At least one of react/vue should be picked (they hit candidates)
    const reactOrVue = result.some(t => t === "react" || t === "vue");
    expect(reactOrVue).toBe(true);
  });

  it("should exclude terms that hit zero candidates", () => {
    const candidates = [
      { title: "React Tutorial", keyPoints: [], categories: [] },
    ];
    // Need > maxTerms terms to trigger scoring path
    const result = pickAnchorTerms(
      "react vue angular obscurexyz",
      candidates,
      2
    );
    // "obscurexyz" hits 0 candidates → NEGATIVE_INFINITY → excluded
    expect(result).not.toContain("obscurexyz");
  });

  it("should return first maxTerms when no candidates provided", () => {
    const result = pickAnchorTerms("one two three four", [], 2);
    expect(result.length).toBe(2);
  });

  it("should prefer terms with higher specificity (fewer candidate hits)", () => {
    const candidates = [
      { title: "React Vue", keyPoints: [], categories: [] },
      { title: "React Only", keyPoints: [], categories: [] },
    ];
    const result = pickAnchorTerms("react vue", candidates, 1);
    // "vue" hits 1/2 candidates (higher specificity), "react" hits 2/2 (lower specificity)
    // vue: specificity = 1 - 0.5 = 0.5, react: specificity = 1 - 1.0 = 0.0
    // With length bonus, vue should win
    expect(result.length).toBe(1);
  });

  it("should handle candidates with empty fields", () => {
    const candidates = [{ title: "", keyPoints: [], categories: [] }];
    // Need > maxTerms terms to trigger scoring path
    const result = pickAnchorTerms("react vue angular svelte", candidates, 2);
    // No candidate has any text, so all terms get 0 hits → excluded
    expect(result).toEqual([]);
  });

  it("should use default maxTerms of 2", () => {
    const result = pickAnchorTerms("one two three four five", []);
    expect(result.length).toBeLessThanOrEqual(2);
  });

  it("should use default minTermLength of 2", () => {
    const result = pickAnchorTerms("I like typescript", [], 5);
    // "I" is length 1, filtered by default minTermLength=2
    expect(result).not.toContain("i");
  });
});

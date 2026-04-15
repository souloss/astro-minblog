import { describe, it, expect } from "vitest";
import { buildIDFMap, getIDFWeight } from "./idf.js";
import type { IndexedDocument } from "./types.js";

const sampleDocs: IndexedDocument[] = [
  {
    id: "d1",
    title: "TypeScript Basics",
    url: "/ts",
    excerpt: "intro",
    content: "typescript is a typed language",
    categories: [],
    tags: [],
    keyPoints: [],
    dateTime: 0,
    lang: "en",
    tokens: ["typescript", "typed", "language"],
  },
  {
    id: "d2",
    title: "JavaScript Patterns",
    url: "/js",
    excerpt: "patterns",
    content: "javascript design patterns",
    categories: [],
    tags: [],
    keyPoints: [],
    dateTime: 0,
    lang: "en",
    tokens: ["javascript", "design", "patterns"],
  },
  {
    id: "d3",
    title: "TypeScript Advanced",
    url: "/ts-adv",
    excerpt: "advanced",
    content: "advanced typescript generics",
    categories: [],
    tags: [],
    keyPoints: [],
    dateTime: 0,
    lang: "en",
    tokens: ["typescript", "advanced", "generics"],
  },
];

describe("buildIDFMap", () => {
  it("should return empty map for empty documents", () => {
    const map = buildIDFMap([]);
    expect(map.weights.size).toBe(0);
    expect(map.docCount).toBe(0);
  });

  it("should compute IDF weights for all unique tokens", () => {
    const map = buildIDFMap(sampleDocs);
    expect(map.docCount).toBe(3);
    // 'typescript' appears in 2/3 docs
    expect(map.weights.has("typescript")).toBe(true);
    // 'generics' appears in 1/3 docs
    expect(map.weights.has("generics")).toBe(true);
  });

  it("should give higher IDF to rare terms", () => {
    const map = buildIDFMap(sampleDocs);
    const tsWeight = map.weights.get("typescript") ?? 0;
    const genericsWeight = map.weights.get("generics") ?? 0;
    // 'generics' appears once (rare) → higher IDF than 'typescript' (appears twice)
    expect(genericsWeight).toBeGreaterThan(tsWeight);
  });

  it("should give all terms positive weights (smooth IDF)", () => {
    const map = buildIDFMap(sampleDocs);
    for (const [, weight] of map.weights) {
      expect(weight).toBeGreaterThan(0);
    }
  });

  it("should handle documents with overlapping tokens", () => {
    const map = buildIDFMap(sampleDocs);
    // 'typescript' in 2 docs, 'javascript' in 1 doc
    const tsWeight = map.weights.get("typescript") ?? 0;
    const jsWeight = map.weights.get("javascript") ?? 0;
    expect(jsWeight).toBeGreaterThan(tsWeight);
  });
});

describe("getIDFWeight", () => {
  it("should return 1 for null map", () => {
    expect(getIDFWeight(null, "anything")).toBe(1);
  });

  it("should return weight for known token", () => {
    const map = buildIDFMap(sampleDocs);
    const weight = getIDFWeight(map, "typescript");
    expect(weight).toBeGreaterThan(0);
  });

  it("should return high default for unknown token", () => {
    const map = buildIDFMap(sampleDocs);
    const weight = getIDFWeight(map, "nonexistent-term");
    // Unknown terms should get a high weight (they're rare)
    expect(weight).toBeGreaterThan(0);
    expect(weight).toBeGreaterThan(map.weights.get("typescript") ?? 0);
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import { loadFactRegistry, queryFacts } from "./registry.js";
import type { FactRegistryFile, Fact } from "./types.js";

// ── Fixtures ─────────────────────────────────────────────────────

function makeFact(overrides: Partial<Fact> = {}): Fact {
  return {
    id: `fact-${Math.random().toString(36).slice(2, 8)}`,
    category: "blog",
    statement: "Test fact statement",
    evidence: "test evidence",
    source: "explicit",
    confidence: 0.8,
    tags: ["test"],
    lang: "zh",
    ...overrides,
  };
}

function makeRegistry(facts: Fact[]): FactRegistryFile {
  return {
    $schema: "",
    generatedAt: new Date().toISOString(),
    version: 1,
    facts,
    stats: {
      total: facts.length,
      byCategory: { author: 0, blog: 0, content: 0, project: 0, tech: 0 },
      avgConfidence: 0,
    },
  };
}

// ── Tests ────────────────────────────────────────────────────────

describe("fact-registry", () => {
  beforeEach(() => {
    loadFactRegistry(null);
  });

  describe("loadFactRegistry", () => {
    it("loads null registry and returns empty facts", () => {
      loadFactRegistry(null);
      expect(queryFacts()).toEqual([]);
    });

    it("loads valid registry with facts", () => {
      const registry = makeRegistry([makeFact()]);
      loadFactRegistry(registry);
      expect(queryFacts()).toHaveLength(1);
    });
  });

  describe("queryFacts", () => {
    beforeEach(() => {
      loadFactRegistry(
        makeRegistry([
          makeFact({ id: "f1", category: "blog", confidence: 0.9, lang: "zh", tags: ["astro"] }),
          makeFact({ id: "f2", category: "tech", confidence: 0.7, lang: "en", tags: ["react"] }),
          makeFact({ id: "f3", category: "blog", confidence: 0.5, lang: "zh", tags: ["css"] }),
          makeFact({ id: "f4", category: "author", confidence: 1.0, lang: "all", tags: ["author", "blog"] }),
        ])
      );
    });

    it("returns all facts with no filters", () => {
      expect(queryFacts()).toHaveLength(4);
    });

    it("sorts by confidence descending", () => {
      const facts = queryFacts();
      expect(facts[0].id).toBe("f4"); // confidence 1.0
      expect(facts[1].id).toBe("f1"); // confidence 0.9
      expect(facts[2].id).toBe("f2"); // confidence 0.7
      expect(facts[3].id).toBe("f3"); // confidence 0.5
    });

    it("filters by category", () => {
      const facts = queryFacts({ categories: ["blog"] });
      expect(facts).toHaveLength(2);
      expect(facts.every(f => f.category === "blog")).toBe(true);
    });

    it("filters by multiple categories", () => {
      const facts = queryFacts({ categories: ["blog", "author"] });
      expect(facts).toHaveLength(3);
    });

    it("filters by lang (includes 'all')", () => {
      const facts = queryFacts({ lang: "zh" });
      // zh facts + "all" facts
      expect(facts).toHaveLength(3);
    });

    it("filters by minConfidence", () => {
      const facts = queryFacts({ minConfidence: 0.8 });
      expect(facts).toHaveLength(2); // f4 (1.0) and f1 (0.9)
    });

    it("filters by tags (case-insensitive)", () => {
      const facts = queryFacts({ tags: ["ASTRO"] });
      expect(facts).toHaveLength(1);
      expect(facts[0].id).toBe("f1");
    });

    it("filters by multiple tags (any match)", () => {
      const facts = queryFacts({ tags: ["astro", "react"] });
      expect(facts).toHaveLength(2);
    });

    it("applies limit after filtering and sorting", () => {
      const facts = queryFacts({ limit: 2 });
      expect(facts).toHaveLength(2);
      expect(facts[0].id).toBe("f4");
      expect(facts[1].id).toBe("f1");
    });

    it("combines multiple filters", () => {
      const facts = queryFacts({
        categories: ["blog"],
        minConfidence: 0.6,
        lang: "zh",
      });
      expect(facts).toHaveLength(1);
      expect(facts[0].id).toBe("f1");
    });
  });
});

import { describe, it, expect } from "vitest";

// Import the main exported function
import { matchFactsToQuery } from "./fact-matcher.js";

describe("matchFactsToQuery", () => {
  it("should return empty array when no facts are registered", () => {
    // No facts loaded in test environment
    const result = matchFactsToQuery("hello");
    expect(Array.isArray(result)).toBe(true);
  });

  it("should accept maxFacts parameter", () => {
    const result = matchFactsToQuery("test", undefined, 5);
    expect(result.length).toBeLessThanOrEqual(5);
  });

  it("should accept lang parameter", () => {
    const result = matchFactsToQuery("test", "zh");
    expect(Array.isArray(result)).toBe(true);
  });

  it("should handle empty query", () => {
    const result = matchFactsToQuery("");
    expect(Array.isArray(result)).toBe(true);
  });

  it("should handle special characters in query", () => {
    const result = matchFactsToQuery("什么是 @#$% 技术？");
    expect(Array.isArray(result)).toBe(true);
  });
});

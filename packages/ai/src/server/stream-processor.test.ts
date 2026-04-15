import { describe, it, expect } from "vitest";
import {
  getStreamResultMetadata,
  streamResultHadToolCalls,
  extractReasoningText,
  parseTokenUsage,
} from "./stream-processor.js";

describe("getStreamResultMetadata", () => {
  it("should return empty object for null", () => {
    expect(getStreamResultMetadata(null)).toEqual({});
  });

  it("should return empty object for non-object", () => {
    expect(getStreamResultMetadata("string")).toEqual({});
    expect(getStreamResultMetadata(42)).toEqual({});
  });

  it("should extract metadata from result object", () => {
    const usage = Promise.resolve({ inputTokens: 10, outputTokens: 20 });
    const reasoning = Promise.resolve("thinking...");
    const result = { usage, reasoning };
    const meta = getStreamResultMetadata(result);
    expect(meta.usage).toBe(usage);
    expect(meta.reasoning).toBe(reasoning);
  });
});

describe("streamResultHadToolCalls", () => {
  it("should return false for null", () => {
    expect(streamResultHadToolCalls(null)).toBe(false);
  });

  it("should return false for non-object", () => {
    expect(streamResultHadToolCalls("string")).toBe(false);
  });

  it("should return false for result without toolCalls", () => {
    expect(streamResultHadToolCalls({})).toBe(false);
    expect(streamResultHadToolCalls({ steps: [] })).toBe(false);
  });

  it("should detect toolCalls in steps", () => {
    const result = {
      steps: [{ toolCalls: [{ name: "search" }] }],
    };
    expect(streamResultHadToolCalls(result)).toBe(true);
  });

  it("should detect toolCalls directly on result", () => {
    const result = { toolCalls: [{ name: "search" }] };
    expect(streamResultHadToolCalls(result)).toBe(true);
  });

  it("should return false for empty toolCalls", () => {
    expect(streamResultHadToolCalls({ toolCalls: [] })).toBe(false);
    expect(streamResultHadToolCalls({ steps: [{ toolCalls: [] }] })).toBe(false);
  });
});

describe("extractReasoningText", () => {
  it("should extract string reasoning", async () => {
    const result = await extractReasoningText(Promise.resolve("I think this..."));
    expect(result).toBe("I think this...");
  });

  it("should extract array of text objects", async () => {
    const result = await extractReasoningText(
      Promise.resolve([{ text: "Part 1" }, { text: " Part 2" }])
    );
    expect(result).toBe("Part 1 Part 2");
  });

  it("should handle non-text array items", async () => {
    const result = await extractReasoningText(
      Promise.resolve([{ text: "Hello" }, 42, "world"])
    );
    expect(result).toBe("Hello42world");
  });

  it("should return undefined for other types", async () => {
    const result = await extractReasoningText(Promise.resolve(42));
    expect(result).toBeUndefined();
  });

  it("should return undefined on rejection", async () => {
    const result = await extractReasoningText(Promise.reject(new Error("fail")));
    expect(result).toBeUndefined();
  });
});

describe("parseTokenUsage", () => {
  it("should parse usage with all fields", async () => {
    const result = await parseTokenUsage(
      Promise.resolve({ inputTokens: 100, outputTokens: 50, totalTokens: 150 })
    );
    expect(result).toEqual({ total: 150, input: 100, output: 50 });
  });

  it("should calculate total when missing", async () => {
    const result = await parseTokenUsage(
      Promise.resolve({ inputTokens: 100, outputTokens: 50 })
    );
    expect(result).toEqual({ total: 150, input: 100, output: 50 });
  });

  it("should default tokens to 0", async () => {
    const result = await parseTokenUsage(Promise.resolve({}));
    expect(result).toEqual({ total: 0, input: 0, output: 0 });
  });

  it("should return undefined on rejection", async () => {
    const result = await parseTokenUsage(Promise.reject(new Error("fail")));
    expect(result).toBeUndefined();
  });
});

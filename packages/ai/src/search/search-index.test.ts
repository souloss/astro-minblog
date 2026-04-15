import { describe, it, expect, afterEach } from "vitest";
import { buildSearchIndex, getIDFMapForIndex, resetIDFMap } from "./search-index.js";
import type { SearchDocument } from "./types.js";

const sampleDocs: SearchDocument[] = [
  {
    id: "doc-1",
    title: "TypeScript Patterns",
    url: "/ts-patterns",
    excerpt: "Common patterns in TypeScript",
    content: "TypeScript design patterns include factory, singleton, and observer patterns",
    categories: ["programming"],
    tags: ["typescript", "patterns"],
    keyPoints: ["factory pattern", "singleton pattern"],
    dateTime: 0,
    lang: "en",
  },
  {
    id: "doc-2",
    title: "React Hooks Guide",
    url: "/react-hooks",
    excerpt: "Guide to React hooks",
    content: "React hooks allow functional components to manage state and side effects",
    categories: ["frontend"],
    tags: ["react", "hooks"],
    keyPoints: ["useState", "useEffect"],
    dateTime: 0,
    lang: "en",
  },
];

afterEach(() => {
  resetIDFMap();
});

describe("buildSearchIndex", () => {
  it("should index documents and return indexed results", () => {
    const indexed = buildSearchIndex(sampleDocs);
    expect(indexed).toHaveLength(2);
    expect(indexed[0]?.tokens).toBeDefined();
    expect(indexed[0]?.tokens.length).toBeGreaterThan(0);
  });

  it("should build IDF map from non-empty document set", () => {
    buildSearchIndex(sampleDocs);
    const idfMap = getIDFMapForIndex();
    expect(idfMap).not.toBeNull();
    expect(idfMap!.docCount).toBe(2);
    expect(idfMap!.weights.size).toBeGreaterThan(0);
  });

  it("should NOT overwrite IDF map with empty document set", () => {
    buildSearchIndex(sampleDocs);
    const idfBefore = getIDFMapForIndex();
    expect(idfBefore).not.toBeNull();

    buildSearchIndex([]); // Empty — should not clear
    const idfAfter = getIDFMapForIndex();
    expect(idfAfter).toBe(idfBefore); // Same reference, not cleared
  });

  it("should return empty IDF map when no documents indexed", () => {
    expect(getIDFMapForIndex()).toBeNull();
  });

  it("should handle documents with empty content", () => {
    const emptyDoc: SearchDocument = {
      id: "empty",
      title: "",
      url: "/empty",
      excerpt: "",
      content: "",
      categories: [],
      tags: [],
      keyPoints: [],
      dateTime: 0,
      lang: "en",
    };
    const indexed = buildSearchIndex([emptyDoc]);
    expect(indexed).toHaveLength(1);
    expect(indexed[0]?.tokens).toBeDefined();
  });
});

describe("resetIDFMap", () => {
  it("should clear the cached IDF map", () => {
    buildSearchIndex(sampleDocs);
    expect(getIDFMapForIndex()).not.toBeNull();

    resetIDFMap();
    expect(getIDFMapForIndex()).toBeNull();
  });
});

describe("getIDFMapForIndex", () => {
  it("should return null when no index has been built", () => {
    expect(getIDFMapForIndex()).toBeNull();
  });

  it("should return IDF map after building index", () => {
    buildSearchIndex(sampleDocs);
    const map = getIDFMapForIndex();
    expect(map).not.toBeNull();
    expect(map!.weights).toBeInstanceOf(Map);
    expect(map!.docCount).toBe(2);
  });
});

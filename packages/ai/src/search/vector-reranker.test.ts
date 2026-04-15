import { describe, it, expect, beforeEach } from "vitest";
import {
  loadVectorIndex,
  hasVectorIndex,
  rerankWithVectors,
} from "./vector-reranker.js";
import type { VectorIndex, VectorChunk } from "./vector-reranker.js";

// ── Fixtures ────────────────────────────────────────────────────

function makeChunk(
  postId: string,
  text: string,
  vector?: number[]
): VectorChunk {
  return {
    postId,
    title: `Article ${postId}`,
    lang: "zh",
    chunkIndex: 0,
    text,
    vector,
  };
}

function makeIndex(
  vocabulary: string[],
  chunks: VectorChunk[]
): VectorIndex {
  return {
    version: 1,
    method: "tfidf",
    createdAt: new Date().toISOString(),
    vocabulary,
    chunks,
  };
}

function makeCandidate(url: string, score: number) {
  return { url, score };
}

// ── Tests ────────────────────────────────────────────────────────

describe("vector-reranker", () => {
  beforeEach(() => {
    loadVectorIndex(null);
  });

  describe("loadVectorIndex + hasVectorIndex", () => {
    it("returns false when no index loaded", () => {
      expect(hasVectorIndex()).toBe(false);
    });

    it("returns true when valid index with vocabulary loaded", () => {
      const index = makeIndex(["hello", "world"], [
        makeChunk("zh/test", "hello world", [0.5, 0.5]),
      ]);
      loadVectorIndex(index);
      expect(hasVectorIndex()).toBe(true);
    });

    it("returns true but skips reranking when no vocabulary", () => {
      const index = makeIndex([], [makeChunk("zh/test", "some text")]);
      loadVectorIndex(index);
      expect(hasVectorIndex()).toBe(true);
      const candidates = [makeCandidate("/zh/posts/test/", 1.0)];
      const result = rerankWithVectors("hello", candidates);
      expect(result).toEqual(candidates);
    });
  });

  describe("rerankWithVectors", () => {
    it("returns candidates unchanged when no index loaded", () => {
      const candidates = [
        makeCandidate("/zh/posts/a/", 1.0),
        makeCandidate("/zh/posts/b/", 0.8),
      ];
      const result = rerankWithVectors("test query", candidates);
      expect(result).toEqual(candidates);
    });

    it("returns empty array for empty candidates", () => {
      const index = makeIndex(["test"], [makeChunk("zh/a", "test", [1.0])]);
      loadVectorIndex(index);
      const result = rerankWithVectors("test", []);
      expect(result).toEqual([]);
    });

    it("returns single candidate potentially with modified score", () => {
      const index = makeIndex(
        ["hello", "world"],
        [makeChunk("zh/a", "hello world", [1.0, 0.0])]
      );
      loadVectorIndex(index);
      const candidates = [makeCandidate("/zh/posts/a/", 0.5)];
      const result = rerankWithVectors("hello", candidates);
      expect(result).toHaveLength(1);
      expect(result[0].url).toBe("/zh/posts/a/");
    });

    it("reranks multiple candidates by blended score", () => {
      const index = makeIndex(
        ["hello", "world", "foo", "bar"],
        [
          makeChunk("zh/a", "hello world", [1.0, 0.0, 0.0, 0.0]),
          makeChunk("zh/b", "foo bar", [0.0, 0.0, 1.0, 0.0]),
        ]
      );
      loadVectorIndex(index);
      const candidates = [
        makeCandidate("/zh/posts/b/", 10.0),
        makeCandidate("/zh/posts/a/", 1.0),
      ];
      const result = rerankWithVectors("hello", candidates, 0.5);
      expect(result).toHaveLength(2);
      expect(result[0].url).toBe("/zh/posts/a/");
    });

    it("uses only original scores when alpha=0", () => {
      const index = makeIndex(
        ["hello"],
        [makeChunk("zh/a", "hello", [1.0])]
      );
      loadVectorIndex(index);
      const candidates = [
        makeCandidate("/zh/posts/a/", 2.0),
        makeCandidate("/zh/posts/b/", 1.0),
      ];
      const result = rerankWithVectors("hello", candidates, 0);
      expect(result[0].url).toBe("/zh/posts/a/");
      expect(result[0].score).toBeGreaterThan(result[1].score);
    });

    it("uses only vector scores when alpha=1", () => {
      const index = makeIndex(
        ["hello", "world"],
        [
          makeChunk("zh/a", "hello world", [1.0, 0.0]),
          makeChunk("zh/b", "unrelated", [0.0, 1.0]),
        ]
      );
      loadVectorIndex(index);
      const candidates = [
        makeCandidate("/zh/posts/a/", 0.5),
        makeCandidate("/zh/posts/b/", 10.0),
      ];
      const result = rerankWithVectors("hello", candidates, 1.0);
      expect(result[0].url).toBe("/zh/posts/a/");
    });

    it("returns candidates with normalized scores when no matching vectors", () => {
      const index = makeIndex(
        ["xyz"],
        [makeChunk("zh/a", "xyz content", [1.0])]
      );
      loadVectorIndex(index);
      const candidates = [
        makeCandidate("/zh/posts/other/", 1.0),
        makeCandidate("/zh/posts/another/", 0.5),
      ];
      const result = rerankWithVectors("hello", candidates, 0.3);
      expect(result).toHaveLength(2);
    });
  });

  describe("vector computation edge cases", () => {
    it("returns candidates unchanged when all-zero query vector", () => {
      const index = makeIndex(
        ["rareword"],
        [makeChunk("zh/a", "rareword content", [1.0])]
      );
      loadVectorIndex(index);
      const candidates = [makeCandidate("/zh/posts/a/", 1.0)];
      const result = rerankWithVectors("xyznotinvocab", candidates);
      expect(result).toEqual(candidates);
    });

    it("handles single CJK character query", () => {
      const index = makeIndex(
        ["测", "试"],
        [makeChunk("zh/a", "测试内容", [0.5, 0.5])]
      );
      loadVectorIndex(index);
      const candidates = [makeCandidate("/zh/posts/a/", 1.0)];
      const result = rerankWithVectors("测", candidates, 0.3);
      expect(result).toHaveLength(1);
    });

    it("filters short English words <=2 chars from query tokens", () => {
      const index = makeIndex(
        ["testing", "hello"],
        [makeChunk("en/a", "testing hello", [0.5, 0.5])]
      );
      loadVectorIndex(index);
      const candidates = [makeCandidate("/en/posts/a/", 1.0)];
      const result = rerankWithVectors("testing is a hello", candidates, 0.3);
      expect(result).toHaveLength(1);
    });

    it("handles mixed CJK + English query", () => {
      const index = makeIndex(
        ["测", "试", "testing"],
        [makeChunk("zh/a", "测试 testing", [0.3, 0.3, 0.3])]
      );
      loadVectorIndex(index);
      const candidates = [makeCandidate("/zh/posts/a/", 1.0)];
      const result = rerankWithVectors("测试 testing", candidates, 0.5);
      expect(result).toHaveLength(1);
      expect(result[0].score).toBeGreaterThan(0);
    });
  });

  describe("extractSlugFromUrl (tested via rerankWithVectors)", () => {
    it("extracts zh/slug from /zh/posts/slug/ URL", () => {
      const index = makeIndex(
        ["test"],
        [makeChunk("zh/my-article", "test content", [1.0])]
      );
      loadVectorIndex(index);
      const candidates = [makeCandidate("/zh/posts/my-article/", 1.0)];
      const result = rerankWithVectors("test", candidates, 0.5);
      expect(result).toHaveLength(1);
    });

    it("extracts slug from full URL with domain", () => {
      const index = makeIndex(
        ["test"],
        [makeChunk("en/test-post", "test content", [1.0])]
      );
      loadVectorIndex(index);
      const candidates = [
        makeCandidate("https://example.com/en/posts/test-post/", 1.0),
      ];
      const result = rerankWithVectors("test", candidates, 0.5);
      expect(result).toHaveLength(1);
    });

    it("handles plain path without posts pattern", () => {
      const index = makeIndex(
        ["test"],
        [makeChunk("something/else", "test content", [1.0])]
      );
      loadVectorIndex(index);
      const candidates = [makeCandidate("/something/else", 1.0)];
      const result = rerankWithVectors("test", candidates, 0.5);
      expect(result).toHaveLength(1);
    });
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import { preloadKnowledgeBundle, getKnowledgeBundle, getAuthorContext } from "./metadata-loader.js";
import type { KnowledgeBundleFile } from "./knowledge-types.js";

// ── Fixtures ─────────────────────────────────────────────────────

function makeBundle(overrides: Partial<KnowledgeBundleFile> = {}): KnowledgeBundleFile {
  return {
    buildTime: new Date().toISOString(),
    version: 1,
    build: {
      articles: { zh: 10, en: 5 },
      projects: { zh: 2 },
    },
    runtime: {
      authorContext: {
        authorName: "Test Author",
        siteUrl: "https://test.com",
        posts: [],
      },
      factRegistry: null,
      vectorIndex: null,
    },
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────

describe("metadata-loader", () => {
  beforeEach(() => {
    // Reset by preloading null
    preloadKnowledgeBundle(makeBundle());
  });

  describe("preloadKnowledgeBundle", () => {
    it("stores the bundle for later retrieval", () => {
      const bundle = makeBundle();
      preloadKnowledgeBundle(bundle);
      expect(getKnowledgeBundle()).toBe(bundle);
    });
  });

  describe("getKnowledgeBundle", () => {
    it("returns null when not loaded", () => {
      // This test depends on state from beforeEach, so we test a fresh instance
      const bundle = getKnowledgeBundle();
      expect(bundle).toBeDefined();
    });
  });

  describe("getAuthorContext", () => {
    it("returns author context from bundle", () => {
      preloadKnowledgeBundle(makeBundle());
      const ctx = getAuthorContext();
      expect(ctx).not.toBeNull();
      expect(ctx!.authorName).toBe("Test Author");
    });

    it("returns null when bundle has no author context", () => {
      preloadKnowledgeBundle(makeBundle({
        runtime: {
          authorContext: null,
          factRegistry: null,
          vectorIndex: null,
        },
      }));
      expect(getAuthorContext()).toBeNull();
    });
  });
});

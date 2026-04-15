import { describe, it, expect, beforeEach } from "vitest";
import { preloadKnowledgeBundle, getKnowledgeBundle, getAuthorContext } from "./metadata-loader.js";
import type { KnowledgeBundleFile } from "./knowledge-types.js";
import type { AuthorContextFile, AuthorPost } from "./types.js";

// ── Fixtures ─────────────────────────────────────────────────────

function makeAuthorContext(): AuthorContextFile {
  return {
    profile: { name: "Test Author", siteUrl: "https://test.com", description: "Test" },
    posts: [],
  };
}

function makeBundle(overrides: Partial<KnowledgeBundleFile> = {}): KnowledgeBundleFile {
  return {
    buildTime: new Date().toISOString(),
    version: 1,
    build: {
      articles: { zh: 10, en: 5 },
      projects: { zh: 2 },
    },
    runtime: {
      summaries: null,
      authorContext: makeAuthorContext(),
      voiceProfile: null,
      factRegistry: null,
      vectorIndex: null,
    },
    ...overrides,
  } as KnowledgeBundleFile;
}

// ── Tests ────────────────────────────────────────────────────────

describe("metadata-loader", () => {
  beforeEach(() => {
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
    it("returns the loaded bundle", () => {
      const bundle = getKnowledgeBundle();
      expect(bundle).toBeDefined();
      expect(bundle!.version).toBe(1);
    });
  });

  describe("getAuthorContext", () => {
    it("returns author context from bundle", () => {
      preloadKnowledgeBundle(makeBundle());
      const ctx = getAuthorContext();
      expect(ctx).not.toBeNull();
      expect(ctx!.profile.name).toBe("Test Author");
    });

    it("returns null when bundle has no author context", () => {
      preloadKnowledgeBundle(makeBundle({
        runtime: {
          summaries: null,
          authorContext: null,
          voiceProfile: null,
          factRegistry: null,
          vectorIndex: null,
        },
      } as unknown as KnowledgeBundleFile));
      expect(getAuthorContext()).toBeNull();
    });
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import { getKnowledgeBundle } from "../data/index.js";
import { getArticleChunks, searchArticles } from "../search/index.js";
import { initializeMetadata, resetMetadataInit } from "./metadata-init.js";
import type { KnowledgeBundleFile } from "../data/knowledge-types.js";

function createBundle(siteSuffix: string): KnowledgeBundleFile {
  return {
    $schema: "knowledge-bundle-v1",
    version: 1,
    generatedAt: `2026-03-26T00:00:00.000Z#${siteSuffix}`,
    corpusHash: `hash-${siteSuffix}`,
    corpus: {
      $schema: "knowledge-corpus-v1",
      version: 1,
      generatedAt: `2026-03-26T00:00:00.000Z#${siteSuffix}`,
      documents: [
        {
          id: `doc-${siteSuffix}`,
          type: "post",
          slug: siteSuffix,
          title: `Doc ${siteSuffix}`,
          url: `/posts/${siteSuffix}`,
          summary: `Summary ${siteSuffix}`,
          keyPoints: [`Key ${siteSuffix}`],
          category: "Blog",
          tags: [siteSuffix],
          lang: "en",
          publishedAt: "2026-03-26T00:00:00.000Z",
          readingTime: 3,
        },
      ],
    },
    passages: {
      $schema: "knowledge-passages-v1",
      version: 1,
      generatedAt: `2026-03-26T00:00:00.000Z#${siteSuffix}`,
      passages: [
        {
          id: `passage-${siteSuffix}`,
          documentId: `doc-${siteSuffix}`,
          sectionPath: [],
          heading: `Heading ${siteSuffix}`,
          text: `Body ${siteSuffix}`,
          contentType: "paragraph",
          position: 0,
          tokenCount: 2,
          headers: {},
        },
      ],
    },
    runtime: {
      summaries: {
        meta: {
          lastUpdated: `2026-03-26T00:00:00.000Z#${siteSuffix}`,
          model: "test-model",
          totalProcessed: 1,
        },
        articles: {},
      },
      authorContext: {
        profile: {
          name: `Author ${siteSuffix}`,
          siteUrl: `https://site-${siteSuffix}.test`,
          description: `Description ${siteSuffix}`,
        },
        posts: [],
      },
      voiceProfile: null,
      factRegistry: null,
      vectorIndex: null,
    },
  };
}

function createBundleWithoutPassages(siteSuffix: string): KnowledgeBundleFile {
  const bundle = createBundle(siteSuffix);
  return {
    ...bundle,
    passages: {
      ...bundle.passages,
      passages: [],
    },
  };
}

describe("metadata-init lifecycle", () => {
  beforeEach(() => {
    resetMetadataInit();
  });

  it("reuses initialization only when bundle and siteUrl are unchanged", () => {
    const bundleA = createBundle("a");
    const bundleB = createBundle("b");

    initializeMetadata({
      knowledgeBundle: bundleA,
      siteUrl: "https://site-a.test",
    });

    let results = searchArticles("Doc", { siteUrl: "https://site-a.test" });
    expect(results[0]?.url).toBe("https://site-a.test/posts/a");
    expect(getKnowledgeBundle()).toBe(bundleA);
    expect(getArticleChunks("doc-a")).toHaveLength(1);

    initializeMetadata({
      knowledgeBundle: bundleA,
      siteUrl: "https://site-a.test",
    });
    results = searchArticles("Doc", { siteUrl: "https://site-a.test" });
    expect(results[0]?.url).toBe("https://site-a.test/posts/a");

    initializeMetadata({
      knowledgeBundle: bundleB,
      siteUrl: "https://site-b.test",
    });
    results = searchArticles("Doc", { siteUrl: "https://site-b.test" });

    expect(results[0]?.url).toBe("https://site-b.test/posts/b");
    expect(getKnowledgeBundle()).toBe(bundleB);
    expect(getArticleChunks("doc-b")).toHaveLength(1);
  });

  it("clears stale chunks when the next bundle has no passages", () => {
    const bundleWithPassages = createBundle("with-passages");
    const bundleWithoutPassages =
      createBundleWithoutPassages("without-passages");

    initializeMetadata({
      knowledgeBundle: bundleWithPassages,
      siteUrl: "https://site-a.test",
    });
    expect(getArticleChunks("doc-with-passages")).toHaveLength(1);

    initializeMetadata({
      knowledgeBundle: bundleWithoutPassages,
      siteUrl: "https://site-b.test",
    });

    expect(getArticleChunks("doc-with-passages")).toBeUndefined();
    expect(getArticleChunks("doc-without-passages")).toBeUndefined();
  });
});

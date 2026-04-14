import { preloadKnowledgeBundle, getKnowledgeBundle } from "../data/index.js";
import {
  initArticleIndex,
  initProjectIndex,
  initArticleChunks,
} from "../search/index.js";
import { getExtensionRegistry } from "../extensions/index.js";
import { safeJoinUrl } from "../utils/url.js";
import { createLogger } from "../utils/logger.js";
import type {
  KnowledgeBundleFile,
  KnowledgeDocument,
  KnowledgePassage,
} from "../data/knowledge-types.js";
import type { SearchDocument, ArticleChunk } from "../search/types.js";
import type { MetadataConfig, ChatHandlerEnv } from "./types.js";

let initialized = false;
let extensionsLoaded = false;
let initializedBundleRef: unknown = null;
let initializedSiteUrl = "";

type LoadedKnowledgeBundle = NonNullable<KnowledgeBundleFile>;

const log = createLogger("metadata-init");

export function initializeMetadata(
  config: MetadataConfig,
  env?: ChatHandlerEnv
): void {
  const siteUrl = config.siteUrl ?? (env?.SITE_URL as string | undefined) ?? "";
  const bundleRef = config.knowledgeBundle;

  if (
    initialized &&
    initializedBundleRef === bundleRef &&
    initializedSiteUrl === siteUrl
  ) {
    return;
  }

  initialized = true;
  initializedBundleRef = bundleRef;
  initializedSiteUrl = siteUrl;

  preloadKnowledgeBundle(
    config.knowledgeBundle as Parameters<typeof preloadKnowledgeBundle>[0]
  );

  const knowledgeBundle = getKnowledgeBundle() as LoadedKnowledgeBundle | null;
  if (!knowledgeBundle) return;

  if (!knowledgeBundle.corpus?.documents) {
    log.warn("No corpus found in knowledge bundle");
    return;
  }

  const articleDocs: SearchDocument[] = knowledgeBundle.corpus.documents.map(
    (doc: KnowledgeDocument) => ({
      id: doc.id,
      title: doc.title,
      url: safeJoinUrl(siteUrl, doc.url ?? `/${doc.id}`),
      excerpt: doc.summary,
      content: doc.keyPoints.join(" "),
      categories: [doc.category].filter(Boolean),
      tags: doc.tags ?? [],
      keyPoints: doc.keyPoints ?? [],
      dateTime: doc.publishedAt ? new Date(doc.publishedAt).getTime() : 0,
      lang: doc.lang,
      summary: doc.summary,
      readingTime: doc.readingTime,
    })
  );

  initArticleIndex(articleDocs);
  initProjectIndex([]);

  // Initialize article chunks for paragraph-level retrieval
  if (!knowledgeBundle.passages?.passages) {
    log.warn("No passages found in knowledge bundle");
    return;
  }

  const chunksData: Record<string, ArticleChunk[]> = Object.fromEntries(
    knowledgeBundle.passages.passages.reduce<Map<string, ArticleChunk[]>>(
      (map: Map<string, ArticleChunk[]>, passage: KnowledgePassage) => {
        const list = map.get(passage.documentId) ?? [];
        list.push({
          id: passage.id,
          postId: passage.documentId,
          heading: passage.heading,
          content: passage.text,
          position: passage.position,
          tokenCount: passage.tokenCount,
          headers: passage.headers,
        });
        map.set(passage.documentId, list);
        return map;
      },
      new Map()
    )
  );
  initArticleChunks(chunksData);
}

/**
 * Resets initialization state (for testing).
 */
export function resetMetadataInit(): void {
  initialized = false;
  extensionsLoaded = false;
  initializedBundleRef = null;
  initializedSiteUrl = "";
  getExtensionRegistry().clear();
}

/**
 * Loads extensions from datas/extensions/*.json
 * Returns the loaded extensions for use in chat pipeline.
 */
export async function initializeExtensions(basePath?: string): Promise<void> {
  if (extensionsLoaded) return;

  try {
    const { loadExtensions } = await import("../extensions/loader.js");
    await loadExtensions("datas/extensions/*.json", basePath);
  } catch (e) {
    log.warn(
      "Extension loading failed:",
      e instanceof Error ? e.message : String(e)
    );
    // Extensions directory may not exist, that's fine
  }
  extensionsLoaded = true;
}

/**
 * Checks if extensions have been loaded.
 */
export function areExtensionsLoaded(): boolean {
  return extensionsLoaded;
}

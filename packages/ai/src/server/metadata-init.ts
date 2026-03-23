import {
  preloadMetadata,
  getAuthorContext,
  getAllSummaries,
  initArticleIndex,
  initProjectIndex,
} from '../index.js';
import { getExtensionRegistry } from '../extensions/index.js';
import { safeJoinUrl } from '../utils/url.js';
import type { AuthorPost } from '../data/types.js';
import type { SearchDocument } from '../search/types.js';
import type { MetadataConfig, ChatHandlerEnv } from './types.js';

let initialized = false;
let extensionsLoaded = false;

/**
 * Initializes AI metadata: loads summaries, author context, voice profile,
 * and builds search indices. Safe to call multiple times (idempotent).
 */
export function initializeMetadata(config: MetadataConfig, env?: ChatHandlerEnv): void {
  if (initialized) return;
  initialized = true;

  preloadMetadata({
    summaries: config.summaries as Parameters<typeof preloadMetadata>[0]['summaries'],
    authorContext: config.authorContext as Parameters<typeof preloadMetadata>[0]['authorContext'],
    voiceProfile: config.voiceProfile as Parameters<typeof preloadMetadata>[0]['voiceProfile'],
    factRegistry: (config.factRegistry ?? null) as Parameters<typeof preloadMetadata>[0]['factRegistry'],
    vectorIndex: (config.vectorIndex ?? null) as Parameters<typeof preloadMetadata>[0]['vectorIndex'],
  });

  const authorCtx = getAuthorContext();
  const allSummaries = getAllSummaries();
  const summaryMap = new Map(allSummaries.map(s => [s.slug, s]));

  const siteUrl = config.siteUrl ?? (env?.SITE_URL as string | undefined) ?? '';

  const articleDocs: SearchDocument[] = (authorCtx?.posts ?? []).map((post: AuthorPost) => {
    const summary = summaryMap.get(post.id);
    return {
      id: post.id,
      title: post.title,
      url: safeJoinUrl(siteUrl, post.url ?? `/${post.id}`),
      excerpt: post.summary || summary?.summary || '',
      content: [...(post.keyPoints ?? []), ...(summary?.keyPoints ?? [])].join(' '),
      categories: [post.category].filter(Boolean),
      tags: post.tags ?? [],
      keyPoints: [...(post.keyPoints ?? []), ...(summary?.keyPoints ?? [])],
      dateTime: post.date ? new Date(post.date).getTime() : 0,
      lang: post.lang,
      summary: summary?.summary,
    };
  });

  initArticleIndex(articleDocs);
  initProjectIndex([]);
}

/**
 * Resets initialization state (for testing).
 */
export function resetMetadataInit(): void {
  initialized = false;
  extensionsLoaded = false;
  getExtensionRegistry().clear();
}

/**
 * Loads extensions from datas/extensions/*.json
 * Returns the loaded extensions for use in chat pipeline.
 */
export async function initializeExtensions(basePath?: string): Promise<void> {
  if (extensionsLoaded) return;
  extensionsLoaded = true;

  try {
    const { loadExtensions } = await import('../extensions/loader.js');
    await loadExtensions('datas/extensions/*.json', basePath);
  } catch {
    // Extensions directory may not exist, that's fine
  }
}

/**
 * Checks if extensions have been loaded.
 */
export function areExtensionsLoaded(): boolean {
  return extensionsLoaded;
}

/**
 * AI initialization and configuration for Cloudflare Pages Functions.
 *
 * This module initializes the full RAG pipeline on first call and provides
 * a unified interface for the chat API endpoint.
 */
/// <reference types="@cloudflare/workers-types" />

import {
  createChatProvider,
  hasOpenAIConfig,
  preloadMetadata,
  getAuthorContext,
  initArticleIndex,
  initProjectIndex,
  getAllSummaries,
  type ProviderEnv,
} from '@astro-minimax/ai';
import type { AuthorPost } from '@astro-minimax/ai';
import type { SearchDocument } from '@astro-minimax/ai';

// JSON data imports — bundled at build time by Wrangler
// @ts-expect-error JSON imports work in Cloudflare Workers runtime
import aiSummaries from '../../datas/ai-summaries.json';
// @ts-expect-error JSON imports work in Cloudflare Workers runtime
import authorContext from '../../datas/author-context.json';
// @ts-expect-error JSON imports work in Cloudflare Workers runtime
import voiceProfile from '../../datas/voice-profile.json';

export interface FunctionEnv extends ProviderEnv {
  [key: string]: unknown;
}

let initialized = false;

/**
 * Initializes the RAG pipeline once per Worker isolate.
 * Subsequent calls are no-ops.
 */
function ensureInitialized(env: FunctionEnv): void {
  if (initialized) return;
  initialized = true;

  // Preload all metadata into memory
  preloadMetadata({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    summaries: aiSummaries as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    authorContext: authorContext as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    voiceProfile: voiceProfile as any,
  });

  // Build article search index from AI summaries + author context
  const authorCtx = getAuthorContext();
  const allSummaries = getAllSummaries();
  const summaryMap = new Map(allSummaries.map(s => [s.slug, s]));

  const siteUrl = (env.SITE_URL as string) || '';

  const articleDocs: SearchDocument[] = (authorCtx?.posts ?? []).map((post: AuthorPost) => {
    const summary = summaryMap.get(post.id);
    return {
      id: post.id,
      title: post.title,
      url: post.url || `${siteUrl}/${post.id}`,
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
  initProjectIndex([]); // Projects not in metadata yet — can be extended
}

/**
 * Returns a configured chat provider, initializing the pipeline if needed.
 */
export function getChatProvider(env: FunctionEnv) {
  ensureInitialized(env);
  return createChatProvider(env);
}

/**
 * Returns configuration info for the /api/ai-info endpoint.
 */
export function getAIConfigInfo(env: FunctionEnv) {
  const bindingName = (env.AI_BINDING_NAME as string) || 'AI';
  return {
    bindingName,
    hasBinding: !!(env as Record<string, unknown>)[bindingName],
    hasOpenAIConfig: hasOpenAIConfig(env),
    model: (env.AI_MODEL as string) || '@cf/zai-org/glm-4.7-flash',
  };
}

export type { FunctionEnv as Env };

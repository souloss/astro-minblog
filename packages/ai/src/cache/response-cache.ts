import type { CacheAdapter } from "./types.js";
import type {
  ArticleContext,
  ProjectContext,
  SourceSelection,
} from "../search/types.js";
import type { PublicQuestionType } from "./global-cache.js";
import { createLogger } from "../utils/logger.js";

const log = createLogger("response-cache");

export interface CachedAIResponse {
  query: string;
  thinking?: string;
  response: string;
  articles: ArticleContext[];
  projects: ProjectContext[];
  sources: SourceSelection[];
  lang: string;
  model?: string;
  updatedAt: number;
}

export interface ResponseCacheConfig {
  enabled: boolean;
  defaultTtl: number;
  playbackDelayMs: number;
  chunkSize: number;
  thinkingPlaybackDelayMs: number;
}

export const DEFAULT_RESPONSE_CACHE_CONFIG: ResponseCacheConfig = {
  enabled: false,
  defaultTtl: 3600,
  playbackDelayMs: 20,
  chunkSize: 15,
  thinkingPlaybackDelayMs: 5,
};

export type ResponseCacheEnv = Record<string, unknown>;

export function getResponseCacheConfig(
  env: Record<string, unknown>
): ResponseCacheConfig {
  const parseBool = (val: unknown): boolean => {
    if (val === undefined) return false;
    if (typeof val === "boolean") return val;
    if (typeof val === "string") return val === "true" || val === "1";
    return false;
  };

  const parseNum = (val: unknown, defaultVal: number): number => {
    if (val === undefined) return defaultVal;
    if (typeof val === "number") return val;
    if (typeof val === "string") {
      const num = parseInt(val, 10);
      return isNaN(num) ? defaultVal : num;
    }
    return defaultVal;
  };

  return {
    enabled: parseBool(env.AI_CACHE_ENABLED),
    defaultTtl: parseNum(env.AI_CACHE_TTL, 3600),
    playbackDelayMs: parseNum(env.AI_CACHE_PLAYBACK_DELAY, 20),
    chunkSize: parseNum(env.AI_CACHE_CHUNK_SIZE, 15),
    thinkingPlaybackDelayMs: parseNum(env.AI_CACHE_THINKING_DELAY, 5),
  };
}

const RESPONSE_CACHE_PREFIX = "response";

export function buildResponseCacheKey(
  type: PublicQuestionType,
  context?: { articleSlug?: string; lang?: string; queryKey?: string }
): string {
  const parts = [RESPONSE_CACHE_PREFIX, type];
  if (context?.articleSlug) parts.push(context.articleSlug);
  if (context?.lang) parts.push(context.lang);
  if (context?.queryKey) parts.push(context.queryKey);
  return parts.join(":");
}

export async function getResponseCache(
  cache: CacheAdapter,
  type: PublicQuestionType,
  context?: { articleSlug?: string; lang?: string; queryKey?: string }
): Promise<CachedAIResponse | null> {
  const key = buildResponseCacheKey(type, context);
  const entry = await cache.get<CachedAIResponse>(key);
  log.debug(
    `getResponseCache: key=${key}, hit=${Boolean(entry?.value)}, adapter=${cache.name}`
  );
  return entry?.value ?? null;
}

export async function setResponseCache(
  cache: CacheAdapter,
  type: PublicQuestionType,
  data: CachedAIResponse,
  ttl: number,
  context?: { articleSlug?: string; lang?: string; queryKey?: string }
): Promise<void> {
  const key = buildResponseCacheKey(type, context);
  await cache.set(key, data, { ttl });
  log.debug(
    `setResponseCache: key=${key}, articles=${data.articles.length}, projects=${data.projects.length}, sources=${data.sources.length}, ttl=${ttl}, adapter=${cache.name}`
  );
}

export async function deleteResponseCache(
  cache: CacheAdapter,
  type: PublicQuestionType,
  context?: { articleSlug?: string; lang?: string; queryKey?: string }
): Promise<boolean> {
  const key = buildResponseCacheKey(type, context);
  log.debug(`deleteResponseCache: key=${key}, adapter=${cache.name}`);
  return cache.delete(key);
}

export interface PlaybackChunk {
  type: "thinking" | "response";
  text: string;
}

export function createResponsePlaybackGenerator(
  cached: CachedAIResponse,
  config: Pick<
    ResponseCacheConfig,
    "playbackDelayMs" | "chunkSize" | "thinkingPlaybackDelayMs"
  >
): AsyncGenerator<PlaybackChunk, void, unknown> {
  const { playbackDelayMs, chunkSize, thinkingPlaybackDelayMs } = config;

  return (async function* () {
    if (cached.thinking) {
      const thinkingChunks = Math.ceil(cached.thinking.length / chunkSize);
      for (let i = 0; i < thinkingChunks; i++) {
        const chunk = cached.thinking.slice(i * chunkSize, (i + 1) * chunkSize);
        if (chunk) {
          yield { type: "thinking", text: chunk };
          if (i < thinkingChunks - 1 && thinkingPlaybackDelayMs > 0) {
            await new Promise(resolve =>
              setTimeout(resolve, thinkingPlaybackDelayMs)
            );
          }
        }
      }
    }

    const responseChunks = Math.ceil(cached.response.length / chunkSize);
    for (let i = 0; i < responseChunks; i++) {
      const chunk = cached.response.slice(i * chunkSize, (i + 1) * chunkSize);
      if (chunk) {
        yield { type: "response", text: chunk };
        if (i < responseChunks - 1 && playbackDelayMs > 0) {
          await new Promise(resolve => setTimeout(resolve, playbackDelayMs));
        }
      }
    }
  })();
}

import { MemoryCacheAdapter } from "./memory-adapter.js";
import { KVCacheAdapter } from "./kv-adapter.js";
import type { CacheAdapter, CacheEnv, CacheManagerConfig } from "./types.js";
import { CACHE } from "../constants.js";
import { createLogger } from "../utils/logger.js";

export {
  MemoryCacheAdapter,
  type MemoryCacheOptions,
} from "./memory-adapter.js";

export { KVCacheAdapter, type KVCacheOptions } from "./kv-adapter.js";

export {
  createCacheKeyBuilder,
  type CacheAdapter,
  type CacheEntry,
  type CacheEntryMetadata,
  type CacheSetOptions,
  type CacheGetOptions,
  type CacheManagerConfig,
  type CacheEnv,
  type CachedSearchContext,
  type CacheResult,
  type CacheKeyBuilder,
} from "./types.js";

export {
  detectPublicQuestion,
  buildGlobalCacheKey,
  normalizePublicCacheQuery,
  getGlobalSearchCache,
  setGlobalSearchCache,
  getGlobalCacheTTL,
  PUBLIC_QUESTION_PATTERNS,
  type PublicQuestionType,
  type PublicQuestionPattern,
  type DetectedPublicQuestion,
} from "./global-cache.js";

export {
  getResponseCache,
  setResponseCache,
  deleteResponseCache,
  getResponseCacheConfig,
  buildResponseCacheKey,
  createResponsePlaybackGenerator,
  DEFAULT_RESPONSE_CACHE_CONFIG,
  type CachedAIResponse,
  type ResponseCacheConfig,
  type ResponseCacheEnv,
  type PlaybackChunk,
} from "./response-cache.js";

export { injectionCache, type InjectionCacheEntry } from "./injection-cache.js";

const log = createLogger("cache");

const DEFAULT_TTL = CACHE.DEFAULT_TTL;
const DEFAULT_MAX_ENTRIES = 400;

let globalMemoryCache: MemoryCacheAdapter | null = null;

function getGlobalMemoryCache(
  ttl: number,
  maxEntries: number
): MemoryCacheAdapter {
  if (!globalMemoryCache) {
    globalMemoryCache = new MemoryCacheAdapter({ defaultTtl: ttl, maxEntries });
  }
  return globalMemoryCache;
}

export function createCacheAdapter(
  env: CacheEnv,
  config?: CacheManagerConfig
): CacheAdapter {
  const ttl = config?.defaultTtl ?? parseTtl(env.CACHE_TTL) ?? DEFAULT_TTL;
  const maxEntries = config?.maxEntries ?? DEFAULT_MAX_ENTRIES;

  if (isCacheDisabled(env)) {
    log.debug(`createCacheAdapter: cache disabled, using memory ttl=${ttl}`);
    return getGlobalMemoryCache(ttl, maxEntries);
  }

  const kvBinding = getKVBinding(env);
  if (kvBinding) {
    log.debug(`createCacheAdapter: using kv adapter ttl=${ttl}`);
    return new KVCacheAdapter(kvBinding, { defaultTtl: ttl });
  }

  log.debug(`createCacheAdapter: using memory adapter ttl=${ttl}`);
  return getGlobalMemoryCache(ttl, maxEntries);
}

function isCacheDisabled(env: CacheEnv): boolean {
  const val = env.CACHE_DISABLED;
  if (val === true || val === "true" || val === "1") {
    return true;
  }
  return false;
}

function getKVBinding(env: CacheEnv): KVNamespace | null {
  const customBinding = env.CACHE_KV_BINDING;
  if (customBinding && typeof customBinding === "string") {
    const binding = (env as Record<string, unknown>)[customBinding];
    return isKVNamespace(binding) ? binding : null;
  }

  if (env.CACHE_KV && isKVNamespace(env.CACHE_KV)) {
    return env.CACHE_KV;
  }

  const defaultBinding = (env as Record<string, unknown>)["CACHE_KV"];
  return isKVNamespace(defaultBinding) ? defaultBinding : null;
}

function isKVNamespace(value: unknown): value is KVNamespace {
  return (
    typeof value === "object" &&
    value !== null &&
    "get" in value &&
    "put" in value &&
    "delete" in value
  );
}

function parseTtl(value: string | number | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "number") return value;
  const parsed = parseInt(value as string, 10);
  return isNaN(parsed) ? undefined : parsed;
}

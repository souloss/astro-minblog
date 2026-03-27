import type { CacheAdapter } from "../cache/types.js";
import type {
  CachedSearchContext,
} from "./types.js";
import { MemoryCacheAdapter } from "../cache/memory-adapter.js";
import { createLogger } from "../utils/logger.js";

export {
  type CachedSearchContext,
} from "./types.js";

import { CACHE } from "../constants.js";

const log = createLogger("session-cache");

const SESSION_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{7,63}$/i;
export const SESSION_CACHE_TTL_SECONDS = CACHE.SESSION_TTL;
export const SESSION_CACHE_TTL_MS = SESSION_CACHE_TTL_SECONDS * 1000;

let defaultCache: CacheAdapter | null = null;

function getDefaultCache(): CacheAdapter {
  if (!defaultCache) {
    defaultCache = new MemoryCacheAdapter({
      defaultTtl: SESSION_CACHE_TTL_SECONDS,
      maxEntries: 400,
    });
  }
  return defaultCache;
}

export function getSessionCacheKey(req: Request): string | null {
  const sessionId = req.headers.get("x-session-id")?.trim();
  if (sessionId && SESSION_ID_PATTERN.test(sessionId)) {
    return `sid:${sessionId}`;
  }
  return null;
}

export function setCacheAdapter(cache: CacheAdapter): void {
  defaultCache = cache;
}

export function getCacheAdapter(): CacheAdapter {
  return getDefaultCache();
}

export async function getCachedContext(
  key: string,
  cache?: CacheAdapter
): Promise<CachedSearchContext | undefined> {
  const adapter = cache ?? getDefaultCache();
  const entry = await adapter.get<CachedSearchContext>(key);
  log.debug(
    `getCachedContext: key=${key}, hit=${Boolean(entry?.value)}, adapter=${adapter.name}`
  );
  return entry?.value;
}

export async function setCachedContext(
  key: string,
  ctx: CachedSearchContext,
  cache?: CacheAdapter
): Promise<void> {
  const adapter = cache ?? getDefaultCache();
  await adapter.set(key, ctx, { ttl: SESSION_CACHE_TTL_SECONDS });
  log.debug(
    `setCachedContext: key=${key}, articles=${ctx.articles.length}, projects=${ctx.projects.length}, adapter=${adapter.name}`
  );
}

export async function deleteCachedContext(
  key: string,
  cache?: CacheAdapter
): Promise<boolean> {
  const adapter = cache ?? getDefaultCache();
  log.debug(`deleteCachedContext: key=${key}, adapter=${adapter.name}`);
  return adapter.delete(key);
}

export function cleanupCache(_now: number): void {
  // No-op: MemoryCacheAdapter handles cleanup internally
  // KV adapter handles TTL automatically
}

import type { CachedSearchContext } from './types.js';

const SESSION_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{7,63}$/i;
export const SESSION_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_CACHE_SIZE = 400;

const cache = new Map<string, CachedSearchContext>();

/**
 * Extracts and validates the session ID from the request header.
 * Returns null if absent or invalid.
 */
export function getSessionCacheKey(req: Request): string | null {
  const sessionId = req.headers.get('x-session-id')?.trim();
  if (sessionId && SESSION_ID_PATTERN.test(sessionId)) {
    return `sid:${sessionId}`;
  }
  return null;
}

export function getCachedContext(key: string): CachedSearchContext | undefined {
  return cache.get(key);
}

export function setCachedContext(key: string, ctx: CachedSearchContext): void {
  cache.set(key, ctx);
}

/**
 * Removes expired entries and trims the cache if it grows too large.
 */
export function cleanupCache(now: number): void {
  for (const [key, value] of cache) {
    if (now - value.updatedAt > SESSION_CACHE_TTL_MS) {
      cache.delete(key);
    }
  }
  if (cache.size > MAX_CACHE_SIZE) {
    const overflow = cache.size - MAX_CACHE_SIZE;
    const keys = cache.keys();
    for (let i = 0; i < overflow; i++) {
      const next = keys.next();
      if (next.done) break;
      cache.delete(next.value);
    }
  }
}

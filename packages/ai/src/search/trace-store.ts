/**
 * @astro-minimax/ai
 * @module search/trace-store
 */

import type { CacheAdapter } from "../cache/types.js";
import type { SessionTrace } from "../server/types/debug.js";
import { MemoryCacheAdapter } from "../cache/memory-adapter.js";
import { createLogger } from "../utils/logger.js";

const log = createLogger("trace-store");

export const TRACE_TTL_SECONDS = 3600;
const TRACE_MAX_ENTRIES = 500;

let defaultTraceCache: CacheAdapter | null = null;

function getDefaultTraceCache(): CacheAdapter {
  if (!defaultTraceCache) {
    defaultTraceCache = new MemoryCacheAdapter({
      defaultTtl: TRACE_TTL_SECONDS,
      maxEntries: TRACE_MAX_ENTRIES,
    });
  }
  return defaultTraceCache;
}

export async function setSessionTrace(
  sessionId: string,
  trace: SessionTrace,
  cache?: CacheAdapter
): Promise<void> {
  const adapter = cache ?? getDefaultTraceCache();
  const key = `trace:${sessionId}`;
  await adapter.set(key, trace, { ttl: TRACE_TTL_SECONDS });
  log.debug(`setSessionTrace: key=${key}, sessionId=${sessionId}`);
}

export async function getSessionTrace(
  sessionId: string,
  cache?: CacheAdapter
): Promise<SessionTrace | undefined> {
  const adapter = cache ?? getDefaultTraceCache();
  const key = `trace:${sessionId}`;
  const entry = await adapter.get<SessionTrace>(key);
  log.debug(`getSessionTrace: key=${key}, hit=${Boolean(entry?.value)}`);
  return entry?.value;
}

export function setTraceCacheAdapter(cache: CacheAdapter): void {
  defaultTraceCache = cache;
}

export function getTraceCacheAdapter(): CacheAdapter {
  return getDefaultTraceCache();
}

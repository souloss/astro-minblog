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

// Maximum number of turns to keep per session
const MAX_TURNS_PER_SESSION = 50;

// Session trace storage format - array of turns with metadata
export interface SessionTraceHistory {
  sessionId: string;
  createdAt: number;
  updatedAt: number;
  turns: SessionTrace[];
}

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

  // Get existing history or create new
  const existing = await adapter.get<SessionTraceHistory>(key);
  const now = Date.now();

  let history: SessionTraceHistory;
  if (existing?.value) {
    history = existing.value;
    // Append new turn
    history.turns.push(trace);
    // Trim to max turns
    if (history.turns.length > MAX_TURNS_PER_SESSION) {
      history.turns = history.turns.slice(-MAX_TURNS_PER_SESSION);
    }
    history.updatedAt = now;
  } else {
    history = {
      sessionId,
      createdAt: now,
      updatedAt: now,
      turns: [trace],
    };
  }

  await adapter.set(key, history, { ttl: TRACE_TTL_SECONDS });
  log.debug(`setSessionTrace: key=${key}, sessionId=${sessionId}, turnCount=${history.turns.length}`);
}

export async function getSessionTrace(
  sessionId: string,
  cache?: CacheAdapter
): Promise<SessionTraceHistory | undefined> {
  const adapter = cache ?? getDefaultTraceCache();
  const key = `trace:${sessionId}`;
  const entry = await adapter.get<SessionTraceHistory>(key);
  log.debug(`getSessionTrace: key=${key}, hit=${Boolean(entry?.value)}`);
  return entry?.value;
}

export function setTraceCacheAdapter(cache: CacheAdapter): void {
  defaultTraceCache = cache;
}

export function getTraceCacheAdapter(): CacheAdapter {
  return getDefaultTraceCache();
}

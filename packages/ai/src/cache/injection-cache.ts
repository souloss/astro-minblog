/**
 * 注入缓存管理
 *
 * 用于多轮对话中去重已注入的段落，避免重复注入浪费 token。
 */

export interface InjectionCacheEntry {
  sessionId: string;
  injectedChunks: Set<string>;
  createdAt: number;
  updatedAt: number;
}

const DEFAULT_TTL = 10 * 60 * 1000; // 10 分钟
const MAX_CACHE_SIZE = 100;

class InjectionCacheManager {
  private caches: Map<string, InjectionCacheEntry> = new Map();
  private ttl: number;

  constructor(ttl: number = DEFAULT_TTL) {
    this.ttl = ttl;
  }

  get(sessionId: string): InjectionCacheEntry | undefined {
    this.cleanup();
    return this.caches.get(sessionId);
  }

  getOrCreate(sessionId: string): InjectionCacheEntry {
    this.cleanup();

    let entry = this.caches.get(sessionId);
    if (!entry) {
        entry = {
          sessionId,
          injectedChunks: new Set(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
      this.caches.set(sessionId, entry);
    }

    return entry;
  }

  filterNewChunks(
    sessionId: string,
    chunks: Array<{ id: string; content: string }>
  ): Array<{ id: string; content: string }> {
    const entry = this.getOrCreate(sessionId);
    const newChunks = chunks.filter(
      chunk => !entry.injectedChunks.has(chunk.id)
    );

    log.debug(
      `filterNewChunks: session=${sessionId}, incoming=${chunks.length}, new=${newChunks.length}, existing=${entry.injectedChunks.size}`
    );

    return newChunks;
  }

  markAsInjected(sessionId: string, chunkIds: string[]): void {
    const entry = this.getOrCreate(sessionId);
    for (const id of chunkIds) {
      entry.injectedChunks.add(id);
    }
    entry.updatedAt = Date.now();
    log.debug(
      `markAsInjected: session=${sessionId}, added=${chunkIds.length}, total=${entry.injectedChunks.size}`
    );
  }

  cleanup(): void {
    const now = Date.now();

    for (const [key, entry] of this.caches) {
      if (now - entry.updatedAt > this.ttl) {
        this.caches.delete(key);
      }
    }

    if (this.caches.size > MAX_CACHE_SIZE) {
      const entries = [...this.caches.entries()].sort(
        (a, b) => a[1].updatedAt - b[1].updatedAt
      );

      const toDelete = entries.slice(0, this.caches.size - MAX_CACHE_SIZE);
      for (const [key] of toDelete) {
        this.caches.delete(key);
      }
    }
  }

  clear(sessionId?: string): void {
    if (sessionId) {
      this.caches.delete(sessionId);
    } else {
      this.caches.clear();
    }
  }

  size(): number {
    return this.caches.size;
  }

  getStats(): { totalSessions: number; totalInjectedChunks: number } {
    let totalInjectedChunks = 0;
    for (const entry of this.caches.values()) {
      totalInjectedChunks += entry.injectedChunks.size;
    }
    return {
      totalSessions: this.caches.size,
      totalInjectedChunks,
    };
  }
}

export const injectionCache = new InjectionCacheManager();
import { createLogger } from "../utils/logger.js";

const log = createLogger("injection-cache");

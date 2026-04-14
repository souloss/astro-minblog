/**
 * @astro-minimax/ai
 *
 * Cache abstraction layer for AI conversation system.
 * Supports multiple storage backends (memory, Cloudflare KV).
 *
 * @module cache/types
 */

// ============================================================================
// Cache Entry Types
// ============================================================================

/**
 * Metadata stored alongside cache entries.
 */
export interface CacheEntryMetadata {
  /** Timestamp when the entry was created (ms since epoch) */
  createdAt: number;
  /** Timestamp when the entry was last updated (ms since epoch) */
  updatedAt: number;
  /** Custom metadata provided by the caller */
  custom?: Record<string, unknown>;
}

/**
 * A cached entry with its value and metadata.
 */
export interface CacheEntry<T> {
  /** The cached value */
  value: T;
  /** Entry metadata */
  metadata: CacheEntryMetadata;
}

/**
 * Options for setting a cache entry.
 */
export interface CacheSetOptions {
  /** Time-to-live in seconds. If not provided, entry won't expire automatically. */
  ttl?: number;
  /** Custom metadata to store with the entry */
  metadata?: Record<string, unknown>;
}

/**
 * Options for getting a cache entry.
 */
export interface CacheGetOptions {
  /** If true, return null instead of throwing on parse errors */
  silent?: boolean;
}

// ============================================================================
// Cache Adapter Interface
// ============================================================================

/**
 * Abstract cache adapter interface.
 * Implementations: MemoryCacheAdapter, KVCacheAdapter.
 *
 * @example
 * ```typescript
 * const cache = new MemoryCacheAdapter();
 * await cache.set('key', { data: 'value' }, { ttl: 600 });
 * const entry = await cache.get<{ data: string }>('key');
 * ```
 */
export interface CacheAdapter {
  readonly name: string;

  get<T>(key: string, options?: CacheGetOptions): Promise<CacheEntry<T> | null>;

  set<T>(key: string, value: T, options?: CacheSetOptions): Promise<void>;

  delete(key: string): Promise<boolean>;

  clear(): Promise<void>;

  has(key: string): Promise<boolean>;

  isAvailable(): Promise<boolean>;

  dispose?(): void;
}

// ============================================================================
// Cache Manager Types
// ============================================================================

/**
 * Configuration for cache manager.
 */
export interface CacheManagerConfig {
  /** Default TTL for entries (seconds). Default: 600 (10 minutes) */
  defaultTtl?: number;
  /** Maximum number of entries for memory cache. Default: 400 */
  maxEntries?: number;
  /** KV binding name in Cloudflare environment. Default: 'CACHE_KV' */
  kvBindingName?: string;
  /** Enable fallback to memory cache if KV is unavailable. Default: true */
  enableFallback?: boolean;
}

/**
 * Environment interface for cache initialization.
 */
export interface CacheEnv {
  /** Cloudflare KV namespace binding */
  CACHE_KV?: KVNamespace;
  /** Custom KV binding name (overrides default) */
  CACHE_KV_BINDING?: string;
  /** Disable KV cache (force memory cache) */
  CACHE_DISABLED?: string | boolean;
  /** Default TTL override (seconds) */
  CACHE_TTL?: string | number;
}

// ============================================================================
// Session Cache Types (imported from search module)
// ============================================================================

export type { CachedSearchContext } from "../search/types.js";

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Result of a cache operation.
 */
export type CacheResult<T> =
  | { success: true; entry: CacheEntry<T> }
  | { success: false; error: Error };

/**
 * Key builder for cache keys.
 */
export interface CacheKeyBuilder {
  /** Build a session-based cache key */
  session(sessionId: string): string;
  /** Build an article-scoped cache key */
  article(sessionId: string, slug: string): string;
  /** Build a custom cache key */
  custom(...parts: string[]): string;
}

/**
 * Default cache key builder implementation.
 */
export const createCacheKeyBuilder = (
  prefix: string = "chat"
): CacheKeyBuilder => ({
  session: (sessionId: string) => `${prefix}:sid:${sessionId}`,
  article: (sessionId: string, slug: string) =>
    `${prefix}:sid:${sessionId}:article:${slug}`,
  custom: (...parts: string[]) => `${prefix}:${parts.join(":")}`,
});

import type {
  CacheAdapter,
  CacheEntry,
  CacheEntryMetadata,
  CacheSetOptions,
  CacheGetOptions,
} from "./types.js";
import { CACHE } from "../constants.js";

interface InternalEntry<T> {
  value: T;
  metadata: CacheEntryMetadata;
  expiresAt?: number;
}

export interface MemoryCacheOptions {
  maxEntries?: number;
  defaultTtl?: number;
  cleanupInterval?: number;
}

const DEFAULT_MAX_ENTRIES = 400;
const DEFAULT_TTL_SECONDS = CACHE.DEFAULT_TTL;

export class MemoryCacheAdapter implements CacheAdapter {
  readonly name = "memory";
  private cache = new Map<string, InternalEntry<unknown>>();
  private maxEntries: number;
  private defaultTtl: number;
  private cleanupTimer?: ReturnType<typeof setInterval>;

  constructor(options?: MemoryCacheOptions) {
    this.maxEntries = options?.maxEntries ?? DEFAULT_MAX_ENTRIES;
    this.defaultTtl = options?.defaultTtl ?? DEFAULT_TTL_SECONDS;

    if (options?.cleanupInterval) {
      this.cleanupTimer = setInterval(
        () => this.cleanup(),
        options.cleanupInterval * 1000
      );
    }
  }

  async get<T>(
    key: string,
    _options?: CacheGetOptions
  ): Promise<CacheEntry<T> | null> {
    const entry = this.cache.get(key) as InternalEntry<T> | undefined;

    if (!entry) return null;

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    this.cache.delete(key);
    this.cache.set(key, entry);

    return {
      value: entry.value,
      metadata: entry.metadata,
    };
  }

  async set<T>(
    key: string,
    value: T,
    options?: CacheSetOptions
  ): Promise<void> {
    const now = Date.now();
    const ttl = options?.ttl ?? this.defaultTtl;

    const entry: InternalEntry<T> = {
      value,
      metadata: {
        createdAt: now,
        updatedAt: now,
        custom: options?.metadata,
      },
      expiresAt: ttl ? now + ttl * 1000 : undefined,
    };

    this.cache.delete(key);
    this.cache.set(key, entry as InternalEntry<unknown>);

    if (this.cache.size > this.maxEntries) {
      this.evictLRU();
    }
  }

  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (entry.expiresAt && now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  private evictLRU(): void {
    const overflow = this.cache.size - this.maxEntries;
    if (overflow <= 0) return;

    const keys = this.cache.keys();
    for (let i = 0; i < overflow; i++) {
      const next = keys.next();
      if (next.done) break;
      this.cache.delete(next.value);
    }
  }

  dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.cache.clear();
  }
}

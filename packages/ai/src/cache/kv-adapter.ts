import type {
  CacheAdapter,
  CacheEntry,
  CacheEntryMetadata,
  CacheSetOptions,
  CacheGetOptions,
} from './types.js';
import { CACHE } from '../constants.js';

interface KVStoredEntry<T> {
  value: T;
  metadata: CacheEntryMetadata;
}

export interface KVCacheOptions {
  defaultTtl?: number;
  prefix?: string;
}

const DEFAULT_TTL_SECONDS = CACHE.DEFAULT_TTL;
const MIN_TTL_SECONDS = 60;

export class KVCacheAdapter implements CacheAdapter {
  readonly name = 'cloudflare-kv';
  private kv: KVNamespace;
  private defaultTtl: number;
  private prefix: string;

  constructor(kv: KVNamespace, options?: KVCacheOptions) {
    this.kv = kv;
    this.defaultTtl = options?.defaultTtl ?? DEFAULT_TTL_SECONDS;
    this.prefix = options?.prefix ?? '';
  }

  private buildKey(key: string): string {
    return this.prefix ? `${this.prefix}:${key}` : key;
  }

  async get<T>(key: string, options?: CacheGetOptions): Promise<CacheEntry<T> | null> {
    try {
      const fullKey = this.buildKey(key);
      const result = await this.kv.getWithMetadata<KVStoredEntry<T>>(fullKey, 'json');

      if (!result.value) {
        return null;
      }

      const storedEntry = result.value as KVStoredEntry<T>;
      if (!storedEntry.value || !storedEntry.metadata) {
        return null;
      }

      return {
        value: storedEntry.value,
        metadata: storedEntry.metadata,
      };
    } catch (error) {
      if (!options?.silent) {
        console.error('[KVCacheAdapter] Get error:', error);
      }
      return null;
    }
  }

  async set<T>(key: string, value: T, options?: CacheSetOptions): Promise<void> {
    try {
      const now = Date.now();
      const ttl = options?.ttl ?? this.defaultTtl;

      const entry: KVStoredEntry<T> = {
        value,
        metadata: {
          createdAt: now,
          updatedAt: now,
          custom: options?.metadata,
        },
      };

      const fullKey = this.buildKey(key);
      const effectiveTtl = Math.max(ttl, MIN_TTL_SECONDS);

      await this.kv.put(fullKey, JSON.stringify(entry), {
        expirationTtl: effectiveTtl,
      });
    } catch (error) {
      console.error('[KVCacheAdapter] Set error:', error);
      throw error;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key);
      const existing = await this.kv.get(fullKey);
      if (existing === null) {
        return false;
      }
      await this.kv.delete(fullKey);
      return true;
    } catch (error) {
      console.error('[KVCacheAdapter] Delete error:', error);
      return false;
    }
  }

  async clear(): Promise<void> {
    console.warn('[KVCacheAdapter] Clear not supported for KV namespace');
  }

  async has(key: string): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key);
      const value = await this.kv.get(fullKey);
      return value !== null;
    } catch {
      return false;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.kv.get('__health_check__');
      return true;
    } catch {
      return false;
    }
  }

  dispose(): void {
    // KV adapter doesn't hold any resources that need cleanup
  }
}
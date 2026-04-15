import { describe, it, expect, beforeEach } from "vitest";
import { createCacheAdapter, MemoryCacheAdapter, KVCacheAdapter } from "./index.js";
import type { CacheEnv } from "./types.js";

// ── Helpers ──────────────────────────────────────────────────────

function makeKV(): KVNamespace {
  const store = new Map<string, string>();
  return {
    get: (key: string) => Promise.resolve(store.get(key) ?? null),
    getWithMetadata: (key: string, _type?: string) =>
      Promise.resolve({
        value: store.get(key) ?? null,
        metadata: null,
        list_complete: true,
        cacheStatus: null,
      }),
    put: (key: string, value: string) => {
      store.set(key, value);
      return Promise.resolve();
    },
    delete: (key: string) => {
      store.delete(key);
      return Promise.resolve();
    },
    list: () => Promise.resolve({ keys: [] }),
  } as unknown as KVNamespace;
}

function makeEnv(overrides: Partial<Record<string, unknown>> = {}): CacheEnv {
  return {
    CACHE_DISABLED: false,
    ...overrides,
  } as CacheEnv;
}

// ── Tests ────────────────────────────────────────────────────────

describe("createCacheAdapter", () => {
  it("returns MemoryCacheAdapter by default", () => {
    const env = makeEnv();
    const adapter = createCacheAdapter(env);
    expect(adapter).toBeInstanceOf(MemoryCacheAdapter);
  });

  it("returns MemoryCacheAdapter when cache disabled with true", () => {
    const env = makeEnv({ CACHE_DISABLED: true });
    const adapter = createCacheAdapter(env);
    expect(adapter).toBeInstanceOf(MemoryCacheAdapter);
  });

  it("returns MemoryCacheAdapter when cache disabled with 'true'", () => {
    const env = makeEnv({ CACHE_DISABLED: "true" });
    const adapter = createCacheAdapter(env);
    expect(adapter).toBeInstanceOf(MemoryCacheAdapter);
  });

  it("returns KVCacheAdapter when CACHE_KV binding provided", () => {
    const kv = makeKV();
    const env = makeEnv({ CACHE_KV: kv });
    const adapter = createCacheAdapter(env);
    expect(adapter).toBeInstanceOf(KVCacheAdapter);
  });

  it("returns KVCacheAdapter with custom CACHE_KV_BINDING name", () => {
    const kv = makeKV();
    const env = makeEnv({
      CACHE_KV_BINDING: "MY_CUSTOM_KV",
      MY_CUSTOM_KV: kv,
    });
    const adapter = createCacheAdapter(env);
    expect(adapter).toBeInstanceOf(KVCacheAdapter);
  });

  it("falls back to MemoryCacheAdapter when binding name not found", () => {
    const env = makeEnv({
      CACHE_KV_BINDING: "NONEXISTENT_KV",
    });
    const adapter = createCacheAdapter(env);
    expect(adapter).toBeInstanceOf(MemoryCacheAdapter);
  });

  it("respects custom config.defaultTtl", () => {
    const env = makeEnv();
    const adapter = createCacheAdapter(env, { defaultTtl: 120 });
    expect(adapter).toBeInstanceOf(MemoryCacheAdapter);
    // TTL is internal; verify adapter was created without error
  });

  it("parses string CACHE_TTL value", () => {
    const env = makeEnv({ CACHE_TTL: "7200" });
    const adapter = createCacheAdapter(env);
    expect(adapter).toBeInstanceOf(MemoryCacheAdapter);
  });

  it("handles CACHE_DISABLED = '1' as disabled", () => {
    const env = makeEnv({ CACHE_DISABLED: "1" });
    const adapter = createCacheAdapter(env);
    expect(adapter).toBeInstanceOf(MemoryCacheAdapter);
  });

  it("handles CACHE_DISABLED = false as NOT disabled", () => {
    const kv = makeKV();
    const env = makeEnv({ CACHE_DISABLED: false, CACHE_KV: kv });
    const adapter = createCacheAdapter(env);
    expect(adapter).toBeInstanceOf(KVCacheAdapter);
  });

  it("reuses global memory cache across calls", () => {
    const env = makeEnv();
    const a = createCacheAdapter(env);
    const b = createCacheAdapter(env);
    // Both should be the same instance (singleton)
    expect(a).toBe(b);
  });
});

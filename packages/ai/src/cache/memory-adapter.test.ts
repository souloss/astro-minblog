import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MemoryCacheAdapter } from "./memory-adapter.js";

describe("MemoryCacheAdapter", () => {
  let cache: MemoryCacheAdapter;

  beforeEach(() => {
    cache = new MemoryCacheAdapter({ maxEntries: 5, defaultTtl: 3600 });
  });

  // Cleanup after each test
  afterEach(() => {
    cache.dispose();
  });

  it("should store and retrieve values", async () => {
    await cache.set("key1", { name: "test" });
    const entry = await cache.get<{ name: string }>("key1");
    expect(entry).not.toBeNull();
    expect(entry?.value).toEqual({ name: "test" });
  });

  it("should return null for missing keys", async () => {
    const entry = await cache.get("nonexistent");
    expect(entry).toBeNull();
  });

  it("should delete entries", async () => {
    await cache.set("key1", "value1");
    expect(await cache.has("key1")).toBe(true);
    await cache.delete("key1");
    expect(await cache.has("key1")).toBe(false);
  });

  it("should clear all entries", async () => {
    await cache.set("key1", "value1");
    await cache.set("key2", "value2");
    await cache.clear();
    expect(await cache.has("key1")).toBe(false);
    expect(await cache.has("key2")).toBe(false);
  });

  it("should report availability", async () => {
    expect(await cache.isAvailable()).toBe(true);
  });

  it("should return correct name", () => {
    expect(cache.name).toBe("memory");
  });

  it("should handle TTL expiration", async () => {
    // Set with very short TTL
    await cache.set("short-lived", "value", { ttl: 0.001 }); // 1ms
    // Wait for expiration
    await new Promise(r => setTimeout(r, 10));
    const entry = await cache.get("short-lived");
    expect(entry).toBeNull();
  });

  it("should evict LRU entries when maxEntries exceeded", async () => {
    // Fill cache to max
    for (let i = 0; i < 5; i++) {
      await cache.set(`key${i}`, `value${i}`);
    }
    // Add one more — should evict oldest
    await cache.set("key5", "value5");
    // First entry should be evicted
    expect(await cache.has("key0")).toBe(false);
    // Latest should exist
    expect(await cache.has("key5")).toBe(true);
  });

  it("should store metadata", async () => {
    await cache.set("key1", "value1", { metadata: { source: "test" } });
    const entry = await cache.get("key1");
    expect(entry?.metadata?.custom).toEqual({ source: "test" });
    expect(entry?.metadata?.createdAt).toBeGreaterThan(0);
  });

  it("should promote accessed entries (LRU reordering)", async () => {
    for (let i = 0; i < 5; i++) {
      await cache.set(`key${i}`, `value${i}`);
    }
    // Access key0 to promote it
    await cache.get("key0");
    // Add new entry — should evict key1 (not key0)
    await cache.set("key5", "value5");
    expect(await cache.has("key0")).toBe(true);
    expect(await cache.has("key1")).toBe(false);
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { KVCacheAdapter } from "./kv-adapter.js";

// ── Mock KV ──────────────────────────────────────────────────────
// Simulates Cloudflare KV behavior: put stores JSON string,
// getWithMetadata with "json" type auto-parses the stored string.

function createMockKV() {
  const store = new Map<string, string>();

  const kv = {
    get: vi.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
    getWithMetadata: vi.fn((key: string, type?: string) => {
      const raw = store.get(key) ?? null;
      let value = raw;
      if (type === "json" && raw !== null) {
        try {
          value = JSON.parse(raw);
        } catch {
          value = null;
        }
      }
      return Promise.resolve({
        value,
        metadata: null,
        list_complete: true,
        cacheStatus: null,
      });
    }),
    put: vi.fn((key: string, value: string) => {
      store.set(key, value);
      return Promise.resolve();
    }),
    delete: vi.fn((key: string) => {
      store.delete(key);
      return Promise.resolve();
    }),
    list: vi.fn(() => Promise.resolve({ keys: [] })),
  };

  return { kv, store };
}

// ── Tests ────────────────────────────────────────────────────────

describe("KVCacheAdapter", () => {
  let adapter: KVCacheAdapter;
  let mock: ReturnType<typeof createMockKV>;

  beforeEach(() => {
    mock = createMockKV();
    adapter = new KVCacheAdapter(mock.kv as unknown as KVNamespace);
  });

  describe("get", () => {
    it("returns null for missing key", async () => {
      const result = await adapter.get("missing-key");
      expect(result).toBeNull();
    });

    it("returns cached entry for existing key", async () => {
      await adapter.set("test-key", { foo: "bar" });
      const result = await adapter.get<{ foo: string }>("test-key");
      expect(result).not.toBeNull();
      expect(result!.value).toEqual({ foo: "bar" });
      expect(result!.metadata.createdAt).toBeGreaterThan(0);
    });

    it("returns null when KV get throws", async () => {
      mock.kv.getWithMetadata.mockRejectedValueOnce(new Error("KV error"));
      const result = await adapter.get("error-key");
      expect(result).toBeNull();
    });
  });

  describe("set", () => {
    it("stores value with correct TTL", async () => {
      await adapter.set("key", "value", { ttl: 300 });
      expect(mock.kv.put).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ expirationTtl: 300 })
      );
    });

    it("uses default TTL when not specified", async () => {
      await adapter.set("key", "value");
      expect(mock.kv.put).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ expirationTtl: expect.any(Number) })
      );
    });

    it("propagates KV errors on set", async () => {
      mock.kv.put.mockRejectedValueOnce(new Error("KV write error"));
      await expect(adapter.set("key", "value")).rejects.toThrow(
        "KV write error"
      );
    });
  });

  describe("delete", () => {
    it("deletes existing key and returns true", async () => {
      await adapter.set("key", "value");
      const result = await adapter.delete("key");
      expect(result).toBe(true);
      expect(mock.kv.delete).toHaveBeenCalled();
    });

    it("returns false for missing key", async () => {
      const result = await adapter.delete("nonexistent");
      expect(result).toBe(false);
    });

    it("returns false when KV get throws on delete", async () => {
      await adapter.set("key", "value");
      mock.kv.get.mockRejectedValueOnce(new Error("KV error"));
      const result = await adapter.delete("key");
      expect(result).toBe(false);
    });
  });

  describe("has", () => {
    it("returns true for existing key", async () => {
      await adapter.set("key", "value");
      expect(await adapter.has("key")).toBe(true);
    });

    it("returns false for missing key", async () => {
      expect(await adapter.has("nonexistent")).toBe(false);
    });
  });

  describe("isAvailable", () => {
    it("returns true when KV is responsive", async () => {
      expect(await adapter.isAvailable()).toBe(true);
    });
  });

  describe("clear", () => {
    it("does not throw (warns instead)", async () => {
      await expect(adapter.clear()).resolves.toBeUndefined();
    });
  });

  describe("dispose", () => {
    it("does not throw", () => {
      expect(() => adapter.dispose()).not.toThrow();
    });
  });

  describe("prefix", () => {
    it("prefixes keys when prefix option set", async () => {
      const prefixed = new KVCacheAdapter(
        mock.kv as unknown as KVNamespace,
        { prefix: "myapp" }
      );
      await prefixed.set("key", "value");
      expect(mock.kv.put).toHaveBeenCalledWith(
        "myapp:key",
        expect.any(String),
        expect.any(Object)
      );
    });
  });

  describe("name", () => {
    it("reports correct adapter name", () => {
      expect(adapter.name).toBe("cloudflare-kv");
    });
  });
});

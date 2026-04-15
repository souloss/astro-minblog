import { describe, expect, it } from "vitest";
import {
  getResponseCacheConfig,
  deleteResponseCache,
  createResponsePlaybackGenerator,
  buildResponseCacheKey,
  getResponseCache,
  setResponseCache,
  DEFAULT_RESPONSE_CACHE_CONFIG,
} from "./response-cache.js";
import { MemoryCacheAdapter } from "./memory-adapter.js";

// ── getResponseCacheConfig ───────────────────────────────────────

describe("getResponseCacheConfig", () => {
  it("returns defaults when env is empty", () => {
    const config = getResponseCacheConfig({});
    expect(config.enabled).toBe(false);
    expect(config.defaultTtl).toBe(3600);
    expect(config.playbackDelayMs).toBe(20);
    expect(config.chunkSize).toBe(15);
    expect(config.thinkingPlaybackDelayMs).toBe(5);
  });

  it("parses AI_CACHE_ENABLED=true", () => {
    expect(getResponseCacheConfig({ AI_CACHE_ENABLED: "true" }).enabled).toBe(true);
  });

  it("parses AI_CACHE_ENABLED=1", () => {
    expect(getResponseCacheConfig({ AI_CACHE_ENABLED: "1" }).enabled).toBe(true);
  });

  it("parses AI_CACHE_ENABLED boolean true", () => {
    expect(getResponseCacheConfig({ AI_CACHE_ENABLED: true }).enabled).toBe(true);
  });

  it("parses numeric cache TTL", () => {
    expect(getResponseCacheConfig({ AI_CACHE_TTL: 7200 }).defaultTtl).toBe(7200);
  });

  it("parses string cache TTL", () => {
    expect(getResponseCacheConfig({ AI_CACHE_TTL: "1800" }).defaultTtl).toBe(1800);
  });

  it("falls back to default for invalid TTL", () => {
    expect(getResponseCacheConfig({ AI_CACHE_TTL: "invalid" }).defaultTtl).toBe(3600);
  });

  it("parses playback delay", () => {
    expect(getResponseCacheConfig({ AI_CACHE_PLAYBACK_DELAY: 50 }).playbackDelayMs).toBe(50);
  });

  it("parses chunk size", () => {
    expect(getResponseCacheConfig({ AI_CACHE_CHUNK_SIZE: 25 }).chunkSize).toBe(25);
  });

  it("parses thinking delay", () => {
    expect(getResponseCacheConfig({ AI_CACHE_THINKING_DELAY: 10 }).thinkingPlaybackDelayMs).toBe(10);
  });
});

// ── DEFAULT_RESPONSE_CACHE_CONFIG ────────────────────────────────

describe("DEFAULT_RESPONSE_CACHE_CONFIG", () => {
  it("has expected defaults", () => {
    expect(DEFAULT_RESPONSE_CACHE_CONFIG.enabled).toBe(false);
    expect(DEFAULT_RESPONSE_CACHE_CONFIG.defaultTtl).toBe(3600);
  });
});

// ── deleteResponseCache ──────────────────────────────────────────

describe("deleteResponseCache", () => {
  it("deletes existing cache entry", async () => {
    const cache = new MemoryCacheAdapter();
    await setResponseCache(cache, "summary", {
      query: "test",
      response: "test-response",
      articles: [],
      projects: [],
      sources: [],
      lang: "zh",
      updatedAt: Date.now(),
    }, 60, { lang: "zh", queryKey: "test" });

    const deleted = await deleteResponseCache(cache, "summary", { lang: "zh", queryKey: "test" });
    expect(deleted).toBe(true);

    const result = await getResponseCache(cache, "summary", { lang: "zh", queryKey: "test" });
    expect(result).toBeNull();
  });

  it("returns false for non-existent entry", async () => {
    const cache = new MemoryCacheAdapter();
    const deleted = await deleteResponseCache(cache, "summary", { lang: "zh", queryKey: "nope" });
    expect(deleted).toBe(false);
  });
});

// ── createResponsePlaybackGenerator ──────────────────────────────

describe("createResponsePlaybackGenerator", () => {
  it("yields response chunks", async () => {
    const gen = createResponsePlaybackGenerator(
      { query: "test", response: "Hello World!", articles: [], projects: [], sources: [], lang: "zh", updatedAt: Date.now() },
      { playbackDelayMs: 0, chunkSize: 5, thinkingPlaybackDelayMs: 0 }
    );

    const chunks: string[] = [];
    for await (const chunk of gen) {
      expect(chunk.type).toBe("response");
      chunks.push(chunk.text);
    }
    expect(chunks.join("")).toBe("Hello World!");
  });

  it("yields thinking chunks before response chunks", async () => {
    const gen = createResponsePlaybackGenerator(
      { query: "test", response: "Answer", thinking: "Think", articles: [], projects: [], sources: [], lang: "zh", updatedAt: Date.now() },
      { playbackDelayMs: 0, chunkSize: 10, thinkingPlaybackDelayMs: 0 }
    );

    const types: string[] = [];
    for await (const chunk of gen) {
      types.push(chunk.type);
    }
    expect(types).toEqual(["thinking", "response"]);
  });

  it("handles empty response", async () => {
    const gen = createResponsePlaybackGenerator(
      { query: "test", response: "", articles: [], projects: [], sources: [], lang: "zh", updatedAt: Date.now() },
      { playbackDelayMs: 0, chunkSize: 5, thinkingPlaybackDelayMs: 0 }
    );

    const chunks: string[] = [];
    for await (const chunk of gen) {
      chunks.push(chunk.text);
    }
    expect(chunks).toEqual([]);
  });
});

// ── buildResponseCacheKey edge cases ─────────────────────────────

describe("buildResponseCacheKey edge cases", () => {
  it("handles minimal context (no optional fields)", () => {
    const key = buildResponseCacheKey("recommend");
    expect(key).toBe("response:recommend");
  });

  it("handles only lang context", () => {
    const key = buildResponseCacheKey("recommend", { lang: "en" });
    expect(key).toBe("response:recommend:en");
  });

  it("handles only queryKey", () => {
    const key = buildResponseCacheKey("recommend", { queryKey: "abc" });
    expect(key).toBe("response:recommend:abc");
  });
});

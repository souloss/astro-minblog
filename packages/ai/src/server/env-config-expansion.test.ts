import { describe, expect, it } from "vitest";
import { applyAiConfigDefaults } from "./env-config.js";

describe("applyAiConfigDefaults extended", () => {
  it("returns base env when config is null", () => {
    const env = applyAiConfigDefaults({ SITE_URL: "https://test.com" }, null);
    expect(env.SITE_URL).toBe("https://test.com");
    expect(env.AI_CACHE_ENABLED).toBeUndefined();
  });

  it("returns base env when config is undefined", () => {
    const env = applyAiConfigDefaults({ SITE_URL: "https://test.com" }, undefined);
    expect(env.SITE_URL).toBe("https://test.com");
  });

  it("applies cache config defaults", () => {
    const env = applyAiConfigDefaults(
      {},
      { cache: { enabled: true, ttl: 7200, playbackDelay: 30, chunkSize: 20, thinkingDelay: 10 } }
    );
    expect(env.AI_CACHE_ENABLED).toBe(true);
    expect(env.AI_CACHE_TTL).toBe(7200);
    expect(env.AI_CACHE_PLAYBACK_DELAY).toBe(30);
    expect(env.AI_CACHE_CHUNK_SIZE).toBe(20);
    expect(env.AI_CACHE_THINKING_DELAY).toBe(10);
  });

  it("applies timeout config defaults", () => {
    const env = applyAiConfigDefaults(
      {},
      { timeouts: { request: 60000, keywordExtraction: 3000, evidenceAnalysis: 5000, llmStreaming: 45000 } }
    );
    expect(env.AI_TIMEOUT_REQUEST).toBe(60000);
    expect(env.AI_TIMEOUT_KEYWORD).toBe(3000);
    expect(env.AI_TIMEOUT_EVIDENCE).toBe(5000);
    expect(env.AI_TIMEOUT_LLM).toBe(45000);
  });

  it("applies health config defaults", () => {
    const env = applyAiConfigDefaults(
      {},
      { health: { unhealthyThreshold: 5, recoveryTtl: 120000 } }
    );
    expect(env.AI_HEALTH_THRESHOLD).toBe(5);
    expect(env.AI_HEALTH_RECOVERY_TTL).toBe(120000);
  });

  it("applies mockMode", () => {
    const env = applyAiConfigDefaults({}, { mockMode: true });
    expect(env.AI_MOCK_MODE).toBe(true);
  });

  it("does not overwrite env values that are already set", () => {
    const env = applyAiConfigDefaults(
      { AI_CACHE_ENABLED: false, AI_TIMEOUT_REQUEST: 1000 },
      { cache: { enabled: true }, timeouts: { request: 9999 } }
    );
    expect(env.AI_CACHE_ENABLED).toBe(false);
    expect(env.AI_TIMEOUT_REQUEST).toBe(1000);
    // But cache TTL was not in env, so config doesn't provide it either
  });

  it("preserves all base env values", () => {
    const env = applyAiConfigDefaults(
      { SITE_URL: "https://test.com", AI_API_KEY: "key123" },
      { mockMode: true }
    );
    expect(env.SITE_URL).toBe("https://test.com");
    expect(env.AI_API_KEY).toBe("key123");
    expect(env.AI_MOCK_MODE).toBe(true);
  });

  it("handles partial config (only cache)", () => {
    const env = applyAiConfigDefaults({}, { cache: { enabled: true } });
    expect(env.AI_CACHE_ENABLED).toBe(true);
    expect(env.AI_TIMEOUT_REQUEST).toBeUndefined();
  });

  it("handles empty config object", () => {
    const env = applyAiConfigDefaults({}, {});
    expect(env).toEqual({});
  });

  it("does not set undefined config values", () => {
    const env = applyAiConfigDefaults({}, { cache: { enabled: undefined } });
    expect(env.AI_CACHE_ENABLED).toBeUndefined();
  });
});

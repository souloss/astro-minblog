import { describe, expect, it } from "vitest";
import { applyAiConfigDefaults } from "./env-config.js";

describe("applyAiConfigDefaults", () => {
  it("applies the same AI defaults shape used by app and template wrappers", () => {
    const blogLikeConfig = {
      enabled: true,
      mockMode: false,
      apiEndpoint: "/api/chat",
      cache: {
        enabled: false,
        ttl: 3600,
      },
      timeouts: {
        request: 45000,
        keywordExtraction: 5000,
        evidenceAnalysis: 8000,
        llmStreaming: 30000,
      },
      health: {
        unhealthyThreshold: 3,
        recoveryTtl: 60000,
      },
    };

    const templateLikeConfig = {
      enabled: false,
      mockMode: false,
      apiEndpoint: "/api/chat",
    };

    const blogEnv = applyAiConfigDefaults({}, blogLikeConfig);
    const templateEnv = applyAiConfigDefaults({}, templateLikeConfig);

    expect(blogEnv.AI_CACHE_ENABLED).toBe(false);
    expect(blogEnv.AI_CACHE_TTL).toBe(3600);
    expect(blogEnv.AI_TIMEOUT_REQUEST).toBe(45000);
    expect(blogEnv.AI_HEALTH_THRESHOLD).toBe(3);
    expect(blogEnv.AI_MOCK_MODE).toBe(false);

    expect(templateEnv.AI_CACHE_ENABLED).toBeUndefined();
    expect(templateEnv.AI_TIMEOUT_REQUEST).toBeUndefined();
    expect(templateEnv.AI_HEALTH_THRESHOLD).toBeUndefined();
    expect(templateEnv.AI_MOCK_MODE).toBe(false);
  });

  it("does not overwrite explicit env values", () => {
    const env = applyAiConfigDefaults(
      {
        AI_CACHE_ENABLED: true,
        AI_TIMEOUT_REQUEST: 1200,
      },
      {
        cache: { enabled: false, ttl: 3600 },
        timeouts: { request: 45000 },
      }
    );

    expect(env.AI_CACHE_ENABLED).toBe(true);
    expect(env.AI_TIMEOUT_REQUEST).toBe(1200);
    expect(env.AI_CACHE_TTL).toBe(3600);
  });
});

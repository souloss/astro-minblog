import { describe, it, expect } from "vitest";
import {
  parseProviderConfigs,
  validateProviderConfig,
  hasAnyProviderConfigured,
} from "./config.js";
import type { ProviderManagerEnv } from "./types.js";

// ── parseProviderConfigs ───────────────────────────────────────

describe("parseProviderConfigs", () => {
  it("should return empty array when no config", () => {
    const result = parseProviderConfigs({});
    expect(result).toEqual([]);
  });

  it("should create OpenAI config from env vars", () => {
    const env: ProviderManagerEnv = {
      AI_BASE_URL: "https://api.openai.com/v1",
      AI_API_KEY: "sk-test123",
      AI_MODEL: "gpt-4o",
    };
    const result = parseProviderConfigs(env);
    expect(result.length).toBe(1);
    expect(result[0].type).toBe("openai");
    expect(result[0].model).toBe("gpt-4o");
  });

  it("should use default model when AI_MODEL not set", () => {
    const env: ProviderManagerEnv = {
      AI_BASE_URL: "https://api.openai.com/v1",
      AI_API_KEY: "sk-test",
    };
    const result = parseProviderConfigs(env);
    expect(result.length).toBe(1);
    expect(result[0].model).toBe("gpt-4o-mini");
  });

  it("should parse AI_PROVIDERS JSON string", () => {
    const env: ProviderManagerEnv = {
      AI_PROVIDERS: JSON.stringify([
        {
          type: "openai",
          baseURL: "https://custom.api/v1",
          apiKey: "sk-custom",
          model: "custom-model",
        },
      ]),
    };
    const result = parseProviderConfigs(env);
    expect(result.length).toBe(1);
    expect(result[0].model).toBe("custom-model");
  });

  it("should ignore invalid AI_PROVIDERS JSON", () => {
    const env: ProviderManagerEnv = {
      AI_PROVIDERS: "not valid json{",
      AI_BASE_URL: "https://api.openai.com/v1",
      AI_API_KEY: "sk-test",
    };
    const result = parseProviderConfigs(env);
    // Should fall back to legacy config
    expect(result.length).toBe(1);
    expect(result[0].type).toBe("openai");
  });

  it("should ignore empty AI_PROVIDERS array", () => {
    const env: ProviderManagerEnv = {
      AI_PROVIDERS: "[]",
      AI_BASE_URL: "https://api.openai.com/v1",
      AI_API_KEY: "sk-test",
    };
    const result = parseProviderConfigs(env);
    expect(result.length).toBe(1);
    expect(result[0].type).toBe("openai");
  });
});

// ── validateProviderConfig ─────────────────────────────────────

describe("validateProviderConfig", () => {
  it("should return error for missing id", () => {
    const result = validateProviderConfig({
      type: "openai",
      model: "gpt-4o",
    } as any);
    expect(result).toContain("missing id");
  });

  it("should return error for missing model", () => {
    const result = validateProviderConfig({
      id: "test",
      type: "openai",
    } as any);
    expect(result).toContain("missing model");
  });

  it("should return error for OpenAI missing baseURL", () => {
    const result = validateProviderConfig({
      id: "test",
      type: "openai",
      model: "gpt-4o",
      apiKey: "sk-test",
    } as any);
    expect(result).toContain("missing baseURL");
  });

  it("should return error for OpenAI missing apiKey", () => {
    const result = validateProviderConfig({
      id: "test",
      type: "openai",
      model: "gpt-4o",
      baseURL: "https://api.openai.com/v1",
    } as any);
    expect(result).toContain("missing apiKey");
  });

  it("should return error for Workers missing bindingName", () => {
    const result = validateProviderConfig({
      id: "test",
      type: "workers",
      model: "test-model",
    } as any);
    expect(result).toContain("missing bindingName");
  });

  it("should return null for valid OpenAI config", () => {
    const result = validateProviderConfig({
      id: "test",
      type: "openai",
      model: "gpt-4o",
      baseURL: "https://api.openai.com/v1",
      apiKey: "sk-test",
    } as any);
    expect(result).toBeNull();
  });

  it("should return null for valid Workers config", () => {
    const result = validateProviderConfig({
      id: "test",
      type: "workers",
      model: "test-model",
      bindingName: "AI",
    } as any);
    expect(result).toBeNull();
  });
});

// ── hasAnyProviderConfigured ───────────────────────────────────

describe("hasAnyProviderConfigured", () => {
  it("should return false when no config", () => {
    expect(hasAnyProviderConfigured({})).toBe(false);
  });

  it("should return true with OpenAI config", () => {
    expect(
      hasAnyProviderConfigured({
        AI_BASE_URL: "https://api.openai.com/v1",
        AI_API_KEY: "sk-test",
      })
    ).toBe(true);
  });

  it("should return true with AI_PROVIDERS JSON", () => {
    expect(
      hasAnyProviderConfigured({
        AI_PROVIDERS: JSON.stringify([{ type: "openai", model: "test" }]),
      })
    ).toBe(true);
  });

  it("should return false with only base URL (missing key)", () => {
    expect(
      hasAnyProviderConfigured({
        AI_BASE_URL: "https://api.openai.com/v1",
      })
    ).toBe(false);
  });
});

describe("parseAIProvidersJSON prototype pollution guard", () => {
  it("should strip __proto__ from parsed configs", () => {
    const result = parseProviderConfigs({
      AI_PROVIDERS: JSON.stringify([
        { type: "openai", baseURL: "https://api.test.com/v1", apiKey: "sk-test", model: "test", __proto__: { injected: true } },
      ]),
    });
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
    // The parsed config should NOT have __proto__ as an own property
    expect(Object.getOwnPropertyDescriptor(result[0] as Record<string, unknown>, "__proto__")).toBeUndefined();
  });

  it("should strip constructor and prototype from parsed configs", () => {
    const malicious = { type: "openai", baseURL: "https://api.test.com/v1", apiKey: "sk-test", model: "test", constructor: { polluted: true }, prototype: { polluted: true } };
    const result = parseProviderConfigs({
      AI_PROVIDERS: JSON.stringify([malicious]),
    });
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
    expect(Object.getOwnPropertyDescriptor(result[0] as Record<string, unknown>, "constructor")).toBeUndefined();
    expect(Object.getOwnPropertyDescriptor(result[0] as Record<string, unknown>, "prototype")).toBeUndefined();
  });
});

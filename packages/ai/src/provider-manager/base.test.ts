import { describe, it, expect, vi, beforeEach } from "vitest";
import { BaseProviderAdapter } from "./base.js";
import type { StreamTextOptions, StreamTextResult } from "./types.js";
import type { LanguageModel } from "ai";

// ── Concrete test subclass ───────────────────────────────────────

class TestProvider extends BaseProviderAdapter {
  readonly id = "test-provider";
  readonly type = "test";
  readonly weight = 50;
  readonly model = "test-model";
  readonly keywordModel = "test-keyword-model";
  readonly evidenceModel = "test-evidence-model";
  readonly timeout = 30000;
  readonly contextWindowTokens = 128000;

  streamText = vi.fn<() => Promise<StreamTextResult>>(() =>
    Promise.resolve({
      stream: new ReadableStream(),
      text: Promise.resolve("test"),
    } as unknown as StreamTextResult)
  );

  getProvider = vi.fn<() => { chatModel: (model: string) => LanguageModel }>(
    () => ({
      chatModel: (model: string) => ({ modelId: model }) as unknown as LanguageModel,
    })
  );
}

// ── Tests ────────────────────────────────────────────────────────

describe("BaseProviderAdapter", () => {
  let provider: TestProvider;

  beforeEach(() => {
    provider = new TestProvider();
  });

  describe("initial state", () => {
    it("starts healthy", () => {
      expect(provider.getHealth().healthy).toBe(true);
    });

    it("starts with zero failures", () => {
      expect(provider.getHealth().consecutiveFailures).toBe(0);
    });

    it("starts with zero total requests", () => {
      expect(provider.getHealth().totalRequests).toBe(0);
    });

    it("starts with zero successful requests", () => {
      expect(provider.getHealth().successfulRequests).toBe(0);
    });
  });

  describe("recordSuccess", () => {
    it("increments successfulRequests", () => {
      provider.recordSuccess();
      expect(provider.getHealth().successfulRequests).toBe(1);
    });

    it("increments totalRequests", () => {
      provider.recordSuccess();
      expect(provider.getHealth().totalRequests).toBe(1);
    });

    it("resets consecutiveFailures to zero", () => {
      provider.recordFailure(new Error("test"));
      expect(provider.getHealth().consecutiveFailures).toBe(1);
      provider.recordSuccess();
      expect(provider.getHealth().consecutiveFailures).toBe(0);
    });

    it("sets healthy to true", () => {
      provider.recordFailure(new Error("test"));
      provider.recordFailure(new Error("test"));
      provider.recordFailure(new Error("test"));
      provider.recordSuccess();
      expect(provider.getHealth().healthy).toBe(true);
    });

    it("records lastSuccessTime", () => {
      const before = Date.now();
      provider.recordSuccess();
      const health = provider.getHealth();
      expect(health.lastSuccessTime).toBeGreaterThanOrEqual(before);
    });
  });

  describe("recordFailure", () => {
    it("increments consecutiveFailures", () => {
      provider.recordFailure(new Error("test error"));
      expect(provider.getHealth().consecutiveFailures).toBe(1);
    });

    it("increments totalRequests", () => {
      provider.recordFailure(new Error("test error"));
      expect(provider.getHealth().totalRequests).toBe(1);
    });

    it("stores error message", () => {
      provider.recordFailure(new Error("test error"));
      expect(provider.getHealth().lastError).toBe("test error");
    });

    it("marks unhealthy after reaching threshold (default 3)", () => {
      provider.recordFailure(new Error("err1"));
      expect(provider.getHealth().healthy).toBe(true);
      provider.recordFailure(new Error("err2"));
      expect(provider.getHealth().healthy).toBe(true);
      provider.recordFailure(new Error("err3"));
      expect(provider.getHealth().healthy).toBe(false);
    });

    it("records lastErrorTime", () => {
      const before = Date.now();
      provider.recordFailure(new Error("test"));
      expect(provider.getHealth().lastErrorTime).toBeGreaterThanOrEqual(before);
    });
  });

  describe("isAvailable", () => {
    it("returns true when healthy", async () => {
      expect(await provider.isAvailable()).toBe(true);
    });

    it("returns false when unhealthy and within recovery TTL", async () => {
      // Trigger unhealthy state
      provider.recordFailure(new Error("err1"));
      provider.recordFailure(new Error("err2"));
      provider.recordFailure(new Error("err3"));
      expect(await provider.isAvailable()).toBe(false);
    });

    it("returns true when unhealthy but TTL expired", async () => {
      const shortRecovery = new TestProvider();
      shortRecovery["healthRecoveryTTL"] = 0; // Immediate recovery
      shortRecovery.recordFailure(new Error("err1"));
      shortRecovery.recordFailure(new Error("err2"));
      shortRecovery.recordFailure(new Error("err3"));
      // TTL=0 means immediately available for recovery
      expect(await shortRecovery.isAvailable()).toBe(true);
    });
  });

  describe("recovery", () => {
    it("isInRecovery returns true when unhealthy", () => {
      provider.recordFailure(new Error("err1"));
      provider.recordFailure(new Error("err2"));
      provider.recordFailure(new Error("err3"));
      expect(provider.isInRecovery()).toBe(true);
    });

    it("isInRecovery returns false when healthy", () => {
      expect(provider.isInRecovery()).toBe(false);
    });

    it("canAttemptRecovery returns true when TTL expired", () => {
      provider["healthRecoveryTTL"] = 0;
      provider.recordFailure(new Error("err1"));
      provider.recordFailure(new Error("err2"));
      provider.recordFailure(new Error("err3"));
      expect(provider.canAttemptRecovery()).toBe(true);
    });

    it("canAttemptRecovery returns false when healthy", () => {
      expect(provider.canAttemptRecovery()).toBe(false);
    });

    it("markAsRecovered resets health", () => {
      provider.recordFailure(new Error("err1"));
      provider.recordFailure(new Error("err2"));
      provider.recordFailure(new Error("err3"));
      provider.markAsRecovered();
      expect(provider.getHealth().healthy).toBe(true);
      expect(provider.getHealth().consecutiveFailures).toBe(0);
    });
  });

  describe("resetHealth", () => {
    it("resets all health stats to initial values", () => {
      provider.recordSuccess();
      provider.recordFailure(new Error("err"));
      provider.resetHealth();
      const health = provider.getHealth();
      expect(health.healthy).toBe(true);
      expect(health.consecutiveFailures).toBe(0);
      expect(health.totalRequests).toBe(0);
      expect(health.successfulRequests).toBe(0);
    });
  });

  describe("getHealth", () => {
    it("returns a copy not a reference", () => {
      const health1 = provider.getHealth();
      health1.consecutiveFailures = 99;
      const health2 = provider.getHealth();
      expect(health2.consecutiveFailures).toBe(0);
    });
  });

  describe("chatModel", () => {
    it("delegates to getProvider().chatModel with default model", () => {
      const model = provider.chatModel();
      expect(provider.getProvider).toHaveBeenCalled();
      expect(model).toHaveProperty("modelId", "test-model");
    });

    it("passes custom model name", () => {
      provider.chatModel("custom-model");
      expect(provider.getProvider).toHaveBeenCalled();
    });
  });

  describe("custom constructor options", () => {
    it("accepts custom unhealthyThreshold", () => {
      const custom = new TestProvider({ unhealthyThreshold: 5 });
      custom.recordFailure(new Error("e1"));
      custom.recordFailure(new Error("e2"));
      custom.recordFailure(new Error("e3"));
      // Default threshold would be 3, but custom is 5
      expect(custom.getHealth().healthy).toBe(true);
      custom.recordFailure(new Error("e4"));
      custom.recordFailure(new Error("e5"));
      expect(custom.getHealth().healthy).toBe(false);
    });

    it("accepts custom healthRecoveryTTL", () => {
      const custom = new TestProvider({ healthRecoveryTTL: 100 });
      expect(custom["healthRecoveryTTL"]).toBe(100);
    });
  });
});

import { describe, it, expect, beforeEach, vi } from "vitest";
import { ProviderManager, getProviderManager } from "./manager.js";
import type { ProviderAdapter, ProviderHealth } from "./types.js";

function createMockAdapter(
  id: string,
  weight: number,
  healthy: boolean = true
): ProviderAdapter {
  const health: ProviderHealth = {
    healthy,
    consecutiveFailures: 0,
    totalRequests: 0,
    successfulRequests: 0,
    lastChecked: Date.now(),
  };

  return {
    id,
    type: "mock",
    weight,
    model: "mock-model",
    keywordModel: "mock-model",
    evidenceModel: "mock-model",
    timeout: 30000,
    isAvailable: vi.fn(async () => health.healthy),
    isInRecovery: vi.fn(() => !health.healthy),
    canAttemptRecovery: vi.fn(() => {
      if (health.healthy) return false;
      return true;
    }),
    markAsRecovered: vi.fn(() => {
      health.healthy = true;
      health.consecutiveFailures = 0;
    }),
    resetHealth: vi.fn(() => {
      health.healthy = true;
      health.consecutiveFailures = 0;
      health.totalRequests = 0;
      health.successfulRequests = 0;
      health.lastChecked = Date.now();
    }),
    streamText: vi.fn(),
    getHealth: vi.fn(() => ({ ...health })),
    recordSuccess: vi.fn(() => {
      health.successfulRequests++;
      health.totalRequests++;
      health.consecutiveFailures = 0;
      health.healthy = true;
      health.lastSuccessTime = Date.now();
    }),
    recordFailure: vi.fn((error: Error) => {
      health.totalRequests++;
      health.consecutiveFailures++;
      health.lastError = error.message;
      health.lastErrorTime = Date.now();
      if (health.consecutiveFailures >= 3) {
        health.healthy = false;
      }
    }),
    getProvider: vi.fn(),
    chatModel: vi.fn(),
  };
}

describe("ProviderManager", () => {
  let manager: ProviderManager;
  let mockAdapters: ProviderAdapter[];

  beforeEach(() => {
    mockAdapters = [
      createMockAdapter("provider-1", 100),
      createMockAdapter("provider-2", 90),
      createMockAdapter("provider-3", 80, false),
    ];

    manager = new ProviderManager({}, { enableMockFallback: true });

    (manager as unknown as { providers: ProviderAdapter[] }).providers =
      mockAdapters;
  });

  describe("getAvailableAdapters", () => {
    it("should return only available adapters in priority order", async () => {
      const adapters = await manager.getAvailableAdapters();
      expect(adapters).toHaveLength(2);
      expect(adapters[0].id).toBe("provider-1");
      expect(adapters[1].id).toBe("provider-2");
    });

    it("should return empty array when no providers available", async () => {
      (manager as unknown as { providers: ProviderAdapter[] }).providers = [];
      const adapters = await manager.getAvailableAdapters();
      expect(adapters).toHaveLength(0);
    });
  });

  describe("getMockAdapter", () => {
    it("should return the mock adapter", () => {
      const mockAdapter = manager.getMockAdapter();
      expect(mockAdapter).toBeDefined();
      expect(mockAdapter.type).toBe("mock");
    });
  });

  describe("hasProviders", () => {
    it("should return true when providers exist", () => {
      expect(manager.hasProviders()).toBe(true);
    });

    it("should return false when no providers", () => {
      (manager as unknown as { providers: ProviderAdapter[] }).providers = [];
      expect(manager.hasProviders()).toBe(false);
    });
  });

  describe("getProviderCount", () => {
    it("should return correct count", () => {
      expect(manager.getProviderCount()).toBe(3);
    });
  });
});

describe("getProviderManager lifecycle", () => {
  it("should create a manager on first call", () => {
    const manager1 = getProviderManager({});
    expect(manager1).toBeDefined();
  });

  it("should create a fresh instance by default", () => {
    const manager1 = getProviderManager({});
    const manager2 = getProviderManager({});
    expect(manager1).not.toBe(manager2);
  });

  it("should respect new env inputs by default", () => {
    const manager1 = getProviderManager({
      AI_BASE_URL: "https://example-a.test/v1",
      AI_API_KEY: "key-a",
      AI_MODEL: "model-a",
    });
    const manager2 = getProviderManager({});

    expect(manager1.getProviderCount()).toBe(1);
    expect(manager2.getProviderCount()).toBe(0);
  });
});

describe("ProviderAdapter health methods", () => {
  let adapter: ProviderAdapter;

  beforeEach(() => {
    adapter = createMockAdapter("test-provider", 100);
  });

  describe("isInRecovery", () => {
    it("should return false when healthy", () => {
      expect(adapter.isInRecovery?.()).toBe(false);
    });

    it("should return true when unhealthy", () => {
      adapter.recordFailure(new Error("test"));
      adapter.recordFailure(new Error("test"));
      adapter.recordFailure(new Error("test"));
      expect(adapter.isInRecovery?.()).toBe(true);
    });
  });

  describe("markAsRecovered", () => {
    it("should mark provider as healthy", () => {
      adapter.recordFailure(new Error("test"));
      adapter.recordFailure(new Error("test"));
      adapter.recordFailure(new Error("test"));
      expect(adapter.getHealth().healthy).toBe(false);

      adapter.markAsRecovered?.();
      expect(adapter.getHealth().healthy).toBe(true);
      expect(adapter.getHealth().consecutiveFailures).toBe(0);
    });
  });

  describe("resetHealth", () => {
    it("should reset all health metrics", () => {
      adapter.recordFailure(new Error("test"));
      adapter.recordFailure(new Error("test"));
      adapter.recordFailure(new Error("test"));
      adapter.recordSuccess();

      adapter.resetHealth?.();
      const health = adapter.getHealth();
      expect(health.healthy).toBe(true);
      expect(health.consecutiveFailures).toBe(0);
      expect(health.totalRequests).toBe(0);
      expect(health.successfulRequests).toBe(0);
    });
  });
});

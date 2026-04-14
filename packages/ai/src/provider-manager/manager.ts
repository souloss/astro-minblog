import { createLogger } from "../utils/logger.js";
const pmLog = createLogger("provider-manager");
import type {
  ProviderAdapter,
  ProviderConfig,
  ProviderManagerEnv,
  ProviderManagerOptions,
  ProviderStatus,
  StreamTextOptions,
  StreamTextResult,
  OpenAIProviderConfig,
  WorkersAIProviderConfig,
} from "./types.js";
import { parseProviderConfigs, validateProviderConfig } from "./config.js";
import { OpenAIAdapter } from "./openai.js";
import { WorkersAIAdapter } from "./workers.js";
import { MockAdapter } from "./mock.js";

export class ProviderManager {
  private providers: ProviderAdapter[] = [];
  private mockAdapter: MockAdapter;
  private options: Required<
    Omit<
      ProviderManagerOptions,
      "onProviderSwitch" | "onStreamError" | "onHealthChange"
    >
  > &
    Pick<
      ProviderManagerOptions,
      "onProviderSwitch" | "onStreamError" | "onHealthChange"
    >;

  constructor(env: ProviderManagerEnv, options?: ProviderManagerOptions) {
    this.options = {
      unhealthyThreshold: options?.unhealthyThreshold ?? 3,
      healthRecoveryTTL: options?.healthRecoveryTTL ?? 60000,
      enableMockFallback: options?.enableMockFallback ?? true,
      onProviderSwitch: options?.onProviderSwitch,
      onStreamError: options?.onStreamError,
      onHealthChange: options?.onHealthChange,
    };

    this.mockAdapter = new MockAdapter();
    this.initializeProviders(env);
  }

  private initializeProviders(env: ProviderManagerEnv): void {
    const configs = parseProviderConfigs(env);

    for (const config of configs) {
      if (config.enabled === false) continue;

      const validationError = validateProviderConfig(config);
      if (validationError) {
        pmLog.warn(`Skipping invalid config: ${validationError}`);
        continue;
      }

      try {
        const adapter = this.createAdapter(config, env);
        if (adapter) {
          this.providers.push(adapter);
        }
      } catch (error) {
        pmLog.warn(`Failed to create adapter for ${config.id}:`, error);
      }
    }

    this.providers.sort((a, b) => b.weight - a.weight);
  }

  private createAdapter(
    config: ProviderConfig,
    env: ProviderManagerEnv
  ): ProviderAdapter | null {
    switch (config.type) {
      case "openai":
        return new OpenAIAdapter(config as OpenAIProviderConfig);
      case "workers":
        return new WorkersAIAdapter(config as WorkersAIProviderConfig, env);
      default:
        return null;
    }
  }

  async getAvailableProvider(): Promise<ProviderAdapter | null> {
    for (const provider of this.providers) {
      if (await provider.isAvailable()) {
        return provider;
      }
    }
    return null;
  }

  async streamText(options: StreamTextOptions): Promise<StreamTextResult> {
    let lastProviderId: string | null = null;
    let lastError: Error | null = null;

    for (const provider of this.providers) {
      const wasInRecovery = provider.isInRecovery?.() ?? false;
      const isAvailable = await provider.isAvailable();
      if (!isAvailable) continue;

      try {
        const result = await provider.streamText(options);
        provider.recordSuccess();

        if (wasInRecovery) {
          provider.markAsRecovered?.();
          this.options.onHealthChange?.(provider.id, true);
        }

        if (lastProviderId && lastProviderId !== provider.id) {
          this.options.onProviderSwitch?.(
            lastProviderId,
            provider.id,
            "fallback success"
          );
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        lastProviderId = provider.id;
        provider.recordFailure(lastError);
        this.options.onStreamError?.(provider.id, lastError);

        if (!provider.getHealth().healthy) {
          this.options.onHealthChange?.(provider.id, false);
        }
      }
    }

    if (this.options.enableMockFallback) {
      this.options.onProviderSwitch?.(
        lastProviderId,
        "mock",
        "all providers failed"
      );
      return this.mockAdapter.streamText(options);
    }

    throw lastError || new Error("No providers available");
  }

  getProviderStatus(): ProviderStatus[] {
    return this.providers.map(provider => ({
      id: provider.id,
      type: provider.type,
      weight: provider.weight,
      enabled: true,
      health: provider.getHealth(),
      model: provider.model,
    }));
  }

  hasProviders(): boolean {
    return this.providers.length > 0;
  }

  getProviderCount(): number {
    return this.providers.length;
  }

  async getAvailableAdapter(): Promise<ProviderAdapter | null> {
    return this.getAvailableProvider();
  }

  /**
   * Returns all available adapters in priority order.
   * Used for implementing multi-provider failover in streaming contexts.
   */
  async getAvailableAdapters(): Promise<ProviderAdapter[]> {
    const available: ProviderAdapter[] = [];
    for (const provider of this.providers) {
      if (await provider.isAvailable()) {
        available.push(provider);
      }
    }
    return available;
  }

  /**
   * Returns the mock adapter for fallback scenarios.
   */
  getMockAdapter(): MockAdapter {
    return this.mockAdapter;
  }
}

export function getProviderManager(
  env: ProviderManagerEnv,
  options?: ProviderManagerOptions
): ProviderManager {
  return new ProviderManager(env, options);
}

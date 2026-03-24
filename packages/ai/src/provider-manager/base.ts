import type {
  ProviderAdapter,
  ProviderHealth,
  StreamTextOptions,
  StreamTextResult,
} from './types.js';

export abstract class BaseProviderAdapter implements ProviderAdapter {
  abstract readonly id: string;
  abstract readonly type: string;
  abstract readonly weight: number;
  abstract readonly model: string;
  abstract readonly keywordModel: string;
  abstract readonly evidenceModel: string;
  abstract readonly timeout: number;

  protected health: ProviderHealth = {
    healthy: true,
    consecutiveFailures: 0,
    totalRequests: 0,
    successfulRequests: 0,
    lastChecked: Date.now(),
  };

  protected unhealthyThreshold: number;
  protected healthRecoveryTTL: number;

  constructor(options?: { unhealthyThreshold?: number; healthRecoveryTTL?: number }) {
    this.unhealthyThreshold = options?.unhealthyThreshold ?? 3;
    this.healthRecoveryTTL = options?.healthRecoveryTTL ?? 60000;
  }

  async isAvailable(): Promise<boolean> {
    if (!this.health.healthy) {
      const timeSinceLastError = Date.now() - (this.health.lastErrorTime ?? 0);
      if (timeSinceLastError < this.healthRecoveryTTL) {
        return false;
      }
    }
    return true;
  }

  isInRecovery(): boolean {
    return !this.health.healthy;
  }

  canAttemptRecovery(): boolean {
    if (this.health.healthy) return false;
    const timeSinceLastError = Date.now() - (this.health.lastErrorTime ?? 0);
    return timeSinceLastError >= this.healthRecoveryTTL;
  }

  markAsRecovered(): void {
    this.health.healthy = true;
    this.health.consecutiveFailures = 0;
    this.health.lastChecked = Date.now();
  }

  resetHealth(): void {
    this.health = {
      healthy: true,
      consecutiveFailures: 0,
      totalRequests: 0,
      successfulRequests: 0,
      lastChecked: Date.now(),
    };
  }

  abstract streamText(options: StreamTextOptions): Promise<StreamTextResult>;

  abstract getProvider(): { chatModel: (model: string) => unknown };

  chatModel(model?: string): unknown {
    return this.getProvider().chatModel(model ?? this.model);
  }

  getHealth(): ProviderHealth {
    return { ...this.health };
  }

  recordSuccess(): void {
    this.health.successfulRequests++;
    this.health.totalRequests++;
    this.health.consecutiveFailures = 0;
    this.health.healthy = true;
    this.health.lastSuccessTime = Date.now();
    this.health.lastChecked = Date.now();
  }

  recordFailure(error: Error): void {
    this.health.totalRequests++;
    this.health.consecutiveFailures++;
    this.health.lastError = error.message;
    this.health.lastErrorTime = Date.now();
    this.health.lastChecked = Date.now();

    if (this.health.consecutiveFailures >= this.unhealthyThreshold) {
      this.health.healthy = false;
    }
  }
}
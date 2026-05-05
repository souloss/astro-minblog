/**
 * Type definitions for the AI Provider Manager.
 *
 * Supports multiple provider types with priority-based fallback.
 */

import type { UIMessage, ToolSet, LanguageModel } from "ai";

// ============================================================================
// Provider Configuration Types
// ============================================================================

/**
 * Base configuration shared by all provider types.
 */
export interface BaseProviderConfig {
  id: string;
  type: "openai" | "workers";
  weight?: number;
  model: string;
  keywordModel?: string;
  evidenceModel?: string;
  timeout?: number;
  /**
   * Number of consecutive failures before marking provider unhealthy.
   * Default: 3. Note: This is NOT retry count - provider will be skipped
   * after this many failures, not retried.
   */
  unhealthyThreshold?: number;
  enabled?: boolean;
  /** Maximum context window in tokens for this provider's model. Default: 128000 */
  contextWindowTokens?: number;
}

/**
 * OpenAI-compatible provider configuration.
 * Supports DeepSeek, Moonshot, Qwen, OpenAI, and any OpenAI-compatible API.
 */
export interface OpenAIProviderConfig extends BaseProviderConfig {
  type: "openai";
  /** API base URL (e.g., https://api.deepseek.com/v1) */
  baseURL: string;
  /** API key */
  apiKey: string;
}

/**
 * Cloudflare Workers AI provider configuration.
 * Uses AI binding directly from the Cloudflare environment.
 */
export interface WorkersAIProviderConfig extends BaseProviderConfig {
  type: "workers";
  /** AI binding name in Cloudflare environment. Default: 'minimaxAI' */
  bindingName: string;
}

/**
 * Union type for all provider configurations.
 */
export type ProviderConfig = OpenAIProviderConfig | WorkersAIProviderConfig;

/**
 * Environment variable interface for provider configuration.
 * Used to build ProviderConfig from environment variables.
 */
export interface ProviderManagerEnv {
  [key: string]: unknown;
  /** JSON string containing array of ProviderConfig */
  AI_PROVIDERS?: string;
  // OpenAI-compatible provider config
  AI_BASE_URL?: string;
  AI_API_KEY?: string;
  AI_MODEL?: string;
  AI_KEYWORD_MODEL?: string;
  AI_EVIDENCE_MODEL?: string;
  /** Context window size in tokens for the model specified by AI_MODEL */
  AI_CONTEXT_WINDOW_TOKENS?: number | string;
  // Workers AI provider config
  AI_BINDING_NAME?: string;
  AI_WORKERS_MODEL?: string;
}

// ============================================================================
// Provider Instance & Status Types
// ============================================================================

/**
 * Health status of a provider instance.
 */
export interface ProviderHealth {
  /** Whether the provider is currently healthy */
  healthy: boolean;
  /** Number of consecutive failures */
  consecutiveFailures: number;
  /** Total number of requests */
  totalRequests: number;
  /** Total number of successful requests */
  successfulRequests: number;
  /** Last error message (if any) */
  lastError?: string;
  /** Timestamp of last error */
  lastErrorTime?: number;
  /** Timestamp of last successful request */
  lastSuccessTime?: number;
  /** Timestamp when health status was last updated */
  lastChecked: number;
}

/**
 * Runtime status of a provider.
 */
export interface ProviderStatus {
  /** Provider ID */
  id: string;
  /** Provider type */
  type: string;
  /** Priority weight */
  weight: number;
  /** Whether the provider is enabled */
  enabled: boolean;
  /** Current health status */
  health: ProviderHealth;
  /** Model name */
  model: string;
}

// ============================================================================
// Stream Options & Result Types
// ============================================================================

/**
 * Options for streaming text generation.
 */
export interface StreamTextOptions {
  /** System prompt */
  system?: string;
  /** Conversation messages */
  messages: UIMessage[];
  /** Temperature (0-1). Default: 0.7 */
  temperature?: number;
  /** Maximum output tokens */
  maxOutputTokens?: number;
  /** Top-p sampling */
  topP?: number;
  /** Abort signal for cancellation */
  abortSignal?: AbortSignal;
  /** Language for mock responses (zh/en) */
  lang?: string;
  /** User question (for mock responses) */
  userQuestion?: string;
  /** Callback for errors during streaming */
  onError?: (error: Error) => void;
  /** Tools for function calling */
  tools?: ToolSet;
}

/**
 * Result from streamText operation.
 * Compatible with AI SDK's streamText result.
 */
export interface StreamTextResult {
  /** Convert to UI Message Stream Response for AI SDK v6 */
  toUIMessageStreamResponse: (options?: { headers?: HeadersInit }) => Response;
  /** The text content (for non-streaming usage) */
  text?: Promise<string>;
  /** Provider ID that handled the request */
  providerId: string;
  /** Whether this is a mock response */
  isMock: boolean;
}

/**
 * Result from provider health check.
 */
export interface HealthCheckResult {
  providerId: string;
  healthy: boolean;
  latency?: number;
  error?: string;
}

// ============================================================================
// Manager Options Types
// ============================================================================

/**
 * Options for creating a ProviderManager.
 */
export interface ProviderManagerOptions {
  /** Number of consecutive failures before marking unhealthy. Default: 3 */
  unhealthyThreshold?: number;
  /** Time in ms before retrying an unhealthy provider. Default: 60000 (1 min) */
  healthRecoveryTTL?: number;
  /** Enable mock provider as final fallback. Default: true */
  enableMockFallback?: boolean;
  /** Callback when provider switch occurs */
  onProviderSwitch?: (
    fromId: string | null,
    toId: string,
    reason: string
  ) => void;
  /** Callback when streaming error occurs */
  onStreamError?: (providerId: string, error: Error) => void;
  /** Callback when health status changes */
  onHealthChange?: (providerId: string, healthy: boolean) => void;
}

// ============================================================================
// Provider Adapter Interface
// ============================================================================

/**
 * Abstract interface for provider adapters.
 * All provider types must implement this interface.
 */
export interface ProviderAdapter {
  readonly id: string;
  readonly type: string;
  readonly weight: number;
  readonly model: string;
  readonly keywordModel: string;
  readonly evidenceModel: string;
  readonly timeout: number;
  readonly contextWindowTokens: number;

  isAvailable(): Promise<boolean>;

  isInRecovery?(): boolean;

  canAttemptRecovery?(): boolean;

  markAsRecovered?(): void;

  resetHealth?(): void;

  streamText(options: StreamTextOptions): Promise<StreamTextResult>;

  getHealth(): ProviderHealth;

  recordSuccess(): void;

  recordFailure(error: Error): void;

  getProvider(): { chatModel: (model: string) => LanguageModel };
  chatModel(model?: string): LanguageModel;

  dispose?(): void;
}

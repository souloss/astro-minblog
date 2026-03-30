/// <reference types="@cloudflare/workers-types" />
import {
  getProviderManager,
  hasAnyProviderConfigured,
  DEFAULT_WORKERS_BINDING_NAME,
} from "@astro-minimax/ai";
import { getResponseCacheConfig } from "@astro-minimax/ai/cache";
import { initializeMetadata } from "@astro-minimax/ai/server";
import knowledgeBundle from "../../datas/knowledge/runtime/knowledge-bundle.json";
import {
  createAiFunctionEnv,
  type FunctionEnv,
} from "./shared-ai-env";

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asNumber(value: unknown, fallback: number): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return fallback;
}

export const onRequest: PagesFunction<FunctionEnv> = async context => {
  const env = createAiFunctionEnv(context.env);
  initializeMetadata({ knowledgeBundle }, env);

  const manager = getProviderManager(env, { enableMockFallback: true });
  const providerStatus = manager.getProviderStatus();
  const bindingName =
    asString(env.AI_BINDING_NAME) || DEFAULT_WORKERS_BINDING_NAME;
  const responseCacheConfig = getResponseCacheConfig(env);

  const hasWorkersBinding = Boolean(env[bindingName]);
  const mockMode = Boolean(env.AI_MOCK_MODE);
  const configured = hasAnyProviderConfigured(env) || hasWorkersBinding || mockMode;
  const providers = providerStatus.length > 0
    ? providerStatus
    : mockMode
      ? [{
          id: "mock",
          type: "mock",
          weight: 0,
          healthy: true,
          model: "mock",
          health: {
            consecutiveFailures: 0,
            totalRequests: 0,
            successfulRequests: 0,
            lastError: null,
            lastErrorTime: null,
            lastSuccessTime: null,
          },
        }]
      : [];

  const timeoutConfig = {
    request: asNumber(env.AI_TIMEOUT_REQUEST, 45000),
    keywordExtraction: asNumber(env.AI_TIMEOUT_KEYWORD, 5000),
    evidenceAnalysis: asNumber(env.AI_TIMEOUT_EVIDENCE, 8000),
    llmStreaming: asNumber(env.AI_TIMEOUT_LLM, 30000),
  };

  const healthConfig = {
    unhealthyThreshold: asNumber(env.AI_HEALTH_THRESHOLD, 3),
    recoveryTtl: asNumber(env.AI_HEALTH_RECOVERY_TTL, 60000),
  };

  const dataStatus = {
    knowledgeBundle: {
      loaded: true,
      count: Array.isArray(knowledgeBundle?.corpus?.documents)
        ? knowledgeBundle.corpus.documents.length
        : undefined,
      lastUpdated: asString(knowledgeBundle?.generatedAt),
    },
    vectorIndex: {
      loaded: Boolean(knowledgeBundle.runtime.vectorIndex),
      lastUpdated: asString(knowledgeBundle?.generatedAt),
    },
  };

  return new Response(
    JSON.stringify(
      {
        status: "ok",
        timestamp: new Date().toISOString(),
        ai: {
          enabled: true,
          mockMode,
          configured,
          cache: {
            enabled: responseCacheConfig.enabled,
            ttl: responseCacheConfig.defaultTtl,
            playbackDelay: responseCacheConfig.playbackDelayMs,
            chunkSize: responseCacheConfig.chunkSize,
            thinkingDelay: responseCacheConfig.thinkingPlaybackDelayMs,
          },
          timeouts: timeoutConfig,
          health: healthConfig,
          providers: providers.map(p => ({
            id: p.id,
            type: p.type,
            weight: p.weight,
            healthy: "healthy" in p ? p.healthy : p.health.healthy,
            model: p.model,
            healthDetails: {
              consecutiveFailures: p.health.consecutiveFailures,
              totalRequests: p.health.totalRequests,
              successfulRequests: p.health.successfulRequests,
              lastError: p.health.lastError,
              lastErrorTime: p.health.lastErrorTime,
              lastSuccessTime: p.health.lastSuccessTime,
            },
          })),
          dataStatus,
        },
        hints: manager.hasProviders() || mockMode
          ? [
              `Providers available: ${providers.length}`,
              "Mock fallback: enabled",
              responseCacheConfig.enabled
                ? "Response cache: enabled"
                : "Response cache: disabled",
            ]
          : [
              "No AI providers configured. Set AI_BASE_URL + AI_API_KEY or configure Workers AI binding.",
            ],
      },
      null,
      2
    ),
    {
      headers: { "Content-Type": "application/json" },
    }
  );
};

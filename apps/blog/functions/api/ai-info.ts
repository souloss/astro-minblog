/// <reference types="@cloudflare/workers-types" />
import { getProviderManager, hasAnyProviderConfigured, DEFAULT_WORKERS_BINDING_NAME, getResponseCacheConfig } from '@astro-minimax/ai';
import { initializeMetadata } from '@astro-minimax/ai/server';
import type { ChatHandlerEnv } from '@astro-minimax/ai/server';
import aiSummaries from '../../datas/ai-summaries.json';
import authorContext from '../../datas/author-context.json';
import voiceProfile from '../../datas/voice-profile.json';
import factRegistry from '../../datas/fact-registry.json';

interface FunctionEnv extends ChatHandlerEnv {
  CACHE_KV?: KVNamespace;
  minimaxAI?: Ai;
  [key: string]: unknown;
}

interface DataStatus {
  loaded: boolean;
  count?: number;
  lastUpdated?: string;
  model?: string;
}

function getDataStatus(data: unknown, countField?: string): DataStatus {
  if (!data) return { loaded: false };
  const obj = data as Record<string, unknown>;
  const meta = obj.meta as Record<string, unknown> | undefined;
  const articles = obj.articles as Record<string, unknown> | undefined;
  const facts = obj.facts as Array<unknown> | undefined;
  
  return {
    loaded: true,
    count: countField === 'facts' 
      ? facts?.length 
      : countField === 'articles' 
        ? Object.keys(articles ?? {}).length 
        : undefined,
    lastUpdated: meta?.lastUpdated as string | undefined,
    model: meta?.model as string | undefined,
  };
}

export const onRequest: PagesFunction<FunctionEnv> = async (context) => {
  const env = context.env;
  initializeMetadata(
    { summaries: aiSummaries, authorContext, voiceProfile, factRegistry },
    env,
  );

  const manager = getProviderManager(env, { enableMockFallback: true });
  const providerStatus = manager.getProviderStatus();
  const bindingName = (env.AI_BINDING_NAME as string) || DEFAULT_WORKERS_BINDING_NAME;
  const responseCacheConfig = getResponseCacheConfig(env as Record<string, unknown>);
  
  const hasWorkersBinding = !!(env as Record<string, unknown>)[bindingName];
  const configured = hasAnyProviderConfigured(env) || hasWorkersBinding;

  const timeoutConfig = {
    request: (env.AI_TIMEOUT_REQUEST as number) ?? 45000,
    keywordExtraction: (env.AI_TIMEOUT_KEYWORD as number) ?? 5000,
    evidenceAnalysis: (env.AI_TIMEOUT_EVIDENCE as number) ?? 8000,
    llmStreaming: (env.AI_TIMEOUT_LLM as number) ?? 30000,
  };

  const healthConfig = {
    unhealthyThreshold: (env.AI_HEALTH_THRESHOLD as number) ?? 3,
    recoveryTtl: (env.AI_HEALTH_RECOVERY_TTL as number) ?? 60000,
  };

  const dataStatus = {
    summaries: getDataStatus(aiSummaries, 'articles'),
    authorContext: getDataStatus(authorContext),
    voiceProfile: getDataStatus(voiceProfile),
    factRegistry: getDataStatus(factRegistry, 'facts'),
  };

  return new Response(JSON.stringify({
    status: 'ok',
    timestamp: new Date().toISOString(),
    ai: {
      enabled: true,
      mockMode: !!env.AI_MOCK_MODE,
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
      providers: providerStatus.map(p => ({
        id: p.id,
        type: p.type,
        weight: p.weight,
        healthy: p.health.healthy,
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
    hints: manager.hasProviders()
      ? [
          `Providers available: ${manager.getProviderCount()}`,
          'Mock fallback: enabled',
          responseCacheConfig.enabled ? 'Response cache: enabled' : 'Response cache: disabled',
        ]
      : ['No AI providers configured. Set AI_BASE_URL + AI_API_KEY or configure Workers AI binding.'],
  }, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  });
};
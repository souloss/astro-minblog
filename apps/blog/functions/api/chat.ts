/// <reference types="@cloudflare/workers-types" />
import { handleChatRequest, initializeMetadata } from '@astro-minimax/ai/server';
import type { ChatHandlerEnv } from '@astro-minimax/ai/server';
import aiSummaries from '../../datas/ai-summaries.json';
import authorContext from '../../datas/author-context.json';
import voiceProfile from '../../datas/voice-profile.json';
import factRegistry from '../../datas/fact-registry.json';
import { SITE } from '../../src/config.ts';

let vectorIndex: unknown = null;
let vectorIndexLoaded = false;

async function loadVectorIndex(): Promise<unknown> {
  if (vectorIndexLoaded) return vectorIndex;
  vectorIndexLoaded = true;
  try {
    const module = await import('../../src/data/vectors/index.json');
    vectorIndex = module.default;
  } catch {
    vectorIndex = null;
  }
  return vectorIndex;
}

function buildAiEnv(baseEnv: Record<string, unknown>): Record<string, unknown> {
  const aiConfig = SITE.ai;
  if (!aiConfig) return baseEnv;

  const envWithConfig: Record<string, unknown> = { ...baseEnv };

  // Priority: env var > config.ts > default (handled in AI package)
  // Only set from config if env var is NOT already set
  
  const setIfMissing = (envKey: string, configValue: unknown) => {
    if (envWithConfig[envKey] === undefined && configValue !== undefined) {
      envWithConfig[envKey] = configValue;
    }
  };

  setIfMissing('AI_CACHE_ENABLED', aiConfig.cache?.enabled);
  setIfMissing('AI_CACHE_TTL', aiConfig.cache?.ttl);
  setIfMissing('AI_CACHE_PLAYBACK_DELAY', aiConfig.cache?.playbackDelay);
  setIfMissing('AI_CACHE_CHUNK_SIZE', aiConfig.cache?.chunkSize);
  setIfMissing('AI_CACHE_THINKING_DELAY', aiConfig.cache?.thinkingDelay);

  setIfMissing('AI_TIMEOUT_REQUEST', aiConfig.timeouts?.request);
  setIfMissing('AI_TIMEOUT_KEYWORD', aiConfig.timeouts?.keywordExtraction);
  setIfMissing('AI_TIMEOUT_EVIDENCE', aiConfig.timeouts?.evidenceAnalysis);
  setIfMissing('AI_TIMEOUT_LLM', aiConfig.timeouts?.llmStreaming);

  setIfMissing('AI_HEALTH_THRESHOLD', aiConfig.health?.unhealthyThreshold);
  setIfMissing('AI_HEALTH_RECOVERY_TTL', aiConfig.health?.recoveryTtl);

  setIfMissing('AI_MOCK_MODE', aiConfig.mockMode);

  return envWithConfig;
}

interface FunctionEnv extends ChatHandlerEnv {
  CACHE_KV?: KVNamespace;
  minimaxAI?: Ai;
  [key: string]: unknown;
}

export const onRequest: PagesFunction<FunctionEnv> = async (context) => {
  await loadVectorIndex();
  
  const envWithConfig = buildAiEnv(context.env as Record<string, unknown>);
  
  initializeMetadata(
    { summaries: aiSummaries, authorContext, voiceProfile, factRegistry, vectorIndex },
    envWithConfig,
  );
  return handleChatRequest({ 
    env: envWithConfig as ChatHandlerEnv, 
    request: context.request,
    waitUntil: context.waitUntil,
  });
};
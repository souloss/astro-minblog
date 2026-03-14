/// <reference types="@cloudflare/workers-types" />
/**
 * GET /api/ai-info
 * Debug endpoint: returns AI provider status without exposing secrets.
 */
import { getAIConfigInfo, type FunctionEnv } from '../lib/ai';

export const onRequest: PagesFunction<FunctionEnv> = async (context) => {
  const info = getAIConfigInfo(context.env);

  const safeConfig = {
    AI_BINDING_NAME: context.env.AI_BINDING_NAME || '(default: AI)',
    AI_BASE_URL: context.env.AI_BASE_URL
      ? context.env.AI_BASE_URL.replace(/^(https?:\/\/)([^/]+).*/, '$1$2/...')
      : '(not set)',
    AI_API_KEY: context.env.AI_API_KEY ? '****(set)' : '(not set)',
    AI_MODEL: context.env.AI_MODEL || '(not set)',
    AI_PROVIDER_TYPE: context.env.AI_PROVIDER_TYPE || 'auto',
    CHAT_RATE_LIMIT_ENABLED: context.env.CHAT_RATE_LIMIT_ENABLED ?? 'true',
  };

  const configured = info.hasBinding || info.hasOpenAIConfig;
  const hints: string[] = [];

  if (!configured) {
    hints.push('No AI providers configured.');
    hints.push('Set AI_BASE_URL + AI_API_KEY for OpenAI-compatible APIs (DeepSeek, Moonshot, Qwen, etc.).');
    hints.push('Or configure a Workers AI binding in wrangler.toml.');
  } else {
    if (info.hasOpenAIConfig) hints.push('OpenAI-compatible provider: ready');
    if (info.hasBinding) hints.push(`Workers AI binding "${info.bindingName}": detected`);
    hints.push(`Default model: ${info.model}`);
  }

  return new Response(JSON.stringify({
    status: 'ok',
    timestamp: new Date().toISOString(),
    ai: { configured, providers: { openaiCompatible: info.hasOpenAIConfig, workersAI: info.hasBinding }, defaultModel: info.model },
    environment: safeConfig,
    hints,
  }, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  });
};

import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { ProviderEnv } from './types.js';
export type { ProviderEnv };

export interface ChatProviderResult {
  provider: ReturnType<typeof createOpenAICompatible>;
  model: string;
  keywordModel: string;
  evidenceModel: string;
  type: 'openai-compatible';
}

export interface WorkersAIProviderResult {
  // Workers AI uses the binding directly, not AI SDK provider
  binding: { run: (model: string, options: unknown) => Promise<unknown> };
  model: string;
  keywordModel: string;
  evidenceModel: string;
  type: 'workers-ai';
}

export type AnyProviderResult = ChatProviderResult | WorkersAIProviderResult;

/**
 * Creates an OpenAI-compatible chat provider from environment variables.
 * Supports DeepSeek, Moonshot, Qwen, and any other OpenAI-compatible API.
 */
export function createChatProvider(env: ProviderEnv): ChatProviderResult {
  const baseURL = env.AI_BASE_URL as string;
  const apiKey = env.AI_API_KEY as string;
  const model = (env.AI_MODEL as string) || 'gpt-4o-mini';
  const keywordModel = (env.AI_KEYWORD_MODEL as string) || model;
  const evidenceModel = (env.AI_EVIDENCE_MODEL as string) || keywordModel;

  if (!baseURL || !apiKey) {
    throw new Error('AI service not configured. Please set AI_BASE_URL and AI_API_KEY environment variables.');
  }

  const provider = createOpenAICompatible({
    name: 'blog-chat',
    baseURL,
    apiKey,
    includeUsage: true,
  });

  return { provider, model, keywordModel, evidenceModel, type: 'openai-compatible' };
}

/**
 * Checks whether OpenAI-compatible provider config is available.
 */
export function hasOpenAIConfig(env: ProviderEnv): boolean {
  return !!(env.AI_BASE_URL && env.AI_API_KEY);
}

/**
 * Checks whether Cloudflare Workers AI binding is available.
 */
export function hasWorkersAIBinding(env: ProviderEnv): boolean {
  const bindingName = (env.AI_BINDING_NAME as string) || 'AI';
  return !!(env as Record<string, unknown>)[bindingName];
}

/**
 * Determines which provider type to use based on available config.
 */
export function detectProviderType(env: ProviderEnv): 'openai-compatible' | 'workers-ai' | 'none' {
  const preferred = env.AI_PROVIDER_TYPE;
  if (preferred === 'openai-compatible' && hasOpenAIConfig(env)) return 'openai-compatible';
  if (preferred === 'workers-ai' && hasWorkersAIBinding(env)) return 'workers-ai';
  // Auto-detect: prefer OpenAI-compatible if both are available
  if (hasOpenAIConfig(env)) return 'openai-compatible';
  if (hasWorkersAIBinding(env)) return 'workers-ai';
  return 'none';
}

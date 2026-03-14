export interface ProviderEnv {
  // Cloudflare Workers AI binding
  [key: string]: unknown;
  AI_BINDING_NAME?: string;
  // OpenAI-compatible config
  AI_BASE_URL?: string;
  AI_API_KEY?: string;
  AI_MODEL?: string;
  AI_KEYWORD_MODEL?: string;
  AI_EVIDENCE_MODEL?: string;
  AI_PROVIDER_TYPE?: 'openai-compatible' | 'workers-ai' | 'auto';
}

export type ProviderType = 'openai-compatible' | 'workers-ai';

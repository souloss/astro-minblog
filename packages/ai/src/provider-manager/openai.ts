import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { streamText, convertToModelMessages } from 'ai';
import type { OpenAIProviderConfig, StreamTextOptions, StreamTextResult } from './types.js';
import { BaseProviderAdapter } from './base.js';

let proxyInitialized = false;

async function setupGlobalProxy(): Promise<void> {
  if (proxyInitialized) return;
  
  // Check if running in a Node.js-like environment with proxy configured
  // In Cloudflare Edge Runtime with nodejs_compat, process exists but undici APIs don't work
  if (typeof process === 'undefined' || !process.env) {
    return;
  }
  
  const proxyUrl = process.env.https_proxy || process.env.HTTPS_PROXY || 
                   process.env.http_proxy || process.env.HTTP_PROXY;
  if (!proxyUrl) {
    return;
  }
  
  try {
    // Dynamic import - will fail or return stubs in Cloudflare Edge Runtime
    const undici = await import('undici');
    
    // Verify the APIs actually exist (they won't in Edge Runtime polyfills)
    if (typeof undici.setGlobalDispatcher !== 'function' || 
        typeof undici.ProxyAgent !== 'function') {
      console.log('[OpenAIAdapter] undici APIs not available, skipping proxy setup (likely Edge Runtime)');
      return;
    }
    
    undici.setGlobalDispatcher(new undici.ProxyAgent(proxyUrl));
    console.log('[OpenAIAdapter] Global proxy dispatcher set:', proxyUrl);
    proxyInitialized = true;
  } catch (e) {
    // Expected in Cloudflare Edge Runtime - undici import may fail or APIs may not exist
    console.log('[OpenAIAdapter] Proxy setup skipped:', e instanceof Error ? e.message : String(e));
  }
}

let proxySetupPromise: Promise<void> | null = null;

function ensureProxySetup(): Promise<void> {
  if (!proxySetupPromise) {
    proxySetupPromise = setupGlobalProxy();
  }
  return proxySetupPromise;
}

export class OpenAIAdapter extends BaseProviderAdapter {
  readonly id: string;
  readonly type = 'openai' as const;
  readonly weight: number;
  readonly model: string;
  readonly keywordModel: string;
  readonly evidenceModel: string;
  readonly timeout: number;

  private provider: ReturnType<typeof createOpenAICompatible>;
  private config: OpenAIProviderConfig;

  constructor(config: OpenAIProviderConfig) {
    super({
      unhealthyThreshold: config.unhealthyThreshold ?? (config.maxRetries ? config.maxRetries + 2 : 3),
    });

    this.id = config.id;
    this.weight = config.weight ?? 100;
    this.model = config.model;
    this.keywordModel = config.keywordModel ?? config.model;
    this.evidenceModel = config.evidenceModel ?? this.keywordModel;
    this.timeout = config.timeout ?? 30000;
    this.config = config;

    this.provider = createOpenAICompatible({
      name: `openai-${config.id}`,
      baseURL: config.baseURL,
      apiKey: config.apiKey,
      includeUsage: true,
    });

    ensureProxySetup().catch(() => {});
  }

  async streamText(options: StreamTextOptions): Promise<StreamTextResult> {
    await ensureProxySetup();
    
    const { system, messages, temperature = 0.7, maxOutputTokens, topP, abortSignal, onError, tools } = options;

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), this.timeout);

    if (abortSignal) {
      abortSignal.addEventListener('abort', () => abortController.abort());
    }

    try {
      const result = streamText({
        model: this.provider.chatModel(this.model),
        system,
        messages: await convertToModelMessages(messages),
        temperature,
        maxOutputTokens,
        topP,
        tools,
        abortSignal: abortController.signal,
        onError: ({ error }) => {
          onError?.(error instanceof Error ? error : new Error(String(error)));
        },
      });

      const streamResult: StreamTextResult = {
        toUIMessageStreamResponse: (responseOptions?: { headers?: HeadersInit }) =>
          result.toUIMessageStreamResponse(responseOptions),
        providerId: this.id,
        isMock: false,
      };

      clearTimeout(timeoutId);
      return streamResult;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  getConfig(): OpenAIProviderConfig {
    return { ...this.config };
  }

  getProvider(): { chatModel: (model: string) => unknown } {
    return this.provider;
  }
}
import { createWorkersAI } from 'workers-ai-provider';
import { streamText, convertToModelMessages } from 'ai';
import type { WorkersAIProviderConfig, StreamTextOptions, StreamTextResult, ProviderManagerEnv } from './types.js';
import { BaseProviderAdapter } from './base.js';

export class WorkersAIAdapter extends BaseProviderAdapter {
  readonly id: string;
  readonly type = 'workers' as const;
  readonly weight: number;
  readonly model: string;
  readonly keywordModel: string;
  readonly evidenceModel: string;
  readonly timeout: number;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private provider: any;
  private config: WorkersAIProviderConfig;

  constructor(config: WorkersAIProviderConfig, env: ProviderManagerEnv) {
    super({
      unhealthyThreshold: config.unhealthyThreshold ?? (config.maxRetries ? config.maxRetries + 2 : 3),
    });

    this.id = config.id;
    this.weight = config.weight ?? 90;
    this.model = config.model;
    this.keywordModel = config.keywordModel ?? config.model;
    this.evidenceModel = config.evidenceModel ?? this.keywordModel;
    this.timeout = config.timeout ?? 30000;
    this.config = config;

    const binding = env[config.bindingName];
    if (!binding) {
      throw new Error(`Workers AI binding '${config.bindingName}' not found in environment`);
    }

    this.provider = createWorkersAI({ binding: binding as any });
  }

  async streamText(options: StreamTextOptions): Promise<StreamTextResult> {
    const { system, messages, temperature = 0.7, maxOutputTokens, topP, abortSignal, onError } = options;

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), this.timeout);

    if (abortSignal) {
      abortSignal.addEventListener('abort', () => abortController.abort());
    }

    try {
      const model = this.provider(this.model, { safePrompt: true });
      
      const result = streamText({
        model,
        system,
        messages: await convertToModelMessages(messages),
        temperature,
        maxOutputTokens,
        topP,
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

  getConfig(): WorkersAIProviderConfig {
    return { ...this.config };
  }

  getProvider(): { chatModel: (model: string) => unknown } {
    return {
      chatModel: (modelId: string) => this.provider(modelId, { safePrompt: true }),
    };
  }
}
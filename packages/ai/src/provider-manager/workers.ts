import { createWorkersAI } from "workers-ai-provider";
import { streamText, convertToModelMessages } from "ai";
import type { WorkersAISettings } from "workers-ai-provider";
import type {
  WorkersAIProviderConfig,
  StreamTextOptions,
  StreamTextResult,
  ProviderManagerEnv,
} from "./types.js";
import { BaseProviderAdapter } from "./base.js";

export class WorkersAIAdapter extends BaseProviderAdapter {
  readonly id: string;
  readonly type = "workers" as const;
  readonly weight: number;
  readonly model: string;
  readonly keywordModel: string;
  readonly evidenceModel: string;
  readonly timeout: number;

  private provider: ReturnType<typeof createWorkersAI>;
  private config: WorkersAIProviderConfig;

  constructor(config: WorkersAIProviderConfig, env: ProviderManagerEnv) {
    super({
      unhealthyThreshold: config.unhealthyThreshold ?? 3,
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
      throw new Error(
        `Workers AI binding '${config.bindingName}' not found in environment`
      );
    }

    type WorkersAIBinding = NonNullable<WorkersAISettings["binding"]>;
    this.provider = createWorkersAI({ binding: binding as WorkersAIBinding });
  }

  async streamText(options: StreamTextOptions): Promise<StreamTextResult> {
    const {
      system,
      messages,
      temperature = 0.7,
      maxOutputTokens,
      topP,
      abortSignal,
      onError,
      tools,
    } = options;

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), this.timeout);

    const abortHandler = () => abortController.abort();
    if (abortSignal) {
      if (abortSignal.aborted) {
        clearTimeout(timeoutId);
        throw new DOMException("The operation was aborted.", "AbortError");
      }
      abortSignal.addEventListener("abort", abortHandler, { once: true });
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
        tools,
        abortSignal: abortController.signal,
        onError: ({ error }) => {
          onError?.(error instanceof Error ? error : new Error(String(error)));
        },
      });

      const streamResult: StreamTextResult = {
        toUIMessageStreamResponse: (responseOptions?: {
          headers?: HeadersInit;
        }) => result.toUIMessageStreamResponse(responseOptions),
        providerId: this.id,
        isMock: false,
      };

      return streamResult;
    } catch (error) {
      throw error;
    } finally {
      clearTimeout(timeoutId);
      if (abortSignal) {
        abortSignal.removeEventListener("abort", abortHandler);
      }
    }
  }

  getConfig(): WorkersAIProviderConfig {
    return { ...this.config };
  }

  getProvider(): { chatModel: (model: string) => unknown } {
    return {
      chatModel: (modelId: string) =>
        this.provider(modelId, { safePrompt: true }),
    };
  }
}

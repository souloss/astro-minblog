import type { LanguageModel } from "ai";
import { createLogger } from "../utils/logger.js";
const openaiLog = createLogger("openai-adapter");
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { streamText, convertToModelMessages } from "ai";
import type {
  OpenAIProviderConfig,
  StreamTextOptions,
  StreamTextResult,
} from "./types.js";
import { BaseProviderAdapter } from "./base.js";

let proxyInitialized = false;

async function setupGlobalProxy(): Promise<void> {
  if (proxyInitialized) return;

  // Check if running in a Node.js-like environment with proxy configured
  // In Cloudflare Edge Runtime with nodejs_compat, process exists but undici APIs don't work
  if (typeof process === "undefined" || !process.env) {
    return;
  }

  const proxyUrl =
    process.env.https_proxy ||
    process.env.HTTPS_PROXY ||
    process.env.http_proxy ||
    process.env.HTTP_PROXY;
  if (!proxyUrl) {
    return;
  }

  try {
    // Dynamic import - will fail or return stubs in Cloudflare Edge Runtime
    const undici = await import("undici");

    // Verify the APIs actually exist (they won't in Edge Runtime polyfills)
    if (
      typeof undici.setGlobalDispatcher !== "function" ||
      typeof undici.ProxyAgent !== "function"
    ) {
      openaiLog.info(
        "undici APIs not available, skipping proxy setup (likely Edge Runtime)"
      );
      return;
    }

    undici.setGlobalDispatcher(new undici.ProxyAgent(proxyUrl));
    openaiLog.info("Global proxy dispatcher set:", proxyUrl);
    proxyInitialized = true;
  } catch (e) {
    // Expected in Cloudflare Edge Runtime - undici import may fail or APIs may not exist
    openaiLog.info(
      "Proxy setup skipped:",
      e instanceof Error ? e.message : String(e)
    );
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
  readonly type = "openai" as const;
  readonly weight: number;
  readonly model: string;
  readonly keywordModel: string;
  readonly evidenceModel: string;
  readonly timeout: number;

  private provider: ReturnType<typeof createOpenAICompatible>;
  private config: OpenAIProviderConfig;

  constructor(config: OpenAIProviderConfig) {
    super({
      unhealthyThreshold: config.unhealthyThreshold ?? 3,
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
        toUIMessageStreamResponse: (responseOptions?: {
          headers?: HeadersInit;
        }) => result.toUIMessageStreamResponse(responseOptions),
        providerId: this.id,
        isMock: false,
      };

      // NOTE: We intentionally do NOT clearTimeout here. The timeout guards the
      // initial connection. The stream lifecycle is managed by the consumer via
      // abortSignal. Clearing the timeout immediately would make it useless.
      return streamResult;
    } finally {
      clearTimeout(timeoutId);
      if (abortSignal) {
        abortSignal.removeEventListener("abort", abortHandler);
      }
    }
  }

  getConfig(): OpenAIProviderConfig {
    return { ...this.config };
  }

  getProvider(): { chatModel: (model: string) => LanguageModel } {
    return this.provider;
  }
}

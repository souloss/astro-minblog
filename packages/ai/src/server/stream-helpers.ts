import {
  type UIMessage,
  type UIMessageStreamWriter,
  type ToolSet,
  streamText,
  convertToModelMessages,
  stepCountIs,
} from "ai";
import { t } from "../utils/i18n.js";
import { CHAT_HANDLER } from "../constants.js";
import { createLogger } from "../utils/logger.js";
import { createChatStatusData } from "./types.js";
import type { NotifyTokenUsage as TokenUsage } from "./types.js";
import type { ProviderAdapter } from "../provider-manager/types.js";
import type {
  CachedAIResponse,
  ResponseCacheConfig,
} from "../cache/response-cache.js";
import { createResponsePlaybackGenerator } from "../cache/response-cache.js";
import type { SourceSelection } from "../search/types.js";
import {
  getStreamResultMetadata,
  streamResultHadToolCalls,
  extractReasoningText,
  parseTokenUsage,
  consumeStreamWithErrors,
} from "./stream-processor.js";

const log = createLogger("stream-helpers");

// ── Types ─────────────────────────────────────────────────

export type MessageStreamWriter = UIMessageStreamWriter<UIMessage>;

interface SourceArticle {
  title: string;
  url?: string;
  heading?: string;
  snippet?: string;
  score?: number;
  matchTerms?: string[];
}

interface StreamLLMParams {
  writer: MessageStreamWriter;
  adapter: ProviderAdapter;
  systemPrompt: string;
  messages: UIMessage[];
  lang: string;
  temperature?: number;
  maxOutputTokens?: number;
  tools?: ToolSet;
}

interface StreamLLMResult {
  success: boolean;
  responseText: string;
  reasoningText?: string;
  tokenUsage?: TokenUsage;
  generationMs: number;
  hadToolCalls?: boolean;
}

interface StreamFailoverParams extends Omit<StreamLLMParams, "adapter"> {
  adapters: ProviderAdapter[];
}

interface StreamFailoverResult extends StreamLLMResult {
  adapter: ProviderAdapter | null;
}

interface StreamAnswerWithFallbackParams extends Omit<
  StreamFailoverParams,
  "adapters"
> {
  adapters?: ProviderAdapter[];
  question: string;
}

export interface StreamAnswerWithFallbackResult extends StreamFailoverResult {
  usedMockFallback: boolean;
}

// ── Metadata Writers ──────────────────────────────────────

export function writeSearchStatus(
  writer: MessageStreamWriter,
  count: number,
  lang: string
): void {
  writer.write({
    type: "message-metadata",
    messageMetadata: createChatStatusData({
      stage: "search",
      message: t("ai.status.found", lang, { count }),
      progress: 40,
    }),
  });
}

export function writeGeneratingStatus(
  writer: MessageStreamWriter,
  lang: string,
  progress = 60
): void {
  writer.write({
    type: "message-metadata",
    messageMetadata: createChatStatusData({
      stage: "answer",
      message: t("ai.status.generating", lang),
      progress,
    }),
  });
}

export function writeDoneStatus(
  writer: MessageStreamWriter,
  lang: string
): void {
  writer.write({
    type: "message-metadata",
    messageMetadata: createChatStatusData({
      stage: "answer",
      message: t("ai.status.generating", lang),
      progress: 100,
      done: true,
    }),
  });
}

export function writeSourceArticles(
  writer: MessageStreamWriter,
  articles: Array<SourceArticle | SourceSelection>,
  max = 3
): void {
  for (const article of articles.slice(0, max)) {
    try {
      writer.write({
        type: "source-url",
        sourceId: `source-${article.title}`,
        url: article.url ?? "#",
        title: article.title,
      });
    } catch (e) {
      log.warn(
        "writeSourceArticles failed:",
        e instanceof Error ? e.message : String(e)
      );
    }
  }
}

export function writeSourceSnippets(
  writer: MessageStreamWriter,
  articles: Array<SourceArticle | SourceSelection>,
  max = 3
): void {
  for (const article of articles.slice(0, max)) {
    if (!article.snippet) continue;
    try {
      writer.write({
        type: "data-source-snippet",
        id: `snippet-${article.title}-${article.heading ?? "section"}`,
        data: {
          sourceId: `source-${article.title}`,
          title: article.title,
          url: article.url ?? "#",
          heading: article.heading,
          snippet: article.snippet,
          score: article.score,
          matchTerms: article.matchTerms ?? [],
        },
      });
    } catch (e) {
      log.warn(
        "writeSourceSnippets failed:",
        e instanceof Error ? e.message : String(e)
      );
    }
  }
}

export function writeTextChunk(
  writer: MessageStreamWriter,
  text: string,
  idPrefix = "text"
): void {
  const id = `${idPrefix}-${Date.now()}`;
  writer.write({ type: "text-start", id });
  writer.write({ type: "text-delta", id, delta: text });
  writer.write({ type: "text-end", id });
}

export function writeFinish(
  writer: MessageStreamWriter,
  reason: "stop" | "error" = "stop"
): void {
  writer.write({ type: "finish", finishReason: reason });
}

// ── LLM Streaming ─────────────────────────────────────────

export async function streamLLMResponse(
  params: StreamLLMParams
): Promise<StreamLLMResult> {
  const {
    writer,
    adapter,
    systemPrompt,
    messages,
    lang,
    temperature = Number(CHAT_HANDLER.CACHED_REPLAY_TEMPERATURE),
    maxOutputTokens = Number(CHAT_HANDLER.CACHED_REPLAY_MAX_OUTPUT_TOKENS),
    tools,
  } = params;

  const start = Date.now();

  try {
    const provider = adapter.getProvider();
    const result = streamText({
      model: provider.chatModel(
        adapter.model
      ),
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
      temperature,
      maxOutputTokens,
      tools,
      stopWhen: stepCountIs(5),
      onError: ({ error }) => {
        log.error("streamText error:", error);
      },
    });

    writer.merge(result.toUIMessageStream({ sendFinish: false }));
    const streamErrors = await consumeStreamWithErrors(opts =>
      result.consumeStream(opts)
    );

    const text = await result.text;
    const metadata = getStreamResultMetadata(result);
    const hadToolCalls = streamResultHadToolCalls(result);

    const reasoningText = metadata.reasoning
      ? await extractReasoningText(metadata.reasoning)
      : undefined;

    const tokenUsage = metadata.usage
      ? await parseTokenUsage(metadata.usage)
      : undefined;

    const generationMs = Date.now() - start;

    if (streamErrors.length > 0) {
      adapter.recordFailure(streamErrors[0]);
      // Do NOT write error text or finish event here — the failover loop
      // in streamLLMWithFailover will try the next adapter.  Writing error
      // chunks now causes "double content" (error text from first provider
      // plus real answer from second provider) visible to the user.
      return {
        success: false,
        responseText: text,
        reasoningText,
        tokenUsage,
        generationMs,
        hadToolCalls,
      };
    }

    if (text.length > 0) {
      adapter.recordSuccess();
      writeFinish(writer);
      return {
        success: true,
        responseText: text,
        reasoningText,
        tokenUsage,
        generationMs,
        hadToolCalls,
      };
    }

    if (hadToolCalls) {
      adapter.recordSuccess();
      writeFinish(writer);
      return {
        success: true,
        responseText: "",
        reasoningText,
        tokenUsage,
        generationMs,
        hadToolCalls,
      };
    }

    writeTextChunk(writer, t("ai.error.noOutput", lang), "no-output");
    writeFinish(writer);
    return {
      success: true,
      responseText: "",
      reasoningText,
      tokenUsage,
      generationMs,
      hadToolCalls,
    };
  } catch (err) {
    adapter.recordFailure(err instanceof Error ? err : new Error(String(err)));
    log.error("Provider threw:", err instanceof Error ? err.message : String(err));
    return {
      success: false,
      responseText: "",
      generationMs: Date.now() - start,
      hadToolCalls: false,
    };
  }
}

export async function streamLLMWithFailover(
  params: StreamFailoverParams
): Promise<StreamFailoverResult> {
  const { adapters, ...streamParams } = params;

  for (const adapter of adapters) {
    const result = await streamLLMResponse({ ...streamParams, adapter });
    if (
      result.success &&
      (result.responseText.length > 0 || result.hadToolCalls)
    ) {
      return { ...result, adapter };
    }
  }

  return {
    success: false,
    responseText: "",
    generationMs: 0,
    adapter: null,
  };
}

export async function streamAnswerWithFallback(
  params: StreamAnswerWithFallbackParams
): Promise<StreamAnswerWithFallbackResult> {
  const { writer, adapters = [], question, lang, ...streamParams } = params;
  const llmResult = await streamLLMWithFailover({
    writer,
    adapters,
    lang,
    ...streamParams,
  });

  if (llmResult.adapter) {
    return {
      ...llmResult,
      usedMockFallback: false,
    };
  }

  const responseText = await streamMockFallback(writer, question, lang);
  return {
    success: true,
    responseText,
    generationMs: llmResult.generationMs,
    adapter: null,
    usedMockFallback: true,
  };
}

// ── Mock Fallback ─────────────────────────────────────────

export async function streamMockFallback(
  writer: MessageStreamWriter,
  question: string,
  lang: string
): Promise<string> {
  const { getMockResponse } = await import("../providers/mock.js");
  const mockText = getMockResponse(question, lang);

  writer.write({
    type: "message-metadata",
    messageMetadata: createChatStatusData({
      stage: "answer",
      message: t("ai.status.fallback", lang),
      progress: 80,
    }),
  });

  writeTextChunk(writer, mockText, "fallback");
  writeFinish(writer);
  return mockText;
}

// ── Cached Response Playback ──────────────────────────────

export async function streamCachedResponse(
  writer: MessageStreamWriter,
  cachedResponse: CachedAIResponse,
  config: ResponseCacheConfig,
  lang: string
): Promise<void> {
  writeSearchStatus(
    writer,
    cachedResponse.articles.length + cachedResponse.projects.length,
    lang
  );
  writeGeneratingStatus(writer, lang);
  writeSourceArticles(writer, cachedResponse.sources);
  writeSourceSnippets(writer, cachedResponse.sources);
  writeGeneratingStatus(writer, lang, 70);

  const playbackGenerator = createResponsePlaybackGenerator(
    cachedResponse,
    config
  );

  let thinkingId: string | undefined;
  const textId = `text-${Date.now()}`;
  let textStarted = false;

  for await (const chunk of playbackGenerator) {
    if (chunk.type === "thinking") {
      if (!thinkingId) {
        thinkingId = `thinking-${Date.now()}`;
        writer.write({ type: "reasoning-start", id: thinkingId });
      }
      writer.write({
        type: "reasoning-delta",
        id: thinkingId,
        delta: chunk.text,
      });
    } else {
      if (thinkingId) {
        writer.write({ type: "reasoning-end", id: thinkingId });
        thinkingId = undefined;
      }
      if (!textStarted) {
        writer.write({ type: "text-start", id: textId });
        textStarted = true;
      }
      writer.write({ type: "text-delta", id: textId, delta: chunk.text });
    }
  }

  if (thinkingId) {
    writer.write({ type: "reasoning-end", id: thinkingId });
  }
  if (textStarted) {
    writer.write({ type: "text-end", id: textId });
  }

  writeDoneStatus(writer, lang);
  writeFinish(writer);
}

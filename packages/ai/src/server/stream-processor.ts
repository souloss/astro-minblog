import { createLogger } from "../utils/logger.js";
import type { NotifyTokenUsage as TokenUsage } from "./types.js";

const log = createLogger("stream-processor");

// ── Stream Result Metadata ─────────────────────────────────

type StreamResultMetadata = {
  reasoning?: PromiseLike<unknown>;
  usage?: PromiseLike<{
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  }>;
};

function getStreamResultMetadata(result: unknown): StreamResultMetadata {
  return typeof result === "object" && result !== null
    ? (result as StreamResultMetadata)
    : {};
}

function streamResultHadToolCalls(result: unknown): boolean {
  if (typeof result !== "object" || result === null) return false;

  const candidate = result as {
    steps?: Array<{ toolCalls?: unknown[] }>;
    toolCalls?: unknown[];
  };

  if (Array.isArray(candidate.steps)) {
    for (const step of candidate.steps) {
      if (Array.isArray(step?.toolCalls) && step.toolCalls.length > 0) {
        return true;
      }
    }
  }

  return Array.isArray(candidate.toolCalls) && candidate.toolCalls.length > 0;
}

// ── Reasoning Text Extraction ──────────────────────────────

/**
 * Extracts reasoning text from an AI SDK stream result.
 *
 * Handles AI SDK v6 reasoning parts which may be:
 * - A plain string
 * - An array of `{ text: string }` objects
 * - Other shapes (converted via `String()`)
 */
async function extractReasoningText(
  reasoningPromise: PromiseLike<unknown>
): Promise<string | undefined> {
  try {
    const reasoningOutput = await Promise.resolve(reasoningPromise);
    if (typeof reasoningOutput === "string") {
      return reasoningOutput;
    }
    if (Array.isArray(reasoningOutput)) {
      return reasoningOutput
        .map((r): string => {
          if (typeof r === "object" && r !== null && "text" in r)
            return (r as { text: string }).text;
          return String(r);
        })
        .join("");
    }
    return undefined;
  } catch (e) {
    log.debug(
      "reasoning extraction failed:",
      e instanceof Error ? e.message : String(e)
    );
    return undefined;
  }
}

// ── Token Usage Parsing ────────────────────────────────────

/**
 * Parses token usage from an AI SDK stream result usage promise.
 *
 * Maps AI SDK `inputTokens`/`outputTokens`/`totalTokens` to the
 * application's `TokenUsage` shape.
 */
async function parseTokenUsage(
  usagePromise: PromiseLike<{
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  }>
): Promise<TokenUsage | undefined> {
  try {
    const usage = await Promise.resolve(usagePromise);
    const inputTokens = usage.inputTokens ?? 0;
    const outputTokens = usage.outputTokens ?? 0;
    return {
      total: usage.totalTokens ?? inputTokens + outputTokens,
      input: inputTokens,
      output: outputTokens,
    };
  } catch {
    /* usage is optional */
    return undefined;
  }
}

// ── Stream Error Collection ────────────────────────────────

interface ConsumeStreamFn {
  (options: { onError: (error: unknown) => void }): PromiseLike<void>;
}

/**
 * Consumes a stream while collecting all errors into an array.
 *
 * Each error is normalized to an `Error` instance.
 */
async function consumeStreamWithErrors(
  consumeStream: ConsumeStreamFn
): Promise<Error[]> {
  const errors: Error[] = [];
  await consumeStream({
    onError: error => {
      errors.push(error instanceof Error ? error : new Error(String(error)));
    },
  });
  return errors;
}

// ── Public API ─────────────────────────────────────────────

export {
  getStreamResultMetadata,
  streamResultHadToolCalls,
  extractReasoningText,
  parseTokenUsage,
  consumeStreamWithErrors,
};

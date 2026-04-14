/**
 * Unified timeout utilities for the AI pipeline.
 *
 * Encapsulates the AbortController + setTimeout + cleanup pattern that was
 * previously repeated across 5+ call sites in the AI package. Each function
 * targets a specific pattern variation found in the codebase.
 *
 * ## Pattern Mapping
 *
 * | Call Site                         | Utility                        |
 * |-----------------------------------|--------------------------------|
 * | `chat-handler.ts` — request-level | `createTimeoutController`      |
 * | `chat-handler.ts` — keyword ext.  | `withTimeout` (with fallback)  |
 * | `prompt-runtime.ts` — evidence    | `withTimeout` (with fallback)  |
 * | `openai.ts` — per-provider        | `createChainedTimeoutController` |
 * | `workers.ts` — per-provider       | `createChainedTimeoutController` |
 *
 * @module timeout
 */

/**
 * Run an async function with a timeout guard.
 *
 * Creates an `AbortController` that aborts after `ms` milliseconds and
 * passes its signal to `fn`. If `fn` does not complete before the timeout,
 * the signal is aborted and:
 * - If `fallback` is provided, it is returned silently.
 * - Otherwise, the `DOMException` from the abort propagates.
 *
 * An optional `parentSignal` can be forwarded for external cancellation
 * (e.g. a request-level timeout). If the parent is already aborted at call
 * time, the function returns `fallback` (or throws) immediately without
 * entering the try/catch.
 *
 * @param fn            Async function receiving the combined `AbortSignal`.
 * @param ms            Timeout in milliseconds.
 * @param fallback      If provided, returned instead of throwing on timeout.
 * @param parentSignal  Optional external `AbortSignal` to chain.
 * @returns The return value of `fn`, or `fallback` on timeout.
 * @throws `DOMException` on timeout (if no fallback) or parent abort.
 *
 * @example
 * // Keyword extraction with silent fallback (chat-handler.ts pattern)
 * const result = await withTimeout(
 *   (signal) => extractSearchKeywords({ messages, provider, abortSignal: signal }),
 *   5000,
 *   undefined, // fallback — returns undefined on timeout
 * );
 * if (result) searchQuery = result.query;
 *
 * @example
 * // Evidence analysis with typed fallback (prompt-runtime.ts pattern)
 * const evidenceResult = await withTimeout(
 *   (signal) => analyzeRetrievedEvidence({
 *     articles, provider, abortSignal: signal,
 *   }),
 *   8000,
 *   undefined,
 * );
 * if (evidenceResult?.analysis) {
 *   evidenceSection = buildEvidenceSection(evidenceResult.analysis);
 * }
 *
 * @example
 * // Chaining a parent signal for nested timeouts
 * const data = await withTimeout(
 *   (signal) => fetchWithRetry(url, { signal }),
 *   3000,
 *   defaultData,
 *   requestAbortSignal, // cancels if the whole request times out
 * );
 */
export async function withTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  ms: number,
  fallback?: T,
  parentSignal?: AbortSignal
): Promise<T> {
  if (parentSignal?.aborted) {
    if (fallback !== undefined) return fallback;
    throw new DOMException("The operation was aborted.", "AbortError");
  }

  const controller = new AbortController();
  const timerId = setTimeout(() => controller.abort(), ms);

  const onParentAbort = () => controller.abort();
  parentSignal?.addEventListener("abort", onParentAbort, { once: true });

  try {
    return await fn(controller.signal);
  } catch (error) {
    if (
      fallback !== undefined &&
      error instanceof DOMException &&
      controller.signal.aborted &&
      !parentSignal?.aborted
    ) {
      return fallback;
    }
    throw error;
  } finally {
    clearTimeout(timerId);
    parentSignal?.removeEventListener("abort", onParentAbort);
  }
}

/**
 * Create a timeout AbortController without wrapping a function.
 *
 * Use this when you need direct control over the controller (e.g. passing
 * it through multiple layers). The caller is responsible for calling
 * `cleanup()` in a `finally` block.
 *
 * @param ms  Timeout in milliseconds.
 * @returns Object with `controller`, its `signal`, and a `cleanup` function.
 *
 * @example
 * // Request-level timeout (chat-handler.ts pattern)
 * const { controller, signal, cleanup } = createTimeoutController(45_000);
 * try {
 *   return await runPipeline({ requestAbort: controller, ... });
 * } catch (err) {
 *   if (signal.aborted) return errors.timeout(lang);
 *   throw err;
 * } finally {
 *   cleanup();
 * }
 */
export function createTimeoutController(ms: number): {
  controller: AbortController;
  signal: AbortSignal;
  cleanup: () => void;
} {
  const controller = new AbortController();
  const timerId = setTimeout(() => controller.abort(), ms);

  return {
    controller,
    signal: controller.signal,
    cleanup: () => clearTimeout(timerId),
  };
}

/**
 * Create a timeout AbortController that chains a parent signal.
 *
 * The returned controller aborts when either the timeout fires **or** the
 * parent signal aborts — whichever comes first. If the parent is already
 * aborted at call time, this throws immediately.
 *
 * Use this when you need a combined signal (timeout + parent) but still
 * want manual control over the stream lifecycle (e.g. `streamText` that
 * returns a lazy stream rather than a resolved value).
 *
 * @param ms            Timeout in milliseconds.
 * @param parentSignal  Optional external `AbortSignal` to chain.
 * @returns Object with `controller`, its `signal`, and a `cleanup` function.
 * @throws `DOMException` if `parentSignal` is already aborted.
 *
 * @example
 * // Per-provider streaming timeout (openai.ts / workers.ts pattern)
 * async streamText(options: StreamTextOptions): Promise<StreamTextResult> {
 *   const { controller, signal, cleanup } = createChainedTimeoutController(
 *     this.timeout,
 *     options.abortSignal,
 *   );
 *   try {
 *     const result = streamText({
 *       model, system, messages,
 *       abortSignal: signal,
 *     });
 *     return { toUIMessageStreamResponse: result.toUIMessageStreamResponse, ... };
 *   } finally {
 *     cleanup();
 *   }
 * }
 */
export function createChainedTimeoutController(
  ms: number,
  parentSignal?: AbortSignal
): {
  controller: AbortController;
  signal: AbortSignal;
  cleanup: () => void;
} {
  const controller = new AbortController();
  const timerId = setTimeout(() => controller.abort(), ms);

  const abortHandler = () => controller.abort();

  if (parentSignal) {
    if (parentSignal.aborted) {
      clearTimeout(timerId);
      throw new DOMException("The operation was aborted.", "AbortError");
    }
    parentSignal.addEventListener("abort", abortHandler, { once: true });
  }

  return {
    controller,
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timerId);
      parentSignal?.removeEventListener("abort", abortHandler);
    },
  };
}

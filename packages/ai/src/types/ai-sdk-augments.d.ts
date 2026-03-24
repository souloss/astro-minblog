/**
 * Type augmentations for AI SDK v6.
 * 
 * The AI SDK's UIMessageStreamWriter type doesn't expose all message types
 * that the protocol actually supports. These augmentations provide type-safe
 * access to text-start/text-delta/text-end events and result properties.
 */

import type { UIMessage } from 'ai';

declare module 'ai' {
  interface StreamTextResult<TOOLS, OUTPUT> {
    reasoning?: PromiseLike<unknown>;
    usage?: PromiseLike<{
      inputTokens?: number;
      outputTokens?: number;
      totalTokens?: number;
    }>;
  }
}

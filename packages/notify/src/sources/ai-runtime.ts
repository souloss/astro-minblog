import type { AiChatEvent } from "../types.js";

export type AiRuntimeEventInput = Omit<AiChatEvent, "type">;

export function createAiRuntimeEventInput(
  event: AiRuntimeEventInput
): AiRuntimeEventInput {
  return {
    ...event,
    source: event.source ?? {
      kind: "ai-runtime",
      eventName: "completed",
    },
  };
}

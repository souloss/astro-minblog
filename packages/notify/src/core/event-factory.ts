import type { AiChatEvent, CommentEvent, NotifyEvent } from "../types.js";

export function withTimestamp<T extends NotifyEvent>(event: T): T {
  return {
    ...event,
    timestamp: event.timestamp ?? new Date(),
  };
}

export function createCommentEvent(
  event: Omit<CommentEvent, "type">
): CommentEvent {
  return {
    ...event,
    type: "comment",
    timestamp: event.timestamp ?? new Date(),
  };
}

export function createAiChatEvent(
  event: Omit<AiChatEvent, "type">
): AiChatEvent {
  return {
    ...event,
    type: "ai-chat",
    timestamp: event.timestamp ?? new Date(),
  };
}

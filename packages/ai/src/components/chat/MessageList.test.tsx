import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import { shouldShowWaitingPlaceholder } from "./MessageList.tsx";

function makeMessage(id: string, role: "user" | "assistant" | "system"): UIMessage {
  return {
    id,
    role,
    content: "",
    parts: [],
  } as UIMessage;
}

describe("shouldShowWaitingPlaceholder", () => {
  it("returns true when streaming and last message is user with no assistant message", () => {
    const messages: UIMessage[] = [
      makeMessage("welcome", "system"),
      makeMessage("u1", "user"),
    ];

    expect(shouldShowWaitingPlaceholder(messages, true)).toBe(true);
  });

  it("returns false when not streaming", () => {
    const messages: UIMessage[] = [
      makeMessage("welcome", "system"),
      makeMessage("u1", "user"),
    ];

    expect(shouldShowWaitingPlaceholder(messages, false)).toBe(false);
  });

  it("returns false when streaming but an assistant message already exists", () => {
    const messages: UIMessage[] = [
      makeMessage("welcome", "system"),
      makeMessage("u1", "user"),
      makeMessage("a1", "assistant"),
    ];

    expect(shouldShowWaitingPlaceholder(messages, true)).toBe(false);
  });

  it("returns false when streaming with an empty assistant message (race condition)", () => {
    const messages: UIMessage[] = [
      makeMessage("welcome", "system"),
      makeMessage("u1", "user"),
      { id: "a1", role: "assistant", content: "", parts: [] } as UIMessage,
    ];

    expect(shouldShowWaitingPlaceholder(messages, true)).toBe(false);
  });

  it("returns false when streaming and last message is assistant", () => {
    const messages: UIMessage[] = [
      makeMessage("welcome", "system"),
      makeMessage("u1", "user"),
      makeMessage("a1", "assistant"),
    ];

    // Even though isStreaming=true, lastMessage.role is "assistant", not "user"
    expect(shouldShowWaitingPlaceholder(messages, true)).toBe(false);
  });

  it("returns false for empty messages array", () => {
    expect(shouldShowWaitingPlaceholder([], true)).toBe(false);
  });

  it("returns false for empty messages array even when not streaming", () => {
    expect(shouldShowWaitingPlaceholder([], false)).toBe(false);
  });
});

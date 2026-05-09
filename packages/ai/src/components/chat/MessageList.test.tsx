import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import { shouldShowWaitingPlaceholder, shouldSkipEmptyAssistant } from "./MessageList.tsx";

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

describe("shouldSkipEmptyAssistant", () => {
  it("skips empty assistant message when not streaming", () => {
    const msg = makeMessage("a1", "assistant");
    expect(shouldSkipEmptyAssistant(msg, false, false)).toBe(true);
  });

  it("skips empty assistant message even when it is the last streaming one", () => {
    const msg = makeMessage("a1", "assistant");
    // Even the currently-streaming last assistant message is skipped if it
    // has no visible content — the isWaitingForAssistant placeholder or the
    // next assistant message with actual text handles the display.
    expect(shouldSkipEmptyAssistant(msg, true, true)).toBe(true);
  });

  it("skips assistant message with whitespace-only text", () => {
    const msg = makeMessage("a1", "assistant", [
      { type: "text", text: "   \n  " },
      { type: "tool-searchArticles", state: "call" },
    ]);
    expect(shouldSkipEmptyAssistant(msg, true, true)).toBe(true);
  });

  it("does not skip assistant message with text content", () => {
    const msg = {
      id: "a1",
      role: "assistant",
      content: "Hello",
      parts: [{ type: "text", text: "Hello" }],
    } as UIMessage;
    expect(shouldSkipEmptyAssistant(msg, false, false)).toBe(false);
  });

  it("does not skip assistant message with reasoning parts", () => {
    const msg = {
      id: "a1",
      role: "assistant",
      content: "",
      parts: [{ type: "reasoning", text: "thinking..." }],
    } as UIMessage;
    expect(shouldSkipEmptyAssistant(msg, false, false)).toBe(false);
  });

  it("skips assistant message with only non-action tool parts (searchArticles)", () => {
    const msg = {
      id: "a1",
      role: "assistant",
      content: "",
      parts: [{ type: "tool-searchArticles", state: "output-available", toolCallId: "tc1", input: {}, output: {} }],
    } as unknown as UIMessage;
    expect(shouldSkipEmptyAssistant(msg, false, false)).toBe(true);
  });

  it("does not skip assistant message with successful action tool output", () => {
    const msg = {
      id: "a1",
      role: "assistant",
      content: "",
      parts: [{ type: "tool-toggleTheme", state: "output-available", toolCallId: "tc1", input: { theme: "dark" }, output: { success: true, confirmation: "Switched to dark mode." } }],
    } as unknown as UIMessage;
    expect(shouldSkipEmptyAssistant(msg, false, false)).toBe(false);
  });

  it("skips assistant message with failed action tool output", () => {
    const msg = {
      id: "a1",
      role: "assistant",
      content: "",
      parts: [{ type: "tool-toggleTheme", state: "output-available", toolCallId: "tc1", input: {}, output: { success: false, error: "failed" } }],
    } as unknown as UIMessage;
    expect(shouldSkipEmptyAssistant(msg, false, false)).toBe(true);
  });

  it("does not skip assistant message with source parts", () => {
    const msg = {
      id: "a1",
      role: "assistant",
      content: "",
      parts: [{ type: "source-url", sourceId: "src1", url: "/posts/test", title: "Test" }],
    } as unknown as UIMessage;
    expect(shouldSkipEmptyAssistant(msg, false, false)).toBe(false);
  });

  it("does not skip user messages", () => {
    const msg = makeMessage("u1", "user");
    expect(shouldSkipEmptyAssistant(msg, false, false)).toBe(false);
  });
});

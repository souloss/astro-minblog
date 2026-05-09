import { describe, it, expect } from "vitest";
import type { UIMessage } from "ai";
import {
  hasVisibleAssistantContent,
  shouldShowWaitingPlaceholder,
} from "./MessageList.js";

function makeMessage(
  id: string,
  role: "user" | "assistant",
  parts?: UIMessage["parts"]
): UIMessage {
  return {
    id,
    role,
    content: "",
    parts: parts ?? [],
  } as UIMessage;
}

describe("hasVisibleAssistantContent", () => {
  it("returns false for user messages", () => {
    const msg = makeMessage("u1", "user");
    expect(hasVisibleAssistantContent(msg)).toBe(false);
  });

  it("returns false for assistant message with no parts", () => {
    const msg = makeMessage("a1", "assistant");
    expect(hasVisibleAssistantContent(msg)).toBe(false);
  });

  it("returns false for assistant message with empty text part", () => {
    const msg = makeMessage("a1", "assistant", [
      { type: "text", text: "" },
    ]);
    expect(hasVisibleAssistantContent(msg)).toBe(false);
  });

  it("returns false for assistant message with whitespace-only text", () => {
    const msg = makeMessage("a1", "assistant", [
      { type: "text", text: "   \n  " },
      { type: "tool-searchArticles", state: "input-streaming" },
    ] as unknown as UIMessage["parts"]);
    expect(hasVisibleAssistantContent(msg)).toBe(false);
  });

  it("returns false for assistant message with only tool-call parts", () => {
    const msg = makeMessage("a1", "assistant", [
      { type: "tool-searchArticles", state: "input-streaming" },
    ] as unknown as UIMessage["parts"]);
    expect(hasVisibleAssistantContent(msg)).toBe(false);
  });

  it("returns false for assistant message with only step-start part", () => {
    const msg = makeMessage("a1", "assistant", [
      { type: "step-start" },
    ]);
    expect(hasVisibleAssistantContent(msg)).toBe(false);
  });

  it("returns true for assistant message with text content", () => {
    const msg = makeMessage("a1", "assistant", [
      { type: "text", text: "Hello" },
    ]);
    expect(hasVisibleAssistantContent(msg)).toBe(true);
  });

  it("returns true for assistant message with reasoning part", () => {
    const msg = makeMessage("a1", "assistant", [
      { type: "reasoning", text: "thinking..." },
    ]);
    expect(hasVisibleAssistantContent(msg)).toBe(true);
  });

  it("returns true for assistant message with source-url part", () => {
    const msg = makeMessage("a1", "assistant", [
      { type: "source-url", sourceId: "s1", url: "https://example.com", title: "Example" },
    ]);
    expect(hasVisibleAssistantContent(msg)).toBe(true);
  });

  it("returns true for assistant message with source-document part", () => {
    const msg = makeMessage("a1", "assistant", [
      { type: "source-document", sourceId: "s1", mediaType: "text", title: "Doc" },
    ]);
    expect(hasVisibleAssistantContent(msg)).toBe(true);
  });

  it("returns true for assistant message with completed action tool output", () => {
    const msg = makeMessage("a1", "assistant", [
      {
        type: "tool-toggleTheme",
        toolCallId: "tc1",
        state: "output-available",
        input: { theme: "dark" },
        output: { success: true, message: "Theme toggled" },
      },
    ] as unknown as UIMessage["parts"]);
    expect(hasVisibleAssistantContent(msg)).toBe(true);
  });

  it("returns false for assistant message with pending action tool call", () => {
    const msg = makeMessage("a1", "assistant", [
      { type: "tool-toggleTheme", toolCallId: "tc1", state: "input-streaming" },
    ] as unknown as UIMessage["parts"]);
    expect(hasVisibleAssistantContent(msg)).toBe(false);
  });

  it("returns false for assistant message with failed action tool output", () => {
    const msg = makeMessage("a1", "assistant", [
      {
        type: "tool-toggleTheme",
        toolCallId: "tc1",
        state: "output-available",
        input: {},
        output: { success: false, message: "Failed" },
      },
    ] as unknown as UIMessage["parts"]);
    expect(hasVisibleAssistantContent(msg)).toBe(false);
  });

  it("returns true for assistant message with text and tool-call parts", () => {
    const msg = makeMessage("a1", "assistant", [
      { type: "text", text: "Here are the results:" },
      { type: "tool-searchArticles", toolCallId: "tc1", state: "input-streaming" },
    ] as unknown as UIMessage["parts"]);
    expect(hasVisibleAssistantContent(msg)).toBe(true);
  });
});

describe("shouldShowWaitingPlaceholder", () => {
  it("returns true when streaming with only user message", () => {
    const messages = [
      { id: "u1", role: "user", content: "hi", parts: [] } as UIMessage,
    ];
    expect(shouldShowWaitingPlaceholder(messages, true)).toBe(true);
  });

  it("returns false when not streaming", () => {
    const messages = [
      { id: "u1", role: "user", content: "hi", parts: [] } as UIMessage,
    ];
    expect(shouldShowWaitingPlaceholder(messages, false)).toBe(false);
  });

  it("returns false when assistant message exists", () => {
    const messages = [
      { id: "u1", role: "user", content: "hi", parts: [] } as UIMessage,
      { id: "a1", role: "assistant", content: "", parts: [] } as UIMessage,
    ];
    expect(shouldShowWaitingPlaceholder(messages, true)).toBe(false);
  });

  it("returns false when last message is assistant", () => {
    const messages = [
      { id: "u1", role: "user", content: "hi", parts: [] } as UIMessage,
      { id: "a1", role: "assistant", content: "", parts: [{ type: "text", text: "hello" }] } as UIMessage,
    ];
    expect(shouldShowWaitingPlaceholder(messages, true)).toBe(false);
  });
});
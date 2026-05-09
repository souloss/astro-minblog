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

  it("returns false for assistant message with empty reasoning part", () => {
    const msg = makeMessage("a1", "assistant", [
      { type: "reasoning", text: "" },
    ]);
    expect(hasVisibleAssistantContent(msg)).toBe(false);
  });

  it("returns false for assistant message with whitespace-only reasoning", () => {
    const msg = makeMessage("a1", "assistant", [
      { type: "reasoning", text: "   \n  " },
    ]);
    expect(hasVisibleAssistantContent(msg)).toBe(false);
  });

  it("returns false for assistant message with empty reasoning and tool-call", () => {
    const msg = makeMessage("a1", "assistant", [
      { type: "step-start" },
      { type: "reasoning", text: "" },
      { type: "tool-searchArticles", toolCallId: "tc1", state: "input-streaming" },
    ] as unknown as UIMessage["parts"]);
    expect(hasVisibleAssistantContent(msg)).toBe(false);
  });

  it("returns true for assistant message with text content", () => {
    const msg = makeMessage("a1", "assistant", [
      { type: "text", text: "Hello" },
    ]);
    expect(hasVisibleAssistantContent(msg)).toBe(true);
  });

  it("returns true for assistant message with non-empty reasoning part", () => {
    const msg = makeMessage("a1", "assistant", [
      { type: "reasoning", text: "thinking..." },
    ]);
    expect(hasVisibleAssistantContent(msg)).toBe(true);
  });

  it("returns false for assistant message with source-url part only", () => {
    // Source parts arrive before text/reasoning in the SSE stream.
    // They should NOT make the message "visible" on their own, otherwise
    // a BotAvatar is rendered with empty content.
    const msg = makeMessage("a1", "assistant", [
      { type: "source-url", sourceId: "s1", url: "https://example.com", title: "Example" },
    ]);
    expect(hasVisibleAssistantContent(msg)).toBe(false);
  });

  it("returns false for assistant message with source-document part only", () => {
    const msg = makeMessage("a1", "assistant", [
      { type: "source-document", sourceId: "s1", mediaType: "text", title: "Doc" },
    ]);
    expect(hasVisibleAssistantContent(msg)).toBe(false);
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

  it("returns true for assistant message with non-empty reasoning despite empty text", () => {
    const msg = makeMessage("a1", "assistant", [
      { type: "text", text: "" },
      { type: "reasoning", text: "Let me think about this..." },
    ]);
    expect(hasVisibleAssistantContent(msg)).toBe(true);
  });

  it("returns true for assistant message with source-url and text content", () => {
    // Sources are rendered alongside text — the text makes it visible.
    const msg = makeMessage("a1", "assistant", [
      { type: "source-url", sourceId: "s1", url: "https://example.com", title: "Example" },
      { type: "text", text: "Here is what I found:" },
    ]);
    expect(hasVisibleAssistantContent(msg)).toBe(true);
  });

  it("returns false for assistant message with source-url and empty text only", () => {
    // Source-url with only whitespace text should not be visible.
    const msg = makeMessage("a1", "assistant", [
      { type: "source-url", sourceId: "s1", url: "https://example.com", title: "Example" },
      { type: "text", text: "" },
    ]);
    expect(hasVisibleAssistantContent(msg)).toBe(false);
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

  it("returns false when assistant message with visible content exists", () => {
    const messages = [
      { id: "u1", role: "user", content: "hi", parts: [] } as UIMessage,
      { id: "a1", role: "assistant", content: "", parts: [{ type: "text", text: "hello" }] } as UIMessage,
    ];
    expect(shouldShowWaitingPlaceholder(messages, true)).toBe(false);
  });

  it("returns true when assistant message exists but has no visible content", () => {
    // An assistant message with only tool-call parts should NOT suppress
    // the waiting placeholder — the user should still see the loading indicator.
    const messages = [
      { id: "u1", role: "user", content: "hi", parts: [] } as UIMessage,
      { id: "a1", role: "assistant", content: "", parts: [
        { type: "step-start" },
        { type: "tool-searchArticles", toolCallId: "tc1", state: "input-streaming" },
      ] } as UIMessage,
    ];
    expect(shouldShowWaitingPlaceholder(messages, true)).toBe(true);
  });

  it("returns true when assistant message exists but has only empty reasoning", () => {
    // An assistant message with only empty reasoning should NOT suppress
    // the waiting placeholder.
    const messages = [
      { id: "u1", role: "user", content: "hi", parts: [] } as UIMessage,
      { id: "a1", role: "assistant", content: "", parts: [
        { type: "reasoning", text: "" },
      ] } as UIMessage,
    ];
    expect(shouldShowWaitingPlaceholder(messages, true)).toBe(true);
  });

  it("returns false when last message is assistant with visible content", () => {
    const messages = [
      { id: "u1", role: "user", content: "hi", parts: [] } as UIMessage,
      { id: "a1", role: "assistant", content: "", parts: [{ type: "text", text: "hello" }] } as UIMessage,
    ];
    expect(shouldShowWaitingPlaceholder(messages, true)).toBe(false);
  });

  it("returns false when last message is assistant (not user)", () => {
    // If the last message is assistant with visible content,
    // the placeholder should not show.
    const messages = [
      { id: "u1", role: "user", content: "hi", parts: [] } as UIMessage,
      { id: "a1", role: "assistant", content: "", parts: [{ type: "text", text: "hello" }] } as UIMessage,
    ];
    expect(shouldShowWaitingPlaceholder(messages, true)).toBe(false);
  });

  it("returns true when only welcome message has visible content", () => {
    // The welcome message is a static UI element, not an actual assistant
    // response. It should NOT suppress the waiting placeholder.
    const messages = [
      { id: "welcome", role: "assistant", content: "", parts: [{ type: "text", text: "Hi, how can I help?" }] } as UIMessage,
      { id: "u1", role: "user", content: "hi", parts: [] } as UIMessage,
    ];
    expect(shouldShowWaitingPlaceholder(messages, true)).toBe(true);
  });

  it("returns false when non-welcome assistant message has visible content alongside welcome", () => {
    // When both welcome and actual assistant response exist, the actual
    // response suppresses the placeholder (welcome is ignored).
    const messages = [
      { id: "welcome", role: "assistant", content: "", parts: [{ type: "text", text: "Hi!" }] } as UIMessage,
      { id: "u1", role: "user", content: "hi", parts: [] } as UIMessage,
      { id: "a1", role: "assistant", content: "", parts: [{ type: "text", text: "Hello!" }] } as UIMessage,
    ];
    expect(shouldShowWaitingPlaceholder(messages, true)).toBe(false);
  });

  it("returns true when assistant message has only source-url parts (no text yet)", () => {
    // During streaming, source-url parts arrive before text/reasoning.
    // The placeholder should continue showing until actual content arrives.
    const messages = [
      { id: "u1", role: "user", content: "hi", parts: [] } as UIMessage,
      { id: "a1", role: "assistant", content: "", parts: [
        { type: "source-url", sourceId: "s1", url: "https://example.com", title: "Example" },
      ] } as UIMessage,
    ];
    expect(shouldShowWaitingPlaceholder(messages, true)).toBe(true);
  });
});

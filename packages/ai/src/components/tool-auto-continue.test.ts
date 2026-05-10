import { describe, it, expect } from "vitest";
import type { UIMessage } from "ai";
import { shouldAutoContinueAfterToolCalls } from "./tool-auto-continue.js";

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

describe("shouldAutoContinueAfterToolCalls", () => {
  it("returns false when there are no messages", () => {
    expect(shouldAutoContinueAfterToolCalls({ messages: [] })).toBe(false);
  });

  it("returns false when last message is from user", () => {
    const messages = [makeMessage("u1", "user")];
    expect(shouldAutoContinueAfterToolCalls({ messages })).toBe(false);
  });

  it("returns false when assistant message has no parts", () => {
    const messages = [makeMessage("a1", "assistant")];
    expect(shouldAutoContinueAfterToolCalls({ messages })).toBe(false);
  });

  it("returns false when assistant message has only text parts", () => {
    const messages = [
      makeMessage("a1", "assistant", [{ type: "text", text: "Hello" }]),
    ];
    expect(shouldAutoContinueAfterToolCalls({ messages })).toBe(false);
  });

  it("returns false when assistant message has server-side tool in input-streaming state", () => {
    // Server-side tools (searchArticles) are handled internally by streamText.
    // They should NOT trigger auto-continue.
    const messages = [
      makeMessage("a1", "assistant", [
        {
          type: "tool-searchArticles",
          toolCallId: "tc1",
          state: "input-streaming",
        },
      ] as unknown as UIMessage["parts"]),
    ];
    expect(shouldAutoContinueAfterToolCalls({ messages })).toBe(false);
  });

  it("returns false when assistant message has server-side tool in output-available state", () => {
    // Server-side tools with output-available are handled by streamText
    // internally — no client-side auto-continue needed.
    const messages = [
      makeMessage("a1", "assistant", [
        {
          type: "tool-searchArticles",
          toolCallId: "tc1",
          state: "output-available",
        },
      ] as unknown as UIMessage["parts"]),
    ];
    expect(shouldAutoContinueAfterToolCalls({ messages })).toBe(false);
  });

  it("returns false when action tool is still in input-streaming state", () => {
    // The tool hasn't been executed yet — no output to send back.
    const messages = [
      makeMessage("a1", "assistant", [
        {
          type: "tool-toggleTheme",
          toolCallId: "tc1",
          state: "input-streaming",
        },
      ] as unknown as UIMessage["parts"]),
    ];
    expect(shouldAutoContinueAfterToolCalls({ messages })).toBe(false);
  });

  it("returns true when action tool has output-available state", () => {
    // After onToolCall + addToolOutput, the tool part transitions to
    // output-available. The client should auto-continue to send the
    // result back to the server.
    const messages = [
      makeMessage("a1", "assistant", [
        {
          type: "tool-toggleTheme",
          toolCallId: "tc1",
          state: "output-available",
          output: { success: true },
        },
      ] as unknown as UIMessage["parts"]),
    ];
    expect(shouldAutoContinueAfterToolCalls({ messages })).toBe(true);
  });

  it("returns true when multiple action tools have output-available state", () => {
    const messages = [
      makeMessage("a1", "assistant", [
        {
          type: "tool-toggleTheme",
          toolCallId: "tc1",
          state: "output-available",
          output: { success: true },
        },
        {
          type: "tool-scrollToSection",
          toolCallId: "tc2",
          state: "output-available",
          output: { success: true },
        },
      ] as unknown as UIMessage["parts"]),
    ];
    expect(shouldAutoContinueAfterToolCalls({ messages })).toBe(true);
  });

  it("returns true when action tool output-available alongside server tool", () => {
    const messages = [
      makeMessage("a1", "assistant", [
        {
          type: "tool-searchArticles",
          toolCallId: "tc1",
          state: "output-available",
        },
        {
          type: "tool-toggleTheme",
          toolCallId: "tc2",
          state: "output-available",
          output: { success: true },
        },
      ] as unknown as UIMessage["parts"]),
    ];
    expect(shouldAutoContinueAfterToolCalls({ messages })).toBe(true);
  });

  it("returns false when last message is user but earlier assistant has action tool output", () => {
    // Only the last message matters.
    const messages = [
      makeMessage("a1", "assistant", [
        {
          type: "tool-toggleTheme",
          toolCallId: "tc1",
          state: "output-available",
          output: { success: true },
        },
      ] as unknown as UIMessage["parts"]),
      makeMessage("u2", "user"),
    ];
    expect(shouldAutoContinueAfterToolCalls({ messages })).toBe(false);
  });
});

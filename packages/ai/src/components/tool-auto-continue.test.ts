import { describe, expect, it } from "vitest";
import { shouldAutoContinueAfterToolCalls } from "./tool-auto-continue.js";

describe("shouldAutoContinueAfterToolCalls", () => {
  it("auto-continues for client-side tools after addToolOutput adds tool-result", () => {
    // After a client-side tool (e.g. toggleTheme) executes via onToolCall,
    // addToolOutput adds a `tool-result` part. The AI should continue generating
    // text after the tool executes.
    expect(
      shouldAutoContinueAfterToolCalls({
        messages: [
          {
            id: "a1",
            role: "assistant",
            parts: [
              {
                type: "tool-toggleTheme",
                toolCallId: "tc1",
                state: "output-available",
                output: { success: true },
              },
              {
                type: "tool-result",
                toolCallId: "tc1",
                content: { success: true },
              },
            ],
          },
        ] as never,
      })
    ).toBe(true);
  });

  it("does not continue for server-side tools with output-available (execute already handled by streamText)", () => {
    // Server-side tools (e.g. searchArticles) have an `execute` function.
    // AI SDK's streamText handles multi-step internally: call tool → get result →
    // LLM continues generating — all in ONE stream.
    // No `tool-result` part is added on the client side.
    expect(
      shouldAutoContinueAfterToolCalls({
        messages: [
          {
            id: "a1",
            role: "assistant",
            parts: [
              {
                type: "tool-searchArticles",
                toolCallId: "tc1",
                state: "output-available",
                output: { articles: [] },
              },
            ],
          },
        ] as never,
      })
    ).toBe(false);
  });

  it("does not continue when the latest assistant message has no completed tool output", () => {
    expect(
      shouldAutoContinueAfterToolCalls({
        messages: [
          {
            id: "a1",
            role: "assistant",
            parts: [
              {
                type: "tool-searchArticles",
                toolCallId: "tc1",
                state: "call",
                input: { query: "AI" },
              },
            ],
          },
        ] as never,
      })
    ).toBe(false);
  });

  it("auto-continues when tool-result exists alongside server-side tool output-available", () => {
    // If addToolOutput was called for a tool that also has output-available
    // (e.g. a tool that can run both server-side and client-side), the
    // tool-result part indicates the client has results to send back.
    expect(
      shouldAutoContinueAfterToolCalls({
        messages: [
          {
            id: "a1",
            role: "assistant",
            parts: [
              {
                type: "tool-searchArticles",
                toolCallId: "tc1",
                state: "output-available",
                output: { articles: [] },
              },
              {
                type: "tool-result",
                toolCallId: "tc1",
                content: { articles: [], projects: [] },
              },
            ],
          },
        ] as never,
      })
    ).toBe(true);
  });

  it("does not continue for plain text messages", () => {
    expect(
      shouldAutoContinueAfterToolCalls({
        messages: [
          {
            id: "a1",
            role: "assistant",
            parts: [{ type: "text", text: "Hello!" }],
          },
        ] as never,
      })
    ).toBe(false);
  });

  it("does not continue when the last message is from the user", () => {
    expect(
      shouldAutoContinueAfterToolCalls({
        messages: [
          {
            id: "u1",
            role: "user",
            parts: [{ type: "text", text: "Hello!" }],
          },
        ] as never,
      })
    ).toBe(false);
  });

  it("does not continue when messages array is empty", () => {
    expect(
      shouldAutoContinueAfterToolCalls({
        messages: [],
      })
    ).toBe(false);
  });

  it("auto-continues for any client-side action tool with tool-result", () => {
    // All client-side action tools (navigateToArticle, scrollToSection, etc.)
    // should trigger auto-continue when their tool-result is present.
    expect(
      shouldAutoContinueAfterToolCalls({
        messages: [
          {
            id: "a1",
            role: "assistant",
            parts: [
              {
                type: "tool-navigateToArticle",
                toolCallId: "tc1",
                state: "output-available",
                output: { success: true },
              },
              {
                type: "tool-result",
                toolCallId: "tc1",
                content: { success: true },
              },
            ],
          },
        ] as never,
      })
    ).toBe(true);
  });
});

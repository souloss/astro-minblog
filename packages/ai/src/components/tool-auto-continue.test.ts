import { describe, expect, it } from "vitest";
import { shouldAutoContinueAfterToolCalls } from "./tool-auto-continue.js";

describe("shouldAutoContinueAfterToolCalls", () => {
  it("does not continue for side-effect-only client tools after completion", () => {
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
            ],
          },
        ] as never,
      })
    ).toBe(false);
  });

  it("does not continue for server-side tools with output-available (execute already handled by streamText)", () => {
    // Server-side tools (e.g. searchArticles) have an `execute` function.
    // AI SDK's streamText handles multi-step internally: call tool → get result →
    // LLM continues generating — all in ONE stream.
    // The tool part arrives with state "output-available" and the LLM's follow-up
    // is already in the same message. Auto-continue must NOT fire, otherwise the
    // user sees a duplicate second response.
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

  it("does not continue for searchArticles when tool result already exists", () => {
    // This prevents infinite loops: after addToolOutput adds a tool-result,
    // the original tool-call part still exists with state "output-available".
    // The function should detect the tool-result and not auto-continue.
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
    ).toBe(false);
  });
});

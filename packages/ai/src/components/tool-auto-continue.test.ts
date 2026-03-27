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

  it("continues for non-UI tools after tool completion", () => {
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
    ).toBe(true);
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
});

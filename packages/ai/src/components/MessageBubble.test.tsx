import { describe, expect, it } from "vitest";
import {
  getActionToolConfirmations,
  shouldSuppressAssistantFallbackText,
} from "./MessageBubble.tsx";

describe("getActionToolConfirmations", () => {
  it("builds a localized confirmation for successful theme toggle tool output", () => {
    const confirmations = getActionToolConfirmations(
      {
        id: "a1",
        role: "assistant",
        parts: [
          {
            type: "tool-toggleTheme",
            toolCallId: "tc1",
            state: "output-available",
            input: { theme: "dark" },
            output: { success: true },
          },
        ],
      } as never,
      "zh"
    );

    expect(confirmations).toEqual(["已为你切换到暗模式。"]);
  });
});

describe("shouldSuppressAssistantFallbackText", () => {
  it("suppresses fallback text when an action confirmation exists", () => {
    expect(
      shouldSuppressAssistantFallbackText(
        "抱歉，我无法生成有效的回答。请尝试换一种方式提问。感谢提问！我目前在 Demo 模式下，可以推荐博客文章和外部资源。",
        ["已为你切换到暗模式。"],
        "zh"
      )
    ).toBe(true);
  });

  it("keeps normal text visible when no action confirmation exists", () => {
    expect(
      shouldSuppressAssistantFallbackText("这里是一段正常回答。", [], "zh")
    ).toBe(false);
  });
});

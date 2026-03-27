import { describe, expect, it } from "vitest";
import {
  filterValidMessages,
  getLatestUserText,
} from "./chat-message-utils.js";

describe("chat-message-utils", () => {
  it("keeps trailing assistant tool messages for SDK continuation flows", () => {
    const messages = filterValidMessages([
      {
        id: "u1",
        role: "user",
        parts: [{ type: "text", text: "切换亮模式" }],
      },
      {
        id: "a1",
        role: "assistant",
        parts: [
          {
            type: "tool-toggleTheme",
            toolCallId: "tc1",
            state: "call",
            input: { theme: "light" },
          },
        ],
      },
    ] as never);

    expect(messages).toHaveLength(2);
    expect(messages[1]?.role).toBe("assistant");
  });

  it("finds the latest user text even when the latest message is assistant tool output", () => {
    const text = getLatestUserText([
      {
        id: "u1",
        role: "user",
        parts: [{ type: "text", text: "切换暗模式" }],
      },
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
    ] as never);

    expect(text).toBe("切换暗模式");
  });
});

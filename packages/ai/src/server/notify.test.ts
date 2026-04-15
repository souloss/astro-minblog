import { describe, it, expect, vi, beforeEach } from "vitest";
import { notifyAiChat } from "./notify.js";
import type { ChatNotifyOptions } from "./notify.js";
import type { UIMessage } from "ai";

// ── Mock notify module ───────────────────────────────────────────

const mockAiChat = vi.fn();
const mockCreateNotifier = vi.fn(() => ({
  aiChat: mockAiChat,
}));
const mockCreateNotifyConfigFromEnv = vi.fn();

// We need to mock the dynamic import of @astro-minimax/notify
// The function uses `import("@astro-minimax/notify")` dynamically
// We'll mock it by intercepting module loading

vi.mock("@astro-minimax/notify", () => ({
  createNotifier: (...args: unknown[]) => mockCreateNotifier(...args),
  createNotifyConfigFromEnv: (...args: unknown[]) =>
    mockCreateNotifyConfigFromEnv(...args),
}));

// ── Helpers ──────────────────────────────────────────────────────

function makeMessage(role: string, text: string): UIMessage {
  return {
    id: `msg-${Date.now()}`,
    role: role as "user" | "assistant",
    content: text,
    parts: [{ type: "text", text }],
    createdAt: new Date(),
  };
}

function makeOptions(
  overrides: Partial<ChatNotifyOptions> = {}
): ChatNotifyOptions {
  return {
    env: { SITE_URL: "https://example.com" },
    sessionId: "session-123",
    messages: [makeMessage("user", "Hello AI")],
    aiResponse: "Hello! How can I help you?",
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────

describe("notifyAiChat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateNotifyConfigFromEnv.mockReturnValue({
      telegram: { token: "test", chatId: "test" },
    });
    mockCreateNotifier.mockReturnValue({ aiChat: mockAiChat });
    mockAiChat.mockResolvedValue({
      event: "ai-chat",
      success: true,
      results: [{ channel: "telegram", success: true }],
    });
  });

  it("returns null when no config channels configured", async () => {
    mockCreateNotifyConfigFromEnv.mockReturnValue({});
    const result = await notifyAiChat(makeOptions());
    expect(result).toBeNull();
  });

  it("returns null when messages array is empty", async () => {
    const result = await notifyAiChat(
      makeOptions({ messages: [] })
    );
    expect(result).toBeNull();
  });

  it("returns null when there are no user messages", async () => {
    const result = await notifyAiChat(
      makeOptions({
        messages: [makeMessage("assistant", "Hi there")],
      })
    );
    expect(result).toBeNull();
  });

  it("returns NotifyResult on successful notification", async () => {
    const result = await notifyAiChat(makeOptions());
    expect(result).not.toBeNull();
    expect(result!.event).toBe("ai-chat");
    expect(result!.success).toBe(true);
  });

  it("truncates AI response to 500 chars", async () => {
    const longResponse = "A".repeat(600);
    await notifyAiChat(makeOptions({ aiResponse: longResponse }));
    expect(mockAiChat).toHaveBeenCalledWith(
      expect.objectContaining({
        aiResponse: "A".repeat(500),
      })
    );
  });

  it("counts roundNumber from user messages", async () => {
    await notifyAiChat(
      makeOptions({
        messages: [
          makeMessage("user", "first"),
          makeMessage("assistant", "reply 1"),
          makeMessage("user", "second"),
        ],
      })
    );
    expect(mockAiChat).toHaveBeenCalledWith(
      expect.objectContaining({ roundNumber: 2 })
    );
  });

  it("passes siteUrl from env to notifier", async () => {
    await notifyAiChat(makeOptions());
    expect(mockAiChat).toHaveBeenCalledWith(
      expect.objectContaining({ siteUrl: "https://example.com" })
    );
  });

  it("returns null when notifier.aiChat throws", async () => {
    mockAiChat.mockRejectedValue(new Error("Notification failed"));
    const result = await notifyAiChat(makeOptions());
    expect(result).toBeNull();
  });
});

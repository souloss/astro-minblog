import { describe, it, expect } from "vitest";
import {
  getQuickPrompts,
  buildWelcomeMessage,
  parseErrorMessage,
  isRetryable,
  getChatActionLabel,
} from "./helpers.js";

// ── getQuickPrompts ────────────────────────────────────────────

describe("getQuickPrompts", () => {
  it("should return Chinese prompts by default", () => {
    const prompts = getQuickPrompts("zh");
    expect(prompts.length).toBeGreaterThan(0);
  });

  it("should return English prompts for en", () => {
    const prompts = getQuickPrompts("en");
    expect(prompts.length).toBeGreaterThan(0);
  });

  it("should return article-specific prompts when context provided", () => {
    const prompts = getQuickPrompts("zh", {
      slug: "test",
      title: "测试文章",
      keyPoints: ["要点1"],
    });
    expect(prompts.length).toBeGreaterThan(0);
  });

  it("should include explain prompt when keyPoints exist", () => {
    const prompts = getQuickPrompts("zh", {
      slug: "test",
      title: "测试文章",
      keyPoints: ["TypeScript类型"],
    });
    expect(prompts.some(p => p.includes("TypeScript类型"))).toBe(true);
  });

  it("should work without keyPoints", () => {
    const prompts = getQuickPrompts("en", {
      slug: "test",
      title: "Test Article",
    });
    expect(prompts.length).toBeGreaterThan(0);
  });
});

// ── buildWelcomeMessage ────────────────────────────────────────

describe("buildWelcomeMessage", () => {
  it("should return a UIMessage with welcome id", () => {
    const msg = buildWelcomeMessage({ lang: "zh" });
    expect(msg.id).toBe("welcome");
    expect(msg.role).toBe("assistant");
  });

  it("should include article title when context provided", () => {
    const msg = buildWelcomeMessage(
      { lang: "zh" },
      { slug: "test", title: "测试文章" }
    );
    const text = (msg.parts as { type: string; text: string }[])[0].text;
    expect(text).toContain("测试文章");
  });

  it("should use custom welcome message when provided", () => {
    const msg = buildWelcomeMessage({
      welcomeMessage: "Custom greeting!",
      lang: "zh",
    });
    const text = (msg.parts as { type: string; text: string }[])[0].text;
    expect(text).toBe("Custom greeting!");
  });

  it("should return general welcome without article context", () => {
    const msg = buildWelcomeMessage({ lang: "en" });
    const text = (msg.parts as { type: string; text: string }[])[0].text;
    expect(text.length).toBeGreaterThan(0);
  });
});

// ── parseErrorMessage ──────────────────────────────────────────

describe("parseErrorMessage", () => {
  it("should parse JSON error message", () => {
    const err = new Error('{"error": "Rate limited"}');
    expect(parseErrorMessage(err, "en")).toBe("Rate limited");
  });

  it("should detect network errors", () => {
    const err = new Error("Failed to fetch data");
    const result = parseErrorMessage(err, "en");
    expect(result).toBeTruthy();
  });

  it("should detect aborted errors", () => {
    const err = new Error("Request was aborted");
    const result = parseErrorMessage(err, "en");
    expect(result).toBeTruthy();
  });

  it("should detect rate limit (429)", () => {
    const err = new Error("HTTP 429 Too Many Requests");
    const result = parseErrorMessage(err, "en");
    expect(result).toBeTruthy();
  });

  it("should detect 503 unavailable", () => {
    const err = new Error("HTTP 503 Service unavailable");
    const result = parseErrorMessage(err, "en");
    expect(result).toBeTruthy();
  });

  it("should return generic error for unknown messages", () => {
    const err = new Error("Something weird happened");
    const result = parseErrorMessage(err, "en");
    expect(result).toBeTruthy();
  });
});

// ── isRetryable ────────────────────────────────────────────────

describe("isRetryable", () => {
  it("should return true by default", () => {
    const err = new Error("Something failed");
    expect(isRetryable(err)).toBe(true);
  });

  it("should parse retryable from JSON message", () => {
    const err = new Error('{"retryable": false}');
    expect(isRetryable(err)).toBe(false);
  });

  it("should return true when retryable is true in JSON", () => {
    const err = new Error('{"retryable": true}');
    expect(isRetryable(err)).toBe(true);
  });
});

// ── getChatActionLabel ─────────────────────────────────────────

describe("getChatActionLabel", () => {
  it("should return Chinese send label", () => {
    expect(getChatActionLabel("zh", "send")).toBe("发送消息");
  });

  it("should return Chinese sending label", () => {
    expect(getChatActionLabel("zh", "sending")).toBe("正在发送");
  });

  it("should return English send label", () => {
    expect(getChatActionLabel("en", "send")).toBe("Send message");
  });

  it("should return English sending label", () => {
    expect(getChatActionLabel("en", "sending")).toBe("Sending");
  });
});

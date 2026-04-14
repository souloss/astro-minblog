import { describe, it, expect } from "vitest";
import { getSessionCacheKey } from "./session-cache.js";

describe("getSessionCacheKey", () => {
  it("should return session key for valid session ID", () => {
    const req = new Request("https://example.com/api/chat", {
      headers: { "x-session-id": "abc1234567" },
    });
    expect(getSessionCacheKey(req)).toBe("sid:abc1234567");
  });

  it("should return null for missing session ID", () => {
    const req = new Request("https://example.com/api/chat");
    expect(getSessionCacheKey(req)).toBeNull();
  });

  it("should return null for empty session ID", () => {
    const req = new Request("https://example.com/api/chat", {
      headers: { "x-session-id": "" },
    });
    expect(getSessionCacheKey(req)).toBeNull();
  });

  it("should return null for whitespace-only session ID", () => {
    const req = new Request("https://example.com/api/chat", {
      headers: { "x-session-id": "   " },
    });
    expect(getSessionCacheKey(req)).toBeNull();
  });

  it("should return null for too short session ID", () => {
    const req = new Request("https://example.com/api/chat", {
      headers: { "x-session-id": "short" },
    });
    expect(getSessionCacheKey(req)).toBeNull();
  });

  it("should return null for session ID starting with non-alphanumeric", () => {
    const req = new Request("https://example.com/api/chat", {
      headers: { "x-session-id": "-abc12345" },
    });
    expect(getSessionCacheKey(req)).toBeNull();
  });

  it("should return null for session ID with special characters", () => {
    const req = new Request("https://example.com/api/chat", {
      headers: { "x-session-id": "abc@1234567" },
    });
    expect(getSessionCacheKey(req)).toBeNull();
  });

  it("should accept session IDs with hyphens and underscores", () => {
    const req = new Request("https://example.com/api/chat", {
      headers: { "x-session-id": "abc_123-def_456" },
    });
    expect(getSessionCacheKey(req)).toBe("sid:abc_123-def_456");
  });

  it("should accept 8-char session ID (min length)", () => {
    const req = new Request("https://example.com/api/chat", {
      headers: { "x-session-id": "a1234567" },
    });
    expect(getSessionCacheKey(req)).toBe("sid:a1234567");
  });

  it("should accept 64-char session ID (max length)", () => {
    const id64 = "a".repeat(64);
    const req = new Request("https://example.com/api/chat", {
      headers: { "x-session-id": id64 },
    });
    expect(getSessionCacheKey(req)).toBe("sid:" + id64);
  });
});

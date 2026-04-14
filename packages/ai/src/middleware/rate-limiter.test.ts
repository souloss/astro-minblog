import { describe, it, expect, beforeEach, vi } from "vitest";
import { checkRateLimit, getClientIP, rateLimitResponse } from "./rate-limiter.js";

// ── Helpers ────────────────────────────────────────────────────

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/chat", { headers });
}

// ── getClientIP ────────────────────────────────────────────────

describe("getClientIP", () => {
  it("should prefer cf-connecting-ip header", () => {
    const req = makeRequest({
      "cf-connecting-ip": "1.2.3.4",
      "x-forwarded-for": "5.6.7.8",
      "x-real-ip": "9.10.11.12",
    });
    expect(getClientIP(req)).toBe("1.2.3.4");
  });

  it("should fall back to x-forwarded-for", () => {
    const req = makeRequest({
      "x-forwarded-for": "5.6.7.8, 9.10.11.12",
    });
    expect(getClientIP(req)).toBe("5.6.7.8");
  });

  it("should trim whitespace from x-forwarded-for", () => {
    const req = makeRequest({
      "x-forwarded-for": "  5.6.7.8  , 9.10.11.12",
    });
    expect(getClientIP(req)).toBe("5.6.7.8");
  });

  it("should fall back to x-real-ip", () => {
    const req = makeRequest({
      "x-real-ip": "9.10.11.12",
    });
    expect(getClientIP(req)).toBe("9.10.11.12");
  });

  it("should return 'unknown' when no IP headers present", () => {
    const req = makeRequest();
    expect(getClientIP(req)).toBe("unknown");
  });
});

// ── checkRateLimit ─────────────────────────────────────────────

describe("checkRateLimit", () => {
  it("should allow request when rate limiting is disabled", () => {
    const result = checkRateLimit("1.2.3.4", {
      CHAT_RATE_LIMIT_ENABLED: "false",
    });
    expect(result.allowed).toBe(true);
    expect(result.triggeredBy).toBeNull();
  });

  it("should allow first request from new IP", () => {
    const result = checkRateLimit("192.168.1.1");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThanOrEqual(0);
  });

  it("should track remaining requests", () => {
    const ip = `test-${Date.now()}`;
    // First request
    const result1 = checkRateLimit(ip);
    expect(result1.allowed).toBe(true);
    // Second request should show one fewer remaining
    const result2 = checkRateLimit(ip);
    expect(result2.allowed).toBe(true);
    expect(result2.remaining).toBeLessThan(result1.remaining);
  });

  it("should respect custom burst limit", () => {
    const ip = `burst-${Date.now()}`;
    const env = {
      CHAT_RATE_LIMIT_BURST_MAX: "1",
      CHAT_RATE_LIMIT_BURST_WINDOW_MS: "60000",
    };
    // First request should be allowed
    const result1 = checkRateLimit(ip, env);
    expect(result1.allowed).toBe(true);
    // Second request should be rate limited (burst = 1)
    const result2 = checkRateLimit(ip, env);
    expect(result2.allowed).toBe(false);
    expect(result2.triggeredBy).toBe("burst");
  });

  it("should return retryAfterMs when rate limited", () => {
    const ip = `retry-${Date.now()}`;
    const env = {
      CHAT_RATE_LIMIT_BURST_MAX: "1",
      CHAT_RATE_LIMIT_BURST_WINDOW_MS: "10000",
    };
    checkRateLimit(ip, env);
    const result = checkRateLimit(ip, env);
    if (!result.allowed) {
      expect(result.retryAfterMs).toBeGreaterThan(0);
    }
  });

  it("should handle different IPs independently", () => {
    const result1 = checkRateLimit(`ip-a-${Date.now()}`);
    const result2 = checkRateLimit(`ip-b-${Date.now()}`);
    expect(result1.allowed).toBe(true);
    expect(result2.allowed).toBe(true);
  });
});

// ── rateLimitResponse ──────────────────────────────────────────

describe("rateLimitResponse", () => {
  it("should return 429 status", () => {
    const result = rateLimitResponse({
      allowed: false,
      retryAfterMs: 5000,
      limit: 3,
      remaining: 0,
      triggeredBy: "burst",
    });
    expect(result.status).toBe(429);
  });

  it("should include Retry-After header", () => {
    const result = rateLimitResponse({
      allowed: false,
      retryAfterMs: 10000,
      limit: 3,
      remaining: 0,
      triggeredBy: "sustained",
    });
    expect(result.headers.get("Retry-After")).toBeTruthy();
  });

  it("should include rate limit headers", () => {
    const result = rateLimitResponse({
      allowed: false,
      retryAfterMs: 5000,
      limit: 20,
      remaining: 0,
      triggeredBy: "daily",
    });
    expect(result.headers.get("X-RateLimit-Limit")).toBe("20");
    expect(result.headers.get("X-RateLimit-Remaining")).toBe("0");
  });

  it("should include error message in body", async () => {
    const result = rateLimitResponse({
      allowed: false,
      retryAfterMs: 5000,
      limit: 3,
      remaining: 0,
      triggeredBy: "burst",
    });
    const body = (await result.json()) as Record<string, unknown>;
    expect(body).toHaveProperty("error");
    expect(typeof body.error).toBe("string");
  });
});

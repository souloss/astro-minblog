import { describe, it, expect, beforeEach } from "vitest";
import { chatError, errors, setCorsOrigin, corsPreflightResponse } from "./errors.js";

describe("chatError", () => {
  it("should return correct status code", () => {
    const res = chatError("TEST_CODE", "test error", 418);
    expect(res.status).toBe(418);
  });

  it("should return JSON body with all ChatErrorResponse fields", async () => {
    const res = chatError("TEST_CODE", "test error", 400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toBe("test error");
    expect(body.code).toBe("TEST_CODE");
    expect(body.retryable).toBe(false);
    expect(body.retryAfter).toBeUndefined();
  });

  it("should include retryable when set", async () => {
    const res = chatError("RATE_LIMITED", "slow down", 429, {
      retryable: true,
      retryAfter: 30,
    });
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.retryable).toBe(true);
    expect(body.retryAfter).toBe(30);
  });

  it("should include Retry-After header when retryAfter is set", () => {
    const res = chatError("RATE_LIMITED", "slow down", 429, {
      retryable: true,
      retryAfter: 30,
    });
    expect(res.headers.get("Retry-After")).toBe("30");
  });

  it("should include CORS headers", () => {
    const res = chatError("TEST", "test", 400);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("should include Content-Type header", () => {
    const res = chatError("TEST", "test", 400);
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });
});

describe("errors factory", () => {
  it("errors.methodNotAllowed returns 405", () => {
    expect(errors.methodNotAllowed().status).toBe(405);
  });

  it("errors.invalidRequest returns 400", () => {
    expect(errors.invalidRequest().status).toBe(400);
  });

  it("errors.emptyMessage returns 400 with code INVALID_REQUEST", async () => {
    const res = errors.emptyMessage();
    const body = (await res.json()) as Record<string, unknown>;
    expect(res.status).toBe(400);
    expect(body.code).toBe("INVALID_REQUEST");
  });

  it("errors.inputTooLong returns 400 with max info", async () => {
    const res = errors.inputTooLong(500, "zh");
    const body = (await res.json()) as Record<string, unknown>;
    expect(res.status).toBe(400);
    expect(body.code).toBe("INPUT_TOO_LONG");
  });

  it("errors.rateLimited returns 429 with retryable=true", async () => {
    const res = errors.rateLimited(10, "en");
    const body = (await res.json()) as Record<string, unknown>;
    expect(res.status).toBe(429);
    expect(body.code).toBe("RATE_LIMITED");
    expect(body.retryable).toBe(true);
    expect(body.retryAfter).toBe(10);
  });

  it("errors.timeout returns 504 with retryable=true", async () => {
    const res = errors.timeout();
    const body = (await res.json()) as Record<string, unknown>;
    expect(res.status).toBe(504);
    expect(body.retryable).toBe(true);
  });

  it("errors.providerUnavailable returns 503", () => {
    expect(errors.providerUnavailable().status).toBe(503);
  });

  it("errors.internal returns 500 with retryable=true", async () => {
    const res = errors.internal();
    const body = (await res.json()) as Record<string, unknown>;
    expect(res.status).toBe(500);
    expect(body.code).toBe("INTERNAL_ERROR");
    expect(body.retryable).toBe(true);
  });
});

describe("setCorsOrigin + corsPreflightResponse", () => {
  beforeEach(() => {
    setCorsOrigin("*");
  });

  it("should set CORS origin on preflight response", () => {
    setCorsOrigin("https://example.com");
    const res = corsPreflightResponse();
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://example.com");
  });

  it("should allow POST and OPTIONS methods", () => {
    const res = corsPreflightResponse();
    expect(res.headers.get("Access-Control-Allow-Methods")).toBe("POST, OPTIONS");
  });

  it("should allow required headers", () => {
    const res = corsPreflightResponse();
    expect(res.headers.get("Access-Control-Allow-Headers")).toContain("Content-Type");
    expect(res.headers.get("Access-Control-Allow-Headers")).toContain("x-session-id");
  });
});

describe("getCorsOrigin", () => {
  beforeEach(() => {
    setCorsOrigin("*");
  });

  it("should return default wildcard origin", async () => {
    const { getCorsOrigin } = await import("./errors.js");
    expect(getCorsOrigin()).toBe("*");
  });

  it("should return configured origin after setCorsOrigin", async () => {
    const { getCorsOrigin } = await import("./errors.js");
    setCorsOrigin("https://myblog.com");
    expect(getCorsOrigin()).toBe("https://myblog.com");
  });

  it("should reflect latest setCorsOrigin call", async () => {
    const { getCorsOrigin } = await import("./errors.js");
    setCorsOrigin("https://first.com");
    expect(getCorsOrigin()).toBe("https://first.com");
    setCorsOrigin("https://second.com");
    expect(getCorsOrigin()).toBe("https://second.com");
  });
});

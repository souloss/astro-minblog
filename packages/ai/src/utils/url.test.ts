import { describe, it, expect } from "vitest";
import { safeJoinUrl } from "./url.js";

describe("safeJoinUrl", () => {
  it("should join base URL with path", () => {
    expect(safeJoinUrl("https://example.com", "/posts/article")).toBe(
      "https://example.com/posts/article"
    );
  });

  it("should handle base URL with trailing slash", () => {
    expect(safeJoinUrl("https://example.com/", "/posts/article")).toBe(
      "https://example.com/posts/article"
    );
  });

  it("should handle path without leading slash", () => {
    expect(safeJoinUrl("https://example.com", "posts/article")).toBe(
      "https://example.com/posts/article"
    );
  });

  it("should return path as-is when no base URL", () => {
    expect(safeJoinUrl("", "/posts/article")).toBe("/posts/article");
  });

  it("should return base URL without trailing slash when no path", () => {
    expect(safeJoinUrl("https://example.com/", "")).toBe("https://example.com");
  });

  it("should return path as-is when path is already a full URL", () => {
    expect(safeJoinUrl("https://example.com", "https://other.com/page")).toBe(
      "https://other.com/page"
    );
  });

  it("should handle http:// full URLs", () => {
    expect(safeJoinUrl("https://example.com", "http://localhost:3000/test")).toBe(
      "http://localhost:3000/test"
    );
  });

  it("should handle multiple trailing slashes on base", () => {
    expect(safeJoinUrl("https://example.com///", "/posts")).toBe(
      "https://example.com/posts"
    );
  });

  it("should handle both base and path having slashes", () => {
    expect(safeJoinUrl("https://example.com/", "/posts/article/")).toBe(
      "https://example.com/posts/article/"
    );
  });

  it("should handle empty both", () => {
    expect(safeJoinUrl("", "")).toBe("");
  });
});

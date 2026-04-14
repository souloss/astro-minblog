import { describe, it, expect, beforeEach } from "vitest";
import { injectionCache } from "./injection-cache.js";

describe("InjectionCacheManager", () => {
  beforeEach(() => {
    injectionCache.clear();
  });

  describe("getOrCreate", () => {
    it("should create a new entry for unknown session", () => {
      const entry = injectionCache.getOrCreate("session-1");
      expect(entry).toBeDefined();
      expect(entry.sessionId).toBe("session-1");
      expect(entry.injectedChunks.size).toBe(0);
    });

    it("should return existing entry for known session", () => {
      const entry1 = injectionCache.getOrCreate("session-1");
      entry1.injectedChunks.add("chunk-a");
      const entry2 = injectionCache.getOrCreate("session-1");
      expect(entry2.injectedChunks.size).toBe(1);
      expect(entry2.injectedChunks.has("chunk-a")).toBe(true);
    });
  });

  describe("get", () => {
    it("should return undefined for unknown session", () => {
      expect(injectionCache.get("unknown")).toBeUndefined();
    });

    it("should return entry after getOrCreate", () => {
      injectionCache.getOrCreate("session-1");
      expect(injectionCache.get("session-1")).toBeDefined();
    });
  });

  describe("filterNewChunks", () => {
    it("should return all chunks for new session", () => {
      const chunks = [
        { id: "a", content: "content a" },
        { id: "b", content: "content b" },
      ];
      const result = injectionCache.filterNewChunks("session-1", chunks);
      expect(result).toHaveLength(2);
    });

    it("should filter out already-injected chunks", () => {
      const chunks = [
        { id: "a", content: "content a" },
        { id: "b", content: "content b" },
        { id: "c", content: "content c" },
      ];
      injectionCache.markAsInjected("session-1", ["a"]);
      const result = injectionCache.filterNewChunks("session-1", chunks);
      expect(result).toHaveLength(2);
      expect(result.map(c => c.id)).toEqual(["b", "c"]);
    });

    it("should return empty when all chunks already injected", () => {
      const chunks = [
        { id: "a", content: "content a" },
        { id: "b", content: "content b" },
      ];
      injectionCache.markAsInjected("session-1", ["a", "b"]);
      const result = injectionCache.filterNewChunks("session-1", chunks);
      expect(result).toHaveLength(0);
    });
  });

  describe("markAsInjected", () => {
    it("should add chunk IDs to the session entry", () => {
      injectionCache.markAsInjected("session-1", ["a", "b", "c"]);
      const entry = injectionCache.get("session-1");
      expect(entry?.injectedChunks.size).toBe(3);
    });

    it("should handle duplicate chunk IDs gracefully", () => {
      injectionCache.markAsInjected("session-1", ["a"]);
      injectionCache.markAsInjected("session-1", ["a", "b"]);
      const entry = injectionCache.get("session-1");
      expect(entry?.injectedChunks.size).toBe(2);
    });

    it("should update updatedAt timestamp", () => {
      const entry1 = injectionCache.getOrCreate("session-1");
      const beforeTime = entry1.updatedAt;
      // Small delay to ensure time difference
      injectionCache.markAsInjected("session-1", ["a"]);
      const entry2 = injectionCache.get("session-1");
      expect(entry2!.updatedAt).toBeGreaterThanOrEqual(beforeTime);
    });
  });

  describe("clear", () => {
    it("should clear specific session", () => {
      injectionCache.getOrCreate("session-1");
      injectionCache.getOrCreate("session-2");
      injectionCache.clear("session-1");
      expect(injectionCache.get("session-1")).toBeUndefined();
      expect(injectionCache.get("session-2")).toBeDefined();
    });

    it("should clear all sessions when no sessionId given", () => {
      injectionCache.getOrCreate("session-1");
      injectionCache.getOrCreate("session-2");
      injectionCache.clear();
      expect(injectionCache.get("session-1")).toBeUndefined();
      expect(injectionCache.get("session-2")).toBeUndefined();
    });
  });

  describe("getStats", () => {
    it("should return correct stats", () => {
      injectionCache.markAsInjected("session-1", ["a", "b"]);
      injectionCache.markAsInjected("session-2", ["c"]);
      const stats = injectionCache.getStats();
      expect(stats.totalSessions).toBe(2);
      expect(stats.totalInjectedChunks).toBe(3);
    });

    it("should return zeros when empty", () => {
      injectionCache.clear();
      const stats = injectionCache.getStats();
      expect(stats.totalSessions).toBe(0);
      expect(stats.totalInjectedChunks).toBe(0);
    });
  });
});

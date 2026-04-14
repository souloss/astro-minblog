import { describe, it, expect } from "vitest";
import {
  normalizeText,
  tokenize,
  dedupeByContainment,
  extractCodeAnchors,
  hasCodeAnchors,
  normalizeCodeBlockLang,
} from "./text.js";

// ── normalizeText ──────────────────────────────────────────────

describe("normalizeText", () => {
  it("should lowercase all characters", () => {
    expect(normalizeText("Hello WORLD")).toBe("hello world");
  });

  it("should replace non-word, non-CJK punctuation with spaces", () => {
    expect(normalizeText("hello, world! foo@bar")).toBe("hello world foo bar");
  });

  it("should collapse multiple whitespace into single space", () => {
    expect(normalizeText("hello   world\t\tfoo")).toBe("hello world foo");
  });

  it("should trim leading and trailing whitespace", () => {
    expect(normalizeText("  hello  ")).toBe("hello");
  });

  it("should preserve CJK characters", () => {
    expect(normalizeText("你好世界")).toBe("你好世界");
  });

  it("should handle mixed CJK and English text", () => {
    expect(normalizeText("使用React开发")).toBe("使用react开发");
  });

  it("should return empty string for whitespace-only input", () => {
    expect(normalizeText("   \t\n  ")).toBe("");
  });

  it("should replace punctuation between words with spaces", () => {
    expect(normalizeText("foo.bar-baz")).toBe("foo bar baz");
  });
});

// ── tokenize ───────────────────────────────────────────────────

describe("tokenize", () => {
  it("should tokenize simple English text into word tokens", () => {
    const tokens = tokenize("hello world");
    expect(tokens).toContain("hello");
    expect(tokens).toContain("world");
  });

  it("should expand CJK text and keep full string after dedup", () => {
    const tokens = tokenize("机器学习");
    // dedupeByContainment removes shorter substrings contained in "机器学习"
    expect(tokens).toContain("机器学习");
    // Individual chars and bigrams are substrings of "机器学习", removed by containment dedup
    expect(tokens).not.toContain("机");
    expect(tokens).not.toContain("机器");
  });

  it("should preserve CJK bigrams when no longer superstring exists", () => {
    // Two separate CJK words → bigrams are kept since no superstring contains them both
    const tokens = tokenize("你好 世界");
    expect(tokens.some(t => t.includes("你"))).toBe(true);
    expect(tokens.some(t => t.includes("世"))).toBe(true);
  });

  it("should return empty array for empty string", () => {
    expect(tokenize("")).toEqual([]);
  });

  it("should handle mixed English and CJK input", () => {
    const tokens = tokenize("使用 React 开发");
    expect(tokens).toContain("react");
    // CJK chars expanded
    expect(tokens.some(t => t.includes("使"))).toBe(true);
  });

  it("should deduplicate tokens via containment", () => {
    const tokens = tokenize("test test");
    // "test" should appear only once after dedup
    const testCount = tokens.filter(t => t === "test").length;
    expect(testCount).toBe(1);
  });

  it("should tokenize single CJK character as single-element array", () => {
    const tokens = tokenize("你");
    expect(tokens).toEqual(["你"]);
  });

  it("should handle text with special characters gracefully", () => {
    const tokens = tokenize("foo@bar.com is cool!");
    expect(tokens).toContain("foo");
    expect(tokens).toContain("bar");
    expect(tokens).toContain("com");
    expect(tokens).toContain("is");
    expect(tokens).toContain("cool");
  });
});

// ── dedupeByContainment ────────────────────────────────────────

describe("dedupeByContainment", () => {
  it("should remove terms fully contained in longer terms", () => {
    const result = dedupeByContainment(["react", "reacthooks", "hooks"]);
    // "react" is contained in "reacthooks", so it should be removed
    expect(result).not.toContain("react");
    expect(result).toContain("reacthooks");
  });

  it("should keep terms that are not substrings of others", () => {
    const result = dedupeByContainment(["foo", "bar"]);
    expect(result).toContain("foo");
    expect(result).toContain("bar");
  });

  it("should deduplicate identical terms", () => {
    const result = dedupeByContainment(["test", "test", "test"]);
    expect(result).toEqual(["test"]);
  });

  it("should return empty array for empty input", () => {
    expect(dedupeByContainment([])).toEqual([]);
  });

  it("should prefer longer terms when substrings exist", () => {
    const result = dedupeByContainment(["ab", "abcd", "cd"]);
    expect(result).toContain("abcd");
    // "ab" and "cd" are substrings of "abcd" and should be removed
    expect(result).not.toContain("ab");
    expect(result).not.toContain("cd");
  });

  it("should keep independent terms of same length", () => {
    const result = dedupeByContainment(["abc", "def"]);
    expect(result).toContain("abc");
    expect(result).toContain("def");
  });
});

// ── extractCodeAnchors ─────────────────────────────────────────

describe("extractCodeAnchors", () => {
  it("should extract backtick-quoted code terms", () => {
    const anchors = extractCodeAnchors(
      "use the `useState` hook and `useEffect`"
    );
    expect(anchors).toContain("useState");
    expect(anchors).toContain("useEffect");
  });

  it("should extract camelCase identifiers", () => {
    const anchors = extractCodeAnchors("use useState to manage state");
    expect(anchors).toContain("useState");
  });

  it("should extract file extensions like .ts, .tsx, .astro", () => {
    const anchors = extractCodeAnchors("edit config.ts and Component.astro");
    expect(anchors).toContain("config.ts");
    expect(anchors).toContain("Component.astro");
  });

  it("should extract function calls with trailing parenthesis removed", () => {
    const anchors = extractCodeAnchors("call myFunction() to proceed");
    expect(anchors).toContain("myFunction");
  });

  it("should sort anchors by length descending", () => {
    const anchors = extractCodeAnchors("use `ab` and `abcde`");
    expect(anchors[0]).toBe("abcde");
    expect(anchors[1]).toBe("ab");
  });

  it("should return empty array for empty input", () => {
    expect(extractCodeAnchors("")).toEqual([]);
    expect(extractCodeAnchors("   ")).toEqual([]);
  });

  it("should ignore single-character backtick content", () => {
    // Pattern requires 2+ chars inside backticks
    const anchors = extractCodeAnchors("use `a` here");
    expect(anchors).toEqual([]);
  });

  it("should extract use-prefixed camelCase identifiers", () => {
    const anchors = extractCodeAnchors("useRouter and useStore are hooks");
    expect(anchors).toContain("useRouter");
    expect(anchors).toContain("useStore");
  });
});

// ── hasCodeAnchors ─────────────────────────────────────────────

describe("hasCodeAnchors", () => {
  it("should return true when code anchors are present", () => {
    expect(hasCodeAnchors("use the `useState` hook")).toBe(true);
  });

  it("should return true for camelCase in text", () => {
    expect(hasCodeAnchors("call myFunction to proceed")).toBe(true);
  });

  it("should return false for plain text without code patterns", () => {
    expect(hasCodeAnchors("what is the weather today")).toBe(false);
  });

  it("should return false for empty input", () => {
    expect(hasCodeAnchors("")).toBe(false);
  });
});

// ── normalizeCodeBlockLang ─────────────────────────────────────

describe("normalizeCodeBlockLang", () => {
  it("should return 'plaintext' for undefined input", () => {
    expect(normalizeCodeBlockLang(undefined)).toBe("plaintext");
  });

  it("should map 'js' to 'javascript'", () => {
    expect(normalizeCodeBlockLang("js")).toBe("javascript");
  });

  it("should map 'ts' to 'typescript'", () => {
    expect(normalizeCodeBlockLang("ts")).toBe("typescript");
  });

  it("should map 'py' to 'python'", () => {
    expect(normalizeCodeBlockLang("py")).toBe("python");
  });

  it("should map 'sh' to 'bash'", () => {
    expect(normalizeCodeBlockLang("sh")).toBe("bash");
  });

  it("should map 'yml' to 'yaml'", () => {
    expect(normalizeCodeBlockLang("yml")).toBe("yaml");
  });

  it("should lowercase and pass through unknown languages", () => {
    expect(normalizeCodeBlockLang("Rust")).toBe("rust");
  });

  it("should handle case-insensitive aliases", () => {
    expect(normalizeCodeBlockLang("JS")).toBe("javascript");
    expect(normalizeCodeBlockLang("TS")).toBe("typescript");
  });
});

import { describe, it, expect } from "vitest";
import {
  resolveVoiceStyleMode,
  buildVoiceStylePrompt,
  getSemanticFallback,
  mergeSearchDocuments,
  mergeFacts,
} from "./injector.js";
import type {
  LoadedExtensions,
  VoiceStyleMode,
  VoiceStyleData,
  SemanticFallbackRule,
} from "./types.js";
import type { Fact } from "../fact-registry/types.js";

const emptyExtensions: LoadedExtensions = {
  searchable: new Map(),
  facts: new Map(),
  context: [],
  voiceStyle: null,
  semanticFallback: [],
};

const mockMode: VoiceStyleMode = {
  id: "casual",
  name: "Casual",
  description: "轻松友好的风格",
  matchKeywords: ["聊聊", "casual"],
  matchCategories: ["lifestyle"],
  traits: ["使用口语化表达", "多用emoji"],
};

const mockExtensions: LoadedExtensions = {
  ...emptyExtensions,
  voiceStyle: {
    modes: [mockMode],
    defaultMode: "casual",
    overallTone: "友好亲切",
    frequentExpressions: ["哈", "嗯"],
  },
  semanticFallback: [
    {
      id: "blog-tech",
      patterns: [/(?:用什么|what.*tech)/i],
      fallbackQuery: "astro 技术栈",
      primaryQuery: "框架 技术",
      complexity: "simple",
    },
  ],
};

describe("resolveVoiceStyleMode", () => {
  it("should return null when no voice style configured", () => {
    expect(resolveVoiceStyleMode("hello", [], emptyExtensions)).toBeNull();
  });

  it("should match keyword in query", () => {
    const result = resolveVoiceStyleMode("聊聊AI", [], mockExtensions);
    expect(result?.id).toBe("casual");
  });

  it("should match category", () => {
    const result = resolveVoiceStyleMode("hello", ["lifestyle"], mockExtensions);
    expect(result?.id).toBe("casual");
  });

  it("should fall back to default mode when no match", () => {
    const result = resolveVoiceStyleMode("technical query", ["tech"], mockExtensions);
    expect(result?.id).toBe("casual");
  });

  it("should return null when no default mode matches", () => {
    const ext: LoadedExtensions = {
      ...mockExtensions,
      voiceStyle: {
        ...mockExtensions.voiceStyle!,
        defaultMode: "nonexistent",
      },
    };
    const result = resolveVoiceStyleMode("hello", [], ext);
    expect(result).toBeNull();
  });
});

describe("buildVoiceStylePrompt", () => {
  it("should return empty string when no voice style", () => {
    expect(buildVoiceStylePrompt(null, emptyExtensions)).toBe("");
  });

  it("should include overall tone", () => {
    const result = buildVoiceStylePrompt(null, mockExtensions);
    expect(result).toContain("友好亲切");
  });

  it("should include mode traits when mode provided", () => {
    const result = buildVoiceStylePrompt(mockMode, mockExtensions);
    expect(result).toContain("口语化表达");
  });

  it("should include frequent expressions", () => {
    const result = buildVoiceStylePrompt(null, mockExtensions);
    expect(result).toContain("哈");
  });
});

describe("getSemanticFallback", () => {
  it("should return null when no rules match", () => {
    const result = getSemanticFallback("今天天气", mockExtensions);
    expect(result).toBeNull();
  });

  it("should match rule pattern and return fallback query", () => {
    const result = getSemanticFallback("用什么框架", mockExtensions);
    expect(result).not.toBeNull();
    expect(result!.query).toBe("astro 技术栈");
    expect(result!.primaryQuery).toBe("框架 技术");
  });

  it("should return empty extensions for no rules", () => {
    const result = getSemanticFallback("test", emptyExtensions);
    expect(result).toBeNull();
  });
});

describe("mergeSearchDocuments", () => {
  it("should return base documents when no extensions", () => {
    const base = [{ title: "Post 1", url: "/p1" }] as any;
    const result = mergeSearchDocuments(base, emptyExtensions);
    expect(result).toHaveLength(1);
  });

  it("should merge extension documents", () => {
    const ext: LoadedExtensions = {
      ...emptyExtensions,
      searchable: new Map([
        ["ext1", {
          documents: [{
            id: "ext-doc",
            title: "Extension Doc",
            url: "/ext",
            excerpt: "ext excerpt",
            content: "ext content",
            categories: ["ext"],
            dateTime: 0,
          }],
        }],
      ]),
    };
    const base = [{ title: "Post 1", url: "/p1" }] as any;
    const result = mergeSearchDocuments(base, ext);
    expect(result).toHaveLength(2);
  });
});

describe("mergeFacts", () => {
  it("should merge extension facts with base facts", () => {
    const baseFact: Fact = {
      id: "f1",
      category: "author",
      statement: "Author is cool",
      evidence: "",
      source: "explicit",
      confidence: 0.9,
      tags: [],
      lang: "zh",
    };
    const ext: LoadedExtensions = {
      ...emptyExtensions,
      facts: new Map([
        ["ext-facts", {
          facts: [{
            id: "ef1",
            category: "tech",
            statement: "Uses TypeScript",
            confidence: 0.95,
            tags: ["ts"],
            lang: "zh",
          }],
        }],
      ]),
    };
    const result = mergeFacts([baseFact], ext);
    expect(result).toHaveLength(2);
    expect(result[1]!.statement).toBe("Uses TypeScript");
  });

  it("should return base facts when no extension facts", () => {
    const baseFact: Fact = {
      id: "f1",
      category: "author",
      statement: "test",
      evidence: "",
      source: "explicit",
      confidence: 0.9,
      tags: [],
      lang: "zh",
    };
    const result = mergeFacts([baseFact], emptyExtensions);
    expect(result).toHaveLength(1);
  });
});

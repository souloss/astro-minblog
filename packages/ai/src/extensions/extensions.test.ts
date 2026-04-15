import { describe, it, expect, beforeEach } from "vitest";
import { getExtensionRegistry, resetExtensionRegistry } from "./registry.js";
import {
  resolveVoiceStyleMode,
  buildVoiceStylePrompt,
  mergeSearchDocuments,
  mergeFacts,
} from "./injector.js";
import type {
  Extension,
  VoiceStyleData,
  SemanticFallbackData,
  SearchableData,
  FactsData,
  LoadedExtensions,
} from "./types.js";
import type { ArticleContext } from "../search/types.js";

function createVoiceStyleExtension(
  id: string,
  data: VoiceStyleData,
  priority = 50,
  enabled = true
): Extension<VoiceStyleData> {
  return { id, type: "voice-style", name: id, priority, enabled, data };
}

function createSemanticFallbackExtension(
  id: string,
  rules: SemanticFallbackData["rules"],
  priority = 50
): Extension<SemanticFallbackData> {
  return {
    id,
    type: "semantic-fallback",
    name: id,
    priority,
    enabled: true,
    data: { rules },
  };
}

function createLoadedExtensions(
  overrides: Partial<LoadedExtensions> = {}
): LoadedExtensions {
  return {
    searchable: new Map(),
    facts: new Map(),
    context: [],
    voiceStyle: null,
    semanticFallback: [],
    ...overrides,
  };
}

describe("ExtensionRegistry", () => {
  beforeEach(() => {
    resetExtensionRegistry();
  });

  describe("voice-style merging", () => {
    it("should merge modes from multiple voice-style extensions", () => {
      const registry = getExtensionRegistry();

      registry.register(
        createVoiceStyleExtension(
          "voice-1",
          {
            modes: [
              {
                id: "travel",
                name: "Travel",
                description: "Travel mode",
                traits: ["trait1"],
              },
            ],
            overallTone: "tone1",
          },
          80
        )
      );

      registry.register(
        createVoiceStyleExtension(
          "voice-2",
          {
            modes: [
              {
                id: "tech",
                name: "Tech",
                description: "Tech mode",
                traits: ["trait2"],
              },
            ],
            overallTone: "tone2",
          },
          70
        )
      );

      const loaded = registry.getLoadedExtensions();

      expect(loaded.voiceStyle).not.toBeNull();
      expect(loaded.voiceStyle?.modes).toHaveLength(2);
      expect(loaded.voiceStyle?.modes.map(m => m.id)).toContain("travel");
      expect(loaded.voiceStyle?.modes.map(m => m.id)).toContain("tech");
    });

    it("should keep overallTone from highest priority extension", () => {
      const registry = getExtensionRegistry();

      registry.register(
        createVoiceStyleExtension(
          "voice-1",
          {
            modes: [
              { id: "mode1", name: "M1", description: "Mode 1", traits: [] },
            ],
            overallTone: "high-priority-tone",
          },
          80
        )
      );

      registry.register(
        createVoiceStyleExtension(
          "voice-2",
          {
            modes: [
              { id: "mode2", name: "M2", description: "Mode 2", traits: [] },
            ],
            overallTone: "low-priority-tone",
          },
          70
        )
      );

      const loaded = registry.getLoadedExtensions();

      expect(loaded.voiceStyle?.overallTone).toBe("high-priority-tone");
    });

    it("should merge frequentExpressions from multiple extensions", () => {
      const registry = getExtensionRegistry();

      registry.register(
        createVoiceStyleExtension(
          "voice-1",
          {
            modes: [],
            frequentExpressions: ["expr1", "expr2"],
          },
          80
        )
      );

      registry.register(
        createVoiceStyleExtension(
          "voice-2",
          {
            modes: [],
            frequentExpressions: ["expr3", "expr4"],
          },
          70
        )
      );

      const loaded = registry.getLoadedExtensions();

      expect(loaded.voiceStyle?.frequentExpressions).toEqual([
        "expr1",
        "expr2",
        "expr3",
        "expr4",
      ]);
    });

    it("should not duplicate modes with same id", () => {
      const registry = getExtensionRegistry();

      registry.register(
        createVoiceStyleExtension(
          "voice-1",
          {
            modes: [
              {
                id: "travel",
                name: "Travel 1",
                description: "D1",
                traits: ["t1"],
              },
            ],
          },
          80
        )
      );

      registry.register(
        createVoiceStyleExtension(
          "voice-2",
          {
            modes: [
              {
                id: "travel",
                name: "Travel 2",
                description: "D2",
                traits: ["t2"],
              },
            ],
          },
          70
        )
      );

      const loaded = registry.getLoadedExtensions();

      expect(loaded.voiceStyle?.modes).toHaveLength(1);
      expect(loaded.voiceStyle?.modes[0].name).toBe("Travel 1");
    });

    it("should skip disabled extensions", () => {
      const registry = getExtensionRegistry();

      registry.register(
        createVoiceStyleExtension(
          "voice-1",
          {
            modes: [{ id: "m1", name: "M1", description: "D1", traits: [] }],
          },
          80,
          false
        )
      );

      const loaded = registry.getLoadedExtensions();

      expect(loaded.voiceStyle).toBeNull();
    });
  });

  describe("semantic-fallback pattern compilation", () => {
    it("should compile string patterns to RegExp", () => {
      const registry = getExtensionRegistry();

      registry.register(
        createSemanticFallbackExtension("fallback-1", [
          {
            id: "rule1",
            patterns: ["旅行|旅游"] as unknown as RegExp[],
            fallbackQuery: "travel",
          },
        ])
      );

      const loaded = registry.getLoadedExtensions();

      expect(loaded.semanticFallback).toHaveLength(1);
      expect(loaded.semanticFallback[0].patterns[0]).toBeInstanceOf(RegExp);
    });

    it("should handle invalid regex patterns gracefully", () => {
      const registry = getExtensionRegistry();

      registry.register(
        createSemanticFallbackExtension("fallback-1", [
          {
            id: "rule1",
            patterns: ["[invalid(regex"] as unknown as RegExp[],
            fallbackQuery: "test",
          },
          {
            id: "rule2",
            patterns: ["valid pattern"] as unknown as RegExp[],
            fallbackQuery: "valid",
          },
        ])
      );

      const loaded = registry.getLoadedExtensions();

      expect(loaded.semanticFallback).toHaveLength(1);
      expect(loaded.semanticFallback[0].id).toBe("rule2");
    });

    it("should merge rules from multiple extensions", () => {
      const registry = getExtensionRegistry();

      registry.register(
        createSemanticFallbackExtension(
          "fallback-1",
          [
            {
              id: "rule1",
              patterns: ["pattern1"] as unknown as RegExp[],
              fallbackQuery: "query1",
            },
          ],
          80
        )
      );

      registry.register(
        createSemanticFallbackExtension(
          "fallback-2",
          [
            {
              id: "rule2",
              patterns: ["pattern2"] as unknown as RegExp[],
              fallbackQuery: "query2",
            },
          ],
          70
        )
      );

      const loaded = registry.getLoadedExtensions();

      expect(loaded.semanticFallback).toHaveLength(2);
    });
  });

  describe("priority ordering", () => {
    it("should sort extensions by priority descending", () => {
      const registry = getExtensionRegistry();

      registry.register(
        createSemanticFallbackExtension(
          "low",
          [
            {
              id: "rule-low",
              patterns: ["low"] as unknown as RegExp[],
              fallbackQuery: "low-query",
            },
          ],
          10
        )
      );

      registry.register(
        createSemanticFallbackExtension(
          "high",
          [
            {
              id: "rule-high",
              patterns: ["high"] as unknown as RegExp[],
              fallbackQuery: "high-query",
            },
          ],
          90
        )
      );

      registry.register(
        createSemanticFallbackExtension(
          "mid",
          [
            {
              id: "rule-mid",
              patterns: ["mid"] as unknown as RegExp[],
              fallbackQuery: "mid-query",
            },
          ],
          50
        )
      );

      const loaded = registry.getLoadedExtensions();

      expect(loaded.semanticFallback[0].id).toBe("rule-high");
      expect(loaded.semanticFallback[1].id).toBe("rule-mid");
      expect(loaded.semanticFallback[2].id).toBe("rule-low");
    });
  });
});

describe("resolveVoiceStyleMode", () => {
  it("should match by keyword", () => {
    const extensions = createLoadedExtensions({
      voiceStyle: {
        modes: [
          {
            id: "travel",
            name: "Travel",
            description: "Travel mode",
            matchKeywords: ["旅行", "travel"],
            traits: [],
          },
        ],
      },
    });

    const result = resolveVoiceStyleMode("推荐日本旅行攻略", [], extensions);

    expect(result?.id).toBe("travel");
  });

  it("should match by category", () => {
    const extensions = createLoadedExtensions({
      voiceStyle: {
        modes: [
          {
            id: "tech",
            name: "Tech",
            description: "Tech mode",
            matchCategories: ["programming", "tech"],
            traits: [],
          },
        ],
      },
    });

    const result = resolveVoiceStyleMode(
      "如何学习编程",
      ["programming"],
      extensions
    );

    expect(result?.id).toBe("tech");
  });

  it("should prefer keyword match over category match", () => {
    const extensions = createLoadedExtensions({
      voiceStyle: {
        modes: [
          {
            id: "keyword-mode",
            name: "Keyword",
            description: "Keyword mode",
            matchKeywords: ["test"],
            traits: [],
          },
          {
            id: "category-mode",
            name: "Category",
            description: "Category mode",
            matchCategories: ["cat"],
            traits: [],
          },
        ],
      },
    });

    const result = resolveVoiceStyleMode("test query", ["cat"], extensions);

    expect(result?.id).toBe("keyword-mode");
  });

  it("should return default mode when no match", () => {
    const extensions = createLoadedExtensions({
      voiceStyle: {
        modes: [
          {
            id: "travel",
            name: "Travel",
            description: "Travel mode",
            traits: [],
          },
          {
            id: "default",
            name: "Default",
            description: "Default mode",
            traits: [],
          },
        ],
        defaultMode: "default",
      },
    });

    const result = resolveVoiceStyleMode("random query", [], extensions);

    expect(result?.id).toBe("default");
  });

  it("should return null when no voiceStyle configured", () => {
    const extensions = createLoadedExtensions();

    const result = resolveVoiceStyleMode("test", [], extensions);

    expect(result).toBeNull();
  });
});

describe("buildVoiceStylePrompt", () => {
  it("should include overallTone", () => {
    const extensions = createLoadedExtensions({
      voiceStyle: {
        modes: [],
        overallTone: "轻松友好",
      },
    });

    const prompt = buildVoiceStylePrompt(null, extensions);

    expect(prompt).toContain("轻松友好");
  });

  it("should include frequentExpressions", () => {
    const extensions = createLoadedExtensions({
      voiceStyle: {
        modes: [],
        frequentExpressions: ["其实", "说实话", "在我看来"],
      },
    });

    const prompt = buildVoiceStylePrompt(null, extensions);

    expect(prompt).toContain("其实、说实话、在我看来");
  });

  it("should include mode traits when matched", () => {
    const extensions = createLoadedExtensions({
      voiceStyle: {
        modes: [],
      },
    });

    const mode = {
      id: "travel",
      name: "Travel",
      description: "旅行模式",
      traits: ["按时间线叙述", "推荐实用信息"],
    };

    const prompt = buildVoiceStylePrompt(mode, extensions);

    expect(prompt).toContain("旅行模式");
    expect(prompt).toContain("按时间线叙述");
    expect(prompt).toContain("推荐实用信息");
  });

  it("should return empty string when no voiceStyle", () => {
    const extensions = createLoadedExtensions();

    const prompt = buildVoiceStylePrompt(null, extensions);

    expect(prompt).toBe("");
  });
});

describe("mergeSearchDocuments", () => {
  it("should merge extension documents into base documents", () => {
    const baseDocs: ArticleContext[] = [
      {
        title: "Base Article",
        url: "/base",
        keyPoints: [],
        categories: [],
        dateTime: Date.now(),
      },
    ];

    const extensions = createLoadedExtensions({
      searchable: new Map([
        [
          "ext1",
          {
            documents: [
              {
                id: "ext-doc",
                title: "Extension Doc",
                url: "/ext",
                excerpt: "test",
                content: "content",
                categories: [],
                dateTime: Date.now(),
              },
            ],
          },
        ],
      ]),
    });

    const result = mergeSearchDocuments(baseDocs, extensions);

    expect(result).toHaveLength(2);
    expect(result[1].title).toBe("Extension Doc");
  });
});

describe("mergeFacts", () => {
  it("should merge extension facts into base facts", () => {
    const baseFacts = [
      {
        id: "base-fact",
        category: "author" as const,
        statement: "Base fact",
        evidence: "",
        source: "explicit" as const,
        confidence: 1,
        tags: [],
        lang: "zh",
      },
    ];

    const extensions = createLoadedExtensions({
      facts: new Map([
        [
          "ext1",
          {
            facts: [
              {
                id: "ext-fact",
                category: "blog",
                statement: "Extension fact",
                confidence: 0.9,
                tags: [],
                lang: "zh",
              },
            ],
          },
        ],
      ]),
    });

    const result = mergeFacts(baseFacts, extensions);

    expect(result).toHaveLength(2);
    expect(result[1].id).toBe("ext-fact");
  });
});

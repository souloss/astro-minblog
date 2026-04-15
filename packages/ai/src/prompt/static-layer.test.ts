import { describe, it, expect } from "vitest";
import { buildStaticLayer } from "./static-layer.js";
import type { StaticLayerConfig } from "./types.js";

// ── Fixtures ─────────────────────────────────────────────────────

function makeConfig(overrides: Partial<StaticLayerConfig> = {}): StaticLayerConfig {
  return {
    authorName: "TestAuthor",
    siteUrl: "https://test.com",
    lang: "zh",
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────

describe("buildStaticLayer", () => {
  it("returns override when systemPromptOverride provided", () => {
    const result = buildStaticLayer(makeConfig({
      systemPromptOverride: "Custom system prompt",
    }));
    expect(result).toBe("Custom system prompt");
  });

  it("includes author name in identity", () => {
    const result = buildStaticLayer(makeConfig());
    expect(result).toContain("TestAuthor");
  });

  it("includes responsibilities section in Chinese", () => {
    const result = buildStaticLayer(makeConfig());
    expect(result).toContain("你的职责");
  });

  it("includes responsibilities section in English", () => {
    const result = buildStaticLayer(makeConfig({ lang: "en" }));
    expect(result).toContain("Your Responsibilities");
  });

  it("includes constraints section in Chinese", () => {
    const result = buildStaticLayer(makeConfig());
    expect(result).toContain("约束");
  });

  it("includes source layers section", () => {
    const result = buildStaticLayer(makeConfig());
    expect(result).toContain("L1");
    expect(result).toContain("L5");
  });

  it("includes privacy protection section in Chinese", () => {
    const result = buildStaticLayer(makeConfig());
    expect(result).toContain("隐私保护");
  });

  it("includes tool usage section in Chinese", () => {
    const result = buildStaticLayer(makeConfig());
    expect(result).toContain("工具使用");
  });

  it("includes tool usage in English", () => {
    const result = buildStaticLayer(makeConfig({ lang: "en" }));
    expect(result).toContain("Tool Usage");
  });

  it("includes voice style prompt when provided", () => {
    const result = buildStaticLayer(makeConfig({ voiceStylePrompt: "Be concise" }));
    expect(result).toContain("Be concise");
  });

  it("generates valid Chinese prompt", () => {
    const result = buildStaticLayer(makeConfig({ lang: "zh" }));
    expect(result).toContain("博客 AI 助手");
    expect(result).toContain("不编造链接");
  });

  it("generates valid English prompt", () => {
    const result = buildStaticLayer(makeConfig({ lang: "en" }));
    expect(result).toContain("blog AI assistant");
    expect(result).toContain("do not fabricate");
  });

  it("includes answer modes section in Chinese", () => {
    const result = buildStaticLayer(makeConfig());
    expect(result).toContain("回答模式");
  });

  it("includes pre-output checks section in Chinese", () => {
    const result = buildStaticLayer(makeConfig());
    expect(result).toContain("输出前检查");
  });

  it("trims trailing whitespace", () => {
    const result = buildStaticLayer(makeConfig());
    expect(result === result.trim()).toBe(true);
  });
});

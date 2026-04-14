import { describe, it, expect } from "vitest";
import {
  pickTemplate,
  pickTemplateWithVars,
  PRIVACY_REFUSAL_TEMPLATES,
  UNKNOWN_REFUSAL_TEMPLATES,
  NO_ARTICLE_TEMPLATES,
  ARTICLE_COUNT_TEMPLATES,
} from "./response-templates.js";

describe("pickTemplate", () => {
  it("should return a Chinese template for zh", () => {
    const result = pickTemplate(UNKNOWN_REFUSAL_TEMPLATES, "zh");
    expect(UNKNOWN_REFUSAL_TEMPLATES.zh).toContain(result);
  });

  it("should return an English template for en", () => {
    const result = pickTemplate(UNKNOWN_REFUSAL_TEMPLATES, "en");
    expect(UNKNOWN_REFUSAL_TEMPLATES.en).toContain(result);
  });

  it("should return Chinese template for non-en lang", () => {
    const result = pickTemplate(UNKNOWN_REFUSAL_TEMPLATES, "fr");
    expect(UNKNOWN_REFUSAL_TEMPLATES.zh).toContain(result);
  });

  it("should return different results sometimes (randomness)", () => {
    const results = new Set<string>();
    for (let i = 0; i < 50; i++) {
      results.add(pickTemplate(NO_ARTICLE_TEMPLATES, "en"));
    }
    // Should have at least 2 different templates from 3 options
    expect(results.size).toBeGreaterThanOrEqual(2);
  });
});

describe("pickTemplateWithVars", () => {
  it("should interpolate {count} variable", () => {
    const result = pickTemplateWithVars(ARTICLE_COUNT_TEMPLATES, "en", { count: 5 });
    expect(result).toContain("5");
    expect(result).not.toContain("{count}");
  });

  it("should interpolate Chinese count variable", () => {
    const result = pickTemplateWithVars(ARTICLE_COUNT_TEMPLATES, "zh", { count: 3 });
    expect(result).toContain("3");
  });
});

describe("PRIVACY_REFUSAL_TEMPLATES", () => {
  it("should have templates for all privacy categories", () => {
    const categories = ["address", "income", "family", "phone", "id", "age"];
    for (const cat of categories) {
      expect(PRIVACY_REFUSAL_TEMPLATES[cat]).toBeDefined();
      expect(PRIVACY_REFUSAL_TEMPLATES[cat].zh.length).toBeGreaterThan(0);
      expect(PRIVACY_REFUSAL_TEMPLATES[cat].en.length).toBeGreaterThan(0);
    }
  });
});

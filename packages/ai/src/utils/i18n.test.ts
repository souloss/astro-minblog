import { describe, it, expect } from "vitest";
import { t, getLang } from "./i18n.js";

describe("getLang", () => {
  it("should return 'zh' for 'zh'", () => {
    expect(getLang("zh")).toBe("zh");
  });

  it("should return 'en' for 'zh-CN' (strict check)", () => {
    expect(getLang("zh-CN")).toBe("en");
  });

  it("should return 'en' for 'en'", () => {
    expect(getLang("en")).toBe("en");
  });

  it("should return 'en' for undefined", () => {
    expect(getLang(undefined)).toBe("en");
  });

  it("should return 'en' for unknown language", () => {
    expect(getLang("fr")).toBe("en");
  });
});

describe("t", () => {
  it("should return Chinese translation by default", () => {
    expect(t("ai.clear")).toBe("清除");
  });

  it("should return English translation for 'en'", () => {
    expect(t("ai.clear", "en")).toBe("Clear");
  });

  it("should return key for unknown key", () => {
    expect(t("ai.unknown.key" as any)).toBe("ai.unknown.key");
  });

  it("should interpolate {count} variable", () => {
    const result = t("ai.status.found", "en", { count: 5 });
    expect(result).toBe("Found 5 related items");
  });

  it("should interpolate {max} variable in Chinese", () => {
    const result = t("ai.error.inputTooLong", "zh", { max: 500 });
    expect(result).toContain("500");
  });

  it("should interpolate multiple variables", () => {
    const result = t("ai.semiStatic.mainCategories", "en", { categories: "tech, life" });
    expect(result).toContain("tech, life");
  });

  it("should handle empty vars object", () => {
    const result = t("ai.clear", "en", {});
    expect(result).toBe("Clear");
  });
});

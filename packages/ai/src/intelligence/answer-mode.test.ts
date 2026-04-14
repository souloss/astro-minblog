import { describe, it, expect } from "vitest";
import { resolveAnswerMode } from "./citation-guard.js";

describe("resolveAnswerMode", () => {
  describe("recommendation mode (checked before count)", () => {
    it("should detect '推荐几篇文章' as recommendation (not count)", () => {
      expect(resolveAnswerMode("推荐几篇文章")).toBe("recommendation");
    });

    it("should detect '有什么建议吗' as recommendation", () => {
      expect(resolveAnswerMode("有什么建议吗")).toBe("recommendation");
    });

    it("should detect 'suggest some tools' as recommendation", () => {
      expect(resolveAnswerMode("suggest some tools")).toBe("recommendation");
    });

    it("should detect 'recommend a framework' as recommendation", () => {
      expect(resolveAnswerMode("recommend a framework")).toBe("recommendation");
    });
  });

  describe("count mode", () => {
    it("should detect '有多少篇文章' as count", () => {
      expect(resolveAnswerMode("有多少篇文章")).toBe("count");
    });

    it("should detect 'how many articles' as count", () => {
      expect(resolveAnswerMode("how many articles")).toBe("count");
    });

    it("should detect '几次' as count", () => {
      expect(resolveAnswerMode("这个功能可以用几次")).toBe("count");
    });

    it("should detect '数量' as count", () => {
      expect(resolveAnswerMode("文章数量")).toBe("count");
    });
  });

  describe("list mode", () => {
    it("should detect '有哪些功能' as list", () => {
      expect(resolveAnswerMode("有哪些功能")).toBe("list");
    });

    it("should detect '列举一下' as list", () => {
      expect(resolveAnswerMode("列举一下")).toBe("list");
    });

    it("should detect 'what are the features' as list", () => {
      expect(resolveAnswerMode("what are the features")).toBe("list");
    });
  });

  describe("opinion mode", () => {
    it("should detect '怎么看' as opinion", () => {
      expect(resolveAnswerMode("你怎么看这个框架")).toBe("opinion");
    });

    it("should detect 'what do you think about' as opinion", () => {
      expect(resolveAnswerMode("what do you think about React")).toBe("opinion");
    });
  });

  describe("fact mode", () => {
    it("should detect '是什么' as fact", () => {
      expect(resolveAnswerMode("TypeScript是什么")).toBe("fact");
    });

    it("should detect 'what is' as fact", () => {
      expect(resolveAnswerMode("what is Astro")).toBe("fact");
    });

    it("should detect '真的吗' as fact", () => {
      expect(resolveAnswerMode("这是真的吗")).toBe("fact");
    });
  });

  describe("privacy/unknown mode", () => {
    it("should detect privacy intent as unknown", () => {
      expect(resolveAnswerMode("你的手机号码是多少")).toBe("unknown");
    });

    it("should detect age query as unknown", () => {
      expect(resolveAnswerMode("你多大了")).toBe("unknown");
    });
  });

  describe("general mode (fallback)", () => {
    it("should return general for unrecognized queries", () => {
      expect(resolveAnswerMode("hello")).toBe("general");
    });

    it("should return general for empty-ish queries", () => {
      expect(resolveAnswerMode("嗯")).toBe("general");
    });
  });

  describe("priority: recommendation before count", () => {
    it("'推荐几篇' should be recommendation, not count", () => {
      // This was the bug: '几篇' matched count before '推荐' matched recommendation
      expect(resolveAnswerMode("推荐几篇文章")).toBe("recommendation");
    });

    it("'建议几个方案' should be recommendation, not count", () => {
      expect(resolveAnswerMode("建议几个方案")).toBe("recommendation");
    });
  });
});

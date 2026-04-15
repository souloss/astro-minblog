import { describe, it, expect } from "vitest";
import {
  QuestionTypeSchema,
  ConfidenceLevelSchema,
  CountModeSchema,
  EvidenceEntitySchema,
  EvidenceFindingSchema,
  EvidenceAnalysisSchema,
  EVIDENCE_ANALYSIS_SYSTEM_PROMPT,
} from "./evidence.js";

describe("evidence schemas", () => {
  describe("QuestionTypeSchema", () => {
    const validTypes = ["fact", "list", "count", "timeline", "recommendation", "opinion", "mixed", "unknown"];

    it.each(validTypes)("accepts '%s'", (type) => {
      expect(QuestionTypeSchema.parse(type)).toBe(type);
    });

    it("rejects invalid type", () => {
      expect(() => QuestionTypeSchema.parse("invalid")).toThrow();
    });
  });

  describe("ConfidenceLevelSchema", () => {
    it("accepts high", () => expect(ConfidenceLevelSchema.parse("high")).toBe("high"));
    it("accepts medium", () => expect(ConfidenceLevelSchema.parse("medium")).toBe("medium"));
    it("accepts low", () => expect(ConfidenceLevelSchema.parse("low")).toBe("low"));
    it("rejects invalid", () => expect(() => ConfidenceLevelSchema.parse("invalid")).toThrow());
  });

  describe("CountModeSchema", () => {
    it("accepts exact", () => expect(CountModeSchema.parse("exact")).toBe("exact"));
    it("accepts at_least", () => expect(CountModeSchema.parse("at_least")).toBe("at_least"));
    it("accepts unknown", () => expect(CountModeSchema.parse("unknown")).toBe("unknown"));
  });

  describe("EvidenceEntitySchema", () => {
    it("validates complete entity", () => {
      const entity = {
        name: "React",
        relation: "framework",
        status: "used",
        count: 5,
        countMode: "at_least" as const,
        note: "Multiple projects",
        evidenceUrls: ["/posts/react-intro/"],
      };
      expect(EvidenceEntitySchema.parse(entity)).toEqual(entity);
    });

    it("validates minimal entity (required fields only)", () => {
      const entity = {
        name: "Vue",
        relation: "framework",
        status: "mentioned",
        evidenceUrls: [],
      };
      expect(EvidenceEntitySchema.parse(entity)).toEqual(entity);
    });

    it("rejects missing required fields", () => {
      expect(() => EvidenceEntitySchema.parse({ name: "X" })).toThrow();
    });
  });

  describe("EvidenceFindingSchema", () => {
    it("validates a finding", () => {
      const finding = {
        claim: "Uses TypeScript",
        confidence: "high" as const,
        evidenceUrls: ["/posts/ts-guide/"],
      };
      expect(EvidenceFindingSchema.parse(finding)).toEqual(finding);
    });

    it("rejects invalid confidence", () => {
      expect(() =>
        EvidenceFindingSchema.parse({
          claim: "test",
          confidence: "invalid",
          evidenceUrls: [],
        })
      ).toThrow();
    });
  });

  describe("EvidenceAnalysisSchema", () => {
    it("validates complete analysis", () => {
      const analysis = {
        questionType: "fact",
        directAnswer: "The blog uses Astro",
        entities: [],
        keyFindings: [],
        uncertainties: [],
        recommendedUrls: [],
      };
      expect(EvidenceAnalysisSchema.parse(analysis)).toEqual(analysis);
    });

    it("validates with entities and findings", () => {
      const analysis = {
        questionType: "list",
        directAnswer: "3 frameworks used",
        entities: [
          {
            name: "React",
            relation: "framework",
            status: "used",
            evidenceUrls: [],
          },
        ],
        keyFindings: [
          {
            claim: "Uses React",
            confidence: "high",
            evidenceUrls: [],
          },
        ],
        uncertainties: ["Exact version unknown"],
        recommendedUrls: ["/posts/react/"],
      };
      expect(EvidenceAnalysisSchema.parse(analysis)).toEqual(analysis);
    });

    it("rejects too many entities (>6)", () => {
      const entities = Array.from({ length: 7 }, (_, i) => ({
        name: `E${i}`,
        relation: "test",
        status: "test",
        evidenceUrls: [],
      }));
      expect(() =>
        EvidenceAnalysisSchema.parse({
          questionType: "list",
          directAnswer: "test",
          entities,
          keyFindings: [],
          uncertainties: [],
          recommendedUrls: [],
        })
      ).toThrow();
    });

    it("rejects too many keyFindings (>4)", () => {
      const findings = Array.from({ length: 5 }, () => ({
        claim: "test",
        confidence: "high",
        evidenceUrls: [],
      }));
      expect(() =>
        EvidenceAnalysisSchema.parse({
          questionType: "fact",
          directAnswer: "test",
          entities: [],
          keyFindings: findings,
          uncertainties: [],
          recommendedUrls: [],
        })
      ).toThrow();
    });

    it("rejects too many recommendedUrls (>3)", () => {
      expect(() =>
        EvidenceAnalysisSchema.parse({
          questionType: "fact",
          directAnswer: "test",
          entities: [],
          keyFindings: [],
          uncertainties: [],
          recommendedUrls: ["/a/", "/b/", "/c/", "/d/"],
        })
      ).toThrow();
    });
  });

  describe("EVIDENCE_ANALYSIS_SYSTEM_PROMPT", () => {
    it("is a non-empty string", () => {
      expect(EVIDENCE_ANALYSIS_SYSTEM_PROMPT).toBeTruthy();
      expect(EVIDENCE_ANALYSIS_SYSTEM_PROMPT.length).toBeGreaterThan(100);
    });

    it("contains JSON format instruction", () => {
      expect(EVIDENCE_ANALYSIS_SYSTEM_PROMPT).toContain("JSON");
    });
  });
});

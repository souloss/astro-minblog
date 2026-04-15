import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { generateStructured } from "./generator.js";
import type { StructuredOutputProvider } from "./types.js";

// ── Schema fixture ───────────────────────────────────────────────

const testSchema = z.object({
  name: z.string(),
  value: z.number(),
});

type TestData = z.infer<typeof testSchema>;

const validData: TestData = { name: "test", value: 42 };

// ── Mock provider builder ────────────────────────────────────────

function createMockProvider(): {
  provider: StructuredOutputProvider;
  generateObject: ReturnType<typeof vi.fn>;
  generateText: ReturnType<typeof vi.fn>;
} {
  const generateObject = vi.fn();
  const generateText = vi.fn();
  return {
    generateObject,
    generateText,
    provider: { generateObject, generateText },
  };
}

/** Creates a mock that never resolves unless the signal aborts (like a real HTTP request). */
function hangingPromise(signal?: AbortSignal): Promise<never> {
  return new Promise((_, reject) => {
    if (signal) {
      signal.addEventListener("abort", () => {
        const err = new Error("Aborted");
        err.name = "AbortError";
        reject(err);
      });
    }
    // If no signal, never resolves
  });
}

const defaultSystemPrompt = "You are a helpful assistant.";
const defaultUserPrompt = "Generate structured data.";

// ── Tests ────────────────────────────────────────────────────────

describe("generateStructured", () => {
  let mock: ReturnType<typeof createMockProvider>;

  beforeEach(() => {
    mock = createMockProvider();
  });

  describe("happy path — generateObject succeeds", () => {
    it("returns success with validated data", async () => {
      mock.generateObject.mockResolvedValue({
        object: validData,
        usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
      });

      const result = await generateStructured({
        config: { schema: testSchema },
        provider: mock.provider,
        systemPrompt: defaultSystemPrompt,
        userPrompt: defaultUserPrompt,
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe("success");
      expect(result.data).toEqual(validData);
      expect(result.fallbackUsed).toBe(false);
      expect(result.usage).toEqual({
        inputTokens: 10,
        outputTokens: 5,
        totalTokens: 15,
      });
    });

    it("returns success without usage when provider omits it", async () => {
      mock.generateObject.mockResolvedValue({
        object: validData,
      });

      const result = await generateStructured({
        config: { schema: testSchema },
        provider: mock.provider,
        systemPrompt: defaultSystemPrompt,
        userPrompt: defaultUserPrompt,
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
      expect(result.usage).toBeUndefined();
    });
  });

  describe("schema validation failure → text repair", () => {
    it("repairs via generateText when generateObject returns invalid data", async () => {
      mock.generateObject.mockResolvedValue({
        object: { wrong: "data" },
      });
      mock.generateText.mockResolvedValue({
        text: JSON.stringify(validData),
        usage: { inputTokens: 20, outputTokens: 10, totalTokens: 30 },
      });

      const result = await generateStructured({
        config: { schema: testSchema, repairStrategy: "lenient" },
        provider: mock.provider,
        systemPrompt: defaultSystemPrompt,
        userPrompt: defaultUserPrompt,
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe("success_repaired");
      expect(result.fallbackUsed).toBe(true);
      expect(result.data).toEqual(validData);
      expect(mock.generateText).toHaveBeenCalled();
    });

    it("repairs when generateObject throws", async () => {
      mock.generateObject.mockRejectedValue(new Error("Provider error"));
      mock.generateText.mockResolvedValue({
        text: JSON.stringify(validData),
      });

      const result = await generateStructured({
        config: { schema: testSchema, repairStrategy: "lenient" },
        provider: mock.provider,
        systemPrompt: defaultSystemPrompt,
        userPrompt: defaultUserPrompt,
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe("success_repaired");
      expect(result.fallbackUsed).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it("extracts JSON from code block", async () => {
      mock.generateObject.mockResolvedValue({
        object: { wrong: "data" },
      });
      mock.generateText.mockResolvedValue({
        text: "```json\n" + JSON.stringify(validData) + "\n```",
      });

      const result = await generateStructured({
        config: { schema: testSchema, repairStrategy: "lenient" },
        provider: mock.provider,
        systemPrompt: defaultSystemPrompt,
        userPrompt: defaultUserPrompt,
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe("success_repaired");
      expect(result.data).toEqual(validData);
    });
  });

  describe("fallback parser", () => {
    it("uses fallbackParser in lenient mode", async () => {
      mock.generateObject.mockResolvedValue({
        object: { wrong: "data" },
      });
      mock.generateText.mockResolvedValue({
        text: "The name is test and the value is 42",
      });

      const fallbackParser = vi.fn().mockReturnValue(validData);

      const result = await generateStructured({
        config: {
          schema: testSchema,
          repairStrategy: "lenient",
          fallbackParser,
        },
        provider: mock.provider,
        systemPrompt: defaultSystemPrompt,
        userPrompt: defaultUserPrompt,
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe("success_repaired");
      expect(fallbackParser).toHaveBeenCalledWith(
        "The name is test and the value is 42"
      );
    });

    it("does NOT use fallbackParser in strict mode", async () => {
      mock.generateObject.mockResolvedValue({
        object: { wrong: "data" },
      });
      mock.generateText.mockResolvedValue({
        text: "unparseable text",
      });

      const fallbackParser = vi.fn().mockReturnValue(validData);

      const result = await generateStructured({
        config: {
          schema: testSchema,
          repairStrategy: "strict",
          fallbackParser,
        },
        provider: mock.provider,
        systemPrompt: defaultSystemPrompt,
        userPrompt: defaultUserPrompt,
      });

      expect(result.success).toBe(false);
      expect(fallbackParser).not.toHaveBeenCalled();
    });

    it("skips all repair in none mode", async () => {
      mock.generateObject.mockResolvedValue({
        object: { wrong: "data" },
      });

      const result = await generateStructured({
        config: {
          schema: testSchema,
          repairStrategy: "none",
        },
        provider: mock.provider,
        systemPrompt: defaultSystemPrompt,
        userPrompt: defaultUserPrompt,
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe("schema_error");
      expect(mock.generateText).not.toHaveBeenCalled();
    });
  });

  describe("timeout handling", () => {
    it(
      "returns failure when generateObject times out",
      async () => {
        // Mock: generateObject listens to abortSignal (like real HTTP)
        mock.generateObject.mockImplementation(
          (opts: { abortSignal?: AbortSignal }) => hangingPromise(opts.abortSignal)
        );
        mock.generateText.mockImplementation(
          (opts: { abortSignal?: AbortSignal }) => hangingPromise(opts.abortSignal)
        );

        const result = await generateStructured({
          config: { schema: testSchema, timeoutMs: 80, repairStrategy: "lenient" },
          provider: mock.provider,
          systemPrompt: defaultSystemPrompt,
          userPrompt: defaultUserPrompt,
        });

        expect(result.success).toBe(false);
        // After timeout, the repair path also times out → request_error or timeout
        expect(result.status).toMatch(/^(timeout|request_error|parse_error)$/);
      },
      15_000
    );
  });

  describe("abort signal", () => {
    it("returns timeout immediately when signal already aborted", async () => {
      const controller = new AbortController();
      controller.abort();

      const result = await generateStructured({
        config: { schema: testSchema },
        provider: mock.provider,
        systemPrompt: defaultSystemPrompt,
        userPrompt: defaultUserPrompt,
        abortSignal: controller.signal,
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe("timeout");
      expect(mock.generateObject).not.toHaveBeenCalled();
    });

    it("handles signal aborted during request", async () => {
      const controller = new AbortController();

      mock.generateObject.mockImplementation(
        (opts: { abortSignal?: AbortSignal }) => {
          setTimeout(() => controller.abort(), 10);
          return hangingPromise(opts.abortSignal);
        }
      );
      mock.generateText.mockResolvedValue({
        text: "fallback",
      });

      const result = await generateStructured({
        config: { schema: testSchema, timeoutMs: 5000, repairStrategy: "lenient" },
        provider: mock.provider,
        systemPrompt: defaultSystemPrompt,
        userPrompt: defaultUserPrompt,
        abortSignal: controller.signal,
      });

      expect(result.success).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("returns parse_error when text response has no JSON", async () => {
      mock.generateObject.mockRejectedValue(new Error("fail"));
      mock.generateText.mockResolvedValue({
        text: "This is just plain text with no JSON at all",
      });

      const result = await generateStructured({
        config: { schema: testSchema, repairStrategy: "lenient" },
        provider: mock.provider,
        systemPrompt: defaultSystemPrompt,
        userPrompt: defaultUserPrompt,
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe("parse_error");
    });

    it("handles JSON array in text response", async () => {
      const arraySchema = z.array(z.string());
      mock.generateObject.mockRejectedValue(new Error("fail"));
      mock.generateText.mockResolvedValue({
        text: '["a", "b", "c"]',
      });

      const result = await generateStructured({
        config: { schema: arraySchema, repairStrategy: "lenient" },
        provider: mock.provider,
        systemPrompt: defaultSystemPrompt,
        userPrompt: defaultUserPrompt,
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(["a", "b", "c"]);
    });

    it("returns failure when both generateObject and generateText fail", async () => {
      mock.generateObject.mockRejectedValue(new Error("object error"));
      mock.generateText.mockRejectedValue(new Error("text error"));

      const result = await generateStructured({
        config: { schema: testSchema, repairStrategy: "lenient" },
        provider: mock.provider,
        systemPrompt: defaultSystemPrompt,
        userPrompt: defaultUserPrompt,
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe("request_error");
    });

    it("repair attempt usage overrides original usage", async () => {
      mock.generateObject.mockResolvedValue({
        object: { wrong: "data" },
        usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
      });
      mock.generateText.mockResolvedValue({
        text: JSON.stringify(validData),
        usage: { inputTokens: 50, outputTokens: 25, totalTokens: 75 },
      });

      const result = await generateStructured({
        config: { schema: testSchema, repairStrategy: "lenient" },
        provider: mock.provider,
        systemPrompt: defaultSystemPrompt,
        userPrompt: defaultUserPrompt,
      });

      expect(result.success).toBe(true);
      expect(result.usage).toEqual({
        inputTokens: 50,
        outputTokens: 25,
        totalTokens: 75,
      });
    });
  });
});

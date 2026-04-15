import { describe, expect, it, beforeEach, vi } from "vitest";

const aiMocks = vi.hoisted(() => ({
  streamTextMock: vi.fn(),
  convertToModelMessagesMock: vi.fn(async messages => messages),
}));

vi.mock("ai", () => ({
  streamText: aiMocks.streamTextMock,
  convertToModelMessages: aiMocks.convertToModelMessagesMock,
}));

import {
  streamLLMResponse,
  streamLLMWithFailover,
  streamAnswerWithFallback,
  streamMockFallback,
  streamCachedResponse,
  writeSourceSnippets,
} from "./stream-helpers.js";

type WrittenChunk = { type?: string } & Record<string, unknown>;

function createWriter() {
  return {
    writes: [] as WrittenChunk[],
    write(chunk: WrittenChunk) {
      this.writes.push(chunk);
    },
    merge: vi.fn(),
  };
}

function createStreamResult(text = "tool-enabled") {
  return {
    toUIMessageStream: vi.fn(() => ({ mocked: true })),
    consumeStream: vi.fn(async () => {}),
    text: Promise.resolve(text),
    usage: Promise.resolve({ inputTokens: 2, outputTokens: 3, totalTokens: 5 }),
  };
}

function createToolOnlyStreamResult() {
  return {
    toUIMessageStream: vi.fn(() => ({ mocked: true })),
    consumeStream: vi.fn(async () => {}),
    text: Promise.resolve(""),
    usage: Promise.resolve({ inputTokens: 2, outputTokens: 0, totalTokens: 2 }),
    steps: [{ toolCalls: [{ toolName: "toggleTheme" }] }],
  };
}

function createAdapter(id = "openai-test") {
  return {
    id,
    model: "test-model",
    getProvider: () => ({
      chatModel: (modelId: string) => ({ provider: id, modelId }),
    }),
    recordSuccess: vi.fn(),
    recordFailure: vi.fn(),
  };
}

beforeEach(() => {
  aiMocks.streamTextMock.mockReset();
  aiMocks.convertToModelMessagesMock.mockClear();
});

describe("streamLLMResponse", () => {
  it("forwards tools to ai.streamText", async () => {
    const writer = createWriter();
    const adapter = createAdapter();
    const tools = {
      searchArticles: {
        description: "Search articles",
        inputSchema: { type: "object" },
        execute: vi.fn(),
      },
    };

    aiMocks.streamTextMock.mockReturnValue(createStreamResult());

    const result = await streamLLMResponse({
      writer: writer as never,
      adapter: adapter as never,
      systemPrompt: "system",
      messages: [],
      lang: "en",
      tools: tools as never,
    });

    expect(result.success).toBe(true);
    expect(aiMocks.streamTextMock).toHaveBeenCalledTimes(1);
    expect(aiMocks.streamTextMock.mock.calls[0]?.[0]).toMatchObject({
      system: "system",
      tools,
    });
    expect(adapter.recordSuccess).toHaveBeenCalledTimes(1);
  });

  it("treats tool-only turns as successful without no-output fallback", async () => {
    const writer = createWriter();
    const adapter = createAdapter();
    const tools = {
      toggleTheme: {
        description: "Toggle theme",
        inputSchema: { type: "object" },
      },
    };

    aiMocks.streamTextMock.mockReturnValue(createToolOnlyStreamResult());

    const result = await streamLLMResponse({
      writer: writer as never,
      adapter: adapter as never,
      systemPrompt: "system",
      messages: [],
      lang: "zh",
      tools: tools as never,
    });

    expect(result.success).toBe(true);
    expect(result.hadToolCalls).toBe(true);
    expect(adapter.recordSuccess).toHaveBeenCalledTimes(1);
    expect(
      writer.writes.some(
        chunk =>
          chunk.type === "text-delta" && String(chunk.delta).includes("抱歉")
      )
    ).toBe(false);
  });
});

describe("streamLLMResponse — stream error path", () => {
  it("does NOT write error text chunk or finish when stream has errors", async () => {
    const writer = createWriter();
    const adapter = createAdapter("failing-adapter");

    // Stream result that simulates stream-level errors
    const failingStreamResult = {
      toUIMessageStream: vi.fn(() => ({ mocked: true })),
      consumeStream: vi.fn(async ({ onError }: { onError: (e: unknown) => void }) => {
        onError(new Error("stream timeout"));
      }),
      text: Promise.resolve("partial text"),
      usage: Promise.resolve({ inputTokens: 2, outputTokens: 3, totalTokens: 5 }),
    };

    aiMocks.streamTextMock.mockReturnValue(failingStreamResult);

    const result = await streamLLMResponse({
      writer: writer as never,
      adapter: adapter as never,
      systemPrompt: "system",
      messages: [],
      lang: "zh",
    });

    expect(result.success).toBe(false);
    expect(adapter.recordFailure).toHaveBeenCalledTimes(1);

    // Critical: no error text chunk or finish event should be written
    const textDeltas = writer.writes.filter(
      chunk => chunk.type === "text-delta"
    );
    expect(textDeltas.length).toBe(0);

    const finishEvents = writer.writes.filter(
      chunk => chunk.type === "finish"
    );
    expect(finishEvents.length).toBe(0);
  });
});

describe("streamLLMWithFailover", () => {
  it("keeps tools when delegating to failover attempts", async () => {
    const writer = createWriter();
    const firstAdapter = createAdapter("first");
    const tools = {
      searchArticles: {
        description: "Search articles",
        inputSchema: { type: "object" },
        execute: vi.fn(),
      },
    };

    aiMocks.streamTextMock.mockReturnValue(createStreamResult("ok"));

    const result = await streamLLMWithFailover({
      writer: writer as never,
      adapters: [firstAdapter as never],
      systemPrompt: "system",
      messages: [],
      lang: "en",
      tools: tools as never,
    });

    expect(result.adapter).toBe(firstAdapter);
    expect(aiMocks.streamTextMock).toHaveBeenCalledTimes(1);
    expect(aiMocks.streamTextMock.mock.calls[0]?.[0]).toMatchObject({ tools });
  });

  it("first adapter fails with stream errors, second succeeds — no error text in writer", async () => {
    const writer = createWriter();
    const firstAdapter = createAdapter("first-fail");
    const secondAdapter = createAdapter("second-ok");

    // First adapter: stream produces errors
    const failingStreamResult = {
      toUIMessageStream: vi.fn(() => ({ mocked: true })),
      consumeStream: vi.fn(async ({ onError }: { onError: (e: unknown) => void }) => {
        onError(new Error("stream timeout from first"));
      }),
      text: Promise.resolve("partial from first"),
      usage: Promise.resolve({ inputTokens: 1, outputTokens: 2, totalTokens: 3 }),
    };

    // Second adapter: succeeds
    const successStreamResult = {
      toUIMessageStream: vi.fn(() => ({ mocked: true })),
      consumeStream: vi.fn(async () => {}),
      text: Promise.resolve("real answer from second"),
      usage: Promise.resolve({ inputTokens: 5, outputTokens: 10, totalTokens: 15 }),
    };

    aiMocks.streamTextMock
      .mockReturnValueOnce(failingStreamResult)
      .mockReturnValueOnce(successStreamResult);

    const result = await streamLLMWithFailover({
      writer: writer as never,
      adapters: [firstAdapter as never, secondAdapter as never],
      systemPrompt: "system",
      messages: [],
      lang: "zh",
    });

    // Second adapter should be the winner
    expect(result.success).toBe(true);
    expect(result.adapter).toBe(secondAdapter);
    expect(result.responseText).toBe("real answer from second");

    // First adapter recorded a failure
    expect(firstAdapter.recordFailure).toHaveBeenCalledTimes(1);
    // Second adapter recorded a success
    expect(secondAdapter.recordSuccess).toHaveBeenCalledTimes(1);

    // Critical: no error text-delta should have been written
    const errorTextDeltas = writer.writes.filter(
      chunk => chunk.type === "text-delta" && String(chunk.delta).includes("抱歉")
    );
    expect(errorTextDeltas.length).toBe(0);
  });

  it("first adapter throws, second succeeds — returns second adapter result", async () => {
    const writer = createWriter();
    const firstAdapter = createAdapter("first-throw");
    const secondAdapter = createAdapter("second-ok");

    // First adapter: throws outright (caught by catch block)
    aiMocks.streamTextMock
      .mockImplementationOnce(() => {
        throw new Error("connection refused");
      })
      .mockReturnValueOnce(createStreamResult("answer from second"));

    const result = await streamLLMWithFailover({
      writer: writer as never,
      adapters: [firstAdapter as never, secondAdapter as never],
      systemPrompt: "system",
      messages: [],
      lang: "en",
    });

    expect(result.success).toBe(true);
    expect(result.adapter).toBe(secondAdapter);
    expect(result.responseText).toBe("answer from second");
  });
});

describe("streamAnswerWithFallback", () => {
  it("falls back to mock when no adapter succeeds", async () => {
    const writer = createWriter();

    const result = await streamAnswerWithFallback({
      writer: writer as never,
      adapters: [],
      systemPrompt: "system",
      messages: [],
      question: "hello",
      lang: "en",
    });

    expect(result.usedMockFallback).toBe(true);
    expect(result.adapter).toBeNull();
    expect(result.responseText.length).toBeGreaterThan(0);
    expect(writer.writes.some(chunk => chunk.type === "finish")).toBe(true);
  });

  it("does NOT use mock fallback when first adapter fails but second succeeds", async () => {
    const writer = createWriter();
    const firstAdapter = createAdapter("first-fail");
    const secondAdapter = createAdapter("second-ok");

    // First adapter: stream errors
    const failingStreamResult = {
      toUIMessageStream: vi.fn(() => ({ mocked: true })),
      consumeStream: vi.fn(async ({ onError }: { onError: (e: unknown) => void }) => {
        onError(new Error("stream error"));
      }),
      text: Promise.resolve("partial"),
      usage: Promise.resolve({ inputTokens: 1, outputTokens: 1, totalTokens: 2 }),
    };

    // Second adapter: succeeds
    const successStreamResult = {
      toUIMessageStream: vi.fn(() => ({ mocked: true })),
      consumeStream: vi.fn(async () => {}),
      text: Promise.resolve("real answer"),
      usage: Promise.resolve({ inputTokens: 3, outputTokens: 5, totalTokens: 8 }),
    };

    aiMocks.streamTextMock
      .mockReturnValueOnce(failingStreamResult)
      .mockReturnValueOnce(successStreamResult);

    const result = await streamAnswerWithFallback({
      writer: writer as never,
      adapters: [firstAdapter as never, secondAdapter as never],
      systemPrompt: "system",
      messages: [],
      question: "hello",
      lang: "en",
    });

    // Should use the real answer, NOT mock fallback
    expect(result.usedMockFallback).toBe(false);
    expect(result.adapter).toBe(secondAdapter);
    expect(result.responseText).toBe("real answer");
  });
});

describe("streamMockFallback", () => {
  it("emits metadata, text, and finish through the shared helper", async () => {
    const writer = createWriter();

    const response = await streamMockFallback(writer as never, "hello", "en");

    expect(typeof response).toBe("string");
    expect(response.length).toBeGreaterThan(0);
    expect(writer.writes.some(chunk => chunk.type === "message-metadata")).toBe(
      true
    );
    expect(writer.writes.some(chunk => chunk.type === "text-start")).toBe(true);
    expect(writer.writes.some(chunk => chunk.type === "text-delta")).toBe(true);
    expect(writer.writes.some(chunk => chunk.type === "text-end")).toBe(true);
    expect(writer.writes.some(chunk => chunk.type === "finish")).toBe(true);
  });
});

describe("streamCachedResponse", () => {
  it("emits cached source selections without article fallback", async () => {
    const writer = createWriter();

    await streamCachedResponse(
      writer as never,
      {
        query: "deploy",
        response: "cached answer",
        articles: [
          {
            title: "Raw Article",
            url: "/raw",
            keyPoints: [],
            categories: [],
            dateTime: Date.now(),
          },
        ],
        projects: [],
        sources: [
          {
            title: "Final Source",
            url: "/final",
            reason: "cache",
          },
        ],
        lang: "zh",
        updatedAt: Date.now(),
      },
      {
        enabled: true,
        defaultTtl: 3600,
        playbackDelayMs: 0,
        chunkSize: 50,
        thinkingPlaybackDelayMs: 0,
      },
      "zh"
    );

    const sourceTitles = writer.writes
      .filter(chunk => chunk.type === "source-url")
      .map(chunk => String(chunk.title));

    expect(sourceTitles).toContain("Final Source");
    expect(sourceTitles).not.toContain("Raw Article");
  });

  it("emits snippet data parts for cached chunk sources", async () => {
    const writer = createWriter();

    await streamCachedResponse(
      writer as never,
      {
        query: "useChat onToolCall",
        response: "cached answer",
        articles: [],
        projects: [],
        sources: [
          {
            title: "Final Source",
            url: "/final",
            reason: "chunk",
            heading: "Chat Hooks",
            snippet: "useChat 的配置中还包含 onToolCall。",
          },
        ],
        lang: "zh",
        updatedAt: Date.now(),
      },
      {
        enabled: true,
        defaultTtl: 3600,
        playbackDelayMs: 0,
        chunkSize: 50,
        thinkingPlaybackDelayMs: 0,
      },
      "zh"
    );

    expect(
      writer.writes.some(chunk => chunk.type === "data-source-snippet")
    ).toBe(true);
  });
});

describe("writeSourceSnippets", () => {
  it("writes structured snippet data for source cards", () => {
    const writer = createWriter();

    writeSourceSnippets(writer as never, [
      {
        title: "Snippet Source",
        url: "/snippet",
        heading: "Chat Hooks",
        snippet: "useChat 的配置中还包含 onToolCall。",
        matchTerms: ["useChat", "onToolCall"],
      },
    ]);

    const snippetChunk = writer.writes.find(
      chunk => chunk.type === "data-source-snippet"
    );
    expect(snippetChunk).toBeTruthy();
    expect(
      (snippetChunk as { data?: { heading?: string } }).data?.heading
    ).toBe("Chat Hooks");
  });
});

import { describe, expect, it } from "vitest";
import {
  computeChunkRelevance,
  expandChunkMatchesWithNeighbors,
  selectRelevantChunks,
  type ArticleChunk,
  type ArticleWithChunks,
} from "./hybrid-search.js";
import { tokenize } from "../utils/text.js";
import { extractCodeAnchors } from "../utils/text.js";

function createChunk(overrides: Partial<ArticleChunk> = {}): ArticleChunk {
  return {
    id: "chunk-1",
    postId: "post-1",
    heading: "Deployment Guide",
    content: "",
    position: 0,
    tokenCount: 40,
    headers: { H1: "Deployment Guide" },
    ...overrides,
  };
}

function createArticle(
  chunk: ArticleChunk,
  overrides: Partial<ArticleWithChunks> = {}
): ArticleWithChunks {
  return {
    id: chunk.postId,
    title: "Cloudflare Deployment Notes",
    url: "/posts/cloudflare-deployment",
    lang: "en",
    summary: "How to deploy to Cloudflare Pages.",
    keyPoints: ["deployment", "cloudflare"],
    categories: ["Deployment"],
    dateTime: 0,
    chunks: [chunk],
    ...overrides,
  };
}

describe("computeChunkRelevance", () => {
  it("strongly boosts exact quoted sentence matches from chunk content", () => {
    const quotedSentence =
      "Use `pnpm build` before `pnpm deploy` to ensure Cloudflare Pages receives the latest assets.";
    const matchingChunk = createChunk({
      id: "matching-chunk",
      content: `${quotedSentence}\n\nThen verify the build output before deployment.`,
    });
    const similarChunk = createChunk({
      id: "similar-chunk",
      content:
        "Deploy to Cloudflare Pages after validating your assets and generated output.",
    });
    const article = createArticle(matchingChunk);
    const queryTokens = tokenize(`请解释这句话："${quotedSentence}"`);

    const exactScore = computeChunkRelevance(
      queryTokens,
      matchingChunk,
      article,
      {
        rawQuery: `请解释这句话："${quotedSentence}"`,
      }
    );
    const similarScore = computeChunkRelevance(
      queryTokens,
      similarChunk,
      article,
      {
        rawQuery: `请解释这句话："${quotedSentence}"`,
      }
    );

    expect(exactScore).toBeGreaterThan(similarScore);
    expect(exactScore).toBeGreaterThan(4);
  });

  it("matches normalized phrases even when punctuation differs", () => {
    const chunk = createChunk({
      content:
        "Use pnpm build before pnpm deploy to ensure Cloudflare Pages receives the latest assets",
    });
    const article = createArticle(chunk);
    const rawQuery =
      "Use `pnpm build` before `pnpm deploy` to ensure Cloudflare Pages receives the latest assets.";

    const score = computeChunkRelevance(tokenize(rawQuery), chunk, article, {
      rawQuery,
    });

    expect(score).toBeGreaterThan(4);
  });

  it("strongly boosts leading intro chunks that begin with the quoted text", () => {
    const rawQuery =
      '请解释这句话："astro-minimax 内置 AI 聊天助手，支持多 Provider 自动故障转移、RAG 检索增强、流式响应和 Mock 降级。"';
    const chunk = createChunk({
      heading: "",
      content:
        "astro-minimax 内置 AI 聊天助手，支持多 Provider 自动故障转移、RAG 检索增强、流式响应和 Mock 降级。本文介绍完整的 AI 配置流程。",
    });
    const article = createArticle(chunk, {
      id: "ai-guide",
      title: "AI 聊天功能配置指南",
      url: "/posts/ai-guide",
    });

    const score = computeChunkRelevance(tokenize(rawQuery), chunk, article, {
      rawQuery,
    });

    expect(score).toBeGreaterThan(7.5);
  });

  it("strongly boosts exact code-anchor matches in chunk content", () => {
    const chunk = createChunk({
      heading: "Chat Hooks",
      content:
        "The ChatPanel config uses useChat with onToolCall and addToolOutput for client-side actions.",
    });
    const article = createArticle(chunk, {
      title: "ChatPanel Deep Dive",
      keyPoints: ["useChat", "tool actions"],
    });
    const rawQuery = "当前 useChat 配置还加入了 onToolCall 后面的内容是什么";

    const score = computeChunkRelevance(tokenize(rawQuery), chunk, article, {
      rawQuery,
      rawAnchors: extractCodeAnchors(rawQuery),
    });

    expect(score).toBeGreaterThan(5);
  });
});

describe("selectRelevantChunks", () => {
  it("prioritizes the current article chunk containing the quoted sentence", () => {
    const quotedSentence =
      "Use `pnpm build` before `pnpm deploy` to ensure Cloudflare Pages receives the latest assets.";
    const matchingChunk = createChunk({
      id: "matching-chunk",
      content: `${quotedSentence}\n\nThen verify the build output before deployment.`,
    });
    const genericChunk = createChunk({
      id: "generic-chunk",
      postId: "post-2",
      heading: "Deployment Overview",
      content:
        "Cloudflare Pages deployment involves build validation, assets, and publishing steps.",
    });

    const matches = selectRelevantChunks(
      `我复制原文问你：${quotedSentence}`,
      [
        createArticle(genericChunk, {
          id: "post-2",
          title: "Generic Deployment Overview",
          url: "/posts/generic-deployment",
          chunks: [genericChunk],
        }),
        createArticle(matchingChunk),
      ],
      { minChunkScore: 0.2, maxChunksPerArticle: 2 }
    );

    expect(matches[0]?.chunk.id).toBe("matching-chunk");
  });

  it("prefers chunks with exact code anchors over generic config chunks", () => {
    const genericChunk = createChunk({
      id: "generic-config",
      heading: "Provider 配置",
      content: "这里介绍 provider 配置、缓存配置和响应错误处理。",
    });
    const anchorChunk = createChunk({
      id: "chat-hooks",
      postId: "post-2",
      heading: "ChatPanel hooks",
      content:
        "useChat 的配置中还包含 onToolCall，用来处理客户端动作并回传 addToolOutput。",
    });

    const matches = selectRelevantChunks(
      "当前 useChat 配置还加入了 onToolCall 后面的内容是什么",
      [
        createArticle(genericChunk, {
          title: "AI 模块技术架构详解",
          url: "/posts/ai-module-architecture",
          keyPoints: ["provider 配置", "缓存配置"],
          categories: ["AI"],
          chunks: [genericChunk],
        }),
        createArticle(anchorChunk, {
          id: "post-2",
          title: "设置面板与偏好设置",
          url: "/posts/settings-panel",
          keyPoints: ["useChat", "onToolCall"],
          categories: ["UI"],
          chunks: [anchorChunk],
        }),
      ],
      {
        minChunkScore: 0.2,
        maxChunksPerArticle: 2,
        rawAnchors: ["useChat", "onToolCall"],
      }
    );

    expect(matches[0]?.chunk.id).toBe("chat-hooks");
  });

  it("keeps only anchor-bearing neighbors when raw anchors are provided", () => {
    const anchorChunk = createChunk({
      id: "anchor",
      heading: "Chat hooks",
      content: "useChat 的配置中包含 onToolCall。",
      position: 1,
    });
    const unrelatedPrev = createChunk({
      id: "prev",
      heading: "Provider 配置",
      content: "这里介绍 provider 配置。",
      position: 0,
    });
    const matchingNext = createChunk({
      id: "next",
      heading: "Tool actions",
      content: "onToolCall 会调用 addToolOutput 回传客户端执行结果。",
      position: 2,
    });
    const article = createArticle(anchorChunk, {
      chunks: [unrelatedPrev, anchorChunk, matchingNext],
    });

    const expanded = expandChunkMatchesWithNeighbors(
      [{ article, chunk: anchorChunk, score: 10 }],
      {
        includePrevious: true,
        includeNext: true,
        rawAnchors: ["useChat", "onToolCall"],
      }
    );

    expect(expanded.map(match => match.chunk.id)).toEqual(["anchor", "next"]);
  });
});

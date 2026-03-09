/**
 * 通用 AI Provider 抽象层
 *
 * 统一管理所有 AI API 调用，支持多种 provider 和自定义端点。
 * 工具脚本不应直接调用任何 AI API，而是通过此模块调用。
 *
 * 配置方式（环境变量）:
 *   AI_PROVIDER     — 使用的 provider: "openai" | "anthropic" | "custom" (默认 "openai")
 *   AI_API_KEY      — API Key（也兼容 OPENAI_API_KEY / ANTHROPIC_API_KEY）
 *   AI_BASE_URL     — 自定义 API 基础 URL（用于兼容 OpenAI 接口的第三方服务）
 *   AI_MODEL        — 默认模型名称
 */

export type AIProvider = "openai" | "anthropic" | "custom";

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  model?: string;
  maxTokens?: number;
  responseFormat?: "text" | "json";
}

export interface EmbeddingOptions {
  model?: string;
  batchSize?: number;
}

export interface ImageOptions {
  model?: string;
  size?: string;
  quality?: string;
}

function resolveConfig(): AIConfig {
  const provider = (process.env.AI_PROVIDER || "openai") as AIProvider;
  const apiKey =
    process.env.AI_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    "";
  const baseUrl =
    process.env.AI_BASE_URL ||
    (provider === "anthropic"
      ? "https://api.anthropic.com"
      : "https://api.openai.com");
  const model = process.env.AI_MODEL || "gpt-4o-mini";

  return { provider, apiKey, baseUrl, model };
}

export function getConfig(): AIConfig {
  return resolveConfig();
}

export function hasAPIKey(): boolean {
  const cfg = resolveConfig();
  return cfg.apiKey.length > 0;
}

export async function chatCompletion(
  messages: ChatMessage[],
  options?: ChatOptions
): Promise<string> {
  const cfg = resolveConfig();
  if (!cfg.apiKey) {
    throw new Error(
      "AI API Key 未设置。请设置 AI_API_KEY 或 OPENAI_API_KEY 环境变量。"
    );
  }

  const model = options?.model || cfg.model;
  const maxTokens = options?.maxTokens || 1024;

  const url = `${cfg.baseUrl}/v1/chat/completions`;
  const body: Record<string, unknown> = {
    model,
    messages,
    max_tokens: maxTokens,
  };

  if (options?.responseFormat === "json") {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AI API 错误 (${response.status}): ${errText}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };

  return data.choices?.[0]?.message?.content?.trim() || "";
}

export async function generateEmbeddings(
  texts: string[],
  options?: EmbeddingOptions
): Promise<number[][]> {
  const cfg = resolveConfig();
  if (!cfg.apiKey) {
    throw new Error("AI API Key 未设置。");
  }

  const model = options?.model || "text-embedding-3-small";
  const batchSize = options?.batchSize || 20;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize).map(t => t.slice(0, 8000));

    const response = await fetch(`${cfg.baseUrl}/v1/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({ model, input: batch }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Embeddings API 错误 (${response.status}): ${errText}`);
    }

    const data = (await response.json()) as {
      data: { embedding: number[] }[];
    };

    allEmbeddings.push(...data.data.map(d => d.embedding));

    if (i + batchSize < texts.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  return allEmbeddings;
}

export async function generateImage(
  prompt: string,
  options?: ImageOptions
): Promise<Uint8Array> {
  const cfg = resolveConfig();
  if (!cfg.apiKey) {
    throw new Error("AI API Key 未设置。");
  }

  const model = options?.model || "dall-e-3";
  const size = options?.size || "1792x1024";
  const quality = options?.quality || "standard";

  const response = await fetch(`${cfg.baseUrl}/v1/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model,
      prompt,
      n: 1,
      size,
      quality,
      response_format: "b64_json",
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Image API 错误 (${response.status}): ${errText}`);
  }

  const result = (await response.json()) as {
    data: { b64_json: string; revised_prompt?: string }[];
  };

  if (result.data[0].revised_prompt) {
    console.log(
      `   修正后的提示词: ${result.data[0].revised_prompt.slice(0, 100)}...`
    );
  }

  return new Uint8Array(Buffer.from(result.data[0].b64_json, "base64"));
}

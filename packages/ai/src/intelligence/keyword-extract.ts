import { generateText, type LanguageModel } from "ai";
import { tokenize } from "../utils/text.js";
import type { KeywordExtractionResult, QueryComplexity } from "./types.js";
import { TIMEOUTS } from "../constants.js";
import { classifyQueryComplexity } from "./request-interpretation.js";
import { getMessageText } from "../server/chat-message-utils.js";
import { createLogger } from "../utils/logger.js";

const log = createLogger("keyword-extract");

export const KEYWORD_EXTRACTION_TIMEOUT_MS = TIMEOUTS.KEYWORD_EXTRACTION;

/**
 * Determines whether to run LLM-based keyword extraction.
 * Skips extraction for simple single-turn queries with a clear local query.
 */
export function shouldRunKeywordExtraction(params: {
  messageCount: number;
  localQuery: string;
  latestText: string;
}): boolean {
  const { messageCount, localQuery, latestText } = params;
  // Only extract for multi-turn conversations or ambiguous short messages
  if (messageCount < 3) return false;
  if (latestText.length < 10) return false;
  // If the local query is already clear (multiple tokens), skip LLM
  const tokens = tokenize(localQuery || latestText);
  if (tokens.length >= 3) return false;
  return true;
}

/**
 * Extracts optimized search keywords from the conversation using LLM.
 * Falls back to local tokenization if LLM call fails or times out.
 */
export async function extractSearchKeywords(params: {
  messages: Array<{
    role: string;
    parts?: Array<{ type: string; text?: string }>;
    content?: string;
  }>;
  provider: { chatModel: (model: string) => LanguageModel };
  model: string;
  abortSignal?: AbortSignal;
}): Promise<KeywordExtractionResult> {
  const { messages, provider, model, abortSignal } = params;

  const latestMessage = messages[messages.length - 1];
  const latestText = getMessageText(latestMessage);
  const complexity = classifyQueryComplexity(latestText);

  const conversationText = messages
    .slice(-6) // Last 3 turns
    .map(m => `${m.role}: ${getMessageText(m)}`)
    .join("\n");

  const prompt = `你是一个搜索关键词提取助手。分析以下对话，提取最佳搜索关键词。

对话:
${conversationText}

请提取：
1. 主查询词（最重要的1-2个关键词，用空格分隔）
2. 补充查询词（可选的辅助关键词）

仅返回JSON格式，不要其他内容：
{"query": "主查询词", "primaryQuery": "核心词"}`;

  try {
    const result = await generateText({
      model: provider.chatModel(model),
      prompt,
      maxOutputTokens: 100,
      temperature: 0,
      abortSignal,
    });

    const rawText = result.text?.trim() ?? "";

    // Try to parse JSON response
    const jsonMatch = rawText.match(/\{[^}]+\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]) as {
          query?: string;
          primaryQuery?: string;
        };
        const query = (parsed.query ?? "").trim();
        const primaryQuery = (parsed.primaryQuery ?? query).trim();
        if (query) {
          const u = result.usage;
          return {
            query,
            primaryQuery,
            complexity,
            usedFallback: false,
            usage: u
              ? {
                  inputTokens: u.inputTokens ?? 0,
                  outputTokens: u.outputTokens ?? 0,
                  totalTokens: (u.inputTokens ?? 0) + (u.outputTokens ?? 0),
                }
              : undefined,
          };
        }
      } catch (e) {
        log.debug(
          "Keyword JSON parse failed:",
          e instanceof Error ? e.message : String(e)
        );
      }
    }

    return buildFallback(latestText, complexity, "json_parse_failed");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return buildFallback(latestText, complexity, message);
  }
}

function buildFallback(
  latestText: string,
  complexity: QueryComplexity,
  error: string
): KeywordExtractionResult {
  const tokens = tokenize(latestText);
  const query = tokens.slice(0, 3).join(" ") || latestText.slice(0, 30);
  return { query, primaryQuery: query, complexity, usedFallback: true, error };
}

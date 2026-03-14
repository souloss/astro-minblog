import { generateText } from 'ai';
import { tokenize } from '../search/search-utils.js';
import type { KeywordExtractionResult, QueryComplexity } from './types.js';

export const KEYWORD_EXTRACTION_TIMEOUT_MS = 5000;

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
 * Classifies the complexity of the user's query.
 */
function classifyComplexity(text: string): QueryComplexity {
  const tokens = tokenize(text);
  if (tokens.length <= 1 || text.length <= 10) return 'simple';
  if (tokens.length >= 5 || text.length > 80) return 'complex';
  return 'moderate';
}

/**
 * Extracts optimized search keywords from the conversation using LLM.
 * Falls back to local tokenization if LLM call fails or times out.
 */
export async function extractSearchKeywords(params: {
  messages: Array<{ role: string; parts?: Array<{ type: string; text?: string }>; content?: string }>;
  provider: { chatModel: (model: string) => unknown };
  model: string;
  abortSignal?: AbortSignal;
}): Promise<KeywordExtractionResult> {
  const { messages, provider, model, abortSignal } = params;

  const latestMessage = messages[messages.length - 1];
  const latestText = getMessageText(latestMessage);
  const complexity = classifyComplexity(latestText);

  const conversationText = messages
    .slice(-6) // Last 3 turns
    .map(m => `${m.role}: ${getMessageText(m)}`)
    .join('\n');

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      model: (provider as any).chatModel(model),
      prompt,
      maxOutputTokens: 100,
      temperature: 0,
      abortSignal,
    });

    const rawText = result.text?.trim() ?? '';

    // Try to parse JSON response
    const jsonMatch = rawText.match(/\{[^}]+\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]) as { query?: string; primaryQuery?: string };
        const query = (parsed.query ?? '').trim();
        const primaryQuery = (parsed.primaryQuery ?? query).trim();
        if (query) {
          const u = result.usage;
          return {
            query,
            primaryQuery,
            complexity,
            usedFallback: false,
            usage: u ? {
              inputTokens: u.inputTokens ?? 0,
              outputTokens: u.outputTokens ?? 0,
              totalTokens: (u.inputTokens ?? 0) + (u.outputTokens ?? 0),
            } : undefined,
          };
        }
      } catch {
        // Parse failed — fall through to fallback
      }
    }

    return buildFallback(latestText, complexity, 'json_parse_failed');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return buildFallback(latestText, complexity, message);
  }
}

function buildFallback(latestText: string, complexity: QueryComplexity, error: string): KeywordExtractionResult {
  const tokens = tokenize(latestText);
  const query = tokens.slice(0, 3).join(' ') || latestText.slice(0, 30);
  return { query, primaryQuery: query, complexity, usedFallback: true, error };
}

function getMessageText(message: { role: string; parts?: Array<{ type: string; text?: string }>; content?: string }): string {
  if (message.content && typeof message.content === 'string') return message.content;
  if (Array.isArray(message.parts)) {
    return message.parts
      .filter((p): p is { type: 'text'; text: string } => p.type === 'text' && typeof p.text === 'string')
      .map(p => p.text)
      .join('');
  }
  return '';
}

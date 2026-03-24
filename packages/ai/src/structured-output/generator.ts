/**
 * @fileoverview Core generator for structured output with fallback support.
 */

import type {
  StructuredOutputConfig,
  StructuredOutputResult,
  StructuredOutputProvider,
  GenerateStructuredOptions,
  TokenUsageStats,
  StructuredOutputStatus,
} from './types.js';

import { TIMEOUTS } from '../constants.js';

const DEFAULT_TIMEOUT_MS = TIMEOUTS.EVIDENCE_ANALYSIS;
const DEFAULT_MAX_OUTPUT_TOKENS = 500;
const DEFAULT_TEMPERATURE = 0;

function toTokenStats(usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number }): TokenUsageStats | undefined {
  if (!usage) return undefined;
  return {
    inputTokens: usage.inputTokens ?? 0,
    outputTokens: usage.outputTokens ?? 0,
    totalTokens: usage.totalTokens ?? (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0),
  };
}

function extractJsonFromText(text: string): unknown | null {
  const trimmed = text.trim();
  
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try { return JSON.parse(trimmed); } catch { /* fallthrough */ }
  }
  
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try { return JSON.parse(codeBlockMatch[1].trim()); } catch { /* fallthrough */ }
  }
  
  const jsonMatch = trimmed.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[1]); } catch { /* fallthrough */ }
  }
  
  return null;
}

function validateWithSchema<T>(data: unknown, schema: StructuredOutputConfig<T>['schema']): T | null {
  const result = schema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  return null;
}

export async function generateStructured<T>(
  options: GenerateStructuredOptions<T>
): Promise<StructuredOutputResult<T>> {
  const {
    config,
    provider,
    systemPrompt,
    userPrompt,
    abortSignal,
  } = options;

  const {
    schema,
    schemaName = 'output',
    schemaDescription,
    fallbackParser,
    repairStrategy = 'lenient',
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxOutputTokens = DEFAULT_MAX_OUTPUT_TOKENS,
    temperature = DEFAULT_TEMPERATURE,
  } = config;

  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);
  
  const abortHandler = () => timeoutController.abort();
  if (abortSignal) {
    if (abortSignal.aborted) {
      clearTimeout(timeoutId);
      return {
        data: null,
        success: false,
        status: 'timeout',
        fallbackUsed: false,
        error: 'Request already aborted',
      };
    }
    abortSignal.addEventListener('abort', abortHandler, { once: true });
  }

  let status: StructuredOutputStatus = 'request_error';
  let rawText = '';
  let usage: TokenUsageStats | undefined;

  try {
    const result = await provider.generateObject<T>({
      schema,
      schemaName,
      schemaDescription,
      systemPrompt,
      userPrompt,
      temperature,
      maxOutputTokens,
      abortSignal: timeoutController.signal,
    });

    clearTimeout(timeoutId);
    usage = toTokenStats(result.usage);
    
    const validated = validateWithSchema(result.object, schema);
    if (validated !== null) {
      return {
        data: validated,
        success: true,
        status: 'success',
        fallbackUsed: false,
        rawText: JSON.stringify(result.object),
        usage,
      };
    }

    status = 'schema_error';
    rawText = JSON.stringify(result.object);
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (timeoutController.signal.aborted || (error instanceof Error && error.name === 'AbortError')) {
      status = 'timeout';
    }
  } finally {
    if (abortSignal) {
      abortSignal.removeEventListener('abort', abortHandler);
    }
  }

  if (fallbackParser) {
    try {
      const textResult = await provider.generateText({
        systemPrompt,
        userPrompt,
        temperature,
        maxOutputTokens,
        abortSignal: timeoutController.signal,
      });

      rawText = textResult.text;
      usage = toTokenStats(textResult.usage);

      const extracted = extractJsonFromText(rawText);
      if (extracted) {
        const validated = validateWithSchema(extracted, schema);
        if (validated !== null) {
          return { data: validated, success: true, status: 'success', fallbackUsed: true, rawText, usage };
        }
        status = 'schema_error';
      } else {
        status = 'parse_error';
      }

      const fallbackData = fallbackParser(rawText);
      if (fallbackData) {
        const validated = validateWithSchema(fallbackData, schema);
        if (validated !== null) {
          return { data: validated, success: true, status: 'success_repaired', fallbackUsed: true, rawText, usage };
        }
      }
    } catch { /* fallback failed */ }
  }

  return {
    data: null,
    success: false,
    status,
    fallbackUsed: false,
    rawText,
    error: status === 'timeout' ? 'Request timed out' : `Failed to generate valid ${schemaName}`,
    usage,
  };
}
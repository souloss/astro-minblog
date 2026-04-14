import type { z } from "zod";
import type { TokenUsageStats } from "../intelligence/types.js";

export type { TokenUsageStats } from "../intelligence/types.js";

export type StructuredOutputStatus =
  | "success"
  | "success_repaired"
  | "schema_error"
  | "parse_error"
  | "request_error"
  | "timeout";

export interface StructuredOutputConfig<T> {
  schema: z.ZodSchema<T>;
  schemaName?: string;
  schemaDescription?: string;
  fallbackParser?: (rawText: string) => T | null;
  repairStrategy?: "strict" | "lenient" | "none";
  timeoutMs?: number;
  maxOutputTokens?: number;
  temperature?: number;
}

export interface RepairResult<T> {
  data: T | null;
  success: boolean;
  repairsApplied: string[];
}

export interface StructuredOutputResult<T> {
  data: T | null;
  success: boolean;
  status: StructuredOutputStatus;
  fallbackUsed: boolean;
  rawText?: string;
  error?: string;
  usage?: TokenUsageStats;
}

export interface StructuredOutputProvider {
  generateObject<T>(options: {
    schema: z.ZodSchema<T>;
    schemaName?: string;
    schemaDescription?: string;
    systemPrompt: string;
    userPrompt: string;
    temperature?: number;
    maxOutputTokens?: number;
    abortSignal?: AbortSignal;
  }): Promise<{
    object: T;
    usage?: {
      inputTokens?: number;
      outputTokens?: number;
      totalTokens?: number;
    };
  }>;

  generateText(options: {
    systemPrompt: string;
    userPrompt: string;
    temperature?: number;
    maxOutputTokens?: number;
    abortSignal?: AbortSignal;
  }): Promise<{
    text: string;
    usage?: {
      inputTokens?: number;
      outputTokens?: number;
      totalTokens?: number;
    };
  }>;
}

export interface GenerateStructuredOptions<T> {
  config: StructuredOutputConfig<T>;
  provider: StructuredOutputProvider;
  systemPrompt: string;
  userPrompt: string;
  abortSignal?: AbortSignal;
}

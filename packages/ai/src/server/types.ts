import type { UIMessage } from "ai";
import type { ProviderManagerEnv } from "../provider-manager/types.js";
import type { CacheEnv } from "../cache/types.js";

// ── Chat Context ──────────────────────────────────────────────

export interface ChatContext {
  scope: "global" | "article";
  article?: ArticleChatContext;
}

export interface ArticleChatContext {
  slug: string;
  title: string;
  categories?: string[];
  summary?: string;
  abstract?: string;
  keyPoints?: string[];
  relatedSlugs?: string[];
}

// ── Request / Response ────────────────────────────────────────

export interface ChatRequestBody {
  context?: ChatContext;
  id?: string;
  messages: UIMessage[];
  lang?: string;
}

export interface AiCacheEnv {
  AI_CACHE_ENABLED?: boolean | string;
  AI_CACHE_TTL?: number | string;
  AI_CACHE_PLAYBACK_DELAY?: number | string;
  AI_CACHE_CHUNK_SIZE?: number | string;
  AI_CACHE_THINKING_DELAY?: number | string;
}

export interface AiTimeoutEnv {
  AI_TIMEOUT_REQUEST?: number | string;
  AI_TIMEOUT_KEYWORD?: number | string;
  AI_TIMEOUT_EVIDENCE?: number | string;
  AI_TIMEOUT_LLM?: number | string;
}

export interface AiHealthEnv {
  AI_HEALTH_THRESHOLD?: number | string;
  AI_HEALTH_RECOVERY_TTL?: number | string;
}

export interface ChatHandlerEnv
  extends ProviderManagerEnv, CacheEnv, AiCacheEnv, AiTimeoutEnv, AiHealthEnv {
  SITE_AUTHOR?: string;
  SITE_URL?: string;
  SITE_LANG?: string;
  [key: string]: unknown;
}

export interface ChatHandlerOptions {
  env: ChatHandlerEnv;
  request: Request;
  waitUntil?: (promise: Promise<unknown>) => void;
}

// ── Status Metadata ───────────────────────────────────────────

export type ChatStatusStage = "search" | "answer" | "complete";

export interface ChatStatusData {
  stage: ChatStatusStage;
  message: string;
  progress: number;
  done: boolean;
  at: number;
}

export function createChatStatusData(
  partial: Omit<ChatStatusData, "done" | "at"> & { done?: boolean }
): ChatStatusData {
  return {
    ...partial,
    done: partial.done ?? partial.stage === "complete",
    at: Date.now(),
  };
}

export function isChatStatusData(value: unknown): value is ChatStatusData {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.stage === "string" &&
    typeof v.message === "string" &&
    typeof v.progress === "number"
  );
}

// ── Error Response ────────────────────────────────────────────

export interface ChatErrorResponse {
  error: string;
  code: string;
  retryable: boolean;
  retryAfter?: number;
}

// ── Metadata Initialization ───────────────────────────────────

export interface MetadataConfig {
  knowledgeBundle: unknown;
  siteUrl?: string;
}

export interface NotifyArticleRef {
  title: string;
  url?: string;
}

export interface NotifyModelInfo {
  name: string;
  provider?: string;
  apiHost?: string;
}

export interface NotifyTokenUsage {
  total: number;
  input: number;
  output: number;
}

export interface PhaseTiming {
  total: number;
  keywordExtraction?: number;
  search?: number;
  evidenceAnalysis?: number;
  generation?: number;
}

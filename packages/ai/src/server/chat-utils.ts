import { createLogger } from "../utils/logger.js";
const log = createLogger("chat-utils");
import type { UIMessage } from "ai";
import type {
  ChatContext,
  NotifyArticleRef as ArticleRef,
  NotifyModelInfo as ModelInfo,
  NotifyTokenUsage as TokenUsage,
  PhaseTiming,
} from "./types.js";
import { notifyAiChat } from "./notify.js";
import { NOTIFICATION, TIMEOUTS, HEALTH } from "../constants.js";

export function buildArticleContextPrompt(context: ChatContext, lang?: string): string {
  if (context.scope !== "article" || !context.article) return "";

  const isEn = lang === "en";
  const a = context.article;
  // Sanitize title: strip newlines, markdown formatting, and limit length
  const sanitizedTitle = (a.title ?? "")
    .replace(/[\n\r]/g, " ")
    .replace(/[#*\[\]_~`>|]/g, "")
    .slice(0, 100);
  const articleLabel = isEn ? "[Current Article]" : "[当前阅读文章]";
  const readingLabel = isEn ? `User is reading: "${sanitizedTitle}"` : `用户正在阅读：《${sanitizedTitle}》`;
  const parts: string[] = [`\n${articleLabel}`, readingLabel];

  if (a.categories?.length) {
    const categoryLabel = isEn ? "Categories" : "分类";
    const sep = isEn ? ", " : "、";
    parts.push(`${categoryLabel}：${a.categories.join(sep)}`);
  }

  if (isEn) {
    parts.push(
      "",
      "You are accompanying the user in reading this article. Prioritize answering questions about this article's content.",
      "When the user's question relates to the current article, prefer using the article's original text passages rather than just restating the summary.",
      'If the user asks "what comes before/after", "what does this section cover", or "what follows this part", prioritize answering based on the original text passages injected from the current article.',
      "When the user wants to explore further, recommend related blog articles."
    );
  } else {
    parts.push(
      "",
      "你正在陪用户阅读这篇文章。优先围绕这篇文章的内容回答问题。",
      "当用户的问题与当前文章相关时，优先使用当前文章原文段落作答，而不是只复述摘要。",
      "如果问题是在问“前面/后面是什么”“这一节讲了什么”“这一项后续内容是什么”，默认优先依据当前文章已注入的原文段落回答。",
      "当用户想要延伸时，推荐相关的博客文章。"
    );
  }

  return parts.join("\n");
}

export interface SendNotificationArgs {
  env: Record<string, unknown>;
  messages: UIMessage[];
  responseText: string;
  relatedArticles: Array<{ title: string; url?: string }>;
  model?: ModelInfo;
  usage?: TokenUsage;
  timing: PhaseTiming;
  cacheKey?: string | null;
  waitUntil?: (promise: Promise<unknown>) => void;
}

export function sendNotification(args: SendNotificationArgs): void {
  const {
    env,
    messages,
    responseText,
    relatedArticles,
    model,
    usage,
    timing,
    cacheKey,
    waitUntil,
  } = args;

  const sessionId = cacheKey || `dev-${Date.now().toString(36)}`;
  const notifyArticles: ArticleRef[] = relatedArticles
    .slice(0, NOTIFICATION.MAX_REFERENCED_ARTICLES)
    .map(a => ({
      title: a.title,
      url: a.url,
    }));

  const notifyPromise = notifyAiChat({
    env,
    sessionId,
    messages,
    aiResponse: responseText,
    referencedArticles: notifyArticles,
    model,
    usage,
    timing,
  });

  if (waitUntil) {
    waitUntil(notifyPromise);
  } else {
    notifyPromise.catch(e => {
      log.warn("Notification failed (no waitUntil):", e instanceof Error ? e.message : String(e));
    });
  }
}

export function parseNum(val: unknown, defaultVal: number): number {
  if (val === undefined) return defaultVal;
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const num = parseInt(val, 10);
    return isNaN(num) ? defaultVal : num;
  }
  return defaultVal;
}

export function getTimeoutConfig(env: Record<string, unknown>): { request: number; keywordExtraction: number; evidenceAnalysis: number; llmStreaming: number } {
  return {
    request: parseNum(env.AI_TIMEOUT_REQUEST, TIMEOUTS.REQUEST),
    keywordExtraction: parseNum(
      env.AI_TIMEOUT_KEYWORD,
      TIMEOUTS.KEYWORD_EXTRACTION
    ),
    evidenceAnalysis: parseNum(
      env.AI_TIMEOUT_EVIDENCE,
      TIMEOUTS.EVIDENCE_ANALYSIS
    ),
    llmStreaming: parseNum(env.AI_TIMEOUT_LLM, TIMEOUTS.LLM_STREAMING),
  };
}

export function getHealthConfig(env: Record<string, unknown>): { unhealthyThreshold: number; recoveryTtl: number } {
  return {
    unhealthyThreshold: parseNum(
      env.AI_HEALTH_THRESHOLD,
      HEALTH.UNHEALTHY_THRESHOLD
    ),
    recoveryTtl: parseNum(env.AI_HEALTH_RECOVERY_TTL, HEALTH.RECOVERY_TTL),
  };
}

// ── Environment Access Helpers ──────────────────────────────

/**
 * Safely extracts a string value from an environment object.
 * Returns undefined if the value is not a string.
 */
export function envString(env: Record<string, unknown>, key: string): string | undefined {
  const val = env[key];
  return typeof val === "string" && val.length > 0 ? val : undefined;
}

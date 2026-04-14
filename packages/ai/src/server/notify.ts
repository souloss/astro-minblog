import { createLogger } from "../utils/logger.js";
const notifyLog = createLogger("notify");
import type { UIMessage } from "ai";
import type {
  NotifyArticleRef as ArticleRef,
  NotifyModelInfo as ModelInfo,
  NotifyTokenUsage as TokenUsage,
  PhaseTiming,
} from "./types.js";
import { getMessageText } from "./chat-message-utils.js";

type NotifyEnv = Record<string, unknown>;

interface NotifyResult {
  event: "comment" | "ai-chat";
  success: boolean;
  results: Array<{
    channel: "telegram" | "webhook" | "email";
    success: boolean;
    error?: string;
    duration?: number;
  }>;
}

interface RuntimeNotifier {
  aiChat(event: {
    sessionId: string;
    roundNumber: number;
    userMessage: string;
    aiResponse?: string;
    referencedArticles?: ArticleRef[];
    model?: ModelInfo;
    usage?: TokenUsage;
    timing?: PhaseTiming;
    siteUrl?: unknown;
  }): Promise<NotifyResult>;
}

interface NotifyRuntimeModule {
  createNotifier(config: NotifyRuntimeConfig): RuntimeNotifier;
  createNotifyConfigFromEnv(env: NotifyEnv): NotifyRuntimeConfig;
}

interface NotifyRuntimeConfig {
  telegram?: unknown;
  webhook?: unknown;
  email?: unknown;
}

async function loadNotifyRuntime(): Promise<NotifyRuntimeModule | null> {
  try {
    return (await import("@astro-minimax/notify")) as unknown as NotifyRuntimeModule;
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as Error & { code?: string }).code === "ERR_MODULE_NOT_FOUND"
    ) {
      return null;
    }
    throw error;
  }
}

async function createEnvNotifier(
  env: NotifyEnv
): Promise<RuntimeNotifier | null> {
  const runtime = await loadNotifyRuntime();
  if (!runtime) {
    return null;
  }

  const config = runtime.createNotifyConfigFromEnv(env);
  if (!config.telegram && !config.webhook && !config.email) {
    return null;
  }

  return runtime.createNotifier(config);
}

export interface ChatNotifyOptions {
  env: NotifyEnv;
  sessionId: string;
  messages: UIMessage[];
  aiResponse?: string;
  referencedArticles?: ArticleRef[];
  model?: ModelInfo;
  usage?: TokenUsage;
  timing?: PhaseTiming;
}

export function notifyAiChat(
  options: ChatNotifyOptions
): Promise<NotifyResult | null> {
  const {
    env,
    sessionId,
    messages,
    aiResponse,
    referencedArticles,
    model,
    usage,
    timing,
  } = options;

  return createEnvNotifier(env)
    .then(notifier => {
      if (!notifier) {
        return null;
      }

      const userMessages = messages.filter(m => m.role === "user");
      const lastUserMessage = userMessages[userMessages.length - 1];

      if (!lastUserMessage) {
        return null;
      }

      const userMessage = getMessageText(lastUserMessage);
      const roundNumber = userMessages.length;

      return notifier.aiChat({
        sessionId,
        roundNumber,
        userMessage,
        aiResponse: aiResponse?.slice(0, 500),
        referencedArticles,
        model,
        usage,
        timing,
        siteUrl: env.SITE_URL,
      });
    })
    .catch(error => {
      notifyLog.error("AI chat notification failed:", error);
      return null;
    });
}

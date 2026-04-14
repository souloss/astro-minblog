import { APICallError } from "@ai-sdk/provider";
import type { UIMessage } from "ai";
import type { ArticleChatContext } from "../../server/types.ts";
import { t, getLang } from "../../utils/i18n.ts";

// ── Quick Prompts ─────────────────────────────────────────────

const QUICK_PROMPTS_ZH = [
  t("ai.prompt.techStack", "zh"),
  t("ai.prompt.recommend", "zh"),
  t("ai.prompt.build", "zh"),
];
const QUICK_PROMPTS_EN = [
  t("ai.prompt.techStack", "en"),
  t("ai.prompt.recommend", "en"),
  t("ai.prompt.build", "en"),
];

export function getQuickPrompts(
  lang: string,
  articleContext?: ArticleChatContext
): string[] {
  const l = getLang(lang);
  if (!articleContext) return l === "zh" ? QUICK_PROMPTS_ZH : QUICK_PROMPTS_EN;

  if (l === "zh") {
    const prompts = [
      t("ai.prompt.summarize", "zh", { title: articleContext.title }),
    ];
    if (articleContext.keyPoints?.length) {
      prompts.push(
        t("ai.prompt.explain", "zh", { point: articleContext.keyPoints[0] })
      );
    }
    prompts.push(t("ai.prompt.related", "zh"));
    return prompts;
  }
  const prompts = [
    t("ai.prompt.summarize", "en", { title: articleContext.title }),
  ];
  if (articleContext.keyPoints?.length) {
    prompts.push(
      t("ai.prompt.explain", "en", { point: articleContext.keyPoints[0] })
    );
  }
  prompts.push(t("ai.prompt.related", "en"));
  return prompts;
}

// ── Welcome Message ───────────────────────────────────────────

export function buildWelcomeMessage(
  config: { welcomeMessage?: string; lang?: string },
  articleContext?: ArticleChatContext
): UIMessage {
  const lang = getLang(config.lang);

  let text: string;
  if (articleContext) {
    text =
      config.welcomeMessage ??
      t("ai.welcome.reading", lang, { title: articleContext.title });
  } else {
    text = config.welcomeMessage ?? t("ai.welcome.canHelp", lang);
  }

  return {
    id: "welcome",
    role: "assistant" as const,
    parts: [{ type: "text" as const, text }],
  };
}

// ── Error Helpers ─────────────────────────────────────────────

export function parseErrorMessage(error: Error, lang: string = "zh"): string {
  const l = getLang(lang);

  if (APICallError.isInstance(error)) {
    if (error.responseBody) {
      try {
        const parsed = JSON.parse(error.responseBody);
        if (parsed?.error) return parsed.error;
      } catch {
        /* not JSON */
      }
    }
    if (error.data && typeof error.data === "object" && "error" in error.data) {
      return String(error.data.error);
    }
  }

  try {
    const parsed = JSON.parse(error.message);
    if (parsed?.error) return parsed.error;
  } catch {
    /* not JSON */
  }

  const msg = error.message;
  if (msg.includes("Failed to fetch") || msg.includes("NetworkError"))
    return t("ai.error.network", l);
  if (msg.includes("aborted")) return t("ai.error.aborted", l);
  if (msg.includes("429") || msg.includes("rate"))
    return t("ai.error.rateLimit", l);
  if (msg.includes("503") || msg.includes("unavailable"))
    return t("ai.error.unavailable", l);
  return t("ai.error.generic", l);
}

export function isRetryable(error: Error): boolean {
  if (APICallError.isInstance(error)) {
    return error.isRetryable;
  }
  try {
    const parsed = JSON.parse(error.message);
    if (typeof parsed?.retryable === "boolean") return parsed.retryable;
  } catch {
    /* not JSON */
  }
  return true;
}

// ── Panel Size ────────────────────────────────────────────────

export type PanelSize = "S" | "M" | "L";

export const PANEL_SIZE_CONFIG: Record<
  PanelSize,
  { width: string; height: string; class: string }
> = {
  S: {
    width: "370px",
    height: "min(520px, calc(100vh - 7rem))",
    class: "w-[370px] max-w-[calc(100vw-2rem)]",
  },
  M: {
    width: "550px",
    height: "min(70vh, calc(100vh - 5rem))",
    class: "w-[550px] max-w-[calc(100vw-3rem)]",
  },
  L: { width: "80vw", height: "80vh", class: "w-[80vw] max-w-[900px]" },
};

// ── Action Labels ─────────────────────────────────────────────

export function getChatActionLabel(
  lang: string,
  type: "send" | "sending"
): string {
  const normalizedLang = getLang(lang);
  if (type === "sending") {
    return normalizedLang === "zh" ? "正在发送" : "Sending";
  }
  return normalizedLang === "zh" ? "发送消息" : "Send message";
}

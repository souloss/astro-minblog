import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { UIMessage } from "ai";
import type { ArticleChatContext } from "../server/types.js";
import { RichText } from "./RichText.js";
import { ReasoningBlock } from "./ReasoningBlock.js";
import {
  generateFollowUpSuggestions,
  FollowUpSuggestions,
} from "./CodeBlock.tsx";

import { BUILTIN_CLIENT_TOOLS } from "../tools/action-tools.js";

type ToolPartLike = {
  type: string;
  state?: string;
  input?: unknown;
  output?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getValidExternalUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.href
      : null;
  } catch {
    return null;
  }
}

function getToolOutput(
  part: ToolPartLike
): { success?: boolean; confirmation?: string } | null {
  if (!isRecord(part.output)) return null;
  return {
    success:
      typeof part.output.success === "boolean"
        ? part.output.success
        : undefined,
    confirmation:
      typeof part.output.confirmation === "string"
        ? part.output.confirmation
        : undefined,
  };
}

const ACTION_TOOL_NAMES = new Set(BUILTIN_CLIENT_TOOLS);

function isToolPart(part: unknown): part is ToolPartLike {
  return (
    typeof part === "object" &&
    part !== null &&
    "type" in part &&
    typeof (part as { type?: unknown }).type === "string" &&
    (part as { type: string }).type.startsWith("tool-")
  );
}

function getToolName(part: ToolPartLike): string {
  return part.type.slice("tool-".length);
}

function buildActionToolConfirmation(
  part: ToolPartLike,
  lang: string
): string | null {
  const toolName = getToolName(part);
  const output = getToolOutput(part);
  if (
    !ACTION_TOOL_NAMES.has(toolName) ||
    part.state !== "output-available" ||
    !output?.success
  ) {
    return null;
  }

  const input = isRecord(part.input) ? part.input : {};

  switch (toolName) {
    case "toggleTheme": {
      const theme = input.theme;
      if (theme === "dark")
        return lang === "en"
          ? "I switched to dark mode."
          : "已为你切换到暗模式。";
      if (theme === "light")
        return lang === "en"
          ? "I switched to light mode."
          : "已为你切换到亮模式。";
      return lang === "en"
        ? "I switched to system theme mode."
        : "已为你切换为跟随系统主题。";
    }
    case "toggleImmersiveMode":
      return input.enabled === false
        ? lang === "en"
          ? "I turned off immersive mode."
          : "已为你关闭沉浸模式。"
        : lang === "en"
          ? "I turned on immersive mode."
          : "已为你开启沉浸模式。";
    case "scrollToSection":
      return lang === "en"
        ? "I jumped to the requested section."
        : "已为你跳转到对应章节。";
    case "navigateToArticle":
      return lang === "en"
        ? "I opened the requested article."
        : "已为你打开相关文章。";
    case "highlightText":
      return lang === "en"
        ? "I highlighted the requested content."
        : "已为你高亮相关内容。";
    case "setPreference":
      return lang === "en"
        ? "I updated that preference."
        : "已为你更新偏好设置。";
    default:
      return output.confirmation ?? null;
  }
}

export function getActionToolConfirmations(
  message: UIMessage,
  lang: string
): string[] {
  const confirmations = (message.parts ?? [])
    .filter(isToolPart)
    .map(part => buildActionToolConfirmation(part, lang))
    .filter((text): text is string => Boolean(text));

  return Array.from(new Set(confirmations));
}

export function shouldSuppressAssistantFallbackText(
  text: string,
  confirmations: string[],
  lang: string,
  hasToolParts?: boolean
): boolean {
  if (!text.trim()) return false;

  const noOutputText =
    lang === "en"
      ? "Sorry, I could not generate a valid response. Please try rephrasing your question."
      : "抱歉，我无法生成有效的回答。请尝试换一种方式提问。";
  const demoIntroText =
    lang === "en"
      ? "Thanks for asking! I'm in Demo mode and can recommend blog articles and external resources."
      : "感谢提问！我目前在 Demo 模式下，可以推荐博客文章和外部资源。";

  const isFallbackText = text.includes(noOutputText) || text.includes(demoIntroText);
  if (!isFallbackText) return false;

  // Suppress fallback text when there are action tool confirmations
  // or when the message contains any tool parts (search, analysis, etc.)
  // whose results will provide the actual response.
  return confirmations.length > 0 || (hasToolParts ?? false);
}

// ── Typewriter Effect Hook ─────────────────────────────────────

const TYPEWRITER_SPEED_MS = 25;
const TYPEWRITER_BATCH_SIZE = 1;

export function useTypewriter(fullText: string, isStreaming: boolean): string {
  const [displayedLength, setDisplayedLength] = useState(0);
  const prevFullTextRef = useRef(fullText);
  const prevStreamingRef = useRef(isStreaming);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (
      fullText !== prevFullTextRef.current &&
      !fullText.startsWith(prevFullTextRef.current)
    ) {
      setDisplayedLength(0);
    }
    prevFullTextRef.current = fullText;
  }, [fullText]);

  useEffect(() => {
    if (!isStreaming && prevStreamingRef.current) {
      setDisplayedLength(fullText.length);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    }
    prevStreamingRef.current = isStreaming;
  }, [isStreaming, fullText.length]);

  useEffect(() => {
    if (!isStreaming) return;

    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - lastTime;

      if (elapsed >= TYPEWRITER_SPEED_MS) {
        setDisplayedLength(prev => {
          const targetLength = fullText.length;
          if (prev >= targetLength) return prev;
          const behind = targetLength - prev;
          const speed =
            behind > 20 ? Math.min(behind, 5) : TYPEWRITER_BATCH_SIZE;
          return Math.min(prev + speed, targetLength);
        });
        lastTime = currentTime;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isStreaming, fullText]);

  if (!isStreaming) return fullText;
  if (displayedLength <= 0) return "";
  if (displayedLength >= fullText.length) return fullText;

  let end = displayedLength;

  // Avoid cutting inside a code fence (```)
  const fence = fullText.indexOf("```", Math.max(0, end - 2));
  if (fence !== -1 && fence < end + 3) {
    const fenceEnd = fence + 3;
    const newline = fullText.indexOf("\n", fenceEnd);
    end = newline !== -1 ? newline + 1 : fenceEnd;
  }

  // Avoid cutting inside a markdown link [label](url).
  // Walk backwards through the displayed text to find any unclosed link
  // syntax. If the displayed text ends inside an incomplete link, truncate
  // before the opening [ so the raw syntax isn't shown as plain text.
  // This handles multiple links in the same line correctly.
  {
    const candidate = fullText.slice(0, end);
    let searchFrom = 0;
    // Scan all [ positions in the displayed portion
    while (searchFrom < end) {
      const openBracket = candidate.indexOf("[", searchFrom);
      if (openBracket === -1) break;

      // Check if this [ starts a complete Markdown link [label](url)
      // that is fully contained within the displayed portion.
      const closeBracket = fullText.indexOf("]", openBracket);
      if (closeBracket !== -1 && closeBracket < end) {
        // We have a ] within displayed range — check for ( after it
        const parenOpen = fullText.indexOf("(", closeBracket);
        if (parenOpen === closeBracket + 1) {
          const parenClose = fullText.indexOf(")", parenOpen);
          if (parenClose !== -1 && parenClose < end) {
            // This link is fully contained — skip past it
            searchFrom = parenClose + 1;
            continue;
          }
          // The ) is beyond the displayed range — incomplete link
          end = openBracket;
          break;
        }
        // No ( after ] — this [ is not a Markdown link, skip past ]
        searchFrom = closeBracket + 1;
        continue;
      }
      // The ] is beyond the displayed range — incomplete link
      end = openBracket;
      break;
    }
  }

  // Avoid cutting inside a citation syntax 【label|title|url】.
  // If the displayed text ends between 【 and 】, truncate before
  // the opening 【 so the raw syntax isn't shown as plain text.
  {
    const lastOpen = fullText.lastIndexOf("【", end);
    if (lastOpen !== -1 && lastOpen < end) {
      const closeMarker = fullText.indexOf("】", lastOpen);
      if (closeMarker === -1 || closeMarker >= end) {
        end = lastOpen;
      }
    }
  }

  return fullText.slice(0, end);
}

// ── Message Text Extractor ────────────────────────────────────

export function getTextFromMessage(message: UIMessage): string {
  const parts = message.parts ?? [];
  return Array.isArray(parts)
    ? parts
        .filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map(p => p.text)
        .join("")
    : "";
}

// ── Icons & Small Components ──────────────────────────────────

export function BotIcon({ class: cls }: { class?: string }) {
  return (
    <svg
      class={cls}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M12 8V4H8" />
      <rect width="16" height="12" x="4" y="8" rx="2" />
      <path d="M2 14h2" />
      <path d="M20 14h2" />
      <path d="M15 13v2" />
      <path d="M9 13v2" />
    </svg>
  );
}

export function BotAvatar() {
  return (
    <div class="bg-accent/15 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full shadow-sm">
      <BotIcon class="text-accent size-3" />
    </div>
  );
}

export function TypingDots({ statusMessage }: { statusMessage?: string }) {
  return (
    <div class="flex items-center gap-2">
      <span class="inline-flex gap-1">
        <span class="bg-foreground-soft size-1.5 animate-pulse rounded-full [animation-delay:0ms]" />
        <span class="bg-foreground-soft size-1.5 animate-pulse rounded-full [animation-delay:150ms]" />
        <span class="bg-foreground-soft size-1.5 animate-pulse rounded-full [animation-delay:300ms]" />
      </span>
      {statusMessage && (
        <span class="text-foreground-soft text-[11px]">{statusMessage}</span>
      )}
    </div>
  );
}

// ── Assistant Message Rendering ───────────────────────────────

type ReasoningPart = {
  type: "reasoning";
  text: string;
  state?: "streaming" | "done";
};

export function AssistantMessage({
  message,
  isStreaming,
  lang = "zh",
  articleContext,
  onFollowUp,
  showSourceSnippets = false,
}: {
  message: UIMessage;
  isStreaming?: boolean;
  lang?: string;
  articleContext?: ArticleChatContext;
  onFollowUp?: (text: string) => void;
  showSourceSnippets?: boolean;
}) {
  const fullText = getTextFromMessage(message);
  const safeParts = message.parts ?? [];
  const hasToolParts = safeParts.some(
    (p: { type: string }) => p.type.startsWith("tool-")
  );
  const actionConfirmations = useMemo(
    () => getActionToolConfirmations(message, lang),
    [message, lang]
  );
  const shouldSuppressFallbackText = useMemo(
    () =>
      shouldSuppressAssistantFallbackText(fullText, actionConfirmations, lang, hasToolParts),
    [fullText, actionConfirmations, lang, hasToolParts]
  );
  const effectiveText = shouldSuppressFallbackText
    ? actionConfirmations.join("\n")
    : (fullText.trim() ? fullText : actionConfirmations.join("\n"));
  const displayedText = useTypewriter(effectiveText, isStreaming ?? false);

  const reasoningParts = safeParts.filter(
    (p): p is ReasoningPart => p.type === "reasoning"
  );
  const reasoningFullText = reasoningParts.map(p => p.text).join("");
  const reasoningDisplayed = useTypewriter(
    reasoningFullText,
    isStreaming ?? false
  );
  const hasReasoning = reasoningFullText.length > 0;

  const isWaitingForContent = isStreaming && !fullText.trim() && !reasoningFullText;

  const allSources = safeParts.filter(
    p => p.type === "source-url" || p.type === "source-document"
  );

  // Deduplicate source-url parts: if the AI already links to the same URL
  // in its response text (Markdown links or citation syntax), don't show a
  // redundant source card below.
  const urlsInText = useMemo(() => {
    const urls = new Set<string>();
    // Match Markdown links: [label](url)
    const linkRe = /\]\((https?:\/\/[^\s)]+)\)/g;
    let m: RegExpExecArray | null;
    while ((m = linkRe.exec(effectiveText)) !== null) {
      urls.add(m[1]);
    }
    // Match citation syntax: 【label|title|url】
    const citationRe = /【[^】]*\|[^】]*\|(https?:\/\/[^】]+)】/g;
    while ((m = citationRe.exec(effectiveText)) !== null) {
      urls.add(m[1]);
    }
    return urls;
  }, [effectiveText]);

  const sources = useMemo(
    () =>
      allSources.filter(s => {
        const url = (s as { url?: string }).url;
        if (!url) return true;
        return !urlsInText.has(url);
      }),
    [allSources, urlsInText]
  );
  const sourceSnippets = safeParts.filter(
    (
      p
    ): p is {
      type: "data-source-snippet";
      data: {
        title?: string;
        url?: string;
        heading?: string;
        snippet?: string;
        matchTerms?: string[];
      };
    } =>
      p.type === "data-source-snippet" &&
      isRecord((p as { data?: unknown }).data) &&
      // Also deduplicate snippets against inline links in text
      !urlsInText.has((p as { data?: { url?: string } }).data?.url ?? "")
  );

  const followUpSuggestions = useMemo(() => {
    if (
      isStreaming ||
      !effectiveText ||
      !onFollowUp ||
      shouldSuppressFallbackText
    )
      return [];
    return generateFollowUpSuggestions(effectiveText, articleContext, lang);
  }, [
    isStreaming,
    effectiveText,
    articleContext,
    onFollowUp,
    shouldSuppressFallbackText,
    lang,
  ]);

  if (isWaitingForContent) {
    return (
      <div class="space-y-1.5">
        <ReasoningBlock text="" isStreaming={true} lang={lang} />
      </div>
    );
  }

  // Defensive: if the caller (LiveMessageList) decided to render this
  // message based on hasVisibleAssistantContent, we must always produce
  // visible output. If effectiveText and reasoning are both empty at this
  // point (e.g., during streaming before text arrives), show a loading
  // placeholder instead of returning null, which would leave an empty div
  // with a ghost BotAvatar.
  if (!effectiveText.trim() && !hasReasoning) {
    return (
      <div class="space-y-1.5">
        <ReasoningBlock text="" isStreaming={isStreaming ?? true} lang={lang} />
      </div>
    );
  }

  return (
    <div class="space-y-1.5">
      {hasReasoning && (
        <ReasoningBlock
          text={reasoningDisplayed}
          isStreaming={isStreaming}
          lang={lang}
        />
      )}
      {displayedText && (
        <RichText text={displayedText} isStreaming={isStreaming} />
      )}
      {!isStreaming && showSourceSnippets && sourceSnippets.length > 0 && (
        <div class="mt-2 space-y-2">
          <div class="text-foreground-soft text-[11px] font-medium">
            {lang === "en" ? "Relevant snippets" : "相关原文段落"}
          </div>
          <div class="space-y-2">
            {sourceSnippets.map((part, i) => {
              const data = part.data;
              const sourceUrl = getValidExternalUrl(data.url);
              const terms = Array.isArray(data.matchTerms)
                ? data.matchTerms.filter(
                    (t): t is string => typeof t === "string" && t.length > 0
                  )
                : [];
              const content = (
                <>
                  <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0">
                      <div class="text-foreground truncate text-[11px] font-medium">
                        {typeof data.title === "string" && data.title
                          ? data.title
                          : "Source"}
                      </div>
                      {typeof data.heading === "string" && data.heading && (
                        <div class="text-foreground-soft truncate text-[10px]">
                          {data.heading}
                        </div>
                      )}
                    </div>
                    {terms.length > 0 && (
                      <div class="hidden shrink-0 flex-wrap gap-1 sm:flex">
                        {terms.slice(0, 2).map((term, ti) => (
                          <span key={ti} class="bg-accent/10 text-accent rounded px-1.5 py-0.5 text-[10px]">
                            {term}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {typeof data.snippet === "string" && data.snippet && (
                    <div class="text-foreground-soft mt-1.5 text-[12px] leading-relaxed">
                      {data.snippet}
                    </div>
                  )}
                </>
              );

              return sourceUrl ? (
                <a
                  key={`snippet-${i}`}
                  href={sourceUrl}
                  class="border-border bg-muted/25 hover:border-accent/30 hover:bg-accent/5 block rounded-lg border px-3 py-2 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {content}
                </a>
              ) : (
                <div
                  key={`snippet-${i}`}
                  class="border-border bg-muted/25 block rounded-lg border px-3 py-2"
                >
                  {content}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {!isStreaming && sources.length > 0 && (
        <div class="mt-2 flex flex-wrap gap-1.5">
          {sources.map((s, i) => {
            const part = s as { url?: string; title?: string };
            const sourceUrl = getValidExternalUrl(part.url);
            const content = (
              <>
                <svg
                  class="size-2.5 opacity-50"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                {part.title ?? "Source"}
              </>
            );

            return sourceUrl ? (
              <a
                key={i}
                href={sourceUrl}
                class="border-border bg-muted/30 text-foreground-soft hover:border-accent/40 hover:text-foreground inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                {content}
              </a>
            ) : (
              <span
                key={i}
                class="border-border bg-muted/30 text-foreground-soft inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px]"
              >
                {content}
              </span>
            );
          })}
        </div>
      )}
      {!isStreaming && followUpSuggestions.length > 0 && onFollowUp && (
        <FollowUpSuggestions
          suggestions={followUpSuggestions}
          onSend={onFollowUp}
          lang={lang}
        />
      )}
    </div>
  );
}

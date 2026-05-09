import type { UIMessage } from "ai";
import type { ArticleChatContext } from "../../server/types.js";
import type { MockMessage } from "./useMockChat.js";
import { RichText } from "../RichText.js";
import { ReasoningBlock } from "../ReasoningBlock.js";
import {
  AssistantMessage,
  BotAvatar,
  TypingDots,
  getTextFromMessage,
} from "../MessageBubble.js";

interface MessageListProps {
  isMockMode: boolean;
  mockMessages: MockMessage[];
  liveMessages: UIMessage[];
  isStreaming: boolean;
  lang: string;
  articleContext?: ArticleChatContext;
  welcomeMessage: UIMessage;
  quickPrompts: string[];
  showSourceSnippets?: boolean;
  onQuickPrompt: (text: string) => void;
}

export function MessageList({
  isMockMode,
  mockMessages,
  liveMessages,
  isStreaming,
  lang,
  articleContext,
  welcomeMessage,
  quickPrompts,
  showSourceSnippets,
  onQuickPrompt,
}: MessageListProps) {
  if (isMockMode) {
    return (
      <MockMessageList
        messages={mockMessages}
        welcomeMessage={welcomeMessage}
        quickPrompts={quickPrompts}
        onQuickPrompt={onQuickPrompt}
      />
    );
  }
  return (
    <LiveMessageList
      messages={liveMessages}
      isStreaming={isStreaming}
      lang={lang}
      articleContext={articleContext}
      quickPrompts={quickPrompts}
      showSourceSnippets={showSourceSnippets}
      onQuickPrompt={onQuickPrompt}
    />
  );
}

// ── Mock Message Rendering ──────────────────────────────────────

function MockMessageList({
  messages,
  welcomeMessage,
  quickPrompts,
  onQuickPrompt,
}: {
  messages: MockMessage[];
  welcomeMessage: UIMessage;
  quickPrompts: string[];
  onQuickPrompt: (text: string) => void;
}) {
  return (
    <>
      {messages.length === 0 && (
        <div class="space-y-3">
          <div class="flex items-start gap-2.5">
            <BotAvatar />
            <p class="text-foreground min-w-0 flex-1 pt-0.5 text-[13px] leading-relaxed">
              {getTextFromMessage(welcomeMessage)}
            </p>
          </div>
          <div class="flex flex-wrap gap-1.5 pl-8">
            {quickPrompts.map(q => (
              <button
                key={q}
                type="button"
                onClick={() => onQuickPrompt(q)}
                class="border-border bg-muted/30 text-foreground-soft hover:border-accent/40 hover:bg-accent/10 hover:text-foreground rounded-full border px-3 py-1.5 text-[12px] transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}
      {messages.map(msg => (
        <div
          key={msg.id}
          class={
            msg.role === "user"
              ? "flex justify-end"
              : "flex items-start gap-2.5"
          }
        >
          {msg.role === "assistant" && <BotAvatar />}
          <div
            class={
              msg.role === "user"
                ? "bg-accent text-background max-w-[82%] rounded-2xl rounded-br-sm px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm"
                : "text-foreground min-w-0 flex-1 pt-0.5 text-[13px] leading-relaxed"
            }
          >
            {msg.text ? (
              msg.role === "assistant" ? (
                <RichText text={msg.text} isStreaming={msg.streaming} />
              ) : (
                msg.text
              )
            ) : msg.streaming ? (
              <TypingDots />
            ) : null}
          </div>
        </div>
      ))}
    </>
  );
}

// ── Live Message Rendering ──────────────────────────────────────

/**
 * Determines whether to show the waiting placeholder (BotAvatar + ReasoningBlock).
 * Only shown when streaming and no assistant message exists yet — the AI SDK
 * hasn't created the first assistant message.
 */
export function shouldShowWaitingPlaceholder(
  messages: UIMessage[],
  isStreaming: boolean
): boolean {
  const lastMessage = messages[messages.length - 1];
  return (
    isStreaming &&
    lastMessage?.role === "user" &&
    !messages.some(m => m.role === "assistant")
  );
}

/**
 * Determines whether an assistant message has visible content that should
 * be rendered with a BotAvatar.
 *
 * Returns true when the message contains any of:
 * - Non-whitespace-only text
 * - Reasoning content
 * - Source parts (source-url, source-document)
 * - Completed action tool output (toggleTheme, etc.)
 *
 * Returns false when the message has only:
 * - Whitespace-only or empty text
 * - Tool-call parts for non-action tools (searchArticles, etc.)
 * - step-start parts
 * - No content at all
 *
 * This is the single decision point — if false, the message is completely
 * skipped (no BotAvatar, no empty div). If true, it is fully rendered
 * and AssistantMessage will always produce visible output.
 */
export function hasVisibleAssistantContent(msg: UIMessage): boolean {
  if (msg.role !== "assistant") return false;

  const parts = msg.parts ?? [];

  // Non-whitespace text → visible
  const textContent = parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map(p => p.text)
    .join("");
  if (textContent.trim()) return true;

  // Reasoning → visible
  if (parts.some((p: { type: string }) => p.type === "reasoning")) return true;

  // Sources → visible
  if (parts.some(
    (p: { type: string }) =>
      p.type === "source-url" || p.type === "source-document"
  )) return true;

  // Completed action tool output → visible
  const ACTION_TOOL_NAMES = new Set([
    "toggleTheme",
    "navigateToArticle",
    "scrollToSection",
    "toggleImmersiveMode",
    "highlightText",
    "setPreference",
  ]);
  if (parts.some((p: { type: string }) => {
    if (!p.type.startsWith("tool-")) return false;
    const toolName = p.type.slice("tool-".length);
    if (!ACTION_TOOL_NAMES.has(toolName)) return false;
    const part = p as { state?: string; output?: unknown };
    return part.state === "output-available" &&
      typeof part.output === "object" && part.output !== null &&
      "success" in part.output && part.output.success === true;
  })) return true;

  // Everything else: whitespace-only text, tool-call parts for
  // search/analysis tools, step-start, empty → not visible.
  return false;
}

function LiveMessageList({
  messages,
  isStreaming,
  lang,
  articleContext,
  quickPrompts,
  showSourceSnippets,
  onQuickPrompt,
}: {
  messages: UIMessage[];
  isStreaming: boolean;
  lang: string;
  articleContext?: ArticleChatContext;
  quickPrompts: string[];
  showSourceSnippets?: boolean;
  onQuickPrompt: (text: string) => void;
}) {
  const showQuickPrompts = messages.length <= 1;
  const lastAssistantMsgId = [...messages]
    .reverse()
    .find(m => m.role === "assistant")?.id;
  const isWaitingForAssistant = shouldShowWaitingPlaceholder(messages, isStreaming);

  return (
    <>
      {messages.map(msg => {
        if (msg.id === "welcome" && showQuickPrompts) {
          return (
            <div key={msg.id} class="space-y-3">
              <div class="flex items-start gap-2.5">
                <BotAvatar />
                <p class="text-foreground min-w-0 flex-1 pt-0.5 text-[13px] leading-relaxed">
                  {getTextFromMessage(msg)}
                </p>
              </div>
              <div class="flex flex-wrap gap-1.5 pl-8">
                {quickPrompts.map(q => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => onQuickPrompt(q)}
                    class="border-border bg-muted/30 text-foreground-soft hover:border-accent/40 hover:bg-accent/10 hover:text-foreground rounded-full border px-3 py-1.5 text-[12px] transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          );
        }

        if (msg.role === "user") {
          const text = getTextFromMessage(msg);
          return (
            <div key={msg.id} class="flex justify-end">
              <div class="bg-accent text-background max-w-[82%] rounded-2xl rounded-br-sm px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm">
                {text}
              </div>
            </div>
          );
        }

        // Assistant message: single decision point.
        // If no visible content → skip entirely (no BotAvatar, no empty div).
        // If visible content → render with BotAvatar + AssistantMessage.
        if (!hasVisibleAssistantContent(msg)) {
          return null;
        }

        const isLastAssistantStreaming =
          isStreaming && msg.id === lastAssistantMsgId;

        return (
          <div key={msg.id} class="flex items-start gap-2.5">
            <BotAvatar />
            <div class="text-foreground min-w-0 flex-1 pt-0.5 text-[13px] leading-relaxed">
              <AssistantMessage
                message={msg}
                isStreaming={isLastAssistantStreaming}
                lang={lang}
                articleContext={articleContext}
                onFollowUp={onQuickPrompt}
                showSourceSnippets={showSourceSnippets}
              />
            </div>
          </div>
        );
      })}
      {isWaitingForAssistant && (
        <div class="flex items-start gap-2.5">
          <BotAvatar />
          <div class="min-w-0 flex-1 pt-0.5">
            <ReasoningBlock text="" isStreaming={true} lang={lang} />
          </div>
        </div>
      )}
    </>
  );
}
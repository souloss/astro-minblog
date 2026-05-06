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
 * Returns true only when streaming and no assistant message exists yet in the array.
 * This prevents double BotAvatar when AI SDK has already created an empty assistant message.
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
 * Checks whether an assistant message has no visible content and should be
 * skipped entirely (no BotAvatar, no empty content div).
 *
 * A message is skipped when:
 * - It's not the currently-streaming last assistant message
 * - It has no text content
 * - It has no reasoning content
 * - It has no source parts
 * - Its tool parts don't produce visible output (only action tools like
 *   toggleTheme produce confirmation text; search/analysis tools don't)
 *
 * This prevents ghost BotAvatar when tool auto-continue creates a first
 * assistant with only tool-call parts, then a second with actual text.
 */
export function shouldSkipEmptyAssistant(
  msg: UIMessage,
  isStreaming: boolean,
  isLastAssistantStreaming: boolean
): boolean {
  if (msg.role !== "assistant") return false;
  if (isLastAssistantStreaming) return false;

  const parts = msg.parts ?? [];
  const textContent = parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map(p => p.text)
    .join("");

  if (textContent) return false;

  const hasReasoning = parts.some(
    (p: { type: string }) => p.type === "reasoning"
  );
  if (hasReasoning) return false;

  const hasSources = parts.some(
    (p: { type: string }) =>
      p.type === "source-url" || p.type === "source-document"
  );
  if (hasSources) return false;

  // Check if any tool parts would produce visible output.
  // Action tools (toggleTheme, navigateToArticle, etc.) produce confirmation
  // text that the user should see. Other tool calls (search, analysis) don't.
  const ACTION_TOOL_NAMES = new Set([
    "toggleTheme",
    "navigateToArticle",
    "scrollToSection",
    "toggleImmersiveMode",
    "highlightText",
    "setPreference",
  ]);
  const hasVisibleToolOutput = parts.some((p: { type: string }) => {
    if (!p.type.startsWith("tool-")) return false;
    const toolName = p.type.slice("tool-".length);
    if (!ACTION_TOOL_NAMES.has(toolName)) return false;
    // Only count if the tool has completed with success output
    const part = p as { state?: string; output?: unknown };
    return part.state === "output-available" &&
      typeof part.output === "object" && part.output !== null &&
      "success" in part.output && part.output.success === true;
  });
  if (hasVisibleToolOutput) return false;

  // All remaining cases: no text, no reasoning, no sources, no visible tool
  // output → skip this message to prevent ghost BotAvatar.
  return true;
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

        const text = getTextFromMessage(msg);
        const isAssistant = msg.role === "assistant";
        const isLastAssistantStreaming =
          isStreaming && msg.id === lastAssistantMsgId;

        // Skip rendering assistant messages that have no visible content.
        // This prevents ghost BotAvatar when:
        // - A tool-call-only assistant exists before the text response
        // - A provider fails and leaves an empty assistant message
        if (shouldSkipEmptyAssistant(msg, isStreaming, isLastAssistantStreaming)) {
          return null;
        }

        // For assistant messages, check if AssistantMessage would produce
        // visible output. If not (e.g., streaming with no content yet),
        // the isWaitingForAssistant placeholder handles the loading state.
        if (isAssistant && !text && !isWaitingForAssistant) {
          const parts = msg.parts ?? [];
          const hasReasoning = parts.some(
            (p: { type: string }) => p.type === "reasoning"
          );
          const hasSources = parts.some(
            (p: { type: string }) =>
              p.type === "source-url" || p.type === "source-document"
          );
          // If the assistant message has no text, no reasoning, no sources,
          // and is NOT the currently streaming last message, skip it entirely.
          // The streaming case is handled by isWaitingForAssistant placeholder.
          if (!hasReasoning && !hasSources && !isLastAssistantStreaming) {
            return null;
          }
        }

        return (
          <div
            key={msg.id}
            class={
              msg.role === "user"
                ? "flex justify-end"
                : "flex items-start gap-2.5"
            }
          >
            {isAssistant && <BotAvatar />}
            <div
              class={
                msg.role === "user"
                  ? "bg-accent text-background max-w-[82%] rounded-2xl rounded-br-sm px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm"
                  : "text-foreground min-w-0 flex-1 pt-0.5 text-[13px] leading-relaxed"
              }
            >
              {isAssistant ? (
                <AssistantMessage
                  message={msg}
                  isStreaming={isLastAssistantStreaming}
                  lang={lang}
                  articleContext={articleContext}
                  onFollowUp={onQuickPrompt}
                  showSourceSnippets={showSourceSnippets}
                />
              ) : (
                text
              )}
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

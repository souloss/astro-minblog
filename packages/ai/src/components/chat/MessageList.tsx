import type { UIMessage } from "ai";
import type { ArticleChatContext } from "../../server/types.ts";
import type { MockMessage } from "./useMockChat.ts";
import { RichText } from "../RichText.tsx";
import { ReasoningBlock } from "../ReasoningBlock.tsx";
import {
  AssistantMessage,
  BotAvatar,
  TypingDots,
  getTextFromMessage,
} from "../MessageBubble.tsx";

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
                class="border-border bg-muted/30 text-foreground-soft hover:border-accent/40 hover:bg-accent/10 hover:text-foreground rounded-lg border px-2.5 py-1 text-[12px] transition-colors"
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
                ? "bg-accent text-background max-w-[82%] rounded-2xl rounded-br-md px-3 py-2 text-[13px] leading-relaxed"
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
  const lastMessage = messages[messages.length - 1];
  const isWaitingForAssistant = isStreaming && lastMessage?.role === "user";

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
                    class="border-border bg-muted/30 text-foreground-soft hover:border-accent/40 hover:bg-accent/10 hover:text-foreground rounded-lg border px-2.5 py-1 text-[12px] transition-colors"
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
                  ? "bg-accent text-background max-w-[82%] rounded-2xl rounded-br-md px-3 py-2 text-[13px] leading-relaxed"
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

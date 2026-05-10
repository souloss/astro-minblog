import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "preact/hooks";
import type { ArticleChatContext } from "../server/types.js";
import { t, getLang } from "../utils/i18n.js";
import { BotAvatar } from "./MessageBubble.js";
import { ChatInput, resetInputHeight } from "./ChatInput.js";
import { useMockChat } from "./chat/useMockChat.js";
import { useLiveChat } from "./chat/useLiveChat.js";
import { MessageList } from "./chat/MessageList.js";
import { ChatToolbar } from "./chat/ChatToolbar.js";
import {
  getChatActionLabel,
  getQuickPrompts,
  buildWelcomeMessage,
  parseErrorMessage,
  isRetryable,
  PANEL_SIZE_CONFIG,
} from "./chat/helpers.js";
import type { PanelSize } from "./chat/helpers.js";

export interface AIChatConfig {
  enabled?: boolean;
  mockMode?: boolean;
  apiEndpoint?: string;
  welcomeMessage?: string;
  placeholder?: string;
  authorName?: string;
  lang?: string;
  showSourceSnippets?: boolean;
}

interface ChatPanelProps {
  open: boolean;
  onClose: () => void;
  config: AIChatConfig;
  articleContext?: ArticleChatContext;
}

const MIN_SEND_INTERVAL_MS = 500;
let lastChatTrigger: HTMLElement | null = null;

// ── Main ChatPanel ────────────────────────────────────────────

export function ChatPanel({
  open,
  onClose,
  config,
  articleContext,
}: ChatPanelProps) {
  const isMockMode = config.mockMode || !config.apiEndpoint;
  const lang = getLang(config.lang);
  const placeholder = config.placeholder ?? t("ai.placeholder", lang);

  const panelRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastSendRef = useRef(0);
  const [inputValue, setInputValue] = useState("");
  const [cooldown, setCooldown] = useState(false);
  const statusId = "ai-chat-status";

  const [panelSize, setPanelSize] = useState<PanelSize>(() => {
    if (typeof window === "undefined") return "S";
    try {
      const saved = localStorage.getItem("ai-chat-panel-size");
      if (saved === "S" || saved === "M" || saved === "L") return saved;
    } catch {
      /* ignore */
    }
    return "S";
  });

  const welcomeMessage = useMemo(
    () => buildWelcomeMessage(config, articleContext),
    [config, articleContext]
  );
  const quickPrompts = useMemo(
    () => getQuickPrompts(lang, articleContext),
    [lang, articleContext]
  );

  useEffect(() => {
    try {
      localStorage.setItem("ai-chat-panel-size", panelSize);
    } catch {
      /* ignore */
    }
  }, [panelSize]);

  useEffect(() => {
    if (!open) return;

    const activeElement = document.activeElement;
    lastChatTrigger =
      activeElement instanceof HTMLElement ? activeElement : null;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const sizeConfig = PANEL_SIZE_CONFIG[panelSize];

  // ── Live Mode ────────────────────────────────────────────────

  const {
    liveMessages,
    liveSendMessage,
    liveSetMessages,
    regenerate,
    liveStatus,
    liveError,
  } = useLiveChat({ config, articleContext, lang, welcomeMessage });

  // ── Mock Mode ────────────────────────────────────────────────

  const mockChat = useMockChat(lang);

  // ── Unified State ───────────────────────────────────────────

  const isStreaming = isMockMode
    ? mockChat.isStreaming
    : liveStatus === "streaming" || liveStatus === "submitted";
  const error = isMockMode ? null : liveError;

  // ── Scroll ─────────────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [liveMessages, mockChat.messages]);

  // ── Send Logic ──────────────────────────────────────────────

  const doSend = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming || cooldown) return;
      const now = Date.now();
      if (now - lastSendRef.current < MIN_SEND_INTERVAL_MS) return;
      lastSendRef.current = now;
      setCooldown(true);
      setTimeout(() => setCooldown(false), MIN_SEND_INTERVAL_MS);
      setInputValue("");
      resetInputHeight();

      if (isMockMode) {
        mockChat.sendMessage(trimmed);
      } else {
        liveSendMessage({ text: trimmed });
      }
    },
    [isStreaming, cooldown, isMockMode, mockChat, liveSendMessage]
  );

  const handleSend = useCallback(
    () => doSend(inputValue),
    [doSend, inputValue]
  );

  const handleClear = useCallback(() => {
    if (isMockMode) {
      mockChat.clear();
    } else {
      liveSetMessages([welcomeMessage]);
    }
    setInputValue("");
  }, [isMockMode, mockChat, liveSetMessages, welcomeMessage]);

  const handleClose = useCallback(() => {
    onClose();
    window.setTimeout(() => lastChatTrigger?.focus(), 0);
  }, [onClose]);

  const statusMessage = error
    ? parseErrorMessage(error, lang)
    : isStreaming
      ? t("ai.status.generating", lang)
      : "";

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      id="ai-chat-panel"
      data-ai-chat-panel
      role="dialog"
      aria-modal="false"
      aria-labelledby={
        articleContext ? "ai-chat-title-reading" : "ai-chat-title"
      }
      aria-describedby={
        articleContext ? "ai-chat-description-reading" : "ai-chat-description"
      }
      class={`border-border fixed z-[90] flex flex-col overflow-hidden rounded-2xl border shadow-2xl transition-all duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] ${
        panelSize === "L"
          ? "right-[10vw] bottom-[10vh] z-[100]"
          : "right-4 bottom-20 sm:right-6 sm:bottom-20"
      } ${sizeConfig.class}`}
      style={{
        height: sizeConfig.height,
        background: "color-mix(in oklch, var(--background) 92%, transparent)",
        backdropFilter: "saturate(180%) blur(16px)",
        WebkitBackdropFilter: "saturate(180%) blur(16px)",
      }}
    >
      {/* Header */}
      <ChatToolbar
        lang={lang}
        isMockMode={isMockMode}
        articleContext={articleContext}
        placeholder={placeholder}
        panelSize={panelSize}
        onSizeChange={setPanelSize}
        onClear={handleClear}
        onClose={handleClose}
      />

      <div
        id={statusId}
        class="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {statusMessage}
      </div>

      {/* Messages */}
      <div
        class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3.5 py-3 [scrollbar-width:thin]"
        aria-live="off"
      >
        <div class="space-y-4">
          <MessageList
            isMockMode={isMockMode}
            mockMessages={mockChat.messages}
            liveMessages={liveMessages}
            isStreaming={isStreaming}
            hasError={!!error}
            lang={lang}
            articleContext={articleContext}
            welcomeMessage={welcomeMessage}
            quickPrompts={quickPrompts}
            showSourceSnippets={config.showSourceSnippets}
            onQuickPrompt={doSend}
          />

          {error && (
            <div class="flex items-start gap-2.5" role="alert">
              <BotAvatar />
              <div class="flex flex-col gap-1 pt-0.5">
                <p class="text-[13px] text-warning">
                  {parseErrorMessage(error, lang)}
                </p>
                {isRetryable(error) && (
                  <button
                    type="button"
                    onClick={() => regenerate()}
                    class="self-start rounded-md border border-warning/30 px-2 py-0.5 text-[11px] text-warning transition-colors hover:bg-warning/10"
                  >
                    {t("ai.retry", lang)}
                  </button>
                )}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <ChatInput
        value={inputValue}
        onInput={setInputValue}
        onSend={handleSend}
        isStreaming={isStreaming}
        cooldown={cooldown}
        placeholder={placeholder}
        label={t("ai.placeholder", lang)}
        sendLabel={getChatActionLabel(lang, "send")}
        sendingLabel={getChatActionLabel(lang, "sending")}
        focusTrigger={open}
      />
    </div>
  );
}

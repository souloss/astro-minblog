import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { UIMessage } from 'ai';
import { APICallError } from '@ai-sdk/provider';
import { getMockResponse, createMockStream } from '../providers/mock.ts';
import type { ArticleChatContext } from '../server/types.ts';
import { t, getLang } from '../utils/i18n.ts';
import { shouldAutoContinueAfterToolCalls } from './tool-auto-continue.ts';
import { RichText } from './RichText.tsx';
import { ReasoningBlock } from './ReasoningBlock.tsx';
import { AssistantMessage, BotAvatar, BotIcon, TypingDots, getTextFromMessage } from './MessageBubble.tsx';
import { ChatInput, resetInputHeight } from './ChatInput.tsx';


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

function getChatActionLabel(lang: string, type: 'send' | 'sending'): string {
  const normalizedLang = getLang(lang);
  if (type === 'sending') {
    return normalizedLang === 'zh' ? '正在发送' : 'Sending';
  }
  return normalizedLang === 'zh' ? '发送消息' : 'Send message';
}

function generateSessionId(articleContext?: ArticleChatContext): string {
  if (articleContext?.slug) return `article:${articleContext.slug}`;
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

// ── Quick Prompts ─────────────────────────────────────────────

const QUICK_PROMPTS_ZH = [
  t('ai.prompt.techStack', 'zh'),
  t('ai.prompt.recommend', 'zh'),
  t('ai.prompt.build', 'zh'),
];
const QUICK_PROMPTS_EN = [
  t('ai.prompt.techStack', 'en'),
  t('ai.prompt.recommend', 'en'),
  t('ai.prompt.build', 'en'),
];

function getQuickPrompts(lang: string, articleContext?: ArticleChatContext): string[] {
  const l = getLang(lang);
  if (!articleContext) return l === 'zh' ? QUICK_PROMPTS_ZH : QUICK_PROMPTS_EN;

  if (l === 'zh') {
    const prompts = [t('ai.prompt.summarize', 'zh', { title: articleContext.title })];
    if (articleContext.keyPoints?.length) {
      prompts.push(t('ai.prompt.explain', 'zh', { point: articleContext.keyPoints[0] }));
    }
    prompts.push(t('ai.prompt.related', 'zh'));
    return prompts;
  }
  const prompts = [t('ai.prompt.summarize', 'en', { title: articleContext.title })];
  if (articleContext.keyPoints?.length) {
    prompts.push(t('ai.prompt.explain', 'en', { point: articleContext.keyPoints[0] }));
  }
  prompts.push(t('ai.prompt.related', 'en'));
  return prompts;
}

// ── Welcome Message ───────────────────────────────────────────

function buildWelcomeMessage(config: AIChatConfig, articleContext?: ArticleChatContext): UIMessage {
  const lang = getLang(config.lang);
  
  let text: string;
  if (articleContext) {
    text = config.welcomeMessage ?? t('ai.welcome.reading', lang, { title: articleContext.title });
  } else {
    text = config.welcomeMessage ?? t('ai.welcome.canHelp', lang);
  }

  return {
    id: 'welcome',
    role: 'assistant' as const,
    parts: [{ type: 'text' as const, text }],
  };
}

// ── Error Helpers ─────────────────────────────────────────────

function parseErrorMessage(error: Error, lang: string = 'zh'): string {
  const l = getLang(lang);

  if (APICallError.isInstance(error)) {
    if (error.responseBody) {
      try {
        const parsed = JSON.parse(error.responseBody);
        if (parsed?.error) return parsed.error;
      } catch { /* not JSON */ }
    }
    if (error.data && typeof error.data === 'object' && 'error' in error.data) {
      return String(error.data.error);
    }
  }

  try {
    const parsed = JSON.parse(error.message);
    if (parsed?.error) return parsed.error;
  } catch { /* not JSON */ }

  const msg = error.message;
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) return t('ai.error.network', l);
  if (msg.includes('aborted')) return t('ai.error.aborted', l);
  if (msg.includes('429') || msg.includes('rate')) return t('ai.error.rateLimit', l);
  if (msg.includes('503') || msg.includes('unavailable')) return t('ai.error.unavailable', l);
  return t('ai.error.generic', l);
}

function isRetryable(error: Error): boolean {
  if (APICallError.isInstance(error)) {
    return error.isRetryable;
  }
  try {
    const parsed = JSON.parse(error.message);
    if (typeof parsed?.retryable === 'boolean') return parsed.retryable;
  } catch { /* not JSON */ }
  return true;
}

// ── Mock Mode Chat ────────────────────────────────────────────

interface MockMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  streaming?: boolean;
}

function useMockChat(lang: string) {
  const [messages, setMessages] = useState<MockMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  const sendMessage = useCallback(async (text: string) => {
    const userMsg: MockMessage = { id: `u-${Date.now()}`, role: 'user', text };
    const assistantId = `a-${Date.now()}`;
    const assistantMsg: MockMessage = { id: assistantId, role: 'assistant', text: '', streaming: true };
    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);

    const stream = createMockStream(getMockResponse(text, lang));
    const reader = stream.getReader();
    let accumulated = '';
    try {
      while (true) {
        if (!mountedRef.current) break;
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += value;
        if (!mountedRef.current) break;
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, text: accumulated } : m));
      }
    } finally {
      if (mountedRef.current) {
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, streaming: false } : m));
        setIsStreaming(false);
      }
    }
  }, [lang]);

  const clear = useCallback(() => setMessages([]), []);

  return { messages, isStreaming, sendMessage, clear };
}

// ── Panel Size Presets ─────────────────────────────────────────

type PanelSize = 'S' | 'M' | 'L';

const PANEL_SIZE_CONFIG: Record<PanelSize, { width: string; height: string; class: string }> = {
  S: { width: '370px', height: 'min(520px, calc(100vh - 7rem))', class: 'w-[370px] max-w-[calc(100vw-2rem)]' },
  M: { width: '550px', height: 'min(70vh, calc(100vh - 5rem))', class: 'w-[550px] max-w-[calc(100vw-3rem)]' },
  L: { width: '80vw', height: '80vh', class: 'w-[80vw] max-w-[900px]' },
};

// ── Main ChatPanel ────────────────────────────────────────────

export function ChatPanel({ open, onClose, config, articleContext }: ChatPanelProps) {
  const isMockMode = config.mockMode || !config.apiEndpoint;
  const lang = getLang(config.lang);
  const placeholder = config.placeholder ?? t('ai.placeholder', lang);

  const sessionId = useMemo(() => generateSessionId(articleContext), [articleContext]);
  const panelRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastSendRef = useRef(0);
  const [inputValue, setInputValue] = useState('');
  const [cooldown, setCooldown] = useState(false);
  const titleId = articleContext ? 'ai-chat-title-reading' : 'ai-chat-title';
  const descriptionId = articleContext ? 'ai-chat-description-reading' : 'ai-chat-description';
  const statusId = 'ai-chat-status';
  
  const [panelSize, setPanelSize] = useState<PanelSize>(() => {
    if (typeof window === 'undefined') return 'S';
    try {
      const saved = localStorage.getItem('ai-chat-panel-size');
      if (saved === 'S' || saved === 'M' || saved === 'L') return saved;
    } catch { /* ignore */ }
    return 'S';
  });

  const quickPrompts = useMemo(() => getQuickPrompts(lang, articleContext), [lang, articleContext]);
  const welcomeMessage = useMemo(() => buildWelcomeMessage(config, articleContext), [config, articleContext]);

  useEffect(() => {
    try {
      localStorage.setItem('ai-chat-panel-size', panelSize);
    } catch { /* ignore */ }
  }, [panelSize]);

  useEffect(() => {
    if (!open) return;

    const activeElement = document.activeElement;
    lastChatTrigger = activeElement instanceof HTMLElement ? activeElement : null;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const sizeConfig = PANEL_SIZE_CONFIG[panelSize];

  // ── Live Mode (useChat) ─────────────────────────────────────

  const transport = useMemo(() => new DefaultChatTransport({
    api: config.apiEndpoint ?? '/api/chat',
    prepareSendMessagesRequest: ({ id, messages: msgs }) => ({
      headers: { 'x-session-id': sessionId },
      body: {
        id, messages: msgs,
        lang,
        context: articleContext
          ? { scope: 'article' as const, article: articleContext }
          : { scope: 'global' as const },
      },
    }),
  }), [config.apiEndpoint, sessionId, articleContext, lang]);

  const {
    messages: liveMessages,
    sendMessage: liveSendMessage,
    setMessages: liveSetMessages,
    regenerate,
    status: liveStatus,
    error: liveError,
    addToolOutput,
  } = useChat({
    transport,
    sendAutomaticallyWhen: shouldAutoContinueAfterToolCalls,
    async onToolCall({ toolCall }) {
      const executor = window.__actionExecutor;
      
      if (!executor) {
        console.warn('[ChatPanel] ActionExecutor not initialized');
        addToolOutput({
          tool: toolCall.toolName,
          toolCallId: toolCall.toolCallId,
          output: {
            success: false,
            tool: toolCall.toolName,
            error: 'ActionExecutor not initialized',
          },
        });
        return;
      }

      const TOOL_ACTION_MAP: Record<string, (input: Record<string, unknown>) => { type: string; payload: Record<string, unknown> }> = {
        toggleTheme: (i) => ({ type: 'toggle-theme', payload: { theme: i.theme } }),
        navigateToArticle: (i) => ({
          type: 'navigate',
          payload: {
            slug: i.slug,
            lang: (i.lang as string) || 'zh',
            then: i.sectionId ? [{ type: 'scroll-to-section', payload: { sectionId: i.sectionId } }] : undefined,
          },
        }),
        scrollToSection: (i) => ({
          type: 'scroll-to-section',
          payload: { sectionId: i.sectionId, highlight: i.highlight ?? true, behavior: i.behavior ?? 'smooth' },
        }),
        toggleReadingMode: (i) => ({
          type: 'toggle-reading-mode',
          payload: {
            enabled: i.enabled,
            settings: { ...(i.fontSize ? { fontSize: i.fontSize } : {}), ...(i.fontFamily ? { fontFamily: i.fontFamily } : {}) },
          },
        }),
        highlightText: (i) => ({
          type: 'highlight-text',
          payload: { text: i.text, selector: i.selector, style: i.style ?? 'accent', duration: i.duration ?? 3000, scrollIntoView: i.scrollIntoView ?? false },
        }),
        setPreference: (i) => ({ type: 'set-preference', payload: { key: i.key, value: i.value } }),
      };

      const mapper = TOOL_ACTION_MAP[toolCall.toolName];
      if (!mapper) {
        console.warn('[ChatPanel] Unknown tool:', toolCall.toolName);
        addToolOutput({
          tool: toolCall.toolName,
          toolCallId: toolCall.toolCallId,
          output: {
            success: false,
            tool: toolCall.toolName,
            error: `Unknown tool: ${toolCall.toolName}`,
          },
        });
        return;
      }

      try {
        const toolInput = (toolCall.input ?? {}) as Record<string, unknown>;
        const action = mapper(toolInput);
        const result = await executor.execute(action);
        addToolOutput({
          tool: toolCall.toolName,
          toolCallId: toolCall.toolCallId,
          output: {
            success: result.success,
            tool: toolCall.toolName,
            action: action.type,
            input: toolInput,
            result,
            confirmation: result.success
              ? `Tool ${toolCall.toolName} executed successfully.`
              : `Tool ${toolCall.toolName} failed: ${result.error ?? 'unknown error'}`,
          },
        });
      } catch (error) {
        console.error('[ChatPanel] Tool execution error:', error);
        addToolOutput({
          tool: toolCall.toolName,
          toolCallId: toolCall.toolCallId,
          output: {
            success: false,
            tool: toolCall.toolName,
            error: String(error),
          },
        });
      }
    },
  });

  // Initialize welcome message on mount only.
  // Empty deps is intentional: we only set the welcome message once,
  // not re-set it every time liveMessages/welcomeMessage changes.
  useEffect(() => {
    if (liveMessages.length === 0) {
      liveSetMessages([welcomeMessage]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Mock Mode ───────────────────────────────────────────────

  const mockChat = useMockChat(lang);

  // ── Unified State ───────────────────────────────────────────

  const isStreaming = isMockMode ? mockChat.isStreaming : (liveStatus === 'streaming' || liveStatus === 'submitted');
  const error = isMockMode ? null : liveError;

  // ── Scroll ─────────────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [liveMessages, mockChat.messages]);

  // ── Send Logic ──────────────────────────────────────────────

  const doSend = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming || cooldown) return;
    const now = Date.now();
    if (now - lastSendRef.current < MIN_SEND_INTERVAL_MS) return;
    lastSendRef.current = now;
    setCooldown(true);
    setTimeout(() => setCooldown(false), MIN_SEND_INTERVAL_MS);
    setInputValue('');
    resetInputHeight();

    if (isMockMode) {
      mockChat.sendMessage(trimmed);
    } else {
      liveSendMessage({ text: trimmed });
    }
  }, [isStreaming, cooldown, isMockMode, mockChat, liveSendMessage]);

  const handleSend = useCallback(() => doSend(inputValue), [doSend, inputValue]);

  const handleClear = useCallback(() => {
    if (isMockMode) {
      mockChat.clear();
    } else {
      liveSetMessages([welcomeMessage]);
    }
    setInputValue('');
  }, [isMockMode, mockChat, liveSetMessages, welcomeMessage]);

  const handleClose = useCallback(() => {
    onClose();
    window.setTimeout(() => lastChatTrigger?.focus(), 0);
  }, [onClose]);

  const statusMessage = error
    ? parseErrorMessage(error, lang)
    : isStreaming
      ? t('ai.status.generating', lang)
      : '';

  if (!open) return null;

  // ── Render Messages ─────────────────────────────────────────

  const renderMockMessages = () => (
    <>
      {mockChat.messages.length === 0 && (
        <div class="space-y-3">
          <div class="flex items-start gap-2.5">
            <BotAvatar />
            <p class="min-w-0 flex-1 pt-0.5 text-[13px] leading-relaxed text-foreground">
              {getTextFromMessage(welcomeMessage)}
            </p>
          </div>
          <div class="flex flex-wrap gap-1.5 pl-8">
            {quickPrompts.map(q => (
              <button key={q} type="button" onClick={() => doSend(q)}
                class="rounded-lg border border-border bg-muted/30 px-2.5 py-1 text-[12px] text-foreground-soft transition-colors hover:border-accent/40 hover:bg-accent/10 hover:text-foreground"
              >{q}</button>
            ))}
          </div>
        </div>
      )}
      {mockChat.messages.map(msg => (
        <div key={msg.id} class={msg.role === 'user' ? 'flex justify-end' : 'flex items-start gap-2.5'}>
          {msg.role === 'assistant' && <BotAvatar />}
          <div class={msg.role === 'user'
            ? 'max-w-[82%] rounded-2xl rounded-br-md bg-accent px-3 py-2 text-[13px] leading-relaxed text-background'
            : 'min-w-0 flex-1 pt-0.5 text-[13px] leading-relaxed text-foreground'}>
            {msg.text
              ? msg.role === 'assistant'
                ? <RichText text={msg.text} isStreaming={msg.streaming} />
                : msg.text
              : msg.streaming ? <TypingDots /> : null}
          </div>
        </div>
      ))}
    </>
  );

  const renderLiveMessages = () => {
    const showQuickPrompts = liveMessages.length <= 1;
    const lastAssistantMsgId = [...liveMessages].reverse().find(m => m.role === 'assistant')?.id;
    const lastMessage = liveMessages[liveMessages.length - 1];
    const isWaitingForAssistant = isStreaming && lastMessage?.role === 'user';

    return (
      <>
        {liveMessages.map(msg => {
          if (msg.id === 'welcome' && showQuickPrompts) {
            return (
              <div key={msg.id} class="space-y-3">
                <div class="flex items-start gap-2.5">
                  <BotAvatar />
                  <p class="min-w-0 flex-1 pt-0.5 text-[13px] leading-relaxed text-foreground">
                    {getTextFromMessage(msg)}
                  </p>
                </div>
                <div class="flex flex-wrap gap-1.5 pl-8">
                  {quickPrompts.map(q => (
                    <button key={q} type="button" onClick={() => doSend(q)}
                      class="rounded-lg border border-border bg-muted/30 px-2.5 py-1 text-[12px] text-foreground-soft transition-colors hover:border-accent/40 hover:bg-accent/10 hover:text-foreground"
                    >{q}</button>
                  ))}
                </div>
              </div>
            );
          }

          const text = getTextFromMessage(msg);
          const isAssistant = msg.role === 'assistant';
          const isLastAssistantStreaming = isStreaming && msg.id === lastAssistantMsgId;

          return (
            <div key={msg.id} class={msg.role === 'user' ? 'flex justify-end' : 'flex items-start gap-2.5'}>
              {isAssistant && <BotAvatar />}
              <div class={msg.role === 'user'
                ? 'max-w-[82%] rounded-2xl rounded-br-md bg-accent px-3 py-2 text-[13px] leading-relaxed text-background'
                : 'min-w-0 flex-1 pt-0.5 text-[13px] leading-relaxed text-foreground'}>
                {isAssistant
                  ? <AssistantMessage 
                      message={msg} 
                      isStreaming={isLastAssistantStreaming} 
                      lang={lang}
                      articleContext={articleContext}
                      onFollowUp={doSend}
                      showSourceSnippets={config.showSourceSnippets}
                    />
                  : text}
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
  };

  return (
    <div ref={panelRef} id="ai-chat-panel" data-ai-chat-panel
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      class={`fixed z-[90] flex flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl transition-all duration-300 ease-out ${
        panelSize === 'L' 
          ? 'right-[10vw] bottom-[10vh] z-[100]' 
          : 'right-4 bottom-20 sm:right-6 sm:bottom-20'
      } ${sizeConfig.class}`}
      style={{ height: sizeConfig.height }}>

      {/* Header */}
      <div class="flex shrink-0 items-center justify-between border-b border-border px-3.5 py-2.5">
        <div class="flex items-center gap-2">
          <div class="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent/15">
            <BotIcon class="size-3 text-accent" aria-hidden="true" />
          </div>
          <div class="flex flex-col">
            <span id={titleId} class="text-[13px] font-semibold text-foreground">{t('ai.assistantName', lang)}</span>
            {articleContext && (
              <span id={descriptionId} class="max-w-[180px] truncate text-[10px] text-foreground-soft">
                {t('ai.header.reading', lang)}{articleContext.title}
              </span>
            )}
            {!articleContext && (
              <span id={descriptionId} class="sr-only">{placeholder}</span>
            )}
          </div>
          <span class={`rounded-full px-1.5 py-px text-[10px] font-medium ${
            isMockMode ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'bg-green-500/15 text-green-600 dark:text-green-400'
          }`}>
            {isMockMode ? t('ai.header.mode', lang) : t('ai.status.live', lang)}
          </span>
          {process.env.NODE_ENV === 'development' && sessionId && (
            <span 
              class="rounded-full px-1.5 py-px text-[10px] font-medium bg-blue-500/15 text-blue-600 dark:text-blue-400 cursor-pointer hover:bg-blue-500/25"
              title="Click to open debug trace"
              onClick={() => window.open(`/api/ai-debug?session_id=${sessionId}`, '_blank')}
            >
              SID:{sessionId.slice(0, 8)}
            </span>
          )}
        </div>
        <div class="flex items-center gap-0.5">
          <div class="flex items-center gap-0.5 rounded-md border border-border bg-muted/30 p-0.5">
            {(['S', 'M', 'L'] as const).map(size => (
              <button
                key={size}
                type="button"
                onClick={() => setPanelSize(size)}
                class={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                  panelSize === size
                    ? 'bg-accent text-background'
                    : 'text-foreground-soft hover:text-foreground'
                }`}
                title={size === 'S' ? 'Small' : size === 'M' ? 'Medium' : 'Large'}
                aria-label={size === 'S' ? 'Small chat panel' : size === 'M' ? 'Medium chat panel' : 'Large chat panel'}
                aria-pressed={panelSize === size}
              >
                {size}
              </button>
            ))}
          </div>
          <button type="button" onClick={handleClear}
            aria-label={t('ai.clear', lang)}
            class="rounded-md p-1 text-foreground-soft transition-colors hover:bg-muted/60 hover:text-foreground"
            title={t('ai.clear', lang)}>
            <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
          </button>
          <button type="button" onClick={handleClose}
            aria-label={t('ai.close', lang)}
            class="rounded-md p-1 text-foreground-soft transition-colors hover:bg-muted/60 hover:text-foreground"
            title={t('ai.close', lang)}>
            <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div id={statusId} class="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {statusMessage}
      </div>

      {/* Messages */}
      <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3.5 py-3 [scrollbar-width:thin]" aria-live="off">
        <div class="space-y-4">
          {isMockMode ? renderMockMessages() : renderLiveMessages()}

          {error && (
            <div class="flex items-start gap-2.5" role="alert">
              <BotAvatar />
              <div class="flex flex-col gap-1 pt-0.5">
                <p class="text-[13px] text-amber-600 dark:text-amber-400">{parseErrorMessage(error, lang)}</p>
                {isRetryable(error) && (
                  <button type="button" onClick={() => regenerate()}
                    class="self-start rounded-md border border-amber-500/30 px-2 py-0.5 text-[11px] text-amber-600 transition-colors hover:bg-amber-500/10 dark:text-amber-400">
                    {t('ai.retry', lang)}
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
        label={t('ai.placeholder', lang)}
        sendLabel={getChatActionLabel(lang, 'send')}
        sendingLabel={getChatActionLabel(lang, 'sending')}
        focusTrigger={open}
      />
    </div>
  );
}

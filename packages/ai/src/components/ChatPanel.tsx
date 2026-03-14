import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { getMockResponse, createMockStream } from '../providers/mock.js';

export interface AIChatConfig {
  enabled?: boolean;
  mockMode?: boolean;
  apiEndpoint?: string;
  welcomeMessage?: string;
  placeholder?: string;
  authorName?: string;
  lang?: string;
}

const MIN_SEND_INTERVAL_MS = 500;

function generateSessionId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

// ---- AI SDK UI Message Stream parser ----

async function consumeAIStream(
  response: Response,
  onDelta: (text: string) => void,
  onFinish: () => void,
  onError: (msg: string) => void,
) {
  const reader = response.body?.getReader();
  if (!reader) { onError('No response body'); return; }
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (trimmed.startsWith('0:')) {
          try {
            const content = JSON.parse(trimmed.slice(2));
            if (typeof content === 'string') onDelta(content);
          } catch { /* skip */ }
        } else if (trimmed.startsWith('e:')) {
          try {
            const err = JSON.parse(trimmed.slice(2));
            onError(err?.message ?? 'Stream error');
          } catch { onError('Stream error'); }
        }
      }
    }
    if (buffer.trim()) {
      const trimmed = buffer.trim();
      if (trimmed.startsWith('0:')) {
        try {
          const content = JSON.parse(trimmed.slice(2));
          if (typeof content === 'string') onDelta(content);
        } catch { /* skip */ }
      }
    }
  } catch (err) {
    onError(err instanceof Error ? err.message : 'Stream failed');
  } finally {
    onFinish();
  }
}

// ---- Rich text rendering (Markdown links → clickable) ----

function RichText({ text }: { text: string }) {
  const parts = useMemo(() => parseInlineMarkdown(text), [text]);
  return (
    <span>
      {parts.map((p, i) => {
        if (p.type === 'link') {
          const isExternal = p.url.startsWith('http');
          return (
            <a
              key={i}
              href={p.url}
              class="inline-flex items-center gap-0.5 font-medium text-accent underline decoration-accent/30 underline-offset-2 transition-colors hover:decoration-accent"
              target={isExternal ? '_blank' : undefined}
              rel={isExternal ? 'noopener noreferrer' : undefined}
            >
              {p.label}
              {isExternal && <ExternalLinkIcon />}
            </a>
          );
        }
        if (p.type === 'bold') return <strong key={i} class="font-semibold">{p.text}</strong>;
        if (p.type === 'code') return <code key={i} class="rounded bg-muted/60 px-1 py-0.5 text-[13px] font-mono">{p.text}</code>;
        return <span key={i}>{p.text}</span>;
      })}
    </span>
  );
}

type InlinePart =
  | { type: 'text'; text: string }
  | { type: 'link'; label: string; url: string }
  | { type: 'bold'; text: string }
  | { type: 'code'; text: string };

function parseInlineMarkdown(text: string): InlinePart[] {
  const parts: InlinePart[] = [];
  // Matches: [label](url), **bold**, `code`
  const re = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', text: text.slice(lastIndex, match.index) });
    }
    if (match[1] && match[2]) parts.push({ type: 'link', label: match[1], url: match[2] });
    else if (match[3]) parts.push({ type: 'bold', text: match[3] });
    else if (match[4]) parts.push({ type: 'code', text: match[4] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ type: 'text', text: text.slice(lastIndex) });
  }
  return parts;
}

function ExternalLinkIcon() {
  return (
    <svg class="inline-block size-3 shrink-0 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

// ---- Message types ----

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  streaming?: boolean;
}

// ---- Quick suggestion chips ----

const QUICK_PROMPTS_ZH = ['这个博客用了什么技术？', '有哪些文章推荐？', '怎么搭建类似的博客？'];
const QUICK_PROMPTS_EN = ['What tech stack is used?', 'Recommend some articles?', 'How to build a similar blog?'];

// ---- Main ChatPanel ----

interface ChatPanelProps {
  open: boolean;
  onClose: () => void;
  config: AIChatConfig;
}

export function ChatPanel({ open, onClose, config }: ChatPanelProps) {
  const isMockMode = config.mockMode || !config.apiEndpoint;
  const lang = config.lang ?? 'zh';
  const isZh = lang !== 'en';
  const placeholder = config.placeholder ?? (isZh ? '输入你的问题...' : 'Ask a question...');
  const welcomeMessage = config.welcomeMessage ?? (isZh
    ? '你好！我是博客 AI 助手，问我任何关于博客内容的问题，我可以帮你找到相关文章。'
    : "Hi! I'm the blog AI assistant. Ask me anything and I'll help you find related articles.");

  const sessionId = useMemo(() => generateSessionId(), []);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastSendRef = useRef(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const quickPrompts = isZh ? QUICK_PROMPTS_ZH : QUICK_PROMPTS_EN;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  // Auto-resize textarea
  const autoResize = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 96) + 'px';
  }, []);

  const sendMockMessage = useCallback(async (text: string) => {
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', text };
    const assistantId = `a-${Date.now()}`;
    const assistantMsg: ChatMessage = { id: assistantId, role: 'assistant', text: '', streaming: true };
    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);

    const stream = createMockStream(getMockResponse(text, lang));
    const reader = stream.getReader();
    let accumulated = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += value;
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, text: accumulated } : m));
      }
    } finally {
      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, streaming: false } : m));
      setIsStreaming(false);
    }
  }, [lang]);

  const sendLiveMessage = useCallback(async (text: string) => {
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', text };
    const assistantId = `a-${Date.now()}`;
    const assistantMsg: ChatMessage = { id: assistantId, role: 'assistant', text: '', streaming: true };
    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);
    setError(null);

    const uiMessages = [...messages, userMsg].map(m => ({
      id: m.id, role: m.role,
      parts: [{ type: 'text', text: m.text }],
    }));

    try {
      const response = await fetch(config.apiEndpoint ?? '/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId },
        body: JSON.stringify({ messages: uiMessages }),
      });

      if (!response.ok) {
        let errMsg = `HTTP ${response.status}`;
        try { const b = await response.json() as { error?: string }; errMsg = b.error ?? errMsg; } catch { /* use status */ }
        setError(errMsg);
        setMessages(prev => prev.filter(m => m.id !== assistantId));
        setIsStreaming(false);
        return;
      }

      await consumeAIStream(
        response,
        (delta) => setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, text: m.text + delta } : m)),
        () => { setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, streaming: false } : m)); setIsStreaming(false); },
        (errMsg) => { setError(errMsg); setIsStreaming(false); },
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
      setMessages(prev => prev.filter(m => m.id !== assistantId));
      setIsStreaming(false);
    }
  }, [messages, config.apiEndpoint, sessionId]);

  const doSend = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming || cooldown) return;
    const now = Date.now();
    if (now - lastSendRef.current < MIN_SEND_INTERVAL_MS) return;
    lastSendRef.current = now;
    setCooldown(true);
    setTimeout(() => setCooldown(false), MIN_SEND_INTERVAL_MS);
    setInputValue('');
    setError(null);
    if (inputRef.current) { inputRef.current.style.height = 'auto'; }
    if (isMockMode) sendMockMessage(trimmed); else sendLiveMessage(trimmed);
  }, [isStreaming, cooldown, isMockMode, sendMockMessage, sendLiveMessage]);

  const handleSend = useCallback(() => doSend(inputValue), [doSend, inputValue]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  const handleClear = useCallback(() => {
    setMessages([]);
    setInputValue('');
    setError(null);
  }, []);

  if (!open) return null;

  const showTypingIndicator = isStreaming && messages.length > 0
    && messages[messages.length - 1]?.role === 'assistant'
    && !messages[messages.length - 1]?.text;

  return (
    <div
      ref={panelRef}
      data-ai-chat-panel
      class="fixed right-4 bottom-20 z-[90] flex w-[370px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl sm:right-6 sm:bottom-20"
      style={{ height: 'min(520px, calc(100vh - 7rem))' }}
    >
      {/* Header */}
      <div class="flex shrink-0 items-center justify-between border-b border-border px-3.5 py-2.5">
        <div class="flex items-center gap-2">
          <div class="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent/15">
            <BotIcon class="size-3 text-accent" />
          </div>
          <span class="text-[13px] font-semibold text-foreground">AI Assistant</span>
          <span class={`rounded-full px-1.5 py-px text-[10px] font-medium ${isMockMode ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'bg-green-500/15 text-green-600 dark:text-green-400'}`}>
            {isMockMode ? 'Demo' : 'Live'}
          </span>
        </div>
        <div class="flex items-center gap-0.5">
          <button type="button" onClick={handleClear}
            class="rounded-md p-1 text-foreground-soft transition-colors hover:bg-muted/60 hover:text-foreground"
            title={isZh ? '清除' : 'Clear'}>
            <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
          </button>
          <button type="button" onClick={onClose}
            class="rounded-md p-1 text-foreground-soft transition-colors hover:bg-muted/60 hover:text-foreground"
            title={isZh ? '关闭' : 'Close'}>
            <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3.5 py-3 [scrollbar-width:thin]">
        <div class="space-y-4">

          {/* Welcome */}
          {messages.length === 0 && (
            <div class="space-y-3">
              <div class="flex items-start gap-2.5">
                <BotAvatar />
                <p class="min-w-0 flex-1 pt-0.5 text-[13px] leading-relaxed text-foreground">{welcomeMessage}</p>
              </div>
              {/* Quick prompts */}
              <div class="flex flex-wrap gap-1.5 pl-8">
                {quickPrompts.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => doSend(q)}
                    class="rounded-lg border border-border bg-muted/30 px-2.5 py-1 text-[12px] text-foreground-soft transition-colors hover:border-accent/40 hover:bg-accent/10 hover:text-foreground"
                  >{q}</button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map(msg => (
            <div key={msg.id} class={msg.role === 'user' ? 'flex justify-end' : 'flex items-start gap-2.5'}>
              {msg.role === 'assistant' && <BotAvatar />}
              <div class={msg.role === 'user'
                ? 'max-w-[82%] rounded-2xl rounded-br-md bg-accent px-3 py-2 text-[13px] leading-relaxed text-background'
                : 'min-w-0 flex-1 pt-0.5 text-[13px] leading-relaxed text-foreground'}>
                {msg.text
                  ? msg.role === 'assistant'
                    ? <AssistantMessage text={msg.text} />
                    : msg.text
                  : msg.streaming ? <TypingDots /> : null}
              </div>
            </div>
          ))}

          {showTypingIndicator && (
            <div class="flex items-start gap-2.5">
              <BotAvatar />
              <div class="pt-2"><TypingDots /></div>
            </div>
          )}

          {error && (
            <div class="flex items-start gap-2.5">
              <BotAvatar />
              <p class="pt-0.5 text-[13px] text-amber-600 dark:text-amber-400">{parseError(error)}</p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div class="shrink-0 border-t border-border px-3 pb-2.5 pt-2">
        <div class="flex items-end gap-1.5 rounded-xl border border-border bg-muted/30 px-2.5 py-1.5 transition-colors focus-within:border-accent/40 focus-within:bg-background">
          <textarea
            ref={inputRef}
            rows={1}
            value={inputValue}
            onInput={(e) => { setInputValue((e.target as HTMLTextAreaElement).value); autoResize(); }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            maxLength={500}
            class="min-w-0 flex-1 resize-none bg-transparent py-0.5 text-[13px] leading-snug text-foreground outline-none placeholder:text-foreground-soft"
            style={{ maxHeight: '96px' }}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!inputValue.trim() || isStreaming || cooldown}
            class="mb-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-accent text-background transition-all hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-30"
          >
            {isStreaming ? (
              <svg class="size-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
            ) : (
              <svg class="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- AssistantMessage: renders text with Markdown links as clickable cards ----

function AssistantMessage({ text }: { text: string }) {
  const paragraphs = text.split('\n').filter(Boolean);
  return (
    <div class="space-y-1.5">
      {paragraphs.map((p, i) => (
        <p key={i} class="whitespace-pre-wrap"><RichText text={p} /></p>
      ))}
    </div>
  );
}

// ---- Small components ----

function BotAvatar() {
  return (
    <div class="flex size-5.5 shrink-0 items-center justify-center rounded-full bg-accent/15 mt-0.5">
      <BotIcon class="size-3 text-accent" />
    </div>
  );
}

function BotIcon({ class: cls }: { class?: string }) {
  return (
    <svg class={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" />
      <path d="M2 14h2" /><path d="M20 14h2" /><path d="M15 13v2" /><path d="M9 13v2" />
    </svg>
  );
}

function TypingDots() {
  return (
    <span class="inline-flex gap-1">
      <span class="size-1.5 animate-bounce rounded-full bg-foreground-soft [animation-delay:0ms]" />
      <span class="size-1.5 animate-bounce rounded-full bg-foreground-soft [animation-delay:150ms]" />
      <span class="size-1.5 animate-bounce rounded-full bg-foreground-soft [animation-delay:300ms]" />
    </span>
  );
}

function parseError(error: string): string {
  if (error.includes('请求太频繁') || error.includes('429') || error.includes('rate')) return '请求太频繁，请稍后再试';
  if (error.includes('503') || error.includes('不可用')) return 'AI 服务暂时不可用';
  return '出了点问题，请稍后再试';
}

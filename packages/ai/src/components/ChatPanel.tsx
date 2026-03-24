import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from 'ai';
import type { UIMessage } from 'ai';
import { APICallError } from '@ai-sdk/provider';
import { getMockResponse, createMockStream } from '../providers/mock.ts';
import type { ArticleChatContext, ChatStatusData } from '../server/types.ts';
import { isChatStatusData } from '../server/types.ts';
import { t, getLang } from '../utils/i18n.ts';
import { CodeBlock, generateFollowUpSuggestions, FollowUpSuggestions } from './CodeBlock.tsx';


export interface AIChatConfig {
  enabled?: boolean;
  mockMode?: boolean;
  apiEndpoint?: string;
  welcomeMessage?: string;
  placeholder?: string;
  authorName?: string;
  lang?: string;
}

interface ChatPanelProps {
  open: boolean;
  onClose: () => void;
  config: AIChatConfig;
  articleContext?: ArticleChatContext;
}

const MIN_SEND_INTERVAL_MS = 500;

// ── Typewriter Effect Hook ─────────────────────────────────────

const TYPEWRITER_SPEED_MS = 25;
const TYPEWRITER_BATCH_SIZE = 1;

function useTypewriter(fullText: string, isStreaming: boolean): string {
  const [displayedLength, setDisplayedLength] = useState(0);
  const prevFullTextRef = useRef(fullText);
  const prevStreamingRef = useRef(isStreaming);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (fullText !== prevFullTextRef.current && !fullText.startsWith(prevFullTextRef.current)) {
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
          const speed = behind > 20 ? Math.min(behind, 5) : TYPEWRITER_BATCH_SIZE;
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

  return fullText.slice(0, displayedLength) || (isStreaming ? '' : fullText);
}

function generateSessionId(articleContext?: ArticleChatContext): string {
  if (articleContext?.slug) return `article:${articleContext.slug}`;
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function getTextFromMessage(message: UIMessage): string {
  const parts = message.parts ?? [];
  return Array.isArray(parts)
    ? parts
        .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
        .map(p => p.text)
        .join('')
    : '';
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

  // APICallError from @ai-sdk/provider contains server response in responseBody,
  // not in error.message which may just be generic text like "Failed to fetch"
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
  // APICallError has isRetryable property from server response
  if (APICallError.isInstance(error)) {
    return error.isRetryable;
  }
  // Fallback: try parsing error.message for retryable flag
  try {
    const parsed = JSON.parse(error.message);
    if (typeof parsed?.retryable === 'boolean') return parsed.retryable;
  } catch { /* not JSON */ }
  // Default to true for unknown errors (allows retry button to show)
  return true;
}

// ── Rich Text Rendering ───────────────────────────────────────

type InlinePart =
  | { type: 'text'; text: string }
  | { type: 'link'; label: string; url: string }
  | { type: 'bold'; text: string }
  | { type: 'code'; text: string };

function parseInlineMarkdown(text: string): InlinePart[] {
  const parts: InlinePart[] = [];
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
  if (lastIndex < text.length) parts.push({ type: 'text', text: text.slice(lastIndex) });
  return parts;
}

function InlineRichText({ text }: { text: string }) {
  const parts = useMemo(() => parseInlineMarkdown(text), [text]);
  return (
    <span>
      {parts.map((p, i) => {
        if (p.type === 'link') {
          const isExternal = p.url.startsWith('http');
          return (
            <a key={i} href={p.url}
              class="inline-flex items-center gap-0.5 font-medium text-accent underline decoration-accent/30 underline-offset-2 transition-colors hover:decoration-accent"
              target={isExternal ? '_blank' : undefined} rel={isExternal ? 'noopener noreferrer' : undefined}>
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

// ── Block-level Markdown Rendering ────────────────────────────

interface BlockNode {
  type: 'paragraph' | 'code-block' | 'blockquote' | 'list';
  content: string;
  lang?: string;
  ordered?: boolean;
  items?: string[];
}

function parseBlocks(text: string): BlockNode[] {
  const lines = text.split('\n');
  const blocks: BlockNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // skip closing ```
      blocks.push({ type: 'code-block', content: codeLines.join('\n'), lang: lang || undefined });
      continue;
    }

    // Blockquote (consecutive > lines)
    if (line.startsWith('> ') || line === '>') {
      const quoteLines: string[] = [];
      while (i < lines.length && (lines[i].startsWith('> ') || lines[i] === '>')) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      blocks.push({ type: 'blockquote', content: quoteLines.join('\n') });
      continue;
    }

    // Unordered list (- or *)
    if (/^[-*]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s/, ''));
        i++;
      }
      blocks.push({ type: 'list', content: '', ordered: false, items });
      continue;
    }

    // Ordered list (1. 2. etc)
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ''));
        i++;
      }
      blocks.push({ type: 'list', content: '', ordered: true, items });
      continue;
    }

    // Empty line - skip
    if (!line.trim()) {
      i++;
      continue;
    }

    // Regular paragraph (collect consecutive non-special lines)
    const paraLines: string[] = [];
    while (i < lines.length && lines[i].trim() && !lines[i].startsWith('```') &&
      !lines[i].startsWith('> ') && lines[i] !== '>' &&
      !/^[-*]\s/.test(lines[i]) && !/^\d+\.\s/.test(lines[i])) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length) {
      blocks.push({ type: 'paragraph', content: paraLines.join('\n') });
    }
  }

  return blocks;
}

function RichText({ text, isStreaming }: { text: string; isStreaming?: boolean }) {
  const blocks = useMemo(() => parseBlocks(text), [text]);
  return (
    <div class="space-y-2">
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'code-block':
            return (
              <CodeBlock 
                key={i} 
                code={block.content} 
                lang={block.lang} 
                isStreaming={isStreaming}
              />
            );
          case 'blockquote':
            return (
              <blockquote key={i} class="border-l-2 border-accent/40 pl-3 text-foreground-soft italic">
                <InlineRichText text={block.content} />
              </blockquote>
            );
          case 'list':
            if (block.ordered) {
              return (
                <ol key={i} class="list-decimal space-y-0.5 pl-5">
                  {block.items?.map((item, j) => (
                    <li key={j}><InlineRichText text={item} /></li>
                  ))}
                </ol>
              );
            }
            return (
              <ul key={i} class="list-disc space-y-0.5 pl-5">
                {block.items?.map((item, j) => (
                  <li key={j}><InlineRichText text={item} /></li>
                ))}
              </ul>
            );
          case 'paragraph':
          default:
            return (
              <p key={i} class="whitespace-pre-wrap"><InlineRichText text={block.content} /></p>
            );
        }
      })}
    </div>
  );
}

// ── Reasoning Collapse Component ──────────────────────────────

function ReasoningBlock({ text, isStreaming, lang = 'zh' }: { text: string; isStreaming?: boolean; lang?: string }) {
  const isEmpty = text.length === 0;
  const l = getLang(lang);
  return (
    <details class="group rounded-lg border border-border/50 bg-muted/30 overflow-hidden" open={isStreaming || !isEmpty}>
      <summary class="flex cursor-pointer items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-foreground-soft transition-colors hover:bg-muted/50 hover:text-foreground">
        <svg class="size-3.5 transition-transform group-open:rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m9 18 6-6-6-6"/>
        </svg>
        <span class="flex items-center gap-1">
          {isStreaming ? (
            <svg class="size-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
          ) : (
            <svg class="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 16v-4"/>
              <path d="M12 8h.01"/>
            </svg>
          )}
          {isStreaming && isEmpty ? t('ai.reasoning.thinking', l) : isStreaming ? t('ai.reasoning.thinking', l).replace('...', '') : t('ai.reasoning.viewReasoning', l)}
        </span>
      </summary>
      <div class="border-t border-border/30 bg-background/50 px-2.5 py-2">
        {isEmpty && isStreaming ? (
          <div class="flex items-center gap-2 text-[11px] text-foreground-soft">
            <span class="inline-flex gap-1">
              <span class="size-1.5 animate-bounce rounded-full bg-foreground-soft [animation-delay:0ms]" />
              <span class="size-1.5 animate-bounce rounded-full bg-foreground-soft [animation-delay:150ms]" />
              <span class="size-1.5 animate-bounce rounded-full bg-foreground-soft [animation-delay:300ms]" />
            </span>
            <span>{t('ai.reasoning.waiting', l)}</span>
          </div>
        ) : (
          <pre class="whitespace-pre-wrap text-[11px] leading-relaxed text-foreground-soft font-mono">{text}</pre>
        )}
      </div>
    </details>
  );
}

// ── Message Rendering (parts-based) ──────────────────────────

type ReasoningPart = { type: 'reasoning'; text: string; state?: 'streaming' | 'done' };

function AssistantMessage({ message, isStreaming, lang = 'zh', articleContext, onFollowUp }: { message: UIMessage; isStreaming?: boolean; lang?: string; articleContext?: ArticleChatContext; onFollowUp?: (text: string) => void }) {
  const fullText = getTextFromMessage(message);
  const displayedText = useTypewriter(fullText, isStreaming ?? false);

  const reasoningParts = message.parts.filter((p): p is ReasoningPart => p.type === 'reasoning');
  const reasoningFullText = reasoningParts.map(p => p.text).join('');
  const reasoningDisplayed = useTypewriter(reasoningFullText, isStreaming ?? false);
  const hasReasoning = reasoningFullText.length > 0;

  const isWaitingForContent = isStreaming && !fullText && !reasoningFullText;

  const sources = message.parts.filter(p => p.type === 'source-url' || p.type === 'source-document');
  
  const followUpSuggestions = useMemo(() => {
    if (isStreaming || !fullText || !onFollowUp) return [];
    return generateFollowUpSuggestions(fullText, articleContext);
  }, [isStreaming, fullText, articleContext, onFollowUp]);


  if (isWaitingForContent) {
    return (
      <div class="space-y-1.5">
        <ReasoningBlock text="" isStreaming={true} lang={lang} />
      </div>
    );
  }

  if (!fullText && !hasReasoning) return null;

  return (
    <div class="space-y-1.5">
      {hasReasoning && (
        <ReasoningBlock text={reasoningDisplayed} isStreaming={isStreaming} lang={lang} />
      )}
      {displayedText && <RichText text={displayedText} isStreaming={isStreaming} />}
      {!isStreaming && sources.length > 0 && (
        <div class="mt-2 flex flex-wrap gap-1.5">
          {sources.map((s, i) => {
            const part = s as { url?: string; title?: string };
            return (
              <a key={i} href={part.url ?? '#'}
                class="inline-flex items-center gap-1 rounded-md border border-border bg-muted/30 px-2 py-0.5 text-[11px] text-foreground-soft transition-colors hover:border-accent/40 hover:text-foreground"
                target="_blank" rel="noopener noreferrer">
                <svg class="size-2.5 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                {part.title ?? 'Source'}
              </a>
            );
          })}
        </div>
      )}
      {!isStreaming && followUpSuggestions.length > 0 && onFollowUp && (
        <FollowUpSuggestions suggestions={followUpSuggestions} onSend={onFollowUp} lang={lang} />
      )}
    </div>
  );
}

// ── Small Components ──────────────────────────────────────────

function ExternalLinkIcon() {
  return (
    <svg class="inline-block size-3 shrink-0 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

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

function TypingDots({ statusMessage }: { statusMessage?: string }) {
  return (
    <div class="flex items-center gap-2">
      <span class="inline-flex gap-1">
        <span class="size-1.5 animate-bounce rounded-full bg-foreground-soft [animation-delay:0ms]" />
        <span class="size-1.5 animate-bounce rounded-full bg-foreground-soft [animation-delay:150ms]" />
        <span class="size-1.5 animate-bounce rounded-full bg-foreground-soft [animation-delay:300ms]" />
      </span>
      {statusMessage && (
        <span class="text-[11px] text-foreground-soft">{statusMessage}</span>
      )}
    </div>
  );
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
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastSendRef = useRef(0);
  const [inputValue, setInputValue] = useState('');
  const [cooldown, setCooldown] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>();
  
  // Panel size state with localStorage persistence
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

  // Persist size preference
  useEffect(() => {
    try {
      localStorage.setItem('ai-chat-panel-size', panelSize);
    } catch { /* ignore */ }
  }, [panelSize]);

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
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onError: (err) => {
      console.error('[ChatPanel] Chat error:', err.message);
    },
    async onToolCall({ toolCall }) {
      const executor = (window as unknown as { __actionExecutor?: { execute: (a: { type: string; payload: Record<string, unknown> }) => Promise<{ success: boolean }> } }).__actionExecutor;
      
      if (!executor) {
        console.warn('[ChatPanel] ActionExecutor not initialized');
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
        return;
      }

      try {
        const action = mapper(toolCall.input as Record<string, unknown>);
        await executor.execute(action);
        addToolOutput({
          tool: toolCall.toolName,
          toolCallId: toolCall.toolCallId,
          output: { success: true },
        });
      } catch (error) {
        console.error('[ChatPanel] Tool execution error:', error);
        addToolOutput({
          tool: toolCall.toolName,
          toolCallId: toolCall.toolCallId,
          output: { success: false, error: String(error) },
        });
      }
    },
  });

  useEffect(() => {
    if (liveMessages.length === 0) {
      liveSetMessages([welcomeMessage]);
    }
  }, []);

  // ── Mock Mode ───────────────────────────────────────────────

  const mockChat = useMockChat(lang);

  // ── Unified State ───────────────────────────────────────────

  const isStreaming = isMockMode ? mockChat.isStreaming : (liveStatus === 'streaming' || liveStatus === 'submitted');
  const error = isMockMode ? null : liveError;

  useEffect(() => {
    if (isMockMode || !liveMessages.length) return;
    for (let i = liveMessages.length - 1; i >= 0; i--) {
      const msg = liveMessages[i];
      if (msg.role === 'assistant' && isChatStatusData(msg.metadata)) {
        setStatusMessage((msg.metadata as ChatStatusData).message);
        return;
      }
    }
    setStatusMessage(undefined);
  }, [liveMessages, isMockMode]);

  // ── Scroll & Focus ──────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [liveMessages, mockChat.messages]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  const autoResize = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 96) + 'px';
  }, []);

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
    if (inputRef.current) inputRef.current.style.height = 'auto';

    if (isMockMode) {
      mockChat.sendMessage(trimmed);
    } else {
      liveSendMessage({ text: trimmed });
    }
  }, [isStreaming, cooldown, isMockMode, mockChat, liveSendMessage]);

  const handleSend = useCallback(() => doSend(inputValue), [doSend, inputValue]);
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  const handleClear = useCallback(() => {
    if (isMockMode) {
      mockChat.clear();
    } else {
      liveSetMessages([welcomeMessage]);
    }
    setInputValue('');
    setStatusMessage(undefined);
  }, [isMockMode, mockChat, liveSetMessages, welcomeMessage]);

  if (!open) return null;

  // ── Render Messages ─────────────────────────────────────────

  const renderMockMessages = () => (
    <>
      {/* Welcome */}
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
            <BotIcon class="size-3 text-accent" />
          </div>
          <div class="flex flex-col">
            <span class="text-[13px] font-semibold text-foreground">{t('ai.assistantName', lang)}</span>
            {articleContext && (
              <span class="max-w-[180px] truncate text-[10px] text-foreground-soft">
                {t('ai.header.reading', lang)}{articleContext.title}
              </span>
            )}
          </div>
          <span class={`rounded-full px-1.5 py-px text-[10px] font-medium ${
            isMockMode ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'bg-green-500/15 text-green-600 dark:text-green-400'
          }`}>
            {isMockMode ? t('ai.header.mode', lang) : t('ai.status.live', lang)}
          </span>
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
              >
                {size}
              </button>
            ))}
          </div>
          <button type="button" onClick={handleClear}
            class="rounded-md p-1 text-foreground-soft transition-colors hover:bg-muted/60 hover:text-foreground"
            title={t('ai.clear', lang)}>
            <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
          </button>
          <button type="button" onClick={onClose}
            class="rounded-md p-1 text-foreground-soft transition-colors hover:bg-muted/60 hover:text-foreground"
            title={t('ai.close', lang)}>
            <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3.5 py-3 [scrollbar-width:thin]">
        <div class="space-y-4">
          {isMockMode ? renderMockMessages() : renderLiveMessages()}

          {error && (
            <div class="flex items-start gap-2.5">
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
      <div class="shrink-0 border-t border-border px-3 pb-2.5 pt-2">
        <div class="flex items-end gap-1.5 rounded-xl border border-border bg-muted/30 px-2.5 py-1.5 transition-colors focus-within:border-accent/40 focus-within:bg-background">
          <textarea id="ai-chat-input" ref={inputRef} rows={1} value={inputValue}
            onInput={(e) => { setInputValue((e.target as HTMLTextAreaElement).value); autoResize(); }}
            onKeyDown={handleKeyDown} placeholder={placeholder} maxLength={500}
            class="min-w-0 flex-1 resize-none bg-transparent py-0.5 text-[13px] leading-snug text-foreground outline-none placeholder:text-foreground-soft"
            style={{ maxHeight: '96px' }} />
          <button type="button" onClick={handleSend}
            disabled={!inputValue.trim() || isStreaming || cooldown}
            class="mb-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-accent text-background transition-all hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-30">
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

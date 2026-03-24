import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { UIMessage } from 'ai';
import type { ArticleChatContext } from '../server/types.ts';
import { RichText } from './RichText.tsx';
import { ReasoningBlock } from './ReasoningBlock.tsx';
import { generateFollowUpSuggestions, FollowUpSuggestions } from './CodeBlock.tsx';

// ── Typewriter Effect Hook ─────────────────────────────────────

const TYPEWRITER_SPEED_MS = 25;
const TYPEWRITER_BATCH_SIZE = 1;

export function useTypewriter(fullText: string, isStreaming: boolean): string {
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

  if (!isStreaming) return fullText;
  if (displayedLength <= 0) return '';
  if (displayedLength >= fullText.length) return fullText;

  let end = displayedLength;
  const fence = fullText.indexOf('```', Math.max(0, end - 2));
  if (fence !== -1 && fence < end + 3) {
    const fenceEnd = fence + 3;
    const newline = fullText.indexOf('\n', fenceEnd);
    end = newline !== -1 ? newline + 1 : fenceEnd;
  }
  return fullText.slice(0, end);
}

// ── Message Text Extractor ────────────────────────────────────

export function getTextFromMessage(message: UIMessage): string {
  const parts = message.parts ?? [];
  return Array.isArray(parts)
    ? parts
        .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
        .map(p => p.text)
        .join('')
    : '';
}

// ── Icons & Small Components ──────────────────────────────────

export function BotIcon({ class: cls }: { class?: string }) {
  return (
    <svg class={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" />
      <path d="M2 14h2" /><path d="M20 14h2" /><path d="M15 13v2" /><path d="M9 13v2" />
    </svg>
  );
}

export function BotAvatar() {
  return (
    <div class="flex size-5.5 shrink-0 items-center justify-center rounded-full bg-accent/15 mt-0.5">
      <BotIcon class="size-3 text-accent" />
    </div>
  );
}

export function TypingDots({ statusMessage }: { statusMessage?: string }) {
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

// ── Assistant Message Rendering ───────────────────────────────

type ReasoningPart = { type: 'reasoning'; text: string; state?: 'streaming' | 'done' };

export function AssistantMessage({ message, isStreaming, lang = 'zh', articleContext, onFollowUp }: {
  message: UIMessage;
  isStreaming?: boolean;
  lang?: string;
  articleContext?: ArticleChatContext;
  onFollowUp?: (text: string) => void;
}) {
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

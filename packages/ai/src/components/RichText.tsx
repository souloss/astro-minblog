import { useMemo } from 'preact/hooks';
import { CodeBlock } from './CodeBlock.tsx';

const SAFE_URL_RE = /^(?:https?|mailto):/i;

function sanitizeUrl(url: string): string {
  if (SAFE_URL_RE.test(url) || url.startsWith('/') || url.startsWith('#')) return url;
  return '#';
}

type InlinePart =
  | { type: 'text'; text: string }
  | { type: 'link'; label: string; url: string }
  | { type: 'bold'; text: string }
  | { type: 'code'; text: string };

export function parseInlineMarkdown(text: string): InlinePart[] {
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

function ExternalLinkIcon() {
  return (
    <svg class="inline-block size-3 shrink-0 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

export function InlineRichText({ text }: { text: string }) {
  const parts = useMemo(() => parseInlineMarkdown(text), [text]);
  return (
    <span>
      {parts.map((p, i) => {
        if (p.type === 'link') {
          const safeUrl = sanitizeUrl(p.url);
          const isExternal = safeUrl.startsWith('http');
          return (
            <a key={i} href={safeUrl}
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

export function parseBlocks(text: string): BlockNode[] {
  const lines = text.split('\n');
  const blocks: BlockNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++;
      blocks.push({ type: 'code-block', content: codeLines.join('\n'), lang: lang || undefined });
      continue;
    }

    if (line.startsWith('> ') || line === '>') {
      const quoteLines: string[] = [];
      while (i < lines.length && (lines[i].startsWith('> ') || lines[i] === '>')) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      blocks.push({ type: 'blockquote', content: quoteLines.join('\n') });
      continue;
    }

    if (/^[-*]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s/, ''));
        i++;
      }
      blocks.push({ type: 'list', content: '', ordered: false, items });
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ''));
        i++;
      }
      blocks.push({ type: 'list', content: '', ordered: true, items });
      continue;
    }

    if (!line.trim()) {
      i++;
      continue;
    }

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

export function RichText({ text, isStreaming }: { text: string; isStreaming?: boolean }) {
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

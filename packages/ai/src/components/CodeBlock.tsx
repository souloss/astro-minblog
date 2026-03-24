import { useEffect, useState } from 'preact/hooks';
import type { FunctionalComponent, VNode } from 'preact';
import { CopyButton } from './VizShared.tsx';
import { MermaidBlock } from './MermaidBlock.tsx';
import { MarkmapBlock } from './MarkmapBlock.tsx';

export { MermaidBlock, MarkmapBlock };

export interface CodeBlockProps {
  code: string;
  lang?: string;
  isStreaming?: boolean;
}

export interface HighlightResult {
  html: string;
  loading: boolean;
  error?: string;
}

const LANG_ALIASES: Record<string, string> = {
  'js': 'javascript',
  'ts': 'typescript',
  'py': 'python',
  'rb': 'ruby',
  'sh': 'bash',
  'shell': 'bash',
  'yml': 'yaml',
  'md': 'markdown',
  'text': 'plaintext',
};

function normalizeLang(lang?: string): string {
  if (!lang) return 'plaintext';
  const lower = lang.toLowerCase();
  return LANG_ALIASES[lower] || lower;
}

interface ShikiLike {
  codeToHtml: (code: string, options: { lang: string; theme: string }) => Promise<string>;
}

let shikiModule: Promise<unknown> | null = null;
let highlighterCache: ShikiLike | null = null;

async function loadShikiHighlighter(): Promise<ShikiLike | null> {
  if (highlighterCache) return highlighterCache;
  
  if (!shikiModule) {
    shikiModule = import('shiki').catch(() => null);
  }
  
  const mod = await shikiModule;
  if (!mod || typeof mod !== 'object') return null;
  
  const shiki = mod as { codeToHtml?: unknown };
  if (typeof shiki.codeToHtml === 'function') {
    highlighterCache = shiki as ShikiLike;
    return highlighterCache;
  }
  
  return null;
}

export function useShikiHighlighter(code: string, lang?: string): HighlightResult {
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const normalizedLang = normalizeLang(lang);
  
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(undefined);
    
    loadShikiHighlighter()
      .then(async (highlighter) => {
        if (!mounted) return;
        
        if (!highlighter) {
          setHtml(escapeHtml(code));
          setLoading(false);
          return;
        }
        
        try {
          const isDark = typeof document !== 'undefined' && 
            document.documentElement.getAttribute('data-theme') === 'dark';
          const theme = isDark ? 'github-dark' : 'github-light';
          
          const highlighted = await highlighter.codeToHtml(code, {
            lang: normalizedLang,
            theme,
          });
          
          if (mounted) {
            setHtml(highlighted);
            setLoading(false);
          }
        } catch (err) {
          if (mounted) {
            setHtml(escapeHtml(code));
            setError(err instanceof Error ? err.message : 'Highlight error');
            setLoading(false);
          }
        }
      })
      .catch((err) => {
        if (mounted) {
          setHtml(escapeHtml(code));
          setError(err instanceof Error ? err.message : 'Shiki load error');
          setLoading(false);
        }
      });
    
    return () => { mounted = false; };
  }, [code, normalizedLang]);
  
  return { html, loading, error };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ── Regular Code Block ───────────────────────────────────────────

export function CodeBlock({ code, lang, isStreaming }: CodeBlockProps): VNode {
  const normalizedLang = lang?.toLowerCase();
  
  if (normalizedLang === 'mermaid') {
    return <MermaidBlock code={code} isStreaming={isStreaming} />;
  }
  
  if (normalizedLang === 'markmap' || normalizedLang === 'mindmap') {
    return <MarkmapBlock code={code} isStreaming={isStreaming} />;
  }
  
  const { html, loading, error } = useShikiHighlighter(isStreaming ? '' : code, lang);
  
  if (isStreaming || loading) {
    return (
      <div class="code-block-wrapper group relative">
        <pre class="overflow-x-auto rounded-md bg-muted/60 px-3 py-2 text-[12px] leading-relaxed font-mono">
          <code>{code}</code>
        </pre>
        {lang && (
          <span class="absolute right-2 top-1 text-[10px] font-medium text-foreground-soft/50 bg-muted/80 px-1.5 py-0.5 rounded">
            {lang}
          </span>
        )}
      </div>
    );
  }
  
  if (html && !error) {
    return (
      <div class="code-block-wrapper group relative">
        <div 
          class="code-highlight overflow-x-auto rounded-md text-[12px] leading-relaxed [&_pre]:!bg-muted/60 [&_pre]:!p-3 [&_pre]:!m-0"
          dangerouslySetInnerHTML={{ __html: html }} 
        />
        {lang && (
          <span class="absolute right-2 top-1 text-[10px] font-medium text-foreground-soft/50 bg-muted/80 px-1.5 py-0.5 rounded">
            {lang}
          </span>
        )}
        <CopyButton code={code} />
      </div>
    );
  }
  
  return (
    <div class="code-block-wrapper group relative">
      <pre class="overflow-x-auto rounded-md bg-muted/60 px-3 py-2 text-[12px] leading-relaxed font-mono">
        <code>{code}</code>
      </pre>
      {lang && (
        <span class="absolute right-2 top-1 text-[10px] font-medium text-foreground-soft/50 bg-muted/80 px-1.5 py-0.5 rounded">
          {lang}
        </span>
      )}
      <CopyButton code={code} />
    </div>
  );
}

// ── Follow Up Suggestions ────────────────────────────────────────

export interface FollowUpSuggestion {
  text: string;
  icon?: string;
}

interface FollowUpSuggestionsProps {
  suggestions: FollowUpSuggestion[];
  onSend: (text: string) => void;
  lang?: string;
}

export function generateFollowUpSuggestions(
  responseText: string,
  articleContext?: { title?: string; keyPoints?: string[] }
): FollowUpSuggestion[] {
  const suggestions: FollowUpSuggestion[] = [];
  const lowerText = responseText.toLowerCase();
  
  if (lowerText.includes('```') || lowerText.includes('code') || lowerText.includes('代码')) {
    suggestions.push({ text: '解释这段代码', icon: 'code' });
  }
  
  if (lowerText.includes('config') || lowerText.includes('配置') || lowerText.includes('设置')) {
    suggestions.push({ text: '详细配置步骤', icon: 'config' });
  }
  
  if (lowerText.includes('文章') || lowerText.includes('article') || lowerText.includes('post')) {
    suggestions.push({ text: '推荐相关文章', icon: 'article' });
  }
  
  if (lowerText.includes('如何') || lowerText.includes('how to')) {
    suggestions.push({ text: '举个具体例子', icon: 'example' });
  }
  
  if (articleContext?.title) {
    suggestions.push({ text: `详解 "${articleContext.title.slice(0, 20)}..."`, icon: 'detail' });
  }
  
  return suggestions.slice(0, 3);
}

export const FollowUpSuggestions: FunctionalComponent<FollowUpSuggestionsProps> = ({ 
  suggestions, 
  onSend 
}) => {
  if (suggestions.length === 0) return null;
  
  return (
    <div class="follow-up-suggestions mt-2 flex flex-wrap gap-1.5">
      {suggestions.map((s, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSend(s.text)}
          class="inline-flex items-center gap-1 rounded-full border border-border bg-muted/30 px-2.5 py-1 text-[11px] text-foreground-soft transition-colors hover:border-accent/40 hover:bg-accent/10 hover:text-foreground"
        >
          {s.text}
        </button>
      ))}
    </div>
  );
};
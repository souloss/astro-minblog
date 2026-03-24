import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { FunctionalComponent, VNode } from 'preact';

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

// ── Visualization Toolbar Component ─────────────────────────────────

interface VizToolbarProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onFullscreen: () => void;
  onShowSource: () => void;
  showSourceActive?: boolean;
}

function VizToolbar({ onZoomIn, onZoomOut, onReset, onFullscreen, onShowSource, showSourceActive }: VizToolbarProps) {
  return (
    <div class="viz-toolbar absolute right-2 top-2 z-10 flex items-center gap-0.5 rounded-lg border border-[var(--viz-border)] bg-[var(--viz-btn-bg)] p-1 opacity-0 shadow-sm backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100">
      <button
        type="button"
        onClick={onZoomIn}
        class="flex size-6 items-center justify-center rounded-md text-foreground-soft transition-colors hover:bg-[var(--viz-btn-hover)] hover:text-accent"
        aria-label="Zoom in"
        title="Zoom in"
      >
        <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
      <button
        type="button"
        onClick={onZoomOut}
        class="flex size-6 items-center justify-center rounded-md text-foreground-soft transition-colors hover:bg-[var(--viz-btn-hover)] hover:text-accent"
        aria-label="Zoom out"
        title="Zoom out"
      >
        <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
      <button
        type="button"
        onClick={onReset}
        class="flex size-6 items-center justify-center rounded-md text-foreground-soft transition-colors hover:bg-[var(--viz-btn-hover)] hover:text-accent"
        aria-label="Reset view"
        title="Reset view"
      >
        <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
        </svg>
      </button>
      <div class="mx-0.5 h-3.5 w-px bg-[var(--viz-border)]" />
      <button
        type="button"
        onClick={onFullscreen}
        class="flex size-6 items-center justify-center rounded-md text-foreground-soft transition-colors hover:bg-[var(--viz-btn-hover)] hover:text-accent"
        aria-label="Toggle fullscreen"
        title="Toggle fullscreen"
      >
        <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M21 8V5a2 2 0 0 0-2-2h-3" />
          <path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" />
        </svg>
      </button>
      <button
        type="button"
        onClick={onShowSource}
        class={`flex size-6 items-center justify-center rounded-md transition-colors ${
          showSourceActive 
            ? 'bg-accent/20 text-accent' 
            : 'text-foreground-soft hover:bg-[var(--viz-btn-hover)] hover:text-accent'
        }`}
        aria-label="Toggle source code"
        title="Toggle source code"
      >
        <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
        </svg>
      </button>
    </div>
  );
}

// ── Copy Button Component ─────────────────────────────────────────

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = code;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } finally {
        document.body.removeChild(textarea);
      }
    }
  }, [code]);
  
  return (
    <button
      type="button"
      onClick={handleCopy}
      class="absolute right-2 top-2 z-10 flex size-6 items-center justify-center rounded-md border border-[var(--viz-border)] bg-[var(--viz-btn-bg)] text-foreground-soft opacity-0 shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-[var(--viz-btn-hover)] hover:text-accent group-hover:opacity-100 focus-within:opacity-100"
      aria-label={copied ? 'Copied!' : 'Copy code'}
      title={copied ? 'Copied!' : 'Copy code'}
    >
      {copied ? (
        <svg class="size-3.5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
        </svg>
      )}
    </button>
  );
}

// ── Skeleton Loading Component ────────────────────────────────────

function SkeletonLoader({ height = '120px' }: { height?: string }) {
  return (
    <div class="flex items-center justify-center" style={{ minHeight: height }}>
      <div class="flex flex-col items-center gap-2">
        <svg class="size-5 animate-spin text-foreground-soft/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        <div class="flex gap-1">
          <span class="size-1.5 animate-pulse rounded-full bg-foreground-soft/30" />
          <span class="size-1.5 animate-pulse rounded-full bg-foreground-soft/30 [animation-delay:150ms]" />
          <span class="size-1.5 animate-pulse rounded-full bg-foreground-soft/30 [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

// ── Mermaid Block ────────────────────────────────────────────────

interface MermaidResult {
  svg: string;
  loading: boolean;
  error?: string;
}

function useMermaid(code: string): MermaidResult {
  const [svg, setSvg] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(undefined);
    
    import('mermaid')
      .then(async ({ default: mermaid }) => {
        if (!mounted) return;
        
        try {
          const isDark = typeof document !== 'undefined' && 
            document.documentElement.getAttribute('data-theme') === 'dark';
          
          mermaid.initialize({
            startOnLoad: false,
            securityLevel: 'loose',
            theme: isDark ? 'dark' : 'default',
          });
          
          const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2)}`;
          const { svg: rendered } = await mermaid.render(id, code);
          
          if (mounted) {
            setSvg(rendered);
            setLoading(false);
          }
        } catch (err) {
          if (mounted) {
            setError(err instanceof Error ? err.message : 'Mermaid error');
            setLoading(false);
          }
        }
      })
      .catch(() => {
        if (mounted) {
          setError('Mermaid not available');
          setLoading(false);
        }
      });
    
    return () => { mounted = false; };
  }, [code]);
  
  return { svg, loading, error };
}

export function MermaidBlock({ code, isStreaming }: CodeBlockProps): VNode | null {
  const { svg, loading, error } = useMermaid(isStreaming ? '' : code);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [showSource, setShowSource] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Stable key based on content hash for re-render persistence
  const contentKey = useMemo(() => {
    if (!code) return '';
    let hash = 0;
    for (let i = 0; i < code.length; i++) {
      const char = code.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `mermaid-${Math.abs(hash).toString(36)}`;
  }, [code]);
  
  const handleZoomIn = useCallback(() => setScale(s => Math.min(5, s + 0.2)), []);
  const handleZoomOut = useCallback(() => setScale(s => Math.max(0.3, s - 0.2)), []);
  const handleReset = useCallback(() => setScale(1), []);
  const handleShowSource = useCallback(() => setShowSource(v => !v), []);
  
  const handleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (document.fullscreenElement === containerRef.current) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen().catch(() => {});
    }
  }, []);
  
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const handleChange = () => {
      setIsFullscreen(document.fullscreenElement === container);
    };
    
    container.addEventListener('fullscreenchange', handleChange);
    return () => container.removeEventListener('fullscreenchange', handleChange);
  }, []);
  
  // Escape key to close fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && document.fullscreenElement) {
        document.exitFullscreen();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);
  
  if (isStreaming || loading) {
    return (
      <div class="mermaid-block group relative overflow-hidden rounded-md border border-[var(--viz-border)] bg-[var(--viz-bg)] p-3">
        <SkeletonLoader height="80px" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div class="mermaid-block">
        <pre class="overflow-x-auto rounded-md bg-muted/60 px-3 py-2 text-[12px] leading-relaxed font-mono">
          <code class="text-amber-600 dark:text-amber-400">{code}</code>
        </pre>
        <div class="mt-1 px-1 text-[10px] text-foreground-soft">Mermaid: {error}</div>
      </div>
    );
  }
  
  return (
    <div 
      ref={containerRef}
      key={contentKey}
      class={`mermaid-block group relative overflow-auto rounded-md border border-[var(--viz-border)] bg-[var(--viz-bg)] ${
        isFullscreen ? 'fixed inset-0 z-[100] p-4' : 'p-3'
      }`}
      style={isFullscreen ? { background: 'var(--background)' } : undefined}
    >
      {showSource ? (
        <pre class="overflow-auto text-[11px] leading-relaxed font-mono text-foreground-soft">
          <code>{code}</code>
        </pre>
      ) : (
        <div 
          class="overflow-auto origin-center transition-transform duration-200"
          style={{ transform: `scale(${scale})` }}
          dangerouslySetInnerHTML={{ __html: svg }} 
        />
      )}
      <VizToolbar 
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onReset={handleReset}
        onFullscreen={handleFullscreen}
        onShowSource={handleShowSource}
        showSourceActive={showSource}
      />
    </div>
  );
}

// ── Markmap Block ────────────────────────────────────────────────

interface MarkmapResult {
  loading: boolean;
  error?: string;
}

function useMarkmap(
  containerRef: { current: Element | null },
  code: string,
  visible: boolean
): MarkmapResult {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const markmapInstanceRef = useRef<{ destroy?: () => void } | null>(null);
  
  useEffect(() => {
    let mounted = true;
    
    if (!containerRef.current || !code || !visible) {
      setLoading(!visible);
      return;
    }
    
    setLoading(true);
    setError(undefined);
    
    // Cleanup previous instance
    if (markmapInstanceRef.current?.destroy) {
      markmapInstanceRef.current.destroy();
      markmapInstanceRef.current = null;
    }
    
    Promise.all([
      import('markmap-lib'),
      import('markmap-view'),
    ])
      .then(async ([markmapLib, markmapView]) => {
        if (!mounted || !containerRef.current) return;
        
        try {
          const { Transformer } = markmapLib;
          const { Markmap } = markmapView;
          
          const transformer = new Transformer();
          const { root } = transformer.transform(code);
          
          containerRef.current.innerHTML = '';
          
          const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svgEl.setAttribute('class', 'markmap-svg w-full');
          svgEl.style.minHeight = '200px';
          containerRef.current.appendChild(svgEl);
          
          const mm = new Markmap(svgEl);
          mm.setData(root);
          mm.fit();
          
          // Store instance for cleanup
          markmapInstanceRef.current = mm as { destroy?: () => void };
          
          if (mounted) {
            setLoading(false);
          }
        } catch (err) {
          if (mounted) {
            setError(err instanceof Error ? err.message : 'Markmap error');
            setLoading(false);
          }
        }
      })
      .catch(() => {
        if (mounted) {
          setError('Markmap not available');
          setLoading(false);
        }
      });
    
    return () => { 
      mounted = false;
      if (markmapInstanceRef.current?.destroy) {
        markmapInstanceRef.current.destroy();
      }
    };
  }, [code, visible]);
  
  return { loading, error };
}

export function MarkmapBlock({ code, isStreaming }: CodeBlockProps): VNode | null {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [showSource, setShowSource] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  
  // Use IntersectionObserver for lazy loading and visibility tracking
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );
    
    observer.observe(container);
    return () => observer.disconnect();
  }, []);
  
  const { loading, error } = useMarkmap(containerRef, isStreaming ? '' : code, isVisible);
  
  // Stable key based on content hash for re-render persistence
  const contentKey = useMemo(() => {
    if (!code) return '';
    let hash = 0;
    for (let i = 0; i < code.length; i++) {
      const char = code.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `markmap-${Math.abs(hash).toString(36)}`;
  }, [code]);
  
  const handleZoomIn = useCallback(() => setScale(s => Math.min(5, s + 0.2)), []);
  const handleZoomOut = useCallback(() => setScale(s => Math.max(0.3, s - 0.2)), []);
  const handleReset = useCallback(() => setScale(1), []);
  const handleShowSource = useCallback(() => setShowSource(v => !v), []);
  
  const handleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (document.fullscreenElement === containerRef.current) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen().catch(() => {});
    }
  }, []);
  
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const handleChange = () => {
      setIsFullscreen(document.fullscreenElement === container);
    };
    
    container.addEventListener('fullscreenchange', handleChange);
    return () => container.removeEventListener('fullscreenchange', handleChange);
  }, []);
  
  // Escape key to close fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && document.fullscreenElement) {
        document.exitFullscreen();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);
  
  if (isStreaming || loading) {
    return (
      <div class="markmap-block group relative overflow-hidden rounded-md border border-[var(--viz-border)] bg-[var(--viz-bg)] p-3" style={{ maxHeight: isFullscreen ? 'none' : '400px' }}>
        <SkeletonLoader height="120px" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div class="markmap-block">
        <pre class="overflow-x-auto rounded-md bg-muted/60 px-3 py-2 text-[12px] leading-relaxed font-mono">
          <code class="text-amber-600 dark:text-amber-400">{code}</code>
        </pre>
        <div class="mt-1 px-1 text-[10px] text-foreground-soft">Markmap: {error}</div>
      </div>
    );
  }
  
  return (
    <div 
      ref={containerRef}
      key={contentKey}
      class={`markmap-block group relative overflow-auto rounded-md border border-[var(--viz-border)] bg-[var(--viz-bg)] ${
        isFullscreen ? 'fixed inset-0 z-[100] p-4' : 'p-3'
      }`}
      style={{ 
        maxHeight: isFullscreen ? 'none' : '400px',
        background: isFullscreen ? 'var(--background)' : undefined 
      }}
    >
      {showSource ? (
        <pre class="overflow-auto text-[11px] leading-relaxed font-mono text-foreground-soft">
          <code>{code}</code>
        </pre>
      ) : (
        <div 
          class="markmap-content origin-center transition-transform duration-200"
          style={{ transform: `scale(${scale})` }}
        />
      )}
      <VizToolbar 
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onReset={handleReset}
        onFullscreen={handleFullscreen}
        onShowSource={handleShowSource}
        showSourceActive={showSource}
      />
    </div>
  );
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
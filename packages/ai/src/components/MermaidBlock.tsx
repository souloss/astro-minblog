import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { VNode } from 'preact';
import type { CodeBlockProps } from './CodeBlock.tsx';
import { SkeletonLoader, VizToolbar } from './VizShared.tsx';

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
            securityLevel: 'strict',
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

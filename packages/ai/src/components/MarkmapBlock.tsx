import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { VNode } from 'preact';
import type { CodeBlockProps } from './CodeBlock.tsx';
import { SkeletonLoader, VizToolbar } from './VizShared.tsx';

interface MarkmapResult {
  loading: boolean;
  error?: string;
}

function useMarkmap(
  svgRef: { current: SVGSVGElement | null },
  code: string,
  visible: boolean
): MarkmapResult {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const markmapInstanceRef = useRef<{ destroy?: () => void } | null>(null);
  
  useEffect(() => {
    if (!code || !visible) {
      setLoading(false);
      return;
    }

    const svgEl = svgRef.current;
    if (!svgEl) return;

    let mounted = true;
    setLoading(true);
    setError(undefined);
    
    if (markmapInstanceRef.current?.destroy) {
      markmapInstanceRef.current.destroy();
      markmapInstanceRef.current = null;
    }
    
    Promise.all([
      import('markmap-lib'),
      import('markmap-view'),
    ])
      .then(async ([markmapLib, markmapView]) => {
        if (!mounted) return;
        
        try {
          const { Transformer } = markmapLib;
          const { Markmap } = markmapView;
          
          const transformer = new Transformer();
          const { root } = transformer.transform(code);
          
          const mm = new Markmap(svgEl);
          mm.setData(root);
          mm.fit();
          
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
  const svgRef = useRef<SVGSVGElement>(null);
  const [scale, setScale] = useState(1);
  const [showSource, setShowSource] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    
    observer.observe(container);
    return () => observer.disconnect();
  }, []);
  
  const resolvedCode = isStreaming ? '' : code;
  const { loading, error } = useMarkmap(svgRef, resolvedCode, isVisible);
  
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
  
  const showSkeleton = isStreaming || (loading && !error);

  return (
    <div 
      ref={containerRef}
      class={`markmap-block group relative overflow-auto rounded-md border border-[var(--viz-border)] bg-[var(--viz-bg)] ${
        isFullscreen ? 'fixed inset-0 z-[100] p-4' : 'p-3'
      }`}
      style={{ 
        maxHeight: isFullscreen ? 'none' : '400px',
        background: isFullscreen ? 'var(--background)' : undefined 
      }}
    >
      {showSkeleton && <SkeletonLoader height="120px" />}
      {error && !showSkeleton && (
        <>
          <pre class="overflow-x-auto rounded-md bg-muted/60 px-3 py-2 text-[12px] leading-relaxed font-mono">
            <code class="text-amber-600 dark:text-amber-400">{code}</code>
          </pre>
          <div class="mt-1 px-1 text-[10px] text-foreground-soft">Markmap: {error}</div>
        </>
      )}
      {!error && (
        <>
          {showSource ? (
            <pre class="overflow-auto text-[11px] leading-relaxed font-mono text-foreground-soft">
              <code>{code}</code>
            </pre>
          ) : (
            <div 
              class="markmap-content origin-center transition-transform duration-200"
              style={{ 
                transform: `scale(${scale})`,
                display: showSkeleton ? 'none' : undefined,
              }}
            >
              <svg ref={svgRef} class="markmap-svg w-full" style={{ minHeight: '200px' }} />
            </div>
          )}
          <VizToolbar 
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onReset={handleReset}
            onFullscreen={handleFullscreen}
            onShowSource={handleShowSource}
            showSourceActive={showSource}
          />
        </>
      )}
    </div>
  );
}

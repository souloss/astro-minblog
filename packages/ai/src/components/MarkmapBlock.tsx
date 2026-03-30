import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { VNode } from 'preact';
import type { CodeBlockProps } from './CodeBlock.tsx';
import { SkeletonLoader, useDragPanScroll, useScaledCanvas, useVizScaleControls, VizToolbar } from './VizShared.tsx';

interface MarkmapResult {
  loading: boolean;
  error?: string;
  markmapInstanceRef: { current: { destroy?: () => void; fit?: () => void } | null };
}

function useMarkmap(
  svgRef: { current: SVGSVGElement | null },
  code: string,
  visible: boolean
): MarkmapResult {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const markmapInstanceRef = useRef<{ destroy?: () => void; fit?: () => void } | null>(null);
  
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
  
  return { loading, error, markmapInstanceRef };
}

export function MarkmapBlock({ code, isStreaming }: CodeBlockProps): VNode | null {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const { scale, handleZoomIn, handleZoomOut, handleReset, handleWheelZoom } = useVizScaleControls();
  const [showSource, setShowSource] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const showDiagram = !showSource;

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
  const { loading, error, markmapInstanceRef } = useMarkmap(svgRef, resolvedCode, isVisible);
  const showSkeleton = isStreaming || (loading && !error);
  
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
    const handleChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    };

    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
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

  useEffect(() => {
    if (isFullscreen) return;
    const container = containerRef.current;
    if (!container) return;
    container.scrollTop = 0;
    container.scrollLeft = 0;
  }, [isFullscreen, scale, showSource]);

  const { scaledStyle, transformStyle } = useScaledCanvas(contentRef, scale, [resolvedCode, showSource, isFullscreen, loading, error]);

  useEffect(() => {
    if (!showDiagram || loading || error || !isVisible || showSkeleton) return;

    const instance = markmapInstanceRef.current;
    if (!instance?.fit) return;

    const refit = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          instance.fit?.();
        });
      });
    };

    refit();

    const frame = requestAnimationFrame(refit);
    const settleTimer = window.setTimeout(refit, 180);
    const lateTimer = window.setTimeout(refit, 420);
    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(refit)
      : null;

    if (viewportRef.current) resizeObserver?.observe(viewportRef.current);
    if (svgRef.current) resizeObserver?.observe(svgRef.current);
    if (contentRef.current) resizeObserver?.observe(contentRef.current);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(settleTimer);
      window.clearTimeout(lateTimer);
      resizeObserver?.disconnect();
    };
  }, [showDiagram, resolvedCode, isFullscreen, loading, error, isVisible, markmapInstanceRef, showSkeleton]);

  useDragPanScroll(viewportRef, showDiagram && !showSkeleton, [resolvedCode, isFullscreen, scale, showSkeleton]);

  return (
    <div 
      ref={containerRef}
      class={`markmap-block group relative rounded-md border border-[var(--viz-border)] bg-[var(--viz-bg)] ${
        isFullscreen ? 'flex h-full w-full flex-col overflow-hidden p-4' : 'p-3'
      }`}
      style={{ 
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
            <pre class={`overflow-auto text-[11px] leading-relaxed font-mono text-foreground-soft ${
              isFullscreen ? 'min-h-0 flex-1 pt-10' : ''
            }`}>
              <code>{code}</code>
            </pre>
          ) : (
            <div
              ref={viewportRef}
              class={`overflow-auto cursor-grab active:cursor-grabbing ${isFullscreen ? 'min-h-0 flex-1 pt-10' : 'max-h-[400px]'}`}
              onWheel={handleWheelZoom}
            >
              <div class="flex min-h-full min-w-full items-start justify-center">
                <div style={{ ...scaledStyle, display: showSkeleton ? 'none' : undefined }}>
                  <div ref={contentRef} class="markmap-content transition-transform duration-200" style={transformStyle}>
                    <svg ref={svgRef} class="markmap-svg block" style={{ minHeight: '200px' }} />
                  </div>
                </div>
              </div>
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

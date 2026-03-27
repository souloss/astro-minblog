import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { VNode } from 'preact';
import type { CodeBlockProps } from './CodeBlock.tsx';
import { SkeletonLoader, useDragPanScroll, useScaledCanvas, useVizScaleControls, VizToolbar } from './VizShared.tsx';

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
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [svgSize, setSvgSize] = useState<{ width: number; height: number } | null>(null);
  const { scale, handleZoomIn, handleZoomOut, handleReset, handleWheelZoom } = useVizScaleControls();
  const [showSource, setShowSource] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const showDiagram = !showSource;
  
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

  useEffect(() => {
    if (isFullscreen) return;
    const container = containerRef.current;
    if (!container) return;
    container.scrollTop = 0;
    container.scrollLeft = 0;
  }, [isFullscreen, scale, showSource]);

  useEffect(() => {
    if (!svg || !showDiagram) {
      setSvgSize(null);
      return;
    }

    const content = contentRef.current;
    const svgEl = content?.querySelector('svg');
    if (!(svgEl instanceof SVGSVGElement)) {
      setSvgSize(null);
      return;
    }

    const updateSvgSize = () => {
      const viewBox = svgEl.viewBox?.baseVal;
      const widthAttr = Number(svgEl.getAttribute('width') || 0);
      const heightAttr = Number(svgEl.getAttribute('height') || 0);
      const rect = svgEl.getBoundingClientRect();
      const width = Math.max(1, Math.ceil(viewBox?.width || widthAttr || rect.width || 1));
      const height = Math.max(1, Math.ceil(viewBox?.height || heightAttr || rect.height || 1));

      svgEl.style.display = 'block';
      svgEl.style.width = `${width}px`;
      svgEl.style.height = `${height}px`;
      svgEl.style.maxWidth = 'none';

      setSvgSize(current => (
        current?.width === width && current?.height === height
          ? current
          : { width, height }
      ));
    };

    updateSvgSize();

    const frame = requestAnimationFrame(updateSvgSize);
    const delayedFrame = requestAnimationFrame(() => requestAnimationFrame(updateSvgSize));
    const settleTimer = window.setTimeout(updateSvgSize, 180);
    const lateTimer = window.setTimeout(updateSvgSize, 420);
    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(updateSvgSize)
      : null;

    resizeObserver?.observe(svgEl);
    if (content) resizeObserver?.observe(content);
    if (viewportRef.current) resizeObserver?.observe(viewportRef.current);

    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(delayedFrame);
      window.clearTimeout(settleTimer);
      window.clearTimeout(lateTimer);
      resizeObserver?.disconnect();
    };
  }, [svg, showDiagram, isFullscreen]);

  useDragPanScroll(viewportRef, showDiagram, [svg, isFullscreen, scale]);

  const { scaledStyle, transformStyle } = useScaledCanvas(contentRef, scale, [svg, showSource, isFullscreen]);
  const effectiveScaledStyle = svgSize
    ? {
        width: `${Math.max(1, Math.ceil(svgSize.width * scale))}px`,
        height: `${Math.max(1, Math.ceil(svgSize.height * scale))}px`,
      }
    : scaledStyle;
  
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
      class={`mermaid-block group relative rounded-md border border-[var(--viz-border)] bg-[var(--viz-bg)] ${
        isFullscreen ? 'flex h-full w-full flex-col overflow-hidden p-4' : 'p-3'
      }`}
      style={isFullscreen ? { background: 'var(--background)' } : undefined}
    >
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
              <div style={effectiveScaledStyle}>
                <div
                  ref={contentRef}
                  class="origin-top-left transition-transform duration-200"
                style={transformStyle}
                dangerouslySetInnerHTML={{ __html: svg }}
              />
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
    </div>
  );
}

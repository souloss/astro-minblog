import { useCallback, useEffect, useState } from "preact/hooks";

interface Size {
  width: number;
  height: number;
}

const VIZ_MIN_SCALE = 0.3;
const VIZ_MAX_SCALE = 5;
const VIZ_SCALE_STEP = 0.2;

function clampVizScale(scale: number) {
  return Math.min(VIZ_MAX_SCALE, Math.max(VIZ_MIN_SCALE, scale));
}

export function useVizScaleControls(initialScale = 1) {
  const [scale, setScale] = useState(initialScale);

  const handleZoomIn = useCallback(() => {
    setScale(current => clampVizScale(current + VIZ_SCALE_STEP));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale(current => clampVizScale(current - VIZ_SCALE_STEP));
  }, []);

  const handleReset = useCallback(() => {
    setScale(initialScale);
  }, [initialScale]);

  const zoomWithWheelDelta = useCallback((deltaY: number) => {
    if (deltaY === 0) return;
    setScale(current =>
      clampVizScale(current + (deltaY < 0 ? VIZ_SCALE_STEP : -VIZ_SCALE_STEP))
    );
  }, []);

  const handleWheelZoom = useCallback(
    (event: WheelEvent) => {
      event.preventDefault();
      zoomWithWheelDelta(event.deltaY);
    },
    [zoomWithWheelDelta]
  );

  return {
    scale,
    setScale,
    handleZoomIn,
    handleZoomOut,
    handleReset,
    handleWheelZoom,
    zoomWithWheelDelta,
  };
}

export function measureElementSize(element: HTMLElement): Size {
  return {
    width: Math.max(
      1,
      Math.ceil(
        element.scrollWidth || element.offsetWidth || element.clientWidth || 1
      )
    ),
    height: Math.max(
      1,
      Math.ceil(
        element.scrollHeight ||
          element.offsetHeight ||
          element.clientHeight ||
          1
      )
    ),
  };
}

export function getScaledCanvasStyles(baseSize: Size, scale: number) {
  return {
    scaledStyle: {
      width: `${Math.max(1, Math.ceil(baseSize.width * scale))}px`,
      height: `${Math.max(1, Math.ceil(baseSize.height * scale))}px`,
    },
    transformStyle: {
      transform: `scale(${scale})`,
      transformOrigin: "top left",
    },
  };
}

export function useScaledCanvas(
  ref: { current: HTMLElement | null },
  scale: number,
  deps: readonly unknown[] = []
) {
  const [baseSize, setBaseSize] = useState<Size>({ width: 1, height: 1 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const updateSize = () => setBaseSize(measureElementSize(element));

    updateSize();

    const frame = requestAnimationFrame(updateSize);
    const delayedFrame = requestAnimationFrame(() =>
      requestAnimationFrame(updateSize)
    );
    const settleTimer = window.setTimeout(updateSize, 180);
    const lateTimer = window.setTimeout(updateSize, 420);

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(updateSize)
        : null;

    resizeObserver?.observe(element);

    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(delayedFrame);
      window.clearTimeout(settleTimer);
      window.clearTimeout(lateTimer);
      resizeObserver?.disconnect();
    };
  }, deps);

  return {
    baseSize,
    ...getScaledCanvasStyles(baseSize, scale),
  };
}

export function useDragPanScroll(
  ref: { current: HTMLElement | null },
  enabled: boolean,
  deps: readonly unknown[] = []
) {
  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled) return;

    let pointerId: number | null = null;
    let startX = 0;
    let startY = 0;
    let startScrollLeft = 0;
    let startScrollTop = 0;

    const setIdleCursor = () => {
      element.style.cursor = "grab";
    };

    const clearDraggingState = () => {
      pointerId = null;
      element.style.cursor = "grab";
      element.style.userSelect = "";
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || event.pointerType === "touch") return;
      if (!(event.target instanceof Element)) return;
      if (event.target.closest("button, a, input, textarea, select, summary"))
        return;

      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      startScrollLeft = element.scrollLeft;
      startScrollTop = element.scrollTop;

      element.style.cursor = "grabbing";
      element.style.userSelect = "none";
      element.setPointerCapture(event.pointerId);
      event.preventDefault();
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (pointerId !== event.pointerId) return;

      const deltaX = event.clientX - startX;
      const deltaY = event.clientY - startY;
      element.scrollLeft = startScrollLeft - deltaX;
      element.scrollTop = startScrollTop - deltaY;
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (pointerId !== event.pointerId) return;
      if (element.hasPointerCapture(event.pointerId)) {
        element.releasePointerCapture(event.pointerId);
      }
      clearDraggingState();
    };

    const handlePointerCancel = (event: PointerEvent) => {
      if (pointerId !== event.pointerId) return;
      clearDraggingState();
    };

    setIdleCursor();
    element.addEventListener("pointerdown", handlePointerDown);
    element.addEventListener("pointermove", handlePointerMove);
    element.addEventListener("pointerup", handlePointerUp);
    element.addEventListener("pointercancel", handlePointerCancel);
    element.addEventListener("lostpointercapture", clearDraggingState);

    return () => {
      element.removeEventListener("pointerdown", handlePointerDown);
      element.removeEventListener("pointermove", handlePointerMove);
      element.removeEventListener("pointerup", handlePointerUp);
      element.removeEventListener("pointercancel", handlePointerCancel);
      element.removeEventListener("lostpointercapture", clearDraggingState);
      element.style.cursor = "";
      element.style.userSelect = "";
    };
  }, [enabled, ...deps]);
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

export function VizToolbar({
  onZoomIn,
  onZoomOut,
  onReset,
  onFullscreen,
  onShowSource,
  showSourceActive,
}: VizToolbarProps) {
  return (
    <div class="viz-toolbar absolute top-2 right-2 z-10 flex items-center gap-0.5 rounded-lg border border-[var(--viz-border)] bg-[var(--viz-btn-bg)] p-1 opacity-0 shadow-sm backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100">
      <button
        type="button"
        onClick={onZoomIn}
        class="text-foreground-soft hover:text-accent flex size-6 items-center justify-center rounded-md transition-colors hover:bg-[var(--viz-btn-hover)]"
        aria-label="Zoom in"
        title="Zoom in"
      >
        <svg
          class="size-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
      <button
        type="button"
        onClick={onZoomOut}
        class="text-foreground-soft hover:text-accent flex size-6 items-center justify-center rounded-md transition-colors hover:bg-[var(--viz-btn-hover)]"
        aria-label="Zoom out"
        title="Zoom out"
      >
        <svg
          class="size-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
      <button
        type="button"
        onClick={onReset}
        class="text-foreground-soft hover:text-accent flex size-6 items-center justify-center rounded-md transition-colors hover:bg-[var(--viz-btn-hover)]"
        aria-label="Reset view"
        title="Reset view"
      >
        <svg
          class="size-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
      </button>
      <div class="mx-0.5 h-3.5 w-px bg-[var(--viz-border)]" />
      <button
        type="button"
        onClick={onFullscreen}
        class="text-foreground-soft hover:text-accent flex size-6 items-center justify-center rounded-md transition-colors hover:bg-[var(--viz-btn-hover)]"
        aria-label="Toggle fullscreen"
        title="Toggle fullscreen"
      >
        <svg
          class="size-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M8 3H5a2 2 0 0 0-2 2v3" />
          <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
          <path d="M3 16v3a2 2 0 0 0 2 2h3" />
          <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
        </svg>
      </button>
      <button
        type="button"
        onClick={onShowSource}
        class={`flex size-6 items-center justify-center rounded-md transition-colors ${
          showSourceActive
            ? "bg-accent/20 text-accent"
            : "text-foreground-soft hover:text-accent hover:bg-[var(--viz-btn-hover)]"
        }`}
        aria-label="Toggle source code"
        title="Toggle source code"
      >
        <svg
          class="size-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      </button>
    </div>
  );
}

// ── Copy Button Component ─────────────────────────────────────────

export function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      class="text-foreground-soft hover:text-accent absolute top-2 right-2 z-10 flex size-6 items-center justify-center rounded-md border border-[var(--viz-border)] bg-[var(--viz-btn-bg)] opacity-0 shadow-sm backdrop-blur-sm transition-all duration-200 group-hover:opacity-100 focus-within:opacity-100 hover:bg-[var(--viz-btn-hover)]"
      aria-label={copied ? "Copied!" : "Copy code"}
      title={copied ? "Copied!" : "Copy code"}
    >
      {copied ? (
        <svg
          class="size-3.5 text-[var(--color-success,#22c55e)]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg
          class="size-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
        </svg>
      )}
    </button>
  );
}

// ── Skeleton Loading Component ────────────────────────────────────

export function SkeletonLoader({ height = "120px" }: { height?: string }) {
  return (
    <div class="flex items-center justify-center" style={{ minHeight: height }}>
      <div class="flex flex-col items-center gap-2">
        <svg
          class="text-foreground-soft/40 size-5 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        <div class="flex gap-1">
          <span class="bg-foreground-soft/30 size-1.5 animate-pulse rounded-full" />
          <span class="bg-foreground-soft/30 size-1.5 animate-pulse rounded-full [animation-delay:150ms]" />
          <span class="bg-foreground-soft/30 size-1.5 animate-pulse rounded-full [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

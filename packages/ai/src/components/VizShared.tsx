import { useCallback, useState } from 'preact/hooks';

// ── Visualization Toolbar Component ─────────────────────────────────

interface VizToolbarProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onFullscreen: () => void;
  onShowSource: () => void;
  showSourceActive?: boolean;
}

export function VizToolbar({ onZoomIn, onZoomOut, onReset, onFullscreen, onShowSource, showSourceActive }: VizToolbarProps) {
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

export function CopyButton({ code }: { code: string }) {
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

export function SkeletonLoader({ height = '120px' }: { height?: string }) {
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

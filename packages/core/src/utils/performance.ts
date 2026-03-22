/**
 * Performance utilities for event management and optimization.
 * Prevents memory leaks and improves runtime performance.
 */

// ── Throttle ───────────────────────────────────────────────────────────────

/**
 * Creates a throttled function that invokes `fn` at most once per `ms` milliseconds.
 * The throttled function always returns the result of the last invocation.
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let pending = false;
  let lastArgs: Parameters<T> | null = null;

  return function throttled(this: unknown, ...args: Parameters<T>) {
    const now = performance.now();

    if (now - lastCall >= ms) {
      lastCall = now;
      fn.apply(this, args);
      pending = false;
    } else if (!pending) {
      pending = true;
      lastArgs = args;
      const delay = ms - (now - lastCall);
      setTimeout(() => {
        if (lastArgs) {
          lastCall = performance.now();
          fn.apply(this, lastArgs);
        }
        pending = false;
        lastArgs = null;
      }, delay);
    } else {
      lastArgs = args;
    }
  };
}

// ── Debounce ───────────────────────────────────────────────────────────────

/**
 * Creates a debounced function that delays invoking `fn` until after `ms`
 * milliseconds have elapsed since the last time the debounced function was invoked.
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function debounced(this: unknown, ...args: Parameters<T>) {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn.apply(this, args);
      timeoutId = null;
    }, ms);
  };
}

// ── RAF Throttle ───────────────────────────────────────────────────────────

/**
 * Creates a function throttled by requestAnimationFrame.
 * Best for scroll and resize events.
 */
export function rafThrottle<T extends (...args: unknown[]) => unknown>(
  fn: T
): (...args: Parameters<T>) => void {
  let rafId: number | null = null;
  let lastArgs: Parameters<T> | null = null;

  return function throttled(this: unknown, ...args: Parameters<T>) {
    lastArgs = args;
    if (rafId !== null) return;

    rafId = requestAnimationFrame(() => {
      if (lastArgs) {
        fn.apply(this, lastArgs);
      }
      rafId = null;
      lastArgs = null;
    });
  };
}

// ── Event Manager ──────────────────────────────────────────────────────────

interface TrackedListener {
  target: EventTarget;
  type: string;
  handler: EventListenerOrEventListenerObject;
  options?: AddEventListenerOptions | boolean;
}

interface TrackedObserver {
  observer: IntersectionObserver | MutationObserver | ResizeObserver | PerformanceObserver;
  type: 'intersection' | 'mutation' | 'resize' | 'performance';
}

/**
 * Unified event listener manager for cleanup on SPA navigation.
 * Tracks all event listeners and observers for proper cleanup.
 */
export class EventManager {
  private listeners: TrackedListener[] = [];
  private observers: TrackedObserver[] = [];
  private cleanups: Array<() => void> = [];

  /**
   * Add an event listener with automatic tracking.
   */
  add(
    target: EventTarget,
    type: string,
    handler: EventListenerOrEventListenerObject,
    options?: AddEventListenerOptions | boolean
  ): void {
    target.addEventListener(type, handler, options);
    this.listeners.push({ target, type, handler, options });
  }

  /**
   * Track an observer for cleanup.
   */
  trackObserver(
    observer: IntersectionObserver | MutationObserver | ResizeObserver | PerformanceObserver,
    type: TrackedObserver['type']
  ): void {
    this.observers.push({ observer, type });
  }

  /**
   * Register a custom cleanup function.
   */
  onCleanup(fn: () => void): void {
    this.cleanups.push(fn);
  }

  /**
   * Remove all tracked event listeners.
   */
  removeListeners(): void {
    for (const { target, type, handler, options } of this.listeners) {
      target.removeEventListener(type, handler, options);
    }
    this.listeners = [];
  }

  /**
   * Disconnect all tracked observers.
   */
  disconnectObservers(): void {
    for (const { observer } of this.observers) {
      if ('disconnect' in observer) {
        observer.disconnect();
      }
    }
    this.observers = [];
  }

  /**
   * Run all registered cleanup functions.
   */
  runCleanups(): void {
    for (const fn of this.cleanups) {
      try {
        fn();
      } catch {
        // Ignore cleanup errors
      }
    }
    this.cleanups = [];
  }

  /**
   * Full cleanup: remove listeners, disconnect observers, run cleanups.
   */
  cleanup(): void {
    this.runCleanups();
    this.disconnectObservers();
    this.removeListeners();
  }

  /**
   * Get counts for debugging.
   */
  getStats(): { listeners: number; observers: number; cleanups: number } {
    return {
      listeners: this.listeners.length,
      observers: this.observers.length,
      cleanups: this.cleanups.length,
    };
  }
}

// ── Global Event Manager for SPA Navigation ────────────────────────────────

let globalEventManager: EventManager | null = null;

/**
 * Get the global event manager instance.
 * Creates one if it doesn't exist and sets up SPA navigation cleanup.
 */
export function getGlobalEventManager(): EventManager {
  if (globalEventManager === null) {
    globalEventManager = new EventManager();

    // Setup cleanup on Astro View Transitions
    if (typeof document !== 'undefined') {
      document.addEventListener('astro:before-swap', () => {
        globalEventManager?.cleanup();
      });
    }
  }
  return globalEventManager;
}

/**
 * Reset the global event manager (useful for testing).
 */
export function resetGlobalEventManager(): void {
  globalEventManager?.cleanup();
  globalEventManager = null;
}

// ── Helper Functions ───────────────────────────────────────────────────────

/**
 * Create a throttled scroll handler with automatic cleanup.
 */
export function createScrollHandler(
  callback: () => void,
  options?: { throttle?: number; useRaf?: boolean }
): { start: () => void; stop: () => void } {
  const useRaf = options?.useRaf ?? true;
  const ms = options?.throttle ?? 16;

  const handler = useRaf ? rafThrottle(callback) : throttle(callback, ms);
  let active = false;

  return {
    start: () => {
      if (active) return;
      active = true;
      window.addEventListener('scroll', handler, { passive: true });
    },
    stop: () => {
      if (!active) return;
      active = false;
      window.removeEventListener('scroll', handler);
    },
  };
}

/**
 * Create a throttled resize handler with automatic cleanup.
 */
export function createResizeHandler(
  callback: () => void,
  options?: { throttle?: number; useRaf?: boolean }
): { start: () => void; stop: () => void } {
  const useRaf = options?.useRaf ?? true;
  const ms = options?.throttle ?? 100;

  const handler = useRaf ? rafThrottle(callback) : throttle(callback, ms);
  let active = false;

  return {
    start: () => {
      if (active) return;
      active = true;
      window.addEventListener('resize', handler, { passive: true });
    },
    stop: () => {
      if (!active) return;
      active = false;
      window.removeEventListener('resize', handler);
    },
  };
}
type VizInitFn = (
  el: HTMLElement,
  isDark: boolean
) => Promise<void> | void;

const registry = new Map<string, VizInitFn>();
let observer: IntersectionObserver | null = null;

function getIsDark(): boolean {
  return document.documentElement.getAttribute("data-theme") === "dark";
}

function ensureObserver(): IntersectionObserver {
  if (observer) return observer;

  observer = new IntersectionObserver(
    entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;

        const el = entry.target as HTMLElement;
        if (el.dataset.vizInitialized) continue;

        const type = el.dataset.vizType;
        if (!type) continue;

        const initFn = registry.get(type);
        if (!initFn) continue;

        el.dataset.vizInitialized = "true";
        observer!.unobserve(el);

        Promise.resolve(initFn(el, getIsDark())).catch(err => {
          console.error(`[viz-loader] Failed to init "${type}":`, err);
        });
      }
    },
    { rootMargin: "200px" }
  );

  return observer;
}

export function registerViz(type: string, initFn: VizInitFn): void {
  registry.set(type, initFn);
  observeAll(type);
}

function observeAll(type?: string): void {
  const obs = ensureObserver();
  const selector = type
    ? `[data-viz-type="${type}"]:not([data-viz-initialized])`
    : `[data-viz-type]:not([data-viz-initialized])`;

  document.querySelectorAll<HTMLElement>(selector).forEach(el => {
    obs.observe(el);
  });
}

export function rescanViz(): void {
  observeAll();
}

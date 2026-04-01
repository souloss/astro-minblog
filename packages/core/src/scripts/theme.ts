import { getGlobalEventManager } from "../utils/performance";

const LIGHT = "light";
const DARK = "dark";

function getThemeController() {
  return window.theme;
}

function getCurrentTheme(): string {
  return getThemeController()?.getTheme() ??
    (window.matchMedia("(prefers-color-scheme: dark)").matches ? DARK : LIGHT);
}

function setThemeValue(theme: string): void {
  const controller = getThemeController();
  if (!controller) return;
  controller.setTheme(theme);
  controller.setPreference();

  // Also update sessionStorage backup for page transitions
  if (typeof sessionStorage !== 'undefined') {
    try {
      const stored = sessionStorage.getItem('__astroMinimax_theme');
      const data = stored ? JSON.parse(stored) : {};
      sessionStorage.setItem('__astroMinimax_theme', JSON.stringify({
        ...data,
        theme: theme,
        timestamp: Date.now()
      }));
    } catch (e) {
      // Silently fail if sessionStorage is unavailable
    }
  }
}

function reflectPreference(): void {
  getThemeController()?.reflectPreference();
}

function supportsViewTransitions(): boolean {
  return "startViewTransition" in document;
}

function toggleThemeWithTransition(event?: MouseEvent): void {
  const newTheme = getCurrentTheme() === LIGHT ? DARK : LIGHT;

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const x = event?.clientX ?? window.innerWidth / 2;
  const y = event?.clientY ?? window.innerHeight / 2;

  if (prefersReducedMotion) {
    setThemeValue(newTheme);
    return;
  }

  if (supportsViewTransitions()) {
    document.documentElement.style.setProperty("--theme-x", `${x}px`);
    document.documentElement.style.setProperty("--theme-y", `${y}px`);

    const html = document.documentElement;
    html.classList.add("theme-transition");

    if (newTheme === DARK) {
      html.classList.add("dark-transition");
    } else {
      html.classList.remove("dark-transition");
    }

    const transition = document.startViewTransition?.(() => {
      setThemeValue(newTheme);
    });

    transition?.finished.then(() => {
      html.classList.remove("theme-transition", "dark-transition");
    });
  } else {
    document.documentElement.classList.add("no-view-transitions");
    setThemeValue(newTheme);

    setTimeout(() => {
      document.documentElement.classList.remove("no-view-transitions");
    }, 400);
  }
}

reflectPreference();

function setThemeFeature(): void {
  reflectPreference();

  const themeBtn = document.querySelector("#theme-btn");
  if (themeBtn) {
    const manager = getGlobalEventManager();
    manager.add(themeBtn, "click", (e: Event) => {
      toggleThemeWithTransition(e as MouseEvent);
    });
  }
}

setThemeFeature();

const manager = getGlobalEventManager();

manager.add(document, "astro:after-swap", setThemeFeature);

manager.add(document, "astro:before-swap", (event: Event) => {
  const astroEvent = event as AstroBeforeSwapEvent;
  const bgColor = document
    .querySelector("meta[name='theme-color']")
    ?.getAttribute("content");

  if (bgColor) {
    astroEvent.newDocument
      .querySelector("meta[name='theme-color']")
      ?.setAttribute("content", bgColor);
  }

  // Preserve theme attributes across page transitions to prevent theme flashing
  const currentTheme = document.documentElement.getAttribute("data-theme");
  const currentColorScheme = document.documentElement.getAttribute("data-color-scheme");
  const currentLayout = document.documentElement.getAttribute("data-layout");
  const cardRadius = document.documentElement.style.getPropertyValue("--card-radius");

  if (currentTheme) {
    astroEvent.newDocument.documentElement.setAttribute("data-theme", currentTheme);
  }
  if (currentColorScheme) {
    astroEvent.newDocument.documentElement.setAttribute("data-color-scheme", currentColorScheme);
  }
  if (currentLayout) {
    astroEvent.newDocument.documentElement.setAttribute("data-layout", currentLayout);
  }
  if (cardRadius) {
    astroEvent.newDocument.documentElement.style.setProperty("--card-radius", cardRadius);
  }

  // Update sessionStorage backup with current theme state for transition reliability
  if (typeof sessionStorage !== 'undefined') {
    try {
      const currentMode = getThemeController()?.getMode?.() ?? LIGHT;
      const themeData = {
        theme: currentTheme || getCurrentTheme(),
        mode: currentMode,
        colorScheme: currentColorScheme,
        layout: currentLayout,
        radius: cardRadius?.split('rem')[0] || 'lg',
        timestamp: Date.now()
      };
      sessionStorage.setItem('__astroMinimax_theme', JSON.stringify(themeData));
    } catch (e) {
      // Silently fail if sessionStorage is unavailable
    }
  }
});

manager.add(window.matchMedia("(prefers-color-scheme: dark)"), "change", ((
  e: Event
) => {
  const mediaEvent = e as MediaQueryListEvent;
  setThemeValue(mediaEvent.matches ? DARK : LIGHT);
}) as EventListener);

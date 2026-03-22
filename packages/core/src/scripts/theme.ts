import { getGlobalEventManager } from "../utils/performance";

const THEME = "theme";
const LIGHT = "light";
const DARK = "dark";
const initialColorScheme = "";

function getPreferTheme(): string {
  const currentTheme = localStorage.getItem(THEME);
  if (currentTheme) return currentTheme;
  if (initialColorScheme) return initialColorScheme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? DARK
    : LIGHT;
}

let themeValue = window.theme?.themeValue ?? getPreferTheme();

function setPreference(): void {
  localStorage.setItem(THEME, themeValue);
  reflectPreference();
}

function reflectPreference(): void {
  document.firstElementChild?.setAttribute("data-theme", themeValue);

  const body = document.body;
  if (body) {
    const computedStyles = window.getComputedStyle(body);
    const bgColor = computedStyles.backgroundColor;
    document
      .querySelector("meta[name='theme-color']")
      ?.setAttribute("content", bgColor);
  }

  requestAnimationFrame(() => {
    window.dispatchEvent(
      new CustomEvent("themechange", {
        detail: { isDark: themeValue === DARK, theme: themeValue },
      })
    );
  });
}

function supportsViewTransitions(): boolean {
  return "startViewTransition" in document;
}

function toggleThemeWithTransition(event?: MouseEvent): void {
  const newTheme = themeValue === LIGHT ? DARK : LIGHT;

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const x = event?.clientX ?? window.innerWidth / 2;
  const y = event?.clientY ?? window.innerHeight / 2;

  themeValue = newTheme;
  window.theme?.setTheme(themeValue);

  if (prefersReducedMotion) {
    setPreference();
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
      setPreference();
    });

    transition?.finished.then(() => {
      html.classList.remove("theme-transition", "dark-transition");
    });
  } else {
    document.documentElement.classList.add("no-view-transitions");
    setPreference();

    setTimeout(() => {
      document.documentElement.classList.remove("no-view-transitions");
    }, 400);
  }
}

if (window.theme) {
  window.theme.setPreference = setPreference;
  window.theme.reflectPreference = reflectPreference;
} else {
  window.theme = {
    themeValue,
    setPreference,
    reflectPreference,
    getTheme: () => themeValue,
    setTheme: (val: string) => {
      themeValue = val;
    },
  };
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
  const astroEvent = event;
  const bgColor = document
    .querySelector("meta[name='theme-color']")
    ?.getAttribute("content");

  if (bgColor) {
    (astroEvent as unknown as { newDocument: Document }).newDocument
      .querySelector("meta[name='theme-color']")
      ?.setAttribute("content", bgColor);
  }
});

manager.add(
  window.matchMedia("(prefers-color-scheme: dark)"),
  "change",
  ((e: Event) => {
    const mediaEvent = e as MediaQueryListEvent;
    themeValue = mediaEvent.matches ? DARK : LIGHT;
    window.theme?.setTheme(themeValue);
    setPreference();
  }) as EventListener
);

// Constants

const THEME = "theme";
const LIGHT = "light";
const DARK = "dark";

// Initial color scheme
// Can be "light", "dark", or empty string for system's prefers-color-scheme
const initialColorScheme = "";

function getPreferTheme(): string {
  // get theme data from local storage (user's explicit choice)
  const currentTheme = localStorage.getItem(THEME);
  if (currentTheme) return currentTheme;

  // return initial color scheme if it is set (site default)
  if (initialColorScheme) return initialColorScheme;

  // return user device's prefer color scheme (system fallback)
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? DARK
    : LIGHT;
}

// Use existing theme value from inline script if available, otherwise detect
let themeValue = window.theme?.themeValue ?? getPreferTheme();

function setPreference(): void {
  localStorage.setItem(THEME, themeValue);
  reflectPreference();
}

function reflectPreference(): void {
  document.firstElementChild?.setAttribute("data-theme", themeValue);

  document.querySelector("#theme-btn")?.setAttribute("aria-label", themeValue);

  const body = document.body;
  if (body) {
    const computedStyles = window.getComputedStyle(body);
    const bgColor = computedStyles.backgroundColor;
    document
      .querySelector("meta[name='theme-color']")
      ?.setAttribute("content", bgColor);
  }

  window.dispatchEvent(
    new CustomEvent("themechange", {
      detail: { isDark: themeValue === DARK, theme: themeValue },
    })
  );
}

// Check if View Transitions API is supported
function supportsViewTransitions(): boolean {
  return "startViewTransition" in document;
}

// Toggle theme with optional View Transition animation
function toggleThemeWithTransition(event?: MouseEvent): void {
  const newTheme = themeValue === LIGHT ? DARK : LIGHT;

  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  // Get click position for circular animation
  const x = event?.clientX ?? window.innerWidth / 2;
  const y = event?.clientY ?? window.innerHeight / 2;

  // Update theme value
  themeValue = newTheme;
  window.theme?.setTheme(themeValue);

  // Skip animations if user prefers reduced motion
  if (prefersReducedMotion) {
    setPreference();
    return;
  }

  // Check if View Transitions API is supported
  if (supportsViewTransitions()) {
    // Set CSS variables for animation origin
    document.documentElement.style.setProperty("--theme-x", `${x}px`);
    document.documentElement.style.setProperty("--theme-y", `${y}px`);

    // Add transition class
    const html = document.documentElement;
    html.classList.add("theme-transition");

    if (newTheme === DARK) {
      html.classList.add("dark-transition");
    } else {
      html.classList.remove("dark-transition");
    }

    // Start View Transition with optimized timing
    const transition = document.startViewTransition?.(() => {
      setPreference();
    });

    // Clean up classes after animation completes
    transition?.finished.then(() => {
      html.classList.remove("theme-transition", "dark-transition");
    });
  } else {
    // Fallback for browsers without View Transitions API
    document.documentElement.classList.add("no-view-transitions");
    setPreference();

    // Remove class after transition completes (optimized timing)
    setTimeout(() => {
      document.documentElement.classList.remove("no-view-transitions");
    }, 400);
  }
}

// Update the global theme API
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

// Ensure theme is reflected (in case body wasn't ready when inline script ran)
reflectPreference();

function setThemeFeature(): void {
  // set on load so screen readers can get the latest value on the button
  reflectPreference();

  // now this script can find and listen for clicks on the control
  document.querySelector("#theme-btn")?.addEventListener("click", e => {
    toggleThemeWithTransition(e as MouseEvent);
  });
}

// Set up theme features after page load
setThemeFeature();

// Runs on view transitions navigation
document.addEventListener("astro:after-swap", setThemeFeature);

// Set theme-color value before page transition
// to avoid navigation bar color flickering in Android dark mode
document.addEventListener("astro:before-swap", event => {
  const astroEvent = event;
  const bgColor = document
    .querySelector("meta[name='theme-color']")
    ?.getAttribute("content");

  if (bgColor) {
    astroEvent.newDocument
      .querySelector("meta[name='theme-color']")
      ?.setAttribute("content", bgColor);
  }
});

// sync with system changes
window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", ({ matches: isDark }) => {
    themeValue = isDark ? DARK : LIGHT;
    window.theme?.setTheme(themeValue);
    setPreference();
  });

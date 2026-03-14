interface ThemeChangeDetail {
  isDark: boolean;
  theme: string;
}

interface Window {
  theme?: {
    themeValue: string;
    setPreference: () => void;
    reflectPreference: () => void;
    getTheme: () => string;
    setTheme: (val: string) => void;
  };
}

interface WindowEventMap {
  themechange: CustomEvent<ThemeChangeDetail>;
}

interface ViewTransition {
  finished: Promise<void>;
  ready: Promise<void>;
  updateCallbackDone: Promise<void>;
  skipTransition: () => void;
}

interface Document {
  startViewTransition?: (
    callback: () => void | Promise<void>
  ) => ViewTransition;
}

// Cloudflare Workers AI Types
type Ai = import('@cloudflare/ai').Ai;

interface Env {
  souloss: Ai;
}

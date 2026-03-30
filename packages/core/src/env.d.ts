interface ThemeChangeDetail {
  isDark: boolean;
  theme: string;
}

interface PreferencesChangeDetail {
  preferences: import("./preferences/types").Preferences;
}

interface Window {
  theme?: {
    themeValue: string;
    setPreference: () => void;
    reflectPreference: () => void;
    getTheme: () => string;
    setTheme: (val: string) => void;
  };
  __actionExecutor?: {
    execute: (
      action: import("./actions/types").Action
    ) => Promise<import("./actions/types").ActionResult>;
  };
  __actionQueue?: typeof import("./actions/queue").ActionQueue;
  __articleContext?: {
    slug: string;
  };
  __roughModule?: unknown;
  AsciinemaPlayer?: {
    create: (
      src: string,
      container: HTMLElement,
      opts: Record<string, unknown>
    ) => { dispose: () => void };
  };
}

interface AstroBeforeSwapEvent extends Event {
  newDocument: Document;
}

interface WindowEventMap {
  themechange: CustomEvent<ThemeChangeDetail>;
  "astro-minimax:preferences-change": CustomEvent<PreferencesChangeDetail>;
}

interface ImportMetaEnv {
  readonly DEV?: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

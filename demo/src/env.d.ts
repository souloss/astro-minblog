/// <reference path="../.astro/types.d.ts" />

interface ThemeChangeDetail {
  theme: "light" | "dark";
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

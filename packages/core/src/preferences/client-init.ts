import { settingsPanelClient } from "./client";

declare global {
  interface Window {
    __astroMinimaxPreferences?: typeof settingsPanelClient;
  }
}

if (typeof window !== "undefined") {
  window.__astroMinimaxPreferences = settingsPanelClient;
}

export {};

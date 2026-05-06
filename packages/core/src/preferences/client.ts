import {
  getEffectiveDefaults,
  loadPreferences,
  savePreferences,
  resetPreferences,
} from "./index";
import type { Preferences } from "./types";
import { themePresetMeta } from "./presets";

export const settingsPanelClient = {
  themePresets: themePresetMeta,
  getInitialSettings(): Preferences {
    return loadPreferences();
  },
  getDefaultSettings(): Preferences {
    return getEffectiveDefaults();
  },
  loadSettings(): Preferences {
    return loadPreferences();
  },
  saveSettings(settings: Preferences): void {
    savePreferences(settings);
  },
  resetSettings(): Preferences {
    return resetPreferences();
  },
};

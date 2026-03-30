import {
  getEffectiveDefaults,
  loadPreferences,
  savePreferences,
  resetPreferences,
  exportShareURL,
  copyShareURL,
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
  exportShareURL(settings: Preferences): string {
    return exportShareURL(settings);
  },
  copyShareURL(settings: Preferences): Promise<boolean> {
    return copyShareURL(settings);
  },
};

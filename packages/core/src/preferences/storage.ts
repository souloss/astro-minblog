import type { Preferences, DeepPartial } from "./types";
import { defaultPreferences, PREFERENCES_VERSION } from "./defaults";
import { userDefaults } from "virtual:astro-minimax/preferences-defaults";

const STORAGE_KEY = "astro-minimax-settings";
const PREFERENCES_EVENT = "astro-minimax:preferences-change";

let _userDefaults: DeepPartial<Preferences> | undefined;

function getUserDefaults(): DeepPartial<Preferences> {
  if (_userDefaults === undefined) {
    _userDefaults = userDefaults ?? {};
  }
  return _userDefaults!;
}

export function getEffectiveDefaults(): Preferences {
  const userDefaults = typeof window !== "undefined" ? getUserDefaults() : {};
  return deepMerge({ ...defaultPreferences }, userDefaults);
}

function deepMerge<T extends object>(target: T, source: DeepPartial<T>): T {
  const result = { ...target } as T;

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key];
      const targetValue = target[key];

      if (
        sourceValue &&
        typeof sourceValue === "object" &&
        !Array.isArray(sourceValue) &&
        targetValue &&
        typeof targetValue === "object" &&
        !Array.isArray(targetValue)
      ) {
        (result as Record<string, unknown>)[key] = deepMerge(
          targetValue as object,
          sourceValue as DeepPartial<object>
        );
      } else {
        (result as Record<string, unknown>)[key] = sourceValue;
      }
    }
  }

  return result;
}

function migratePreferences(oldPrefs: unknown): Preferences {
  const prefs = oldPrefs as Partial<Preferences> | null;
  return {
    ...defaultPreferences,
    ...(prefs ?? {}),
    theme: {
      ...defaultPreferences.theme,
      ...(prefs?.theme ?? {}),
    },
    appearance: {
      ...defaultPreferences.appearance,
      ...(prefs?.appearance ?? {}),
    },
    layout: {
      ...defaultPreferences.layout,
      ...(prefs?.layout ?? {}),
    },
    reading: {
      ...defaultPreferences.reading,
      ...(prefs?.reading ?? {}),
    },
    widgets: {
      ...defaultPreferences.widgets,
      ...(prefs?.widgets ?? {}),
    },
    animations: {
      ...defaultPreferences.animations,
      ...(prefs?.animations ?? {}),
    },
    version: PREFERENCES_VERSION,
  };
}

export function loadPreferences(): Preferences {
  if (typeof window === "undefined") {
    return { ...defaultPreferences };
  }

  const effectiveDefaults = getEffectiveDefaults();

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return effectiveDefaults;
    }

    const parsed = JSON.parse(stored);
    const migrated = migratePreferences(parsed);

    if ((parsed as { version?: number })?.version !== PREFERENCES_VERSION) {
      savePreferences(migrated);
    }

    return migrated;
  } catch (error) {
    console.warn("Failed to load preferences:", error);
    return effectiveDefaults;
  }
}

export function savePreferences(preferences: Preferences): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const toSave: Preferences = {
      ...preferences,
      version: PREFERENCES_VERSION,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    window.dispatchEvent(
      new CustomEvent(PREFERENCES_EVENT, {
        detail: { preferences: toSave },
      })
    );
  } catch (error) {
    console.warn("Failed to save preferences:", error);
  }
}

export function updatePreferences(
  updates: DeepPartial<Preferences>
): Preferences {
  const current = loadPreferences();
  const updated = deepMerge(current, updates);
  savePreferences(updated);
  return updated;
}

export function resetPreferences(): Preferences {
  const effectiveDefaults = getEffectiveDefaults();
  savePreferences(effectiveDefaults);
  return effectiveDefaults;
}

export function clearPreferences(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(
      new CustomEvent(PREFERENCES_EVENT, {
        detail: { preferences: getEffectiveDefaults() },
      })
    );
  } catch (error) {
    console.warn("Failed to clear preferences:", error);
  }
}

export function getPreference<K extends keyof Preferences>(
  key: K
): Preferences[K] {
  const prefs = loadPreferences();
  return prefs[key];
}

export function setPreference<K extends keyof Preferences>(
  key: K,
  value: Preferences[K]
): void {
  updatePreferences({ [key]: value } as DeepPartial<Preferences>);
}

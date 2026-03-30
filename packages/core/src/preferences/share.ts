/**
 * Preferences Share
 * URL Hash based configuration sharing (no backend required)
 */

import type { Preferences, DeepPartial } from "./types";
import { getEffectiveDefaults } from "./storage";

/** Share URL hash key */
const SHARE_KEY = "prefs";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mergePlainObjects(
  currentValue: Record<string, unknown>,
  sharedValue: Record<string, unknown>
): Record<string, unknown> {
  return {
    ...currentValue,
    ...sharedValue,
  };
}

function assignPreferenceValue<K extends keyof Preferences>(
  target: Preferences,
  key: K,
  value: Preferences[K]
): void {
  target[key] = value;
}

/**
 * Compress preferences by removing default values
 * This reduces the URL size significantly
 */
function compressPreferences(prefs: Preferences): DeepPartial<Preferences> {
  const compressed: Partial<Record<keyof Preferences, unknown>> = {};
  const effectiveDefaults = getEffectiveDefaults();

  const compareAndCompress = (
    key: keyof Preferences,
    value: unknown,
    defaultValue: unknown
  ) => {
    if (value === undefined || value === null) return;

    if (isPlainObject(value)) {
      const nested: Record<string, unknown> = {};
      let hasDiff = false;
      const defaultObject = isPlainObject(defaultValue)
        ? defaultValue
        : undefined;

      for (const subKey in value) {
        if (
          JSON.stringify(value[subKey]) !==
          JSON.stringify(defaultObject?.[subKey])
        ) {
          nested[subKey] = value[subKey];
          hasDiff = true;
        }
      }

      if (hasDiff) {
        compressed[key] = nested;
      }
    } else if (JSON.stringify(value) !== JSON.stringify(defaultValue)) {
      compressed[key] = value;
    }
  };

  const prefKeys: (keyof Preferences)[] = [
    "theme",
    "appearance",
    "layout",
    "reading",
    "widgets",
    "animations",
  ];

  for (const key of prefKeys) {
    compareAndCompress(key, prefs[key], effectiveDefaults[key]);
  }

  return compressed as DeepPartial<Preferences>;
}

/**
 * Export preferences to a shareable URL
 */
export function exportShareURL(prefs: Preferences): string {
  const compressed = compressPreferences(prefs);

  // If no custom preferences, return base URL
  if (Object.keys(compressed).length === 0) {
    return window.location.origin + window.location.pathname;
  }

  try {
    const encoded = btoa(encodeURIComponent(JSON.stringify(compressed)));
    const url = new URL(window.location.href);
    url.hash = `#${SHARE_KEY}=${encoded}`;
    // Remove any existing query params for cleaner URL
    url.search = "";
    return url.toString();
  } catch (error) {
    console.warn("Failed to export share URL:", error);
    return window.location.href;
  }
}

/**
 * Import preferences from URL hash
 */
export function importFromURL(): DeepPartial<Preferences> | null {
  if (typeof window === "undefined") {
    return null;
  }

  const hash = window.location.hash.slice(1); // Remove #

  // Check for our share key
  const match = hash.match(new RegExp(`${SHARE_KEY}=(.+)`));
  if (!match) {
    return null;
  }

  try {
    const encoded = match[1];
    const decoded = decodeURIComponent(atob(encoded));
    const prefs = JSON.parse(decoded);

    return prefs as DeepPartial<Preferences>;
  } catch (error) {
    console.warn("Failed to parse shared preferences from URL:", error);
    return null;
  }
}

/**
 * Check if URL contains shared preferences
 */
export function hasSharedPreferences(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const hash = window.location.hash;
  return hash.includes(`${SHARE_KEY}=`);
}

/**
 * Clear share parameters from URL
 */
export function clearShareURL(): void {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);
  url.hash = "";
  history.replaceState(null, "", url.toString());
}

/**
 * Copy share URL to clipboard
 */
export async function copyShareURL(prefs: Preferences): Promise<boolean> {
  const url = exportShareURL(prefs);

  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch (error) {
    // Fallback for older browsers
    try {
      const textArea = document.createElement("textarea");
      textArea.value = url;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      return true;
    } catch {
      console.warn("Failed to copy share URL:", error);
      return false;
    }
  }
}

/**
 * Merge shared preferences with current preferences
 */
export function mergeSharedPreferences(
  current: Preferences,
  shared: DeepPartial<Preferences>
): Preferences {
  const merged = { ...current };

  const keys: (keyof Preferences)[] = [
    "theme",
    "appearance",
    "layout",
    "reading",
    "widgets",
    "animations",
  ];

  for (const key of keys) {
    if (shared[key] !== undefined) {
      const sharedValue = shared[key];
      const currentValue = current[key];

      if (isPlainObject(currentValue) && isPlainObject(sharedValue)) {
        switch (key) {
          case "appearance":
            if (shared.appearance) {
              merged.appearance = {
                ...merged.appearance,
                ...shared.appearance,
              };
            }
            break;
          case "layout":
            if (shared.layout) {
              merged.layout = {
                ...merged.layout,
                ...shared.layout,
              };
            }
            break;
          case "reading":
            if (shared.reading) {
              merged.reading = {
                ...merged.reading,
                ...shared.reading,
              };
            }
            break;
          case "widgets":
            if (shared.widgets) {
              merged.widgets = {
                ...merged.widgets,
                ...shared.widgets,
              };
            }
            break;
          case "animations":
            if (shared.animations) {
              merged.animations = {
                ...merged.animations,
                ...shared.animations,
              };
            }
            break;
          default:
            break;
        }
      } else {
        assignPreferenceValue(
          merged,
          key,
          sharedValue as Preferences[typeof key]
        );
      }
    }
  }

  return merged;
}

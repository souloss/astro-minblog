/**
 * Preferences Module
 * Centralized user preferences management for astro-minimax
 *
 * Inspired by Vben Admin's preference system
 */

// Types
export type {
  Preferences,
  DeepPartial,
  ThemePreferences,
  AppearancePreferences,
  LayoutPreferences,
  ReadingPreferences,
  WidgetPreferences,
  AnimationPreferences,
  ThemePreset,
  ThemeColors,
  ColorSchemeType,
  ThemeModeType,
  RadiusType,
  LayoutModeType,
  ReadingFontSizeType,
  ReadingLineHeightType,
  ReadingWidthType,
  ReadingThemeType,
  ReadingFontFamilyType,
} from "./types";

// Defaults
export {
  defaultPreferences,
  PREFERENCES_VERSION,
  RADIUS_VALUES,
  READING_FONT_SIZE_VALUES,
  READING_LINE_HEIGHT_VALUES,
  READING_WIDTH_VALUES,
  READING_THEME_COLORS,
  READING_FONT_FAMILY_VALUES,
} from "./defaults";

// Presets
export { themePresetMeta, getThemePresetMeta, getPresetIds } from "./presets";

// Storage
export {
  loadPreferences,
  savePreferences,
  updatePreferences,
  resetPreferences,
  clearPreferences,
  getPreference,
  setPreference,
  getEffectiveDefaults,
} from "./storage";

export { settingsPanelClient } from "./client";

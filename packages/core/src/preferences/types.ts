/**
 * Preferences Types
 * Inspired by Vben Admin's preference system
 */

// === Color Scheme Types ===
export type ColorSchemeType =
  | 'teal'
  | 'ocean'
  | 'rose'
  | 'forest'
  | 'midnight'
  | 'sunset'
  | 'mono'
  | 'github';

// === Theme Mode Types ===
export type ThemeModeType = 'light' | 'dark' | 'system';

// === Border Radius Types ===
export type RadiusType = 'sm' | 'md' | 'lg' | 'xl';

// === Layout Mode Types ===
/**
 * 文章列表布局模式
 * - card: 卡片布局，标题优先，完整元信息，适合阅读型内容
 * - grid: 网格布局，高信息密度，快速浏览，适合图文并茂
 * - list: 列表布局，极简紧凑，适合归档/大量文章
 */
export type LayoutModeType = 'card' | 'grid' | 'list';

// === Reading Mode Types ===
export type ReadingFontSizeType = 'sm' | 'md' | 'lg' | 'xl';
export type ReadingLineHeightType = 'compact' | 'comfortable' | 'relaxed';
export type ReadingWidthType = 'narrow' | 'medium' | 'wide';
export type ReadingThemeType =
  | 'default'
  | 'eyecare'
  | 'parchment'
  | 'night'
  | 'oled';
export type ReadingFontFamilyType =
  | 'serif'
  | 'sans'
  | 'mono'
  | 'system'
  | 'code'
  | 'lxgw'
  | 'zcool'
  | 'readable'
  | 'classic';

// === Theme Preferences ===
export interface ThemePreferences {
  /** Current color scheme */
  colorScheme: ColorSchemeType;
  /** Theme mode */
  mode: ThemeModeType;
  /** Border radius */
  radius: RadiusType;
}

// === Appearance Preferences ===
export interface AppearancePreferences {
  /** Global font size scale (0.85 - 1.25) */
  fontSize: number;
}

// === Layout Preferences ===
export interface LayoutPreferences {
  /** Posts list layout mode */
  postsLayout: LayoutModeType;
}

// === Reading Preferences ===
export interface ReadingPreferences {
  /** Font size */
  fontSize: ReadingFontSizeType;
  /** Line height */
  lineHeight: ReadingLineHeightType;
  /** Content width */
  contentWidth: ReadingWidthType;
  /** Reading theme */
  theme: ReadingThemeType;
  /** Font family */
  fontFamily: ReadingFontFamilyType;
  /** Focus mode - highlight current paragraph */
  focusMode: boolean;
}

// === Widget Preferences ===
export interface WidgetPreferences {
  /** Show theme toggle button */
  themeToggle: boolean;
  /** Show back to top button */
  backToTop: boolean;
  /** Show reading time */
  readingTime: boolean;
  /** Show sticky back to top in article */
  stickyBackToTop: boolean;
}

// === Animation Preferences ===
export interface AnimationPreferences {
  /** Enable page animations */
  enabled: boolean;
  /** Enable card hover effect */
  cardHover: boolean;
  /** Enable smooth scrolling */
  smoothScroll: boolean;
}

// === Main Preferences Interface ===
export interface Preferences {
  /** Theme settings */
  theme: ThemePreferences;
  /** Appearance settings */
  appearance: AppearancePreferences;
  /** Layout settings */
  layout: LayoutPreferences;
  /** Reading mode settings */
  reading: ReadingPreferences;
  /** Widget visibility settings */
  widgets: WidgetPreferences;
  /** Animation settings */
  animations: AnimationPreferences;
  /** Preferences version for migration */
  version: number;
}

// === Deep Partial Type ===
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// === Theme Preset Color Definition ===
export interface ThemeColors {
  background: string;
  surface: string;
  foreground: string;
  foregroundSoft: string;
  muted: string;
  accent: string;
  accentSoft: string;
  border: string;
  borderStrong: string;
  card: string;
  cardHover: string;
}

// === Theme Preset Definition ===
export interface ThemePreset {
  id: ColorSchemeType;
  name: string;
  nameZh: string;
  description: string;
  descriptionZh: string;
  light: ThemeColors;
  dark: ThemeColors;
}

// === Storage Data Structure ===
export interface PreferencesStorageData {
  version: number;
  preferences: Preferences;
  updatedAt: string;
}

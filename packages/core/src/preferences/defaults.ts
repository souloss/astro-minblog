/**
 * Default Preferences Configuration
 * Migrated from SettingsPanel.astro with enhanced structure
 */

import type { Preferences, RadiusType } from './types';

/** Current preferences version for migration */
export const PREFERENCES_VERSION = 2;

/** Border radius values mapping */
export const RADIUS_VALUES: Record<RadiusType, string> = {
  sm: '0.5rem',
  md: '0.75rem',
  lg: '1rem',
  xl: '1.5rem',
};

/** Default preferences configuration */
export const defaultPreferences: Preferences = {
  theme: {
    colorScheme: 'teal',
    mode: 'system',
    radius: 'lg',
  },

  appearance: {
    fontSize: 1, // 1rem = 100%
  },

  layout: {
    postsLayout: 'card',
  },

  reading: {
    fontSize: 'md',
    lineHeight: 'comfortable',
    contentWidth: 'medium',
    theme: 'default',
    fontFamily: 'system',
    focusMode: false,
  },

  widgets: {
    themeToggle: true,
    backToTop: true,
    readingTime: true,
    stickyBackToTop: true,
  },

  animations: {
    enabled: true,
    cardHover: true,
    smoothScroll: true,
  },

  version: PREFERENCES_VERSION,
};

/** Reading mode font size values (rem) */
export const READING_FONT_SIZE_VALUES = {
  sm: '0.9rem',
  md: '1rem',
  lg: '1.125rem',
  xl: '1.25rem',
} as const;

/** Reading mode line height values */
export const READING_LINE_HEIGHT_VALUES = {
  compact: '1.6',
  comfortable: '1.8',
  relaxed: '2',
} as const;

/** Reading mode content width values (ch) */
export const READING_WIDTH_VALUES = {
  narrow: '65ch',
  medium: '72ch',
  wide: '80ch',
} as const;

/** Reading mode theme colors */
export const READING_THEME_COLORS = {
  default: {
    bg: '#ffffff',
    text: '#1d1d1f',
  },
  eyecare: {
    bg: '#f5f0e6',
    text: '#433422',
  },
  parchment: {
    bg: '#f4ecd8',
    text: '#5c4b37',
  },
  night: {
    bg: '#111827',
    text: '#f9fafb',
  },
  oled: {
    bg: '#000000',
    text: '#f5f5f5',
  },
} as const;

/** Reading mode font family values */
export const READING_FONT_FAMILY_VALUES = {
  serif: '"Noto Serif SC", "Source Han Serif SC", Georgia, serif',
  sans: '"Noto Sans SC", "Source Han Sans SC", -apple-system, sans-serif',
  mono: '"JetBrains Mono", "Fira Code", "IBM Plex Mono", monospace',
  system: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
  code: '"JetBrains Mono", "Fira Code", "Cascadia Code", "Source Code Pro", monospace',
  lxgw: '"LXGW WenKai", "LXGW WenKai Mono", "Noto Serif SC", serif',
  zcool: '"ZCOOL KuaiLe", "ZCOOL XiaoWei", "Ma Shan Zheng", cursive',
  readable: '"Literata", "Source Serif Pro", "Noto Serif SC", Georgia, serif',
  classic: '"Noto Serif SC", "Source Han Serif SC", "Songti SC", SimSun, serif',
} as const;

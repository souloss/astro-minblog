/**
 * @astro-minimax/core - Type definitions
 *
 * Consumer projects must provide a `src/config.ts` that exports a `SITE` object
 * conforming to the `SiteConfig` interface below.
 */

export interface NavItem {
  key: string;
  enabled: boolean;
}

export interface EditPostConfig {
  enabled: boolean;
  text: string;
  url: string;
}

export interface FeaturesConfig {
  tags?: boolean;
  categories?: boolean;
  series?: boolean;
  archives?: boolean;
  friends?: boolean;
  projects?: boolean;
  search?: boolean;
  darkMode?: boolean;
  ai?: boolean;
  waline?: boolean;
  sponsor?: boolean;
}

export interface WalineConfig {
  serverURL: string;
}

export interface AiConfig {
  enabled?: boolean;
  mockMode?: boolean;
  apiEndpoint?: string;
  model?: string;
  maxTokens?: number;
  systemPromptOverride?: string;
  welcomeMessage?: string;
  placeholder?: string;
}

export interface SponsorItem {
  platform: string;
  qrcode: string;
  hint: string;
}

export interface SponsorConfig {
  items: SponsorItem[];
}

export interface CopyrightConfig {
  license: string;
  url: string;
}

export interface UmamiConfig {
  enabled?: boolean;
  websiteId: string;
  src: string;
}

export interface SiteConfig {
  website: string;
  author: string;
  profile?: string;
  desc: string;
  title: string;
  ogImage?: string;
  postPerIndex?: number;
  postPerPage?: number;
  scheduledPostMargin?: number;
  showBackButton?: boolean;
  showArchives?: boolean;
  startDate?: string;
  editPost?: EditPostConfig;
  dynamicOgImage?: boolean;
  dir?: "ltr" | "rtl";
  lang?: string;
  timezone?: string;
  features?: FeaturesConfig;
  nav?: { items: NavItem[] };
  umami?: UmamiConfig;
  waline?: WalineConfig;
  ai?: AiConfig;
  sponsor?: SponsorConfig;
  copyright?: CopyrightConfig;
}

/**
 * @astro-minimax/core - Type definitions
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

export interface UmamiConfig {
  enabled?: boolean;
  websiteId: string;
  src: string;
}

export interface WalineConfig {
  enabled?: boolean;
  serverURL: string;
  emoji?: string[];
  lang?: string;
  pageview?: boolean;
  reaction?: boolean;
  login?: string;
  wordLimit?: number[];
  imageUploader?: boolean;
  requiredMeta?: string[];
  copyright?: boolean;
  recaptchaV3Key?: string;
  turnstileKey?: string;
}

export interface AiConfig {
  enabled?: boolean;
  mockMode?: boolean;
  apiEndpoint?: string;
  model?: string;
  maxTokens?: number;
  systemPrompt?: string;
  welcomeMessage?: string;
  placeholder?: string;
}

export interface SponsorMethod {
  name: string;
  icon: string;
  image: string;
}

export interface SponsorEntry {
  name: string;
  platform?: string;
  amount: number;
  date: string;
}

export interface SponsorConfig {
  enabled?: boolean;
  methods?: SponsorMethod[];
  sponsors?: SponsorEntry[];
}

export interface CopyrightConfig {
  license: string;
  licenseUrl?: string;
  url?: string;
}

export interface ProjectConfig {
  repo: string;
  featured?: boolean;
  description?: string;
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
  startDate?: string;
  editPost?: EditPostConfig;
  dynamicOgImage?: boolean;
  dir?: "ltr" | "rtl";
  lang?: string;
  timezone?: string;
  blogPath?: string;
  features?: FeaturesConfig;
  nav?: { items: NavItem[] };
  projects?: ProjectConfig[];
  umami?: UmamiConfig;
  waline?: WalineConfig;
  ai?: AiConfig;
  sponsor?: SponsorConfig;
  copyright?: CopyrightConfig;

  lightAndDarkMode?: boolean;
  showArchives?: boolean;
}

export interface SocialLink {
  name: string;
  href: string;
  linkTitle: string;
  icon: string;
}

export interface FriendLink {
  name: string;
  url: string;
  avatar?: string;
  description?: string;
}

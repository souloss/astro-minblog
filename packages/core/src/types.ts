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

/**
 * AI chat configuration (client-side).
 * 
 * Note: Server-side AI configuration (model, apiKey, etc.) is handled via
 * environment variables (AI_MODEL, AI_API_KEY, etc.) in the @astro-minimax/ai package.
 * 
 * @see packages/ai/README.md for server-side configuration
 */
export interface AiConfig {
  /** Enable AI chat widget */
  enabled?: boolean;
  /** Use mock responses instead of real API (for demos) */
  mockMode?: boolean;
  /** API endpoint for chat requests (default: "/api/chat") */
  apiEndpoint?: string;
  /** Custom welcome message (auto-generated if not provided) */
  welcomeMessage?: string;
  /** Custom input placeholder text */
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

export interface DocSearchConfig {
  appId: string;
  apiKey: string;
  indexName: string;
  placeholder?: string;
}

export interface SearchConfig {
  provider?: 'pagefind' | 'docsearch';
  docsearch?: DocSearchConfig;
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
  darkMode?: boolean;
  nav?: { items: NavItem[] };
  projects?: ProjectConfig[];
  umami?: UmamiConfig;
  waline?: WalineConfig;
  ai?: AiConfig;
  sponsor?: SponsorConfig;
  copyright?: CopyrightConfig;
  search?: SearchConfig;
  
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

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
 * AI response cache configuration.
 */
export interface AiCacheConfig {
  /** Enable response caching for public questions */
  enabled?: boolean;
  /** Cache TTL in seconds (default: 3600 = 1 hour) */
  ttl?: number;
  /** Delay between chunks during playback in ms (default: 20) */
  playbackDelay?: number;
  /** Characters per chunk during playback (default: 15) */
  chunkSize?: number;
  /** Delay for thinking content playback in ms (default: 5) */
  thinkingDelay?: number;
}

/**
 * AI timeout configuration in milliseconds.
 */
export interface AiTimeoutConfig {
  /** Total request timeout (default: 45000) */
  request?: number;
  /** Keyword extraction timeout (default: 5000) */
  keywordExtraction?: number;
  /** Evidence analysis timeout (default: 8000) */
  evidenceAnalysis?: number;
  /** LLM streaming timeout per provider (default: 30000) */
  llmStreaming?: number;
}

/**
 * AI provider health configuration.
 */
export interface AiHealthConfig {
  /** Consecutive failures before marking unhealthy (default: 3) */
  unhealthyThreshold?: number;
  /** Time in ms before retrying unhealthy provider (default: 60000) */
  recoveryTtl?: number;
}

/**
 * AI chat configuration.
 * 
 * Server-side sensitive configuration (API keys) is handled via environment variables:
 * - AI_API_KEY, AI_BASE_URL, AI_MODEL for OpenAI-compatible providers
 * - AI_BINDING_NAME for Cloudflare Workers AI
 * - AI_PROVIDERS for multi-provider JSON config
 * 
 * @see packages/ai/README.md for full configuration guide
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
  /** Response cache configuration */
  cache?: AiCacheConfig;
  /** Timeout configuration in milliseconds */
  timeouts?: AiTimeoutConfig;
  /** Provider health configuration */
  health?: AiHealthConfig;
  /** Voice style preset for AI responses */
  voiceStyle?: "friendly" | "professional" | "casual" | "technical";
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

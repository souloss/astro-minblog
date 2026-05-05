export const MODEL = {
  /** Default context window size in tokens — override per-provider via AI_CONTEXT_WINDOW_TOKENS */
  DEFAULT_CONTEXT_WINDOW_TOKENS: 128_000,
  /** Maximum fraction of context window usable for input (system prompt + messages) */
  MAX_INPUT_TOKEN_RATIO: 0.85,
  /** Minimum output tokens to reserve regardless of context pressure */
  MIN_OUTPUT_TOKENS: 2_000,
  /** Safety margin tokens kept free to account for estimation imprecision */
  SAFETY_MARGIN_TOKENS: 2_000,
} as const;

export const CHAT_HANDLER = {
  MAX_HISTORY_MESSAGES: 20,
  MAX_INPUT_LENGTH: 500,
  STREAMING_TEMPERATURE: 1.0,
  STREAMING_MAX_OUTPUT_TOKENS: 16_000,
  CACHED_REPLAY_TEMPERATURE: 0.3,
  CACHED_REPLAY_MAX_OUTPUT_TOKENS: 2_500,
} as const;

export const TIMEOUTS = {
  REQUEST: 45_000,
  KEYWORD_EXTRACTION: 5_000,
  EVIDENCE_ANALYSIS: 8_000,
  LLM_STREAMING: 30_000,
  PROVIDER_DEFAULT: 30_000,
  MOCK_CHAR_DELAY: 15,
} as const;

export const HEALTH = {
  UNHEALTHY_THRESHOLD: 3,
  RECOVERY_TTL: 60_000,
} as const;

export const SEARCH = {
  ARTICLE_LIMIT: 10,
  ARTICLE_LIMIT_BROAD: 20,
  PROJECT_LIMIT: 5,
  DEEP_CONTENT_SCORE_THRESHOLD: 8,
  DEEP_CONTENT_MAX_LENGTH: 1500,
} as const;

export const CACHE = {
  DEFAULT_TTL: 600,
  DEFAULT_MAX_ENTRIES: 400,
  PLAYBACK_DELAY: 20,
  CHUNK_SIZE: 15,
  THINKING_DELAY: 5,
  SESSION_TTL: 600,
  MIN_TTL: 60,
  GLOBAL_CLEANUP_INTERVAL: 300_000,
} as const;

export const NOTIFICATION = {
  MAX_REFERENCED_ARTICLES: 5,
} as const;

export const RESPONSE = {
  SEARCH_PROGRESS: 40,
  GENERATING_PROGRESS: 60,
  FALLBACK_PROGRESS: 80,
  COMPLETE_PROGRESS: 100,
  MAX_SOURCE_ARTICLES: 3,
  MAX_CITATIONS: 5,
} as const;

export const PROVIDER = {
  DEFAULT_WEIGHT: 100,
} as const;

export const INTELLIGENCE = {
  EVIDENCE_ANALYSIS_MAX_TOKENS: 360,
  MAX_FOLLOW_UP_LENGTH: 48,
} as const;

export const CHUNK_INJECTION = {
  SHORT_ARTICLE_THRESHOLD: 5000,
  SHORT_ARTICLE_MAX_TOKENS: 6000,
  LONG_ARTICLE_MAX_TOKENS: 3000,
  MAX_TOKENS: 1500,
  MIN_CHUNK_SCORE: 0.15,
  MAX_CHUNKS_PER_ARTICLE: 4,
} as const;

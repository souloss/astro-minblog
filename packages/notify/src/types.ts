// ============================================================================
// Provider Configuration Types
// ============================================================================

export interface TelegramConfig {
  botToken: string;
  chatId: string;
}

export interface WebhookConfig {
  url: string;
  method?: "POST";
  headers?: Record<string, string>;
}

export interface EmailConfig {
  provider: "resend";
  apiKey: string;
  from: string;
  to: string;
}

export interface NotifyConfig {
  telegram?: TelegramConfig;
  webhook?: WebhookConfig;
  email?: EmailConfig;
  templates?: Partial<EventTemplates>;
  logger?: Logger;
}

export interface NotifyEnv {
  NOTIFY_TELEGRAM_BOT_TOKEN?: string;
  NOTIFY_TELEGRAM_CHAT_ID?: string;
  NOTIFY_WEBHOOK_URL?: string;
  NOTIFY_RESEND_API_KEY?: string;
  NOTIFY_RESEND_FROM?: string;
  NOTIFY_RESEND_TO?: string;
  SITE_URL?: string;
  [key: string]: unknown;
}

export type SourceKind = "waline" | "ai-runtime" | "manual";

export interface EventSourceMeta {
  kind: SourceKind;
  eventName?: string;
}

// ============================================================================
// Event Types
// ============================================================================

export type EventType = "comment" | "ai-chat";

export interface BaseEvent {
  type: EventType;
  timestamp?: Date;
  source?: EventSourceMeta;
}

export interface CommentEvent extends BaseEvent {
  type: "comment";
  author: string;
  content: string;
  postTitle: string;
  postUrl: string;
}

export interface ArticleRef {
  title: string;
  url?: string;
}

export interface ModelInfo {
  name: string;
  provider?: string;
  apiHost?: string;
}

export interface TokenUsage {
  total: number;
  input: number;
  output: number;
}

export interface PhaseTiming {
  total: number;
  keywordExtraction?: number;
  search?: number;
  evidenceAnalysis?: number;
  generation?: number;
}

export interface AiChatEvent extends BaseEvent {
  type: "ai-chat";
  sessionId: string;
  roundNumber: number;
  userMessage: string;
  aiResponse?: string;
  referencedArticles?: ArticleRef[];
  model?: ModelInfo;
  usage?: TokenUsage;
  timing?: PhaseTiming;
  siteUrl?: string;
}

export type NotifyEvent = CommentEvent | AiChatEvent;

// ============================================================================
// Template Types
// ============================================================================

export interface TelegramTemplate {
  text: string;
  parse_mode?: "HTML" | "MarkdownV2";
}

export interface WebhookPayload {
  event: EventType;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

export interface EventTemplates {
  comment: {
    telegram: (event: CommentEvent) => TelegramTemplate;
    webhook: (event: CommentEvent) => WebhookPayload;
    email: (event: CommentEvent) => EmailTemplate;
  };
  "ai-chat": {
    telegram: (event: AiChatEvent) => TelegramTemplate;
    webhook: (event: AiChatEvent) => WebhookPayload;
    email: (event: AiChatEvent) => EmailTemplate;
  };
}

// ============================================================================
// Result Types
// ============================================================================

export type Channel = "telegram" | "webhook" | "email";

export interface SendResult {
  channel: Channel;
  success: boolean;
  error?: string;
  duration?: number;
}

export interface NotifyResult {
  event: EventType;
  results: SendResult[];
  success: boolean;
}

// ============================================================================
// Logger Type
// ============================================================================

export interface Logger {
  info(message: string, data?: Record<string, unknown>): void;
  error(message: string, error?: Error, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
}

// ============================================================================
// Notifier Interface
// ============================================================================

export interface Notifier {
  comment(event: Omit<CommentEvent, "type">): Promise<NotifyResult>;
  aiChat(event: Omit<AiChatEvent, "type">): Promise<NotifyResult>;
  send(event: NotifyEvent): Promise<NotifyResult>;
}

export { handleChatRequest } from "./chat-handler.js";
export {
  extractQuotedCandidate,
  isLikelyQuotedArticleQuery,
  isCrossArticleIntent,
  isArticleSummaryQuery,
  rerankArticlesForCurrentArticleQuote,
  rerankArticlesForCodeAnchors,
  shapeArticlesForQuery,
} from "./article-ranking.js";
export { buildFinalSources } from "./source-selection.js";
export { initializeMetadata } from "./metadata-init.js";
export { applyAiConfigDefaults } from "./env-config.js";
export { errors, corsPreflightResponse, chatError } from "./errors.js";
export { selectAndInjectChunks } from "./chunk-injector.js";
export type {
  ChunkInjectionArgs,
  ChunkInjectionResult,
} from "./chunk-injector.js";
export { classifyQueryScope } from "./scope-classifier.js";
export type { QueryScope, ArticleContextHint } from "./scope-classifier.js";
export { createChatStatusData, isChatStatusData } from "./types.js";
export {
  getStreamResultMetadata,
  streamResultHadToolCalls,
  extractReasoningText,
  parseTokenUsage,
  consumeStreamWithErrors,
} from "./stream-processor.js";
export {
  withTimeout,
  createTimeoutController,
  createChainedTimeoutController,
} from "./timeout.js";
export type {
  ChatContext,
  ArticleChatContext,
  ChatRequestBody,
  ChatHandlerEnv,
  ChatHandlerOptions,
  ChatStatusData,
  ChatStatusStage,
  ChatErrorResponse,
  MetadataConfig,
} from "./types.js";

import {
  type UIMessage,
  createUIMessageStream,
  createUIMessageStreamResponse,
} from "ai";
import { t, getLang } from "../utils/i18n.js";
import {
  buildLocalSearchQuery,
  shouldRunKeywordExtraction,
  extractSearchKeywords,
  rankArticlesByCategory,
  shouldSkipAnalysis,
  analyzeRetrievedEvidence,
  buildEvidenceSection,
  getCitationGuardPreflight,
  buildUnknownRefusal,
  shouldAppendCitations,
  selectCitations,
  formatCitationBlock,
  resolveSearchInterpretation,
} from "../intelligence/index.js";
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
import {
  isLikelyQuotedArticleQuery,
  isCrossArticleIntent,
  isArticleSummaryQuery,
  rerankArticlesForCurrentArticleQuote,
  shapeArticlesForQuery,
} from "./article-ranking.js";
import { buildFinalSources } from "./source-selection.js";
import {
  mergeResults,
  searchArticles,
  searchProjects,
  getSessionCacheKey,
  getCachedContext,
  setCachedContext,
  getArticleChunks,
  type ArticleContext,
} from "../search/index.js";
import { getProviderManager } from "../provider-manager/index.js";
import {
  createCacheAdapter,
  getGlobalSearchCache,
  setGlobalSearchCache,
  getGlobalCacheTTL,
  getResponseCache,
  setResponseCache,
  getResponseCacheConfig,
  detectPublicQuestion,
  normalizePublicCacheQuery,
} from "../cache/index.js";
import {
  getClientIP,
  checkRateLimit,
  rateLimitResponse,
} from "../middleware/index.js";
import {
  getExtensionRegistry,
  getSemanticFallback,
  resolveVoiceStyleMode,
  mergeSearchDocuments,
  mergeFacts,
} from "../extensions/index.js";
import { initializeExtensions, areExtensionsLoaded } from "./metadata-init.js";
import type { CachedAIResponse } from "../cache/response-cache.js";
import type { PublicQuestionType } from "../cache/global-cache.js";
import type { SourceSelection } from "../search/types.js";
import type { ProviderAdapter } from "../provider-manager/types.js";
import type {
  ChatHandlerOptions,
  ChatRequestBody,
  ChatContext,
  PhaseTiming,
} from "./types.js";
import { createChatStatusData } from "./types.js";
import { errors, corsPreflightResponse, setCorsOrigin } from "./errors.js";
import {
  writeSearchStatus,
  writeGeneratingStatus,
  writeSourceArticles,
  writeSourceSnippets,
  streamLLMResponse,
  streamLLMWithFailover,
  streamAnswerWithFallback,
  streamMockFallback,
  streamCachedResponse,
  writeTextChunk,
  writeFinish,
} from "./stream-helpers.js";
import {
  getMessageText,
  filterValidMessages,
  getLatestUserText,
} from "./chat-message-utils.js";
import {
  sendNotification,
  getTimeoutConfig,
  getHealthConfig,
} from "./chat-utils.js";
import {
  buildRuntimeSystemPrompt,
  assemblePromptRuntime,
} from "./prompt-runtime.js";
import { CHAT_HANDLER, RESPONSE, CHUNK_INJECTION } from "../constants.js";
import { createLogger, setLogLevel } from "../utils/logger.js";
import { getAllTools } from "../tools/index.js";

const log = createLogger("chat-handler");

export async function handleChatRequest(
  options: ChatHandlerOptions
): Promise<Response> {
  const { env, request: req, waitUntil } = options;

  if (env.AI_DEBUG) setLogLevel("debug");
  if (env.CORS_ORIGIN) setCorsOrigin(env.CORS_ORIGIN as string);
  if (req.method === "OPTIONS") return corsPreflightResponse();
  if (req.method !== "POST")
    return errors.methodNotAllowed((env.SITE_LANG as string) ?? "zh");

  const ip = getClientIP(req);
  const rateCheck = checkRateLimit(
    ip,
    env as Record<string, string | undefined>
  );
  if (!rateCheck.allowed)
    return rateLimitResponse(rateCheck, (env.SITE_LANG as string) ?? "zh");

  let body: ChatRequestBody;
  try {
    body = await req.json();
  } catch {
    return errors.invalidRequest(
      t("ai.error.format", (env.SITE_LANG as string) ?? "zh")
    );
  }

  const lang = getLang(body.lang ?? (env.SITE_LANG as string | undefined));
  const context: ChatContext = body.context ?? { scope: "global" };
  const rawMessages = (body.messages ?? []).slice(
    -CHAT_HANDLER.MAX_HISTORY_MESSAGES
  );
  if (!rawMessages.length) return errors.emptyMessage(lang);

  const messages = filterValidMessages(rawMessages);
  if (!messages.length) return errors.emptyMessage(lang);

  const latestMessage = messages[messages.length - 1];
  const latestText =
    latestMessage.role === "user"
      ? getMessageText(latestMessage)
      : getLatestUserText(messages);
  if (!latestText) return errors.emptyContent(lang);
  if (latestText.length > CHAT_HANDLER.MAX_INPUT_LENGTH)
    return errors.inputTooLong(CHAT_HANDLER.MAX_INPUT_LENGTH, lang);

  const timeouts = getTimeoutConfig(env as Record<string, unknown>);
  const requestAbort = new AbortController();
  const requestTimer = setTimeout(() => requestAbort.abort(), timeouts.request);

  log.debug(
    `Request: scope=${context.scope}, msg="${latestText.substring(0, 80)}", history=${messages.length}`
  );

  try {
    return await runPipeline({
      env,
      messages,
      latestText,
      context,
      req,
      requestAbort,
      lang,
      waitUntil,
      timeouts,
    });
  } catch (err) {
    if (requestAbort.signal.aborted) return errors.timeout(lang);
    log.error("Unexpected error:", err);
    return errors.internal(undefined, lang);
  } finally {
    clearTimeout(requestTimer);
  }
}

interface TimeoutConfig {
  request: number;
  keywordExtraction: number;
  evidenceAnalysis: number;
  llmStreaming: number;
}

interface PipelineArgs {
  env: ChatHandlerOptions["env"];
  messages: UIMessage[];
  latestText: string;
  context: ChatContext;
  req: Request;
  requestAbort: AbortController;
  lang: string;
  waitUntil?: (promise: Promise<unknown>) => void;
  timeouts: TimeoutConfig;
}

interface TimingTracker {
  start: number;
  keywordExtraction?: number;
  search?: number;
  evidenceAnalysis?: number;
  generation?: number;
}

interface PipelineContext {
  env: ChatHandlerOptions["env"];
  messages: UIMessage[];
  latestText: string;
  context: ChatContext;
  lang: string;
  timeouts: TimeoutConfig;
  timing: TimingTracker;
  cache: ReturnType<typeof createCacheAdapter>;
  responseCacheConfig: ReturnType<typeof getResponseCacheConfig>;
  adapters: ProviderAdapter[];
  adapter: ProviderAdapter | null;
  hasRealProvider: boolean;
  extensions: ReturnType<
    ReturnType<typeof getExtensionRegistry>["getLoadedExtensions"]
  > extends infer R
    ? R
    : never;
  articleSlug: string | undefined;
  publicQuestion: ReturnType<typeof detectPublicQuestion>;
  cacheKey: string | null;
}

async function initializeContext(args: PipelineArgs): Promise<PipelineContext> {
  const { env, messages, latestText, context, req, lang, timeouts } = args;
  const timing: TimingTracker = { start: Date.now() };
  const cache = createCacheAdapter(env);
  const responseCacheConfig = getResponseCacheConfig(env);
  const healthConfig = getHealthConfig(env as Record<string, unknown>);
  const manager = getProviderManager(env, {
    enableMockFallback: true,
    unhealthyThreshold: healthConfig.unhealthyThreshold,
    healthRecoveryTTL: healthConfig.recoveryTtl,
  });
  const hasRealProvider = manager.hasProviders();
  const adapters = hasRealProvider ? await manager.getAvailableAdapters() : [];
  const adapter = adapters[0] ?? null;
  if (!areExtensionsLoaded()) {
    await initializeExtensions();
  }
  const extensions = getExtensionRegistry().getLoadedExtensions();
  if (context.scope === "article" && !context.article?.slug) {
    log.warn("article scope but no article context provided");
  }

  const articleSlug =
    context.scope === "article" && context.article?.slug
      ? context.article.slug
      : undefined;
  const publicQuestion = detectPublicQuestion(latestText);
  const cacheKey = getSessionCacheKey(req);

  return {
    env,
    messages,
    latestText,
    context,
    lang,
    timeouts,
    timing,
    cache,
    responseCacheConfig,
    adapters,
    adapter,
    hasRealProvider,
    extensions,
    articleSlug,
    publicQuestion,
    cacheKey,
  };
}

async function analyzeAndBuildPrompt(
  ctx: PipelineContext,
  search: SearchPhaseResult
): Promise<import("./prompt-runtime.js").PromptAssemblyResult> {
  return assemblePromptRuntime({
    env: ctx.env,
    latestText: ctx.latestText,
    context: ctx.context,
    lang: ctx.lang,
    evidenceAnalysisTimeout: ctx.timeouts.evidenceAnalysis,
    timing: {
      total: Date.now() - ctx.timing.start,
      keywordExtraction: ctx.timing.keywordExtraction,
      search: ctx.timing.search,
      evidenceAnalysis: ctx.timing.evidenceAnalysis,
      generation: ctx.timing.generation,
    },
    adapter: ctx.adapter,
    hasRealProvider: ctx.hasRealProvider,
    extensions: ctx.extensions,
    cacheKey: ctx.cacheKey,
    searchQuery: search.searchQuery,
    relatedArticles: search.relatedArticles,
    relatedProjects: search.relatedProjects,
    budget: search.budget,
    answerMode: search.interpretation.answer.contract,
  });
}

interface SearchPhaseResult {
  searchQuery: string;
  relatedArticles: ReturnType<typeof searchArticles>;
  relatedProjects: ReturnType<typeof searchProjects>;
  selectedSources?: SourceSelection[];
  budget: ReturnType<typeof resolveSearchInterpretation>["budget"];
  interpretation: ReturnType<
    typeof resolveSearchInterpretation
  >["interpretation"];
}

export function resolveSearchAnswerShaping(
  query: string
): Pick<SearchPhaseResult, "budget" | "interpretation"> {
  const { interpretation, budget } = resolveSearchInterpretation({
    latestText: query,
  });

  return { interpretation, budget };
}

export function rankArticlesForQuery(
  query: string,
  articles: ReturnType<typeof searchArticles>
): ReturnType<typeof searchArticles> {
  const { interpretation } = resolveSearchInterpretation({ latestText: query });
  return rankArticlesByCategory(interpretation.topic.primary, articles);
}

export function shouldPersistAuthoritativeSources(
  sources: SourceSelection[]
): boolean {
  return (
    sources.length > 0 &&
    sources.every(
      source =>
        source.reason === "chunk" ||
        source.reason === "evidence" ||
        source.reason === "article-context"
    )
  );
}

export function shapeCachedSearchForQuery(args: {
  query: string;
  articles: ReturnType<typeof searchArticles>;
  projects: ReturnType<typeof searchProjects>;
}): {
  interpretation: ReturnType<
    typeof resolveSearchInterpretation
  >["interpretation"];
  budget: ReturnType<typeof resolveSearchInterpretation>["budget"];
  articles: ReturnType<typeof searchArticles>;
  projects: ReturnType<typeof searchProjects>;
} {
  const shaped = shapeArticlesForQuery(args.query, args.articles);
  return {
    interpretation: shaped.interpretation,
    budget: shaped.budget,
    articles: shaped.articles,
    projects: args.projects,
  };
}

export function shouldPersistResponseCacheEntry(args: {
  enabled: boolean;
  success: boolean;
  responseText: string;
  sources: SourceSelection[];
}): boolean {
  return (
    args.enabled &&
    args.success &&
    args.responseText.length > 0 &&
    shouldPersistAuthoritativeSources(args.sources)
  );
}

type PublicQuestionLike = {
  type: PublicQuestionType;
  needsContext: boolean;
};

export function shouldUsePublicQuestionCaches(args: {
  publicQuestion: PublicQuestionLike | null;
  articleSlug?: string;
}): boolean {
  return Boolean(
    args.publicQuestion &&
    (!args.publicQuestion.needsContext || args.articleSlug)
  );
}

export function buildPublicCacheContext(args: {
  articleSlug?: string;
  lang: string;
  latestText: string;
}): { articleSlug?: string; lang?: string; queryKey?: string } {
  return {
    articleSlug: args.articleSlug,
    lang: args.lang,
    queryKey: normalizePublicCacheQuery(args.latestText),
  };
}

export function shapePublicCacheBranch(args: {
  publicQuestion: PublicQuestionLike | null;
  articleSlug?: string;
  lang: string;
  latestText: string;
}): {
  enabled: boolean;
  context: { articleSlug?: string; lang?: string; queryKey?: string };
} {
  return {
    enabled: shouldUsePublicQuestionCaches({
      publicQuestion: args.publicQuestion,
      articleSlug: args.articleSlug,
    }),
    context: buildPublicCacheContext({
      articleSlug: args.articleSlug,
      lang: args.lang,
      latestText: args.latestText,
    }),
  };
}

async function retrieveContext(
  ctx: PipelineContext,
  req: Request
): Promise<SearchPhaseResult> {
  const {
    messages,
    latestText,
    cache,
    timeouts,
    timing,
    hasRealProvider,
    adapter,
    extensions,
    publicQuestion,
    articleSlug,
    cacheKey,
    lang,
  } = ctx;
  const now = Date.now();

  const cachedContext = cacheKey
    ? await getCachedContext(cacheKey, cache)
    : undefined;
  const userTurnCount = messages.filter(
    (m: UIMessage) => m.role === "user"
  ).length;
  const initialSearchInterpretation = resolveSearchInterpretation({
    latestText,
    cachedContext,
    userTurnCount,
    now,
  });
  const reuseContext =
    initialSearchInterpretation.interpretation.conversation.shouldReuseContext;

  let searchQuery = buildLocalSearchQuery(latestText) || latestText;
  let relatedArticles =
    reuseContext && cachedContext ? cachedContext.articles : [];
  let relatedProjects =
    reuseContext && cachedContext ? cachedContext.projects : [];
  let { budget } = initialSearchInterpretation;
  let { interpretation } = initialSearchInterpretation;

  const semanticFallback = getSemanticFallback(latestText, extensions);
  if (semanticFallback) {
    searchQuery = semanticFallback.query;
  }

  if (reuseContext && cachedContext && cacheKey) {
    searchQuery = cachedContext.query;
    await setCachedContext(
      cacheKey,
      { ...cachedContext, updatedAt: now },
      cache
    );
  } else {
    if (hasRealProvider && adapter) {
      const runKW = shouldRunKeywordExtraction({
        messageCount: messages.length,
        localQuery: searchQuery,
        latestText,
      });
      if (runKW) {
        const kwStart = Date.now();
        const abortCtrl = new AbortController();
        const timeoutId = setTimeout(
          () => abortCtrl.abort(),
          timeouts.keywordExtraction
        );
        try {
          const provider = adapter.getProvider();
          const kwResult = await extractSearchKeywords({
            messages: messages as Array<{
              role: string;
              parts?: Array<{ type: string; text?: string }>;
            }>,
            provider,
            model: adapter.keywordModel,
            abortSignal: abortCtrl.signal,
          });
          timing.keywordExtraction = Date.now() - kwStart;
          if (kwResult.query && !kwResult.usedFallback) {
            searchQuery = kwResult.query;
            if (
              kwResult.primaryQuery &&
              kwResult.primaryQuery !== searchQuery
            ) {
              const searchStart = Date.now();
              const primary = searchArticles(kwResult.primaryQuery, {
                enableDeepContent: false,
              });
              relatedArticles = mergeResults(
                searchArticles(searchQuery, { enableDeepContent: true }),
                primary
              );
              relatedProjects = searchProjects(searchQuery);
              timing.search = Date.now() - searchStart;
            }
          }
        } catch (err) {
          timing.keywordExtraction = Date.now() - kwStart;
          log.debug(
            "Keyword extraction failed, using local query:",
            (err as Error).message
          );
        } finally {
          clearTimeout(timeoutId);
        }
      }
    }

    if (!relatedArticles.length) {
      const searchStart = Date.now();
      relatedArticles = searchArticles(searchQuery, {
        enableDeepContent: true,
      });
      relatedProjects = searchProjects(searchQuery);
      timing.search = Date.now() - searchStart;
    }

    if (cacheKey) {
      await setCachedContext(
        cacheKey,
        {
          query: searchQuery,
          articles: relatedArticles,
          projects: relatedProjects,
          updatedAt: now,
        },
        cache
      );
    }

    const publicCacheBranch = shapePublicCacheBranch({
      publicQuestion,
      articleSlug,
      lang,
      latestText,
    });
    if (publicCacheBranch.enabled && publicQuestion) {
      const globalTTL = getGlobalCacheTTL(publicQuestion.type);
      await setGlobalSearchCache(
        cache,
        publicQuestion.type,
        {
          query: searchQuery,
          articles: relatedArticles,
          projects: relatedProjects,
          updatedAt: now,
        },
        globalTTL,
        publicCacheBranch.context
      );
    }
  }

  relatedArticles = mergeSearchDocuments(relatedArticles, extensions);
  ({
    interpretation,
    budget,
    articles: relatedArticles,
  } = shapeArticlesForQuery(latestText, relatedArticles, {
    articleSlug,
    context: ctx.context,
  }));

  log.debug(
    `Search: query="${searchQuery}", articles=${relatedArticles.length}, projects=${relatedProjects.length}, mode=${interpretation.answer.contract}`
  );
  if (relatedArticles.length > 0) {
    log.debug(
      `Top articles: ${relatedArticles
        .slice(0, 3)
        .map(
          (a: { title: string; chunks?: unknown[] }) =>
            `"${a.title}" (chunks: ${a.chunks?.length ?? 0})`
        )
        .join(", ")}`
    );
  }

  return {
    searchQuery,
    relatedArticles,
    relatedProjects,
    budget,
    interpretation,
  };
}

async function runPipeline(args: PipelineArgs): Promise<Response> {
  const ctx = await initializeContext(args);
  const {
    env,
    messages,
    latestText,
    context,
    lang,
    timeouts,
    timing,
    cache,
    responseCacheConfig,
    adapters,
    adapter,
    hasRealProvider,
    extensions,
    articleSlug,
    publicQuestion,
    cacheKey,
  } = ctx;
  const { waitUntil } = args;
  const tools = getAllTools();

  const publicCacheBranch = shapePublicCacheBranch({
    publicQuestion,
    articleSlug,
    lang,
    latestText,
  });
  if (publicCacheBranch.enabled && publicQuestion) {
    const globalCacheContext = publicCacheBranch.context;

    if (responseCacheConfig.enabled) {
      const cachedResponse = await getResponseCache(
        cache,
        publicQuestion.type,
        globalCacheContext
      );

      if (cachedResponse) {
        const notifyTiming: PhaseTiming = { total: Date.now() - timing.start };
        sendNotification({
          env,
          messages,
          responseText: cachedResponse.response,
          relatedArticles: cachedResponse.articles,
          timing: notifyTiming,
          waitUntil,
        });

        const stream = createUIMessageStream({
          execute: async ({ writer }) => {
            await streamCachedResponse(
              writer,
              cachedResponse,
              responseCacheConfig,
              lang
            );
          },
        });

        return createUIMessageStreamResponse({
          stream,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-cache",
          },
        });
      }
    }

    const cachedSearch = await getGlobalSearchCache(
      cache,
      publicQuestion.type,
      globalCacheContext
    );

    if (cachedSearch) {
      const stream = createUIMessageStream({
        execute: async ({ writer }) => {
          const w = writer;
          writeSearchStatus(
            w,
            cachedSearch.articles.length + cachedSearch.projects.length,
            lang
          );
          if (cachedSearch.articles.length + cachedSearch.projects.length > 0) {
            writeGeneratingStatus(w, lang);
          }
          let responseText = "";

          if (adapter) {
            const {
              interpretation: cachedInterpretation,
              budget: cachedBudget,
              articles: shapedCachedArticles,
              projects: shapedCachedProjects,
            } = shapeCachedSearchForQuery({
              query: latestText,
              articles: cachedSearch.articles,
              projects: cachedSearch.projects,
            });
            const promptRuntime = await assemblePromptRuntime({
              env,
              latestText,
              context,
              lang,
              evidenceAnalysisTimeout: timeouts.evidenceAnalysis,
              timing: {
                total: Date.now() - timing.start,
                keywordExtraction: timing.keywordExtraction,
                search: timing.search,
                evidenceAnalysis: timing.evidenceAnalysis,
                generation: timing.generation,
              },
              adapter,
              hasRealProvider,
              extensions,
              cacheKey,
              searchQuery: cachedSearch.query,
              relatedArticles: shapedCachedArticles,
              relatedProjects: shapedCachedProjects,
              budget: cachedBudget,
              answerMode: cachedInterpretation.answer.contract,
            });
            const finalSources = buildFinalSources({
              relatedArticles: shapedCachedArticles as ArticleContext[],
              selectedSources: promptRuntime.selectedSources,
              query: latestText,
              lang,
              max: RESPONSE.MAX_SOURCE_ARTICLES,
              articleSlug,
              context,
            });
            writeSourceArticles(w, finalSources);
            writeSourceSnippets(w, finalSources);

            const llmResult = await streamAnswerWithFallback({
              writer: w,
              adapters: [adapter],
              systemPrompt: promptRuntime.systemPrompt,
              messages,
              question: latestText,
              lang,
              tools,
            });
            responseText = llmResult.responseText;

            if (
              shouldPersistResponseCacheEntry({
                enabled: responseCacheConfig.enabled,
                success: llmResult.success,
                responseText: llmResult.responseText,
                sources: promptRuntime.selectedSources,
              })
            ) {
              const globalTTL = getGlobalCacheTTL(publicQuestion.type);
              const responseCacheData: CachedAIResponse = {
                query: cachedSearch.query,
                thinking: llmResult.reasoningText,
                response: llmResult.responseText,
                articles: shapedCachedArticles,
                projects: shapedCachedProjects,
                sources: promptRuntime.selectedSources,
                lang,
                model: adapter.model,
                updatedAt: Date.now(),
              };
              await setResponseCache(
                cache,
                publicQuestion.type,
                responseCacheData,
                globalTTL,
                globalCacheContext
              );
            }
          } else {
            responseText = await streamMockFallback(w, latestText, lang);
          }
        },
      });

      return createUIMessageStreamResponse({
        stream,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-cache",
        },
      });
    }
  }

  const search = await retrieveContext(ctx, args.req);
  const { searchQuery, relatedArticles, relatedProjects, interpretation } =
    search;
  const { systemPrompt, preflight, unknownRefusal, selectedSources } =
    await analyzeAndBuildPrompt(ctx, search);
  const finalSources = buildFinalSources({
    relatedArticles,
    selectedSources,
    query: latestText,
    lang,
    max: RESPONSE.MAX_SOURCE_ARTICLES,
    articleSlug,
    context,
  });
  log.debug(
    `Final sources: ${finalSources
      .map(
        source =>
          `${source.title}[${source.reason}]${source.lang ? `:${source.lang}` : ""}`
      )
      .join(", ")}`
  );

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const articleCount = relatedArticles.length + relatedProjects.length;

      if (articleCount > 0) {
        writer.write({
          type: "message-metadata",
          messageMetadata: createChatStatusData({
            stage: "search",
            message: t("ai.status.found", lang, { count: articleCount }),
            progress: RESPONSE.SEARCH_PROGRESS,
          }),
        });
      }

      writeSourceArticles(writer, finalSources);
      writeSourceSnippets(writer, finalSources);

      if (preflight) {
        writer.write({
          type: "message-metadata",
          messageMetadata: createChatStatusData({
            stage: "answer",
            message: t("ai.status.citation", lang),
            progress: RESPONSE.COMPLETE_PROGRESS,
            done: true,
          }),
        });
        writeTextChunk(writer, preflight.text, "preflight");
        writeFinish(writer);
        return;
      }

      if (unknownRefusal) {
        writer.write({
          type: "message-metadata",
          messageMetadata: createChatStatusData({
            stage: "answer",
            message: t("ai.status.generating", lang),
            progress: RESPONSE.COMPLETE_PROGRESS,
            done: true,
          }),
        });
        writeTextChunk(writer, unknownRefusal.text, "unknown");
        writeFinish(writer);
        return;
      }

      writer.write({
        type: "message-metadata",
        messageMetadata: createChatStatusData({
          stage: "answer",
          message: t("ai.status.generating", lang),
          progress: RESPONSE.GENERATING_PROGRESS,
        }),
      });

      let responseText = "";
      let reasoningText: string | undefined;
      let tokenUsage:
        | { total: number; input: number; output: number }
        | undefined;
      const generationStart = Date.now();
      const llmResult = await streamAnswerWithFallback({
        writer,
        adapters,
        systemPrompt,
        messages,
        question: latestText,
        lang,
        temperature: CHAT_HANDLER.STREAMING_TEMPERATURE,
        maxOutputTokens: CHAT_HANDLER.STREAMING_MAX_OUTPUT_TOKENS,
        tools,
      });

      timing.generation =
        llmResult.generationMs || Date.now() - generationStart;
      responseText = llmResult.responseText;
      reasoningText = llmResult.reasoningText;
      tokenUsage = llmResult.tokenUsage
        ? {
            total: llmResult.tokenUsage.total,
            input: llmResult.tokenUsage.input,
            output: llmResult.tokenUsage.output,
          }
        : undefined;

      const usedAdapter = llmResult.adapter;

      if (usedAdapter && llmResult.responseText.length > 0) {
        log.debug(
          `Provider success: adapter=${usedAdapter.id}, model=${usedAdapter.model}, responseLength=${responseText.length}, usage=${JSON.stringify(tokenUsage ?? null)}`
        );

        if (
          shouldAppendCitations(responseText, relatedArticles, relatedProjects)
        ) {
          const citations = selectCitations(
            relatedArticles,
            relatedProjects,
            RESPONSE.MAX_SOURCE_ARTICLES,
            RESPONSE.MAX_CITATIONS
          );
          if (citations.length > 0) {
            const citationBlock = formatCitationBlock(citations, lang);
            writeTextChunk(writer, citationBlock, "citation");
            responseText += citationBlock;
          }
        }

        if (
          publicCacheBranch.enabled &&
          publicQuestion &&
          shouldPersistResponseCacheEntry({
            enabled: responseCacheConfig.enabled,
            success: true,
            responseText,
            sources: selectedSources,
          })
        ) {
          const globalTTL = getGlobalCacheTTL(publicQuestion.type);
          const responseCacheData: CachedAIResponse = {
            query: searchQuery,
            thinking: reasoningText,
            response: responseText,
            articles: relatedArticles,
            projects: relatedProjects,
            sources: selectedSources,
            lang,
            model: usedAdapter.model,
            updatedAt: Date.now(),
          };
          await setResponseCache(
            cache,
            publicQuestion.type,
            responseCacheData,
            globalTTL,
            publicCacheBranch.context
          );
        }
      }

      if (llmResult.usedMockFallback) {
        timing.generation = Date.now() - generationStart;
        responseText = llmResult.responseText;
      }

      if (responseText) {
        const notifyTiming: PhaseTiming = {
          total: Date.now() - timing.start,
          keywordExtraction: timing.keywordExtraction,
          search: timing.search,
          evidenceAnalysis: timing.evidenceAnalysis,
          generation: timing.generation,
        };

        sendNotification({
          env,
          messages,
          responseText,
          relatedArticles: finalSources,
          model: usedAdapter
            ? {
                name: usedAdapter.model,
                provider: (env.AI_PROVIDER as string) || undefined,
                apiHost: (env.AI_BASE_URL as string) || undefined,
              }
            : undefined,
          usage: tokenUsage,
          timing: notifyTiming,
          cacheKey,
          waitUntil,
        });
      }
    },
  });

  return createUIMessageStreamResponse({
    stream,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-cache",
    },
  });
}

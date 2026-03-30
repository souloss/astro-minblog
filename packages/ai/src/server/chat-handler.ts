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
  applyBudgetToArticles,
  getCitationGuardPreflight,
  buildUnknownRefusal,
  shouldAppendCitations,
  selectCitations,
  formatCitationBlock,
  resolveSearchInterpretation,
} from "../intelligence/index.js";
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
import {
  extractCodeAnchors,
  hasCodeAnchors,
  normalizeText,
  tokenize,
} from "../utils/text.js";
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
  if (req.method !== "POST") return errors.methodNotAllowed((env.SITE_LANG as string) ?? "zh");

  const ip = getClientIP(req);
  const rateCheck = checkRateLimit(
    ip,
    env as Record<string, string | undefined>
  );
  if (!rateCheck.allowed) return rateLimitResponse(rateCheck, (env.SITE_LANG as string) ?? "zh");

  let body: ChatRequestBody;
  try {
    body = await req.json();
  } catch {
    return errors.invalidRequest(t("ai.error.format", (env.SITE_LANG as string) ?? "zh"));
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
  interpretation: ReturnType<typeof resolveSearchInterpretation>["interpretation"];
}

export function resolveSearchAnswerShaping(query: string): Pick<
  SearchPhaseResult,
  "budget" | "interpretation"
> {
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

interface CurrentArticleBoostOptions {
  articleSlug?: string;
  context?: ChatContext;
}

const MIN_QUOTED_QUERY_LENGTH = 12;
const CURRENT_ARTICLE_SCORE_BOOST_RATIO = 0.12;
const CURRENT_ARTICLE_SCORE_CAP_RATIO = 1.08;
const CROSS_ARTICLE_INTENT_PATTERNS = [
  /还有哪些/u,
  /相关文章/u,
  /类似/u,
  /推荐/u,
  /对比/u,
  /比较/u,
  /related/u,
  /similar/u,
  /compare/u,
  /comparison/u,
  /recommend/u,
  /what else/u,
] as const;

export function extractQuotedCandidate(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";

  const matches = [...trimmed.matchAll(/["“”'‘’「」『』《》](.+?)["“”'‘’「」『』《》]/g)]
    .map(match => match[1]?.trim() ?? "")
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  return matches[0] ?? "";
}

export function isLikelyQuotedArticleQuery(text: string): boolean {
  const quoted = extractQuotedCandidate(text);
  if (!quoted) return false;
  return normalizeText(quoted).length >= MIN_QUOTED_QUERY_LENGTH;
}

export function isCrossArticleIntent(text: string): boolean {
  if (isLikelyQuotedArticleQuery(text)) {
    return false;
  }
  const normalized = normalizeText(text);
  if (!normalized) return false;
  return CROSS_ARTICLE_INTENT_PATTERNS.some(pattern => pattern.test(normalized));
}

function isCurrentArticle(
  article: ReturnType<typeof searchArticles>[number],
  articleSlug: string
): boolean {
  return article.id === articleSlug || article.url?.includes(articleSlug);
}

function buildCurrentArticleFallback(
  context: ChatContext | undefined,
  articleSlug: string,
  tailScore: number
): ReturnType<typeof searchArticles>[number] | null {
  if (context?.scope !== "article" || !context.article) return null;

  return {
    id: articleSlug,
    title: context.article.title,
    url: `/posts/${articleSlug}`,
    summary: context.article.summary ?? context.article.abstract,
    keyPoints: context.article.keyPoints ?? [],
    categories: context.article.categories ?? [],
    dateTime: 0,
    score: tailScore,
  };
}

export function rerankArticlesForCurrentArticleQuote(
  query: string,
  articles: ReturnType<typeof searchArticles>,
  options: CurrentArticleBoostOptions = {}
): ReturnType<typeof searchArticles> {
  const { articleSlug, context } = options;
  if (!articleSlug || context?.scope !== "article") return articles;
  if (!isLikelyQuotedArticleQuery(query)) return articles;
  if (isCrossArticleIntent(query)) return articles;

  const cloned = [...articles];
  const currentIndex = cloned.findIndex(article =>
    isCurrentArticle(article, articleSlug)
  );

  if (currentIndex >= 0) {
    const topScore = cloned[0]?.score ?? 0;
    if (topScore <= 0) return cloned;

    const current = cloned[currentIndex];
    const boostedScore = Math.min(
      (current.score ?? 0) + topScore * CURRENT_ARTICLE_SCORE_BOOST_RATIO,
      topScore * CURRENT_ARTICLE_SCORE_CAP_RATIO
    );
    cloned[currentIndex] = { ...current, score: boostedScore };
    return cloned.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }

  const tailScore = Math.max((cloned[cloned.length - 1]?.score ?? 1) * 0.95, 0.01);
  const fallback = buildCurrentArticleFallback(context, articleSlug, tailScore);
  if (!fallback) return cloned;

  return [...cloned, fallback];
}

export function shapeArticlesForQuery(
  query: string,
  articles: ReturnType<typeof searchArticles>,
  options: CurrentArticleBoostOptions = {}
): {
  interpretation: ReturnType<typeof resolveSearchInterpretation>["interpretation"];
  budget: ReturnType<typeof resolveSearchInterpretation>["budget"];
  articles: ReturnType<typeof searchArticles>;
} {
  const { interpretation, budget } = resolveSearchInterpretation({
    latestText: query,
  });
  const boostedArticles = rerankArticlesForCurrentArticleQuote(
    query,
    articles,
    options
  );
  const rankedArticles = hasCodeAnchors(query)
    ? rerankArticlesForCodeAnchors(query, boostedArticles)
    : rankArticlesByCategory(interpretation.topic.primary, boostedArticles);
  return {
    interpretation,
    budget,
    articles: applyBudgetToArticles(rankedArticles, budget),
  };
}

export function rerankArticlesForCodeAnchors(
  query: string,
  articles: ReturnType<typeof searchArticles>
): ReturnType<typeof searchArticles> {
  const rawAnchors = extractCodeAnchors(query);
  if (rawAnchors.length === 0 || articles.length <= 1) return articles;

  return [...articles].sort((a, b) => {
    const aAnchorScore = scoreArticleForCodeAnchors(a, rawAnchors);
    const bAnchorScore = scoreArticleForCodeAnchors(b, rawAnchors);

    return (
      bAnchorScore - aAnchorScore ||
      (b.score ?? 0) - (a.score ?? 0) ||
      a.title.localeCompare(b.title)
    );
  });
}

function scoreArticleForCodeAnchors(
  article: ReturnType<typeof searchArticles>[number],
  rawAnchors: string[]
): number {
  const title = article.title;
  const summary = article.summary ?? "";
  const keyPoints = article.keyPoints ?? [];
  const chunks = article.chunks ?? [];

  let score = 0;

  for (const anchor of rawAnchors) {
    const normalizedAnchor = normalizeText(anchor);
    if (!normalizedAnchor) continue;

    if (title.includes(anchor)) {
      score += 10;
      continue;
    }
    if (summary.includes(anchor)) {
      score += 6;
      continue;
    }
    if (keyPoints.some(point => point.includes(anchor))) {
      score += 5;
      continue;
    }
    if (chunks.some(chunk => chunk.heading.includes(anchor))) {
      score += 8;
      continue;
    }
    if (chunks.some(chunk => chunk.content.includes(anchor))) {
      score += 9;
      continue;
    }

    const normalizedTitle = normalizeText(title);
    const normalizedSummary = normalizeText(summary);
    const normalizedKeyPoints = keyPoints.map(point => normalizeText(point));

    if (normalizedTitle.includes(normalizedAnchor)) {
      score += 6;
    } else if (normalizedSummary.includes(normalizedAnchor)) {
      score += 4;
    } else if (normalizedKeyPoints.some(point => point.includes(normalizedAnchor))) {
      score += 3;
    } else if (
      chunks.some(
        chunk =>
          normalizeText(chunk.heading).includes(normalizedAnchor) ||
          normalizeText(chunk.content).includes(normalizedAnchor)
      )
    ) {
      score += 5;
    }
  }

  return score;
}

export function shouldPersistAuthoritativeSources(
  sources: SourceSelection[]
): boolean {
  return (
    sources.length > 0 &&
    sources.every(source =>
      source.reason === "chunk" || source.reason === "evidence" || source.reason === "article-context"
    )
  );
}

export function shapeCachedSearchForQuery(args: {
  query: string;
  articles: ReturnType<typeof searchArticles>;
  projects: ReturnType<typeof searchProjects>;
}): {
  interpretation: ReturnType<typeof resolveSearchInterpretation>["interpretation"];
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
  return Boolean(args.publicQuestion && (!args.publicQuestion.needsContext || args.articleSlug));
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
          console.debug(
            "[chat-handler] Keyword extraction failed, using local query:",
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
  ({ interpretation, budget, articles: relatedArticles } = shapeArticlesForQuery(
    latestText,
    relatedArticles,
    { articleSlug, context: ctx.context }
  ));

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

  return { searchQuery, relatedArticles, relatedProjects, budget, interpretation };
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
  const { searchQuery, relatedArticles, relatedProjects, interpretation } = search;
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

      timing.generation = llmResult.generationMs || Date.now() - generationStart;
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

export function buildFinalSources(args: {
  relatedArticles: ReturnType<typeof searchArticles>;
  selectedSources: SourceSelection[];
  query: string;
  lang: string;
  max: number;
  articleSlug?: string;
  context?: ChatContext;
}): SourceSelection[] {
  const { relatedArticles, selectedSources, query, lang, max, articleSlug, context } = args;
  const normalizedQuery = normalizeText(query);

  const fallbackSources: SourceSelection[] = relatedArticles.map(article => ({
    title: article.title,
    url: article.url,
    lang: article.lang,
    reason: "retrieval-fallback",
    score: article.score,
  }));

  const preferredPool =
    selectedSources.length > 0 ? selectedSources : fallbackSources;
  const isCurrentArticleSource = (source: SourceSelection): boolean => {
    if (!articleSlug) return false;
    const url = source.url ?? "";
    if (url.includes(`/posts/${articleSlug}`) || url.includes(articleSlug)) {
      return true;
    }
    if (context?.article?.title && source.title === context.article.title) {
      return true;
    }
    return false;
  };

  const shouldPrioritizeCurrentArticle =
    !!articleSlug &&
    context?.scope === "article" &&
    isLikelyQuotedArticleQuery(query) &&
    !isCrossArticleIntent(query);

  if (shouldPrioritizeCurrentArticle) {
    const orderedCurrent = preferredPool.filter(isCurrentArticleSource);
    const orderedOther = preferredPool.filter(source => !isCurrentArticleSource(source));
    const currentChunkSources = orderedCurrent.filter(source => source.reason === "chunk");
    const currentNonChunkSources = orderedCurrent.filter(source => source.reason !== "chunk");
    const dedupedPrioritized: SourceSelection[] = [];
    const seenPrioritized = new Set<string>();
    for (const source of [
      ...currentChunkSources,
      ...currentNonChunkSources,
      ...orderedOther,
    ]) {
      const key = `${source.title}::${source.url ?? ""}::${source.chunkId ?? ""}`;
      if (seenPrioritized.has(key)) continue;
      seenPrioritized.add(key);
      dedupedPrioritized.push(source);
      if (dedupedPrioritized.length >= max) break;
    }
    return dedupedPrioritized;
  }

  const sameLang = preferredPool.filter(source => source.lang === lang);
  const anchorTerms = tokenize(query)
    .filter((token: string) => token.length >= 2)
    .sort((a: string, b: string) => b.length - a.length)
    .slice(0, 3);
  const sourceMatchesAnchor = (source: SourceSelection): boolean => {
    if (!anchorTerms.length) return true;
    const title = normalizeText(source.title);
    return anchorTerms.some((term: string) => title.includes(term));
  };
  const sameLangAnchored = sameLang.filter(sourceMatchesAnchor);
  const crossLangAnchored = preferredPool.filter(
    source => source.lang !== lang && sourceMatchesAnchor(source)
  );
  const articleSummaryQuery = isArticleSummaryQuery(normalizedQuery);
  const rankByTitleCloseness = (
    sources: SourceSelection[]
  ): SourceSelection[] => {
    return [...sources].sort((a, b) => {
      const aScore = computeTitleCloseness(normalizedQuery, a.title);
      const bScore = computeTitleCloseness(normalizedQuery, b.title);
      return bScore - aScore || (b.score ?? 0) - (a.score ?? 0);
    });
  };

  const orderedSameLang = rankByTitleCloseness(
    sameLangAnchored.length > 0 ? sameLangAnchored : sameLang
  );
  const orderedCrossLang = rankByTitleCloseness(
    crossLangAnchored.length > 0
      ? crossLangAnchored
      : preferredPool.filter(source => source.lang !== lang)
  );

  let ordered = articleSummaryQuery
    ? orderedSameLang.length >= max
      ? orderedSameLang
      : [...orderedSameLang, ...orderedCrossLang]
    : [...orderedSameLang, ...orderedCrossLang];

  const deduped: SourceSelection[] = [];
  const seen = new Set<string>();

  for (const source of ordered) {
    const key = `${source.title}::${source.url ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(source);
    if (deduped.length >= max) break;
  }

  return deduped;
}

function isArticleSummaryQuery(normalizedQuery: string): boolean {
  return [
    "这篇文章",
    "主要讲了什么",
    "讲了什么",
    "文章主要",
    "文章讲了什么",
    "article summary",
    "what does this article",
    "what is this article about",
  ].some(marker => normalizedQuery.includes(marker));
}

function computeTitleCloseness(normalizedQuery: string, title: string): number {
  const normalizedTitle = normalizeText(title);
  const tokens = tokenize(normalizedQuery)
    .filter(token => token.length >= 2)
    .sort((a, b) => b.length - a.length)
    .slice(0, 5);

  let score = 0;
  for (const token of tokens) {
    if (normalizedTitle.includes(token)) {
      score += Math.max(1, Math.min(token.length, 6));
    }
  }

  if (
    normalizedQuery.includes("技术架构") &&
    normalizedTitle.includes("技术架构")
  ) {
    score += 8;
  }
  if (normalizedQuery.includes("模块") && normalizedTitle.includes("模块")) {
    score += 4;
  }
  if (normalizedQuery.includes("文章") && normalizedTitle.includes("文章")) {
    score += 2;
  }

  return score;
}

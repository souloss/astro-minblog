import {
  type UIMessage,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  convertToModelMessages,
} from 'ai';
import { t, getLang } from '../utils/i18n.js';
import {
  shouldReuseSearchContext,
  buildLocalSearchQuery,
  shouldRunKeywordExtraction,
  extractSearchKeywords,
  shouldSkipAnalysis,
  analyzeRetrievedEvidence,
  buildEvidenceSection,
  getCitationGuardPreflight,
  buildSystemPrompt,
  getAuthorContext,
  getVoiceProfile,
  mergeResults,
  getProviderManager,
  createCacheAdapter,
  detectPublicQuestion,
  getGlobalSearchCache,
  shouldAppendCitations,
  formatCitationBlock,
  selectCitations,
  setGlobalSearchCache,
  getGlobalCacheTTL,
  getResponseCache,
  setResponseCache,
  getResponseCacheConfig,
  rankArticlesByIntent,
  matchFactsToQuery,
  buildFactSection,
  getEvidenceBudget,
  applyBudgetToArticles,
  resolveAnswerMode,
  buildUnknownRefusal,
  getClientIP,
  checkRateLimit,
  rateLimitResponse,
  searchArticles,
  searchProjects,
  getSessionCacheKey,
  getCachedContext,
  setCachedContext,
  initializeExtensions,
  areExtensionsLoaded,
  getExtensionRegistry,
  getSemanticFallback,
  mergeSearchDocuments,
  mergeFacts,
  resolveVoiceStyleMode,
  buildVoiceStylePrompt,
} from '../index.js';
import type { CachedAIResponse } from '../cache/response-cache.js';
import type { PublicQuestionType } from '../index.js';
import type { ProviderAdapter } from '../provider-manager/types.js';
import type { ChatHandlerOptions, ChatRequestBody, ChatContext } from './types.js';
import { createChatStatusData } from './types.js';
import { errors, corsPreflightResponse } from './errors.js';
import type { PhaseTiming } from '@astro-minimax/notify';
import {
  writeSearchStatus,
  writeGeneratingStatus,
  writeSourceArticles,
  streamLLMResponse,
  streamMockFallback,
  streamCachedResponse,
} from './stream-helpers.js';
import { getMessageText, filterValidMessages } from './chat-message-utils.js';
import { buildArticleContextPrompt, sendNotification, getTimeoutConfig, getHealthConfig } from './chat-utils.js';
import { CHAT_HANDLER, RESPONSE } from '../constants.js';

export async function handleChatRequest(options: ChatHandlerOptions): Promise<Response> {
  const { env, request: req, waitUntil } = options;

  if (req.method === 'OPTIONS') return corsPreflightResponse();
  if (req.method !== 'POST') return errors.methodNotAllowed('zh');

  const ip = getClientIP(req);
  const rateCheck = checkRateLimit(ip, env as Record<string, string | undefined>);
  if (!rateCheck.allowed) return rateLimitResponse(rateCheck, 'zh');

  let body: ChatRequestBody;
  try {
    body = await req.json();
  } catch {
    return errors.invalidRequest(t('ai.error.format', 'zh'));
  }

  const lang = getLang(body.lang ?? (env.SITE_LANG as string | undefined));
  const context: ChatContext = body.context ?? { scope: 'global' };
  const rawMessages = (body.messages ?? []).slice(-CHAT_HANDLER.MAX_HISTORY_MESSAGES);
  if (!rawMessages.length) return errors.emptyMessage(lang);

  const messages = filterValidMessages(rawMessages);
  if (!messages.length) return errors.emptyMessage(lang);

  const latestMessage = messages[messages.length - 1];
  const latestText = getMessageText(latestMessage);
  if (!latestText) return errors.emptyContent(lang);
  if (latestText.length > CHAT_HANDLER.MAX_INPUT_LENGTH) return errors.inputTooLong(CHAT_HANDLER.MAX_INPUT_LENGTH, lang);

  const timeouts = getTimeoutConfig(env as Record<string, unknown>);
  const requestAbort = new AbortController();
  const requestTimer = setTimeout(() => requestAbort.abort(), timeouts.request);

  try {
    return await runPipeline({ env, messages, latestText, context, req, requestAbort, lang, waitUntil, timeouts });
  } catch (err) {
    if (requestAbort.signal.aborted) return errors.timeout(lang);
    console.error('[chat-handler] Unexpected error:', err);
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
  env: ChatHandlerOptions['env'];
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

async function runPipeline(args: PipelineArgs): Promise<Response> {
  const { env, messages, latestText, context, req, lang, waitUntil, timeouts } = args;
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

  const articleSlug = context.scope === 'article' && context.article?.slug 
    ? context.article.slug 
    : undefined;

  const publicQuestion = detectPublicQuestion(latestText);

  if (publicQuestion && (!publicQuestion.needsContext || articleSlug)) {
    const globalCacheContext = { articleSlug, lang };

    if (responseCacheConfig.enabled) {
      const cachedResponse = await getResponseCache(cache, publicQuestion.type, globalCacheContext);
      
      if (cachedResponse) {
        const notifyTiming: PhaseTiming = { total: Date.now() - timing.start };
        sendNotification({ env, messages, responseText: cachedResponse.response, relatedArticles: cachedResponse.articles, timing: notifyTiming, waitUntil });

        const stream = createUIMessageStream({
          execute: async ({ writer }) => {
            await streamCachedResponse(writer as never, cachedResponse, responseCacheConfig, lang);
          },
        });

        return createUIMessageStreamResponse({ stream, headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-cache' } });
      }
    }

    const cachedSearch = await getGlobalSearchCache(cache, publicQuestion.type, globalCacheContext);

    if (cachedSearch) {
      const stream = createUIMessageStream({
        execute: async ({ writer }) => {
          const w = writer as never;
          writeSearchStatus(w, cachedSearch.articles.length + cachedSearch.projects.length, lang);
          if (cachedSearch.articles.length + cachedSearch.projects.length > 0) {
            writeGeneratingStatus(w, lang);
          }
          writeSourceArticles(w, cachedSearch.articles);

          let responseText = '';

          if (adapter) {
            const articlePrompt = buildArticleContextPrompt(context);
            const matchedFacts = matchFactsToQuery(cachedSearch.query, lang);
            const factPromptSection = buildFactSection(matchedFacts, lang);
            const systemPrompt = buildSystemPrompt({
              static: { authorName: (env.SITE_AUTHOR as string) || '博主', siteUrl: (env.SITE_URL as string) || '', lang },
              semiStatic: { authorContext: getAuthorContext(), voiceProfile: getVoiceProfile() },
              dynamic: { userQuery: cachedSearch.query, articles: cachedSearch.articles, projects: cachedSearch.projects, evidenceSection: articlePrompt, factSection: factPromptSection, extensions, sessionId: cacheKey || undefined },
            });

            const llmResult = await streamLLMResponse({ writer: w, adapter, systemPrompt, messages, lang });
            responseText = llmResult.responseText;

            if (responseCacheConfig.enabled && llmResult.success && llmResult.responseText.length > 0) {
              const globalTTL = getGlobalCacheTTL(publicQuestion.type);
              const responseCacheData: CachedAIResponse = {
                query: cachedSearch.query, thinking: llmResult.reasoningText, response: llmResult.responseText,
                articles: cachedSearch.articles, projects: cachedSearch.projects, lang, model: adapter.model, updatedAt: Date.now(),
              };
              await setResponseCache(cache, publicQuestion.type, responseCacheData, globalTTL, globalCacheContext);
            }
          } else {
            responseText = await streamMockFallback(w, latestText, lang);
          }
        },
      });

      return createUIMessageStreamResponse({ stream, headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-cache' } });
    }
  }

  const cacheKey = getSessionCacheKey(req);
  const now = Date.now();

  const cachedContext = cacheKey ? await getCachedContext(cacheKey, cache) : undefined;
  const userTurnCount = messages.filter((m: UIMessage) => m.role === 'user').length;
  const reuseContext = shouldReuseSearchContext({ latestText, cachedContext, userTurnCount, now });

  let searchQuery = buildLocalSearchQuery(latestText) || latestText;
  let relatedArticles = reuseContext && cachedContext ? cachedContext.articles : [];
  let relatedProjects = reuseContext && cachedContext ? cachedContext.projects : [];
  let budget = getEvidenceBudget('moderate');
  let answerMode: 'fact' | 'count' | 'list' | 'opinion' | 'recommendation' | 'unknown' | 'general' = 'general';

  const semanticFallback = getSemanticFallback(latestText, extensions);
  if (semanticFallback) {
    searchQuery = semanticFallback.query;
  }

  if (reuseContext && cachedContext && cacheKey) {
    searchQuery = cachedContext.query;
    await setCachedContext(cacheKey, { ...cachedContext, updatedAt: now }, cache);
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
        const timeoutId = setTimeout(() => abortCtrl.abort(), timeouts.keywordExtraction);
        try {
          const provider = adapter.getProvider();
          const kwResult = await extractSearchKeywords({
            messages: messages as Array<{ role: string; parts?: Array<{ type: string; text?: string }> }>,
            provider,
            model: adapter.keywordModel,
            abortSignal: abortCtrl.signal,
          });
          timing.keywordExtraction = Date.now() - kwStart;
          if (kwResult.query && !kwResult.usedFallback) {
            searchQuery = kwResult.query;
            if (kwResult.primaryQuery && kwResult.primaryQuery !== searchQuery) {
              const searchStart = Date.now();
              const primary = searchArticles(kwResult.primaryQuery, { enableDeepContent: false });
              relatedArticles = mergeResults(
                searchArticles(searchQuery, { enableDeepContent: true }),
                primary,
              );
              relatedProjects = searchProjects(searchQuery);
              timing.search = Date.now() - searchStart;
            }
          }
        } catch {
          timing.keywordExtraction = Date.now() - kwStart;
        } finally {
          clearTimeout(timeoutId);
        }
      }
    }

    if (!relatedArticles.length) {
      const searchStart = Date.now();
      relatedArticles = searchArticles(searchQuery, { enableDeepContent: true });
      relatedProjects = searchProjects(searchQuery);
      timing.search = Date.now() - searchStart;
    }

    relatedArticles = mergeSearchDocuments(relatedArticles, extensions);
    relatedArticles = rankArticlesByIntent(latestText, relatedArticles);

    answerMode = resolveAnswerMode(latestText);
    budget = getEvidenceBudget('moderate', answerMode);
    relatedArticles = applyBudgetToArticles(relatedArticles, budget);

    if (cacheKey) {
      await setCachedContext(cacheKey, {
        query: searchQuery,
        articles: relatedArticles,
        projects: relatedProjects,
        updatedAt: now,
      }, cache);
    }

    if (publicQuestion && (!publicQuestion.needsContext || articleSlug)) {
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
        { articleSlug, lang }
      );
    }
  }

  let evidenceSection = '';

  if (hasRealProvider && adapter) {
    const skipEvidence = shouldSkipAnalysis(latestText, relatedArticles.length, 'moderate');

    if (!skipEvidence) {
      const evidenceStart = Date.now();
      const abortCtrl = new AbortController();
      const timeoutId = setTimeout(() => abortCtrl.abort(), timeouts.evidenceAnalysis);
      try {
        const provider = adapter.getProvider();
        const evidenceResult = await analyzeRetrievedEvidence({
          userQuery: latestText,
          articles: relatedArticles,
          projects: relatedProjects,
          provider,
          model: adapter.evidenceModel,
          maxOutputTokens: budget.analysisMaxTokens,
          abortSignal: abortCtrl.signal,
        });
        if (evidenceResult.analysis) {
          evidenceSection = buildEvidenceSection(evidenceResult.analysis);
        }
        timing.evidenceAnalysis = Date.now() - evidenceStart;
      } catch {
        timing.evidenceAnalysis = Date.now() - evidenceStart;
      } finally {
        clearTimeout(timeoutId);
      }
    }
  }

  const preflight = getCitationGuardPreflight({
    userQuery: latestText,
    articles: relatedArticles,
    projects: relatedProjects,
    lang,
  });

  // Handle unknown answer mode (privacy-sensitive queries)
  // Uses intent-based approach inspired by luoleiorg-x
  const unknownRefusal = answerMode === 'unknown' 
    ? { text: buildUnknownRefusal(latestText, lang), isUnknown: true }
    : null;

  let matchedFacts = matchFactsToQuery(latestText, lang);
  matchedFacts = mergeFacts(matchedFacts, extensions);
  const factPromptSection = buildFactSection(matchedFacts, lang);

  const articleCategories = relatedArticles.flatMap(a => a.categories ?? []);
  const voiceMode = resolveVoiceStyleMode(latestText, articleCategories, extensions);
  const voiceStylePrompt = buildVoiceStylePrompt(voiceMode, extensions);

  const articlePrompt = buildArticleContextPrompt(context);
  const systemPrompt = buildSystemPrompt({
    static: {
      authorName: (env.SITE_AUTHOR as string) || '博主',
      siteUrl: (env.SITE_URL as string) || '',
      lang,
      voiceStylePrompt,
    },
    semiStatic: {
      authorContext: getAuthorContext(),
      voiceProfile: getVoiceProfile(),
    },
    dynamic: {
      userQuery: searchQuery,
      articles: relatedArticles,
      projects: relatedProjects,
      evidenceSection: articlePrompt
        ? `${evidenceSection}\n${articlePrompt}`
        : evidenceSection,
      factSection: factPromptSection,
      answerMode,
      lang,
      extensions,
      sessionId: cacheKey || undefined,
    },
  });

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const articleCount = relatedArticles.length + relatedProjects.length;

      if (articleCount > 0) {
        writer.write({
          type: 'message-metadata',
          messageMetadata: createChatStatusData({
            stage: 'search',
            message: t('ai.status.found', lang, { count: articleCount }),
            progress: RESPONSE.SEARCH_PROGRESS,
          }),
        });
      }

      for (const article of relatedArticles.slice(0, RESPONSE.MAX_SOURCE_ARTICLES)) {
        try {
          writer.write({
            type: 'source-url',
            sourceId: `source-${article.title}`,
            url: (article as { url?: string }).url ?? '#',
            title: article.title,
          } as never);
        } catch {
          // source writing is best-effort
        }
      }

      if (preflight) {
        writer.write({
          type: 'message-metadata',
          messageMetadata: createChatStatusData({
            stage: 'answer',
            message: t('ai.status.citation', lang),
            progress: RESPONSE.COMPLETE_PROGRESS,
            done: true,
          }),
        });
        const partId = `preflight-${Date.now()}`;
        writer.write({ type: 'text-start' as never, id: partId } as never);
        writer.write({ type: 'text-delta' as never, id: partId, delta: preflight.text } as never);
        writer.write({ type: 'text-end' as never, id: partId } as never);
        writer.write({ type: 'finish', finishReason: 'stop' });
        return;
      }

      if (unknownRefusal) {
        writer.write({
          type: 'message-metadata',
          messageMetadata: createChatStatusData({
            stage: 'answer',
            message: t('ai.status.generating', lang),
            progress: RESPONSE.COMPLETE_PROGRESS,
            done: true,
          }),
        });
        const partId = `unknown-${Date.now()}`;
        writer.write({ type: 'text-start' as never, id: partId } as never);
        writer.write({ type: 'text-delta' as never, id: partId, delta: unknownRefusal.text } as never);
        writer.write({ type: 'text-end' as never, id: partId } as never);
        writer.write({ type: 'finish', finishReason: 'stop' });
        return;
      }

      writer.write({
        type: 'message-metadata',
        messageMetadata: createChatStatusData({
          stage: 'answer',
          message: t('ai.status.generating', lang),
          progress: RESPONSE.GENERATING_PROGRESS,
        }),
      });

      let streamSuccess = false;
      let responseText = '';
      let reasoningText: string | undefined;
      let tokenUsage: { total: number; input: number; output: number } | undefined;
      const generationStart = Date.now();
      let usedAdapter: ProviderAdapter | null = null;
      
      for (const currentAdapter of adapters) {
        try {
          const provider = currentAdapter.getProvider();
          const result = streamText({
            model: (provider as { chatModel: (m: string) => never }).chatModel(currentAdapter.model),
            system: systemPrompt,
            messages: await convertToModelMessages(messages),
            temperature: CHAT_HANDLER.DEFAULT_TEMPERATURE,
            maxOutputTokens: CHAT_HANDLER.DEFAULT_MAX_OUTPUT_TOKENS,
            onError: ({ error }) => {
              console.error('[chat-handler] streamText error:', error);
            },
          });

          let hasTextOutput = false;
          const errors: Error[] = [];

          writer.merge(result.toUIMessageStream({ sendFinish: false }));
          await result.consumeStream({
            onError: (error) => {
              errors.push(error instanceof Error ? error : new Error(String(error)));
            },
          });

          const text = await result.text;
          const reasoningPromise = (result as unknown as { reasoning?: PromiseLike<unknown> }).reasoning;
          const usagePromise = (result as unknown as { usage?: PromiseLike<{ inputTokens?: number; outputTokens?: number; totalTokens?: number }> }).usage;
          
          if (reasoningPromise) {
            try {
              const reasoningOutput = await Promise.resolve(reasoningPromise);
              reasoningText = typeof reasoningOutput === 'string' ? reasoningOutput : 
                (Array.isArray(reasoningOutput) ? reasoningOutput.map((r): string => {
                  if (typeof r === 'object' && r !== null && 'text' in r) return (r as { text: string }).text;
                  return String(r);
                }).join('') : undefined);
            } catch { }
          }
          
          if (usagePromise) {
            try {
              const usage = await Promise.resolve(usagePromise);
              const inputTokens = usage.inputTokens ?? 0;
              const outputTokens = usage.outputTokens ?? 0;
              tokenUsage = {
                total: usage.totalTokens ?? inputTokens + outputTokens,
                input: inputTokens,
                output: outputTokens,
              };
            } catch { }
          }
          
          timing.generation = Date.now() - generationStart;
          responseText = text;
          hasTextOutput = text.length > 0;

          if (hasTextOutput && errors.length === 0) {
            currentAdapter.recordSuccess();
            usedAdapter = currentAdapter;
            
            if (shouldAppendCitations(responseText, relatedArticles, relatedProjects)) {
              const citations = selectCitations(relatedArticles, relatedProjects, RESPONSE.MAX_SOURCE_ARTICLES, RESPONSE.MAX_CITATIONS);
              if (citations.length > 0) {
                const citationBlock = formatCitationBlock(citations, lang);
                const citationId = `citation-${Date.now()}`;
                writer.write({ type: 'text-start', id: citationId } as never);
                writer.write({ type: 'text-delta', id: citationId, delta: citationBlock } as never);
                writer.write({ type: 'text-end', id: citationId } as never);
                responseText += citationBlock;
              }
            }
            
            writer.write({ type: 'finish', finishReason: 'stop' });
            streamSuccess = true;

            if (responseCacheConfig.enabled && publicQuestion && (!publicQuestion.needsContext || articleSlug)) {
              const globalTTL = getGlobalCacheTTL(publicQuestion.type);
              const responseCacheData: CachedAIResponse = {
                query: searchQuery,
                thinking: reasoningText,
                response: text,
                articles: relatedArticles,
                projects: relatedProjects,
                lang,
                model: currentAdapter.model,
                updatedAt: Date.now(),
              };
              await setResponseCache(cache, publicQuestion.type, responseCacheData, globalTTL, { articleSlug, lang });
            }
            break;
          } else if (errors.length > 0) {
            currentAdapter.recordFailure(errors[0]);
            console.error('[chat-handler] Stream error from', currentAdapter.id, ':', errors[0].message);
          } else if (!hasTextOutput) {
            currentAdapter.recordFailure(new Error('No output from model'));
          }
        } catch (err) {
          timing.generation = Date.now() - generationStart;
          currentAdapter.recordFailure(err instanceof Error ? err : new Error(String(err)));
          console.error('[chat-handler] Provider', currentAdapter.id, 'threw:', (err as Error).message);
        }
      }

      if (!streamSuccess) {
        const { getMockResponse } = await import('../providers/mock.js');
        const mockText = getMockResponse(latestText, lang);
        timing.generation = Date.now() - generationStart;
        responseText = mockText;
        writer.write({
          type: 'message-metadata',
          messageMetadata: createChatStatusData({
            stage: 'answer',
            message: t('ai.status.fallback', lang),
            progress: RESPONSE.FALLBACK_PROGRESS,
          }),
        });
        const fallbackId = `fallback-${Date.now()}`;
        writer.write({ type: 'text-start', id: fallbackId } as never);
        writer.write({ type: 'text-delta', id: fallbackId, delta: mockText } as never);
        writer.write({ type: 'text-end', id: fallbackId } as never);
        writer.write({ type: 'finish', finishReason: 'stop' });
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
          relatedArticles,
          model: usedAdapter ? {
            name: usedAdapter.model,
            provider: (env.AI_PROVIDER as string) || undefined,
            apiHost: (env.AI_BASE_URL as string) || undefined,
          } : undefined,
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
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
    },
  });
}
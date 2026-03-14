/// <reference types="@cloudflare/workers-types" />
/**
 * POST /api/chat
 *
 * Full RAG pipeline chat endpoint (AI SDK v6):
 * 1. IP rate limiting (burst / sustained / daily)
 * 2. Message validation
 * 3. Intent detection — reuse cached search context for follow-ups
 * 4. Keyword extraction (optional LLM) → optimized search query
 * 5. SearchAPI — find related articles & projects
 * 6. Evidence analysis (optional LLM) — pre-analyze retrieved content
 * 7. Citation guard preflight — answer factual queries directly
 * 8. Three-layer system prompt construction
 * 9. streamText → toUIMessageStreamResponse (AI SDK v6 UI Message Stream)
 */
import { streamText, convertToModelMessages } from 'ai';
import type { UIMessage } from 'ai';
import {
  getClientIP,
  checkRateLimit,
  rateLimitResponse,
  searchArticles,
  searchProjects,
  getSessionCacheKey,
  getCachedContext,
  setCachedContext,
  cleanupCache,
  shouldReuseSearchContext,
  buildLocalSearchQuery,
  shouldRunKeywordExtraction,
  extractSearchKeywords,
  KEYWORD_EXTRACTION_TIMEOUT_MS,
  shouldSkipAnalysis,
  analyzeRetrievedEvidence,
  buildEvidenceSection,
  EVIDENCE_ANALYSIS_TIMEOUT_MS,
  getCitationGuardPreflight,
  buildSystemPrompt,
  getAuthorContext,
  getVoiceProfile,
  mergeResults,
} from '@astro-minimax/ai';
import { getChatProvider } from '../lib/ai';
import type { FunctionEnv } from '../lib/ai';

const MAX_HISTORY_MESSAGES = 20;
const MAX_INPUT_LENGTH = 500;

function getMessageText(message: UIMessage): string {
  if (Array.isArray(message.parts)) {
    return message.parts
      .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map(p => p.text)
      .join('');
  }
  return '';
}

/** Streams a plain text preflight response in AI SDK UI Message Stream format */
function streamPreflightResponse(text: string): Response {
  const encoder = new TextEncoder();
  const lines = [
    `0:"${text.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"\n`,
    `d:{"finishReason":"stop","usage":{"inputTokens":0,"outputTokens":0}}\n`,
  ];
  const stream = new ReadableStream({
    start(controller) {
      for (const line of lines) controller.enqueue(encoder.encode(line));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-store',
      'Access-Control-Allow-Origin': '*',
      'x-vercel-ai-data-stream': 'v1',
    },
  });
}

export const onRequest: PagesFunction<FunctionEnv> = async (context) => {
  const req = context.request;

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-session-id',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  // ── 1. Rate limiting ──────────────────────────────────────────────────────
  const ip = getClientIP(req);
  const rateCheck = checkRateLimit(ip, context.env as Record<string, string | undefined>);
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck);
  }

  // ── 2. Parse and validate ─────────────────────────────────────────────────
  let body: { messages?: UIMessage[] };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: '请求格式错误' }), { status: 400 });
  }

  const messages = (body.messages ?? []).slice(-MAX_HISTORY_MESSAGES);
  if (!messages.length) {
    return new Response(JSON.stringify({ error: '消息不能为空' }), { status: 400 });
  }

  const latestMessage = messages[messages.length - 1];
  const latestText = getMessageText(latestMessage);

  if (!latestText) {
    return new Response(JSON.stringify({ error: '消息内容不能为空' }), { status: 400 });
  }
  if (latestText.length > MAX_INPUT_LENGTH) {
    return new Response(JSON.stringify({ error: `消息过长，最多 ${MAX_INPUT_LENGTH} 字` }), { status: 400 });
  }

  // ── 3. Initialize provider ────────────────────────────────────────────────
  let providerResult: ReturnType<typeof getChatProvider>;
  try {
    providerResult = getChatProvider(context.env);
  } catch {
    return new Response(JSON.stringify({ error: 'AI 服务未配置，请联系站长' }), { status: 503 });
  }
  const { provider, model, keywordModel, evidenceModel } = providerResult;

  // ── 4. Session cache & intent detection ───────────────────────────────────
  const cacheKey = getSessionCacheKey(req);
  const now = Date.now();
  cleanupCache(now);

  const cachedContext = cacheKey ? getCachedContext(cacheKey) : undefined;
  const userTurnCount = messages.filter(m => m.role === 'user').length;
  const reuseContext = shouldReuseSearchContext({ latestText, cachedContext, userTurnCount, now });

  let searchQuery = buildLocalSearchQuery(latestText) || latestText;
  let relatedArticles = reuseContext && cachedContext ? cachedContext.articles : [];
  let relatedProjects = reuseContext && cachedContext ? cachedContext.projects : [];

  if (reuseContext && cachedContext && cacheKey) {
    searchQuery = cachedContext.query;
    setCachedContext(cacheKey, { ...cachedContext, updatedAt: now });
  } else {
    // ── 5. Keyword extraction (optional LLM) ──────────────────────────────
    const runKeywordExtraction = shouldRunKeywordExtraction({
      messageCount: messages.length,
      localQuery: searchQuery,
      latestText,
    });

    if (runKeywordExtraction) {
      const abortCtrl = new AbortController();
      const timeoutId = setTimeout(() => abortCtrl.abort(), KEYWORD_EXTRACTION_TIMEOUT_MS);
      try {
        const kwResult = await extractSearchKeywords({
          messages: messages as Array<{ role: string; parts?: Array<{ type: string; text?: string }> }>,
          provider,
          model: keywordModel,
          abortSignal: abortCtrl.signal,
        });
        if (kwResult.query && !kwResult.usedFallback) {
          searchQuery = kwResult.query;
          if (kwResult.primaryQuery && kwResult.primaryQuery !== searchQuery) {
            const primary = searchArticles(kwResult.primaryQuery, { enableDeepContent: false });
            relatedArticles = mergeResults(
              searchArticles(searchQuery, { enableDeepContent: true }),
              primary,
            );
            relatedProjects = searchProjects(searchQuery);
          }
        }
      } catch {
        // keyword extraction is optional
      } finally {
        clearTimeout(timeoutId);
      }
    }

    // ── 6. SearchAPI ───────────────────────────────────────────────────────
    if (!relatedArticles.length) {
      relatedArticles = searchArticles(searchQuery, { enableDeepContent: true });
      relatedProjects = searchProjects(searchQuery);
    }

    if (cacheKey) {
      setCachedContext(cacheKey, {
        query: searchQuery,
        articles: relatedArticles,
        projects: relatedProjects,
        updatedAt: now,
      });
    }
  }

  // ── 7. Evidence analysis (optional LLM) ──────────────────────────────────
  let evidenceSection = '';
  const skipEvidence = shouldSkipAnalysis(latestText, relatedArticles.length, 'moderate');

  if (!skipEvidence) {
    const abortCtrl = new AbortController();
    const timeoutId = setTimeout(() => abortCtrl.abort(), EVIDENCE_ANALYSIS_TIMEOUT_MS);
    try {
      const evidenceResult = await analyzeRetrievedEvidence({
        userQuery: latestText,
        articles: relatedArticles,
        projects: relatedProjects,
        provider,
        model: evidenceModel,
        abortSignal: abortCtrl.signal,
      });
      if (evidenceResult.analysis) {
        evidenceSection = buildEvidenceSection(evidenceResult.analysis);
      }
    } catch {
      // evidence analysis is optional
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ── 8. Citation guard preflight ───────────────────────────────────────────
  const preflight = getCitationGuardPreflight({
    userQuery: latestText,
    articles: relatedArticles,
    projects: relatedProjects,
  });

  if (preflight) {
    return streamPreflightResponse(preflight.text);
  }

  // ── 9. System prompt ──────────────────────────────────────────────────────
  const systemPrompt = buildSystemPrompt({
    static: {
      authorName: (context.env.SITE_AUTHOR as string) || '博主',
      siteUrl: (context.env.SITE_URL as string) || '',
    },
    semiStatic: {
      authorContext: getAuthorContext(),
      voiceProfile: getVoiceProfile(),
    },
    dynamic: {
      userQuery: searchQuery,
      articles: relatedArticles,
      projects: relatedProjects,
      evidenceSection,
    },
  });

  // ── 10. Stream response ───────────────────────────────────────────────────
  const result = streamText({
    model: provider.chatModel(model),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    temperature: 0.3,
    maxOutputTokens: 2500,
    onError: ({ error }) => {
      console.error('[chat] streamText error:', error);
    },
  });

  return result.toUIMessageStreamResponse({
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
    },
  });
};

import { tokenize, normalizeText } from '../utils/text.js';
import type { CachedSearchContext, ArticleContext } from '../search/types.js';
import { CACHE } from '../constants.js';

const MAX_FOLLOW_UP_LENGTH = 48;

// ── Intent Classification ────────────────────────────────────

export type IntentCategory =
  | 'setup'
  | 'config'
  | 'content'
  | 'feature'
  | 'deployment'
  | 'troubleshooting'
  | 'general';

const INTENT_KEYWORDS: Record<IntentCategory, string[]> = {
  setup: ['搭建', '创建', '安装', 'install', 'setup', 'create', 'init', 'scaffold', '新建', '开始'],
  config: ['配置', '设置', 'config', 'settings', '环境变量', '.env', 'wrangler', 'tsconfig', '主题色', '颜色'],
  content: ['文章', '博客', '写作', 'markdown', 'mdx', '标签', '分类', '摘要', '封面', '翻译'],
  feature: ['功能', '特性', 'feature', '支持', 'AI', 'RAG', '搜索', '评论', 'RSS', '暗色', '深色'],
  deployment: ['部署', 'deploy', 'cloudflare', 'vercel', 'netlify', 'build', '构建', 'CI', 'CD'],
  troubleshooting: ['报错', '错误', 'error', 'bug', '问题', '不工作', '失败', 'fail', '修复', 'fix'],
  general: [],
};

/**
 * Classifies the user query into an intent category.
 * Used to adjust search relevance scoring.
 */
export function classifyIntent(query: string): IntentCategory {
  const q = query.toLowerCase();
  const scores: Partial<Record<IntentCategory, number>> = {};

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS) as [IntentCategory, string[]][]) {
    if (intent === 'general') continue;
    const score = keywords.reduce((acc, kw) => acc + (q.includes(kw.toLowerCase()) ? 1 : 0), 0);
    if (score > 0) scores[intent] = score;
  }

  const sorted = Object.entries(scores).sort((a, b) => (b[1] as number) - (a[1] as number));
  return (sorted[0]?.[0] as IntentCategory) || 'general';
}

/**
 * Re-ranks articles by intent relevance.
 * Boosts articles whose title/categories/keyPoints match the detected intent.
 */
function countKeywordHits(text: string | undefined, keywords: string[]): number {
  if (!text) return 0;
  const lower = text.toLowerCase();
  return keywords.reduce((hits, kw) => hits + (lower.includes(kw.toLowerCase()) ? 1 : 0), 0);
}

function isRecent(dateTime?: number): boolean {
  if (!dateTime || !Number.isFinite(dateTime)) return false;
  return Date.now() - dateTime <= 365 * 24 * 60 * 60 * 1000;
}

/**
 * Re-ranks articles by intent relevance with weighted multi-dimension scoring.
 * Scoring: title(+3) / categories(+2) / summary(+2) / keyPoints(+1) / recency(+1)
 */
export function rankArticlesByIntent(
  query: string,
  articles: ArticleContext[],
): ArticleContext[] {
  const intent = classifyIntent(query);
  if (intent === 'general' || articles.length <= 1) return articles;

  const keywords = INTENT_KEYWORDS[intent];
  if (!keywords.length) return articles;

  const scored = articles.map((article, index) => {
    const titleHit = countKeywordHits(article.title, keywords) > 0 ? 3 : 0;
    const categoryHit = (article.categories ?? []).some(c => countKeywordHits(c, keywords) > 0) ? 2 : 0;
    const summaryHit = countKeywordHits(article.summary, keywords) > 0 ? 2 : 0;
    const keyPointHit = article.keyPoints.some(kp => countKeywordHits(kp, keywords) > 0) ? 1 : 0;
    const recentHit = isRecent(article.dateTime) ? 1 : 0;

    return { article, index, score: titleHit + categoryHit + summaryHit + keyPointHit + recentHit };
  });

  const maxScore = Math.max(...scored.map(s => s.score), 0);
  if (maxScore === 0) return articles;

  scored.sort((a, b) => b.score - a.score || a.index - b.index);
  return scored.map(s => s.article);
}

// ── Follow-up Detection ──────────────────────────────────────

/**
 * Determines if the latest message is likely a follow-up to the previous context.
 * Uses heuristics: message length, punctuation, word count.
 */
export function isLikelyFollowUp(message: string): boolean {
  const text = message.trim();
  if (!text || text.length > MAX_FOLLOW_UP_LENGTH) return false;

  const hasTerminalPunctuation = /[?？!！。.…]$/.test(text);
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  if (text.length <= 16) return true;
  if (!/\s/.test(text) && text.length <= 24) return true;
  return hasTerminalPunctuation && wordCount <= 6 && text.length <= 36;
}

/**
 * Checks whether the current query contains significant new tokens
 * that aren't present in the cached query.
 */
export function hasNewSignificantTokens(currentQuery: string, cachedQuery: string): boolean {
  const currentTokens = new Set(tokenize(currentQuery));
  const cachedTokens = new Set(tokenize(cachedQuery));
  const newTokens = [...currentTokens].filter(t => !cachedTokens.has(t) && t.length >= 2);
  return newTokens.length > 0;
}

/**
 * Checks whether the current query overlaps significantly with the cached query.
 */
export function hasQueryOverlap(currentQuery: string, cachedQuery: string): boolean {
  const currentTokens = tokenize(currentQuery);
  const cachedNorm = normalizeText(cachedQuery);
  if (!currentTokens.length || !cachedNorm) return false;
  return currentTokens.some(t => cachedNorm.includes(t));
}

/**
 * Determines whether to reuse the cached search context for this request.
 */
export function shouldReuseSearchContext(params: {
  latestText: string;
  cachedContext: CachedSearchContext | undefined;
  userTurnCount: number;
  now: number;
}): boolean {
  const { latestText, cachedContext, userTurnCount, now } = params;
  if (!cachedContext) return false;
  if (userTurnCount <= 1) return false;
  if (now - cachedContext.updatedAt > CACHE.SESSION_TTL * 1000) return false;
  if (!isLikelyFollowUp(latestText)) return false;
  if (!hasQueryOverlap(latestText, cachedContext.query)) return false;
  if (hasNewSignificantTokens(latestText, cachedContext.query)) return false;
  return true;
}

/**
 * Builds a normalized local search query from the latest message.
 */
export function buildLocalSearchQuery(latestText: string): string {
  return tokenize(latestText).join(' ');
}

import { tokenize, normalizeText } from '../search/search-utils.js';
import type { CachedSearchContext } from '../search/types.js';
import { SESSION_CACHE_TTL_MS } from '../search/session-cache.js';

const MAX_FOLLOW_UP_LENGTH = 48;

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
  if (now - cachedContext.updatedAt > SESSION_CACHE_TTL_MS) return false;
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

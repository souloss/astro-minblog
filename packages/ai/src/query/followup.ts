import { tokenize, normalizeText } from "../utils/text.js";
import { CACHE } from "../constants.js";
import type { SearchContextReuseParams } from "./types.js";

const MAX_FOLLOW_UP_LENGTH = 48;

export function isLikelyFollowUp(message: string): boolean {
  const text = message.trim();
  if (!text || text.length > MAX_FOLLOW_UP_LENGTH) return false;

  const hasTerminalPunctuation = /[?？!！。.…]$/.test(text);
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  if (text.length <= 16) return true;
  if (!/\s/.test(text) && text.length <= 24) return true;
  return hasTerminalPunctuation && wordCount <= 6 && text.length <= 36;
}

export function hasNewSignificantTokens(
  currentQuery: string,
  cachedQuery: string
): boolean {
  const currentTokens = new Set(tokenize(currentQuery));
  const cachedTokens = new Set(tokenize(cachedQuery));
  const newTokens = [...currentTokens].filter(
    t => !cachedTokens.has(t) && t.length >= 2
  );
  return newTokens.length > 0;
}

export function hasQueryOverlap(
  currentQuery: string,
  cachedQuery: string
): boolean {
  const currentTokens = tokenize(currentQuery);
  const cachedNorm = normalizeText(cachedQuery);
  if (!currentTokens.length || !cachedNorm) return false;
  return currentTokens.some(t => cachedNorm.includes(t));
}

export function shouldReuseSearchContext(
  params: SearchContextReuseParams
): boolean {
  const { latestText, cachedContext, userTurnCount, now } = params;
  if (!cachedContext) return false;
  if (userTurnCount <= 1) return false;
  if (now - cachedContext.updatedAt > CACHE.SESSION_TTL * 1000) return false;
  if (!isLikelyFollowUp(latestText)) return false;
  if (!hasQueryOverlap(latestText, cachedContext.query)) return false;
  if (hasNewSignificantTokens(latestText, cachedContext.query)) return false;
  return true;
}

export function buildLocalSearchQuery(latestText: string): string {
  return tokenize(latestText).join(" ");
}

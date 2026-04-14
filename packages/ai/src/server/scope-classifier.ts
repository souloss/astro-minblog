/**
 * Scope-level intent classification for chat queries.
 *
 * Determines whether a user's question is about the current article,
 * comparing across articles, or a general/external question.
 *
 * This is a fast, local classifier using pattern matching — no LLM calls.
 */

import { isCrossArticleIntent } from "./article-ranking.js";
import { normalizeText } from "../utils/text.js";

// ── Types ─────────────────────────────────────────────────────

export type QueryScope = "article-local" | "article-comparative" | "global";

export interface ArticleContextHint {
  title?: string;
  keyPoints?: string[];
  categories?: string[];
}

// ── Patterns ──────────────────────────────────────────────────

/**
 * Deictic references pointing back to the current article.
 * These words strongly indicate the user is asking about content
 * they are currently reading.
 */
const DEICTIC_PATTERNS = [
  // Chinese deictic references
  /这个/gu,
  /这里/gu,
  /上面/gu,
  /前面/gu,
  /后面/gu,
  /刚才/gu,
  /这段/gu,
  /这一节/gu,
  /这一章/gu,
  /这篇文章/gu,
  /文章里/gu,
  /文中/gu,
  /本文/gu,
  /原文/gu,
  /引用原文/gu,
  /后面是什么/gu,
  /前面是什么/gu,
  // English deictic references
  /\bhere\b/i,
  /\bthis section\b/i,
  /\babove\b/i,
  /\bmentioned\b/i,
  /\bthe article\b/i,
  /\bthis article\b/i,
  /\bthis post\b/i,
  /\bthe post\b/i,
  /\bit (?:say|mention|state|explain|describe)s?\b/i,
  /\bwhat (?:comes|is) (?:after|before|next)\b/i,
  /\bthe original text\b/i,
  /\bquote the (?:original|article|text)\b/i,
] as const;

/**
 * Patterns for queries that ask about the article's content as a whole.
 */
const ARTICLE_SUMMARY_PATTERNS = [
  // Chinese summary queries
  /讲了什么/gu,
  /主要讲/gu,
  /主要内容/gu,
  /核心内容/gu,
  /总结一下/gu,
  /概括/gu,
  /要点/gu,
  /关键点/gu,
  // English summary queries
  /\bwhat does this (?:article|post) say\b/i,
  /\bwhat is this (?:article|post) about\b/i,
  /\bsummar(?:ize|ise|y)\b/i,
  /\bmain (?:point|idea|topic)s?\b/i,
  /\bkey (?:point|takeaway|insight)s?\b/i,
  /\bt?l;?dr\b/i,
] as const;

/**
 * Section/paragraph references (Chinese chapter/section numbering).
 */
const SECTION_REFERENCE_PATTERNS = [
  /第[一二三四五六七八九十\d]+[章节段]/u,
  /文章开头/u,
  /文章结尾/u,
  /首段/u,
  /末尾/u,
  /开头部分/u,
  /结尾部分/u,
  /\bsection \d+\b/i,
  /\bchapter \d+\b/i,
  /\bbeginning\b/i,
  /\bend (?:of )?(?:the )?(?:article|post|section)\b/i,
] as const;

// ── Scoring ───────────────────────────────────────────────────

/**
 * Score contributions per pattern category.
 * These weights determine how strongly each signal influences classification.
 */
const DEICTIC_SCORE = 2;
const SUMMARY_SCORE = 2;
const SECTION_SCORE = 3;

const ARTICLE_LOCAL_THRESHOLD = DEICTIC_SCORE;

// ── Classifier ────────────────────────────────────────────────

/**
 * Classify the scope of a user query when in article-reading mode.
 *
 * - **article-local**: "解释一下这个概念", "这一节讲了什么", "前面说的那个"
 * - **article-comparative**: "还有其他类似文章吗", "和XXX对比"
 * - **global**: "什么是Astro", "怎么部署", general knowledge questions
 *
 * The classifier uses a weighted scoring approach:
 * 1. Cross-article intent is checked first (highest priority)
 * 2. Deictic, summary, and section-reference patterns accumulate score
 * 3. If score reaches threshold → article-local, else → global
 *
 * @param text - The user's query text
 * @param articleContext - Optional article metadata for context-aware classification
 * @returns The classified query scope
 */
export function classifyQueryScope(
  text: string,
  articleContext?: ArticleContextHint
): QueryScope {
  const normalized = normalizeText(text);
  if (!normalized) return "global";

  // Priority 1: Cross-article intent takes precedence
  if (isCrossArticleIntent(text)) {
    return "article-comparative";
  }

  // Priority 2: Accumulate article-local signals
  let localScore = 0;

  // Deictic references
  const hasDeictic = DEICTIC_PATTERNS.some(pattern => pattern.test(normalized));
  if (hasDeictic) {
    localScore += DEICTIC_SCORE;
  }

  // Summary patterns
  const hasSummary = ARTICLE_SUMMARY_PATTERNS.some(pattern =>
    pattern.test(normalized)
  );
  if (hasSummary) {
    localScore += SUMMARY_SCORE;
  }

  // Section references (strongest signal — user is pointing at specific content)
  const hasSectionRef = SECTION_REFERENCE_PATTERNS.some(pattern =>
    pattern.test(normalized)
  );
  if (hasSectionRef) {
    localScore += SECTION_SCORE;
  }

  // If article context is provided, boost local score when query matches
  // article-specific terms (title words, key point keywords)
  if (articleContext) {
    localScore += computeContextOverlap(normalized, articleContext);
  }

  return localScore >= ARTICLE_LOCAL_THRESHOLD ? "article-local" : "global";
}

// ── Context-aware boost ───────────────────────────────────────

/**
 * Compute overlap between the query and article context metadata.
 * Returns a small bonus score (0–1) when the query mentions terms
 * from the article title or key points.
 */
function computeContextOverlap(
  normalizedQuery: string,
  context: ArticleContextHint
): number {
  let overlap = 0;

  if (context.title) {
    const titleTerms = extractSignificantTerms(context.title);
    const matchedTerms = titleTerms.filter(term =>
      normalizedQuery.includes(term)
    );
    // Even a single title term match suggests article-local intent
    if (matchedTerms.length >= 1) {
      overlap += 1.0;
    }
  }

  if (context.keyPoints && context.keyPoints.length > 0) {
    const keyPointTerms = context.keyPoints.flatMap(extractSignificantTerms);
    const matchedKeyTerms = keyPointTerms.filter(term =>
      normalizedQuery.includes(term)
    );
    // Even 1 key point term match suggests article-local intent
    if (matchedKeyTerms.length >= 1) {
      overlap += 0.5;
    }
  }

  return Math.min(overlap, 1);
}

/**
 * Extract significant terms from text by splitting on whitespace/punctuation
 * and filtering out short or common words.
 */
const STOP_WORDS = new Set([
  "的",
  "了",
  "是",
  "在",
  "和",
  "与",
  "及",
  "等",
  "中",
  "为",
  "the",
  "a",
  "an",
  "is",
  "are",
  "was",
  "were",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "and",
  "or",
  "it",
  "this",
  "that",
]);

function extractSignificantTerms(text: string): string[] {
  return text
    .split(/[\s,，。.!！?？:：;；、\-–—/\\|()（）[\]【】{}]+/)
    .filter(term => term.length >= 2 && !STOP_WORDS.has(term.toLowerCase()));
}

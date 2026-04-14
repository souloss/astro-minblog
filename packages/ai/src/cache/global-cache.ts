import type { CacheAdapter, CachedSearchContext } from "./types.js";

import { createLogger } from "../utils/logger.js";

const log = createLogger("global-cache");



export type PublicQuestionType =
  | "tech"
  | "recommend"
  | "build"
  | "summary"
  | "author"
  | "about";

export interface PublicQuestionPattern {
  type: PublicQuestionType;
  keywords: string[];
  patterns: RegExp[];
  ttl: number;
  needsContext: boolean;
}

export const PUBLIC_QUESTION_PATTERNS: PublicQuestionPattern[] = [
  {
    type: "tech",
    keywords: [
      "技术栈",
      "技术",
      "框架",
      "用了什么",
      "built with",
      "tech stack",
      "framework",
    ],
    patterns: [
      /这个博客用了什么/,
      /博客.*技术栈/,
      /用了什么技术/,
      /what.*tech.*stack/,
      /built with/,
      /用什么框架/,
    ],
    ttl: 86400,
    needsContext: false,
  },
  {
    type: "recommend",
    keywords: ["推荐", "文章推荐", "好文", "recommend", "suggest"],
    patterns: [
      /推荐.*文章/,
      /有哪些推荐/,
      /文章推荐/,
      /recommend.*article/,
      /any.*recommend/,
    ],
    ttl: 1800,
    needsContext: false,
  },
  {
    type: "build",
    keywords: ["搭建", "部署", "怎么建", "how to build", "deploy", "setup"],
    patterns: [
      /怎么搭建/,
      /如何搭建/,
      /怎么部署/,
      /how to build/,
      /how to deploy/,
      /搭建.*博客/,
    ],
    ttl: 86400,
    needsContext: false,
  },
  {
    type: "summary",
    keywords: ["总结", "概括", "摘要", "summarize", "summary", "tl;dr"],
    patterns: [
      /总结(一下|这篇文章)/,
      /概括(一下|这篇文章)/,
      /文章摘要/,
      /summarize/,
      /summary/,
      /主要讲了什么/,
    ],
    ttl: 14400,
    needsContext: true,
  },
  {
    type: "author",
    keywords: ["作者", "博主", "谁", "author", "who"],
    patterns: [
      /作者是谁/,
      /博主是谁/,
      /关于作者/,
      /who.*author/,
      /about author/,
    ],
    ttl: 86400,
    needsContext: false,
  },
  {
    type: "about",
    keywords: ["关于", "介绍", "about", "intro"],
    patterns: [/关于.*博客/, /博客介绍/, /about.*blog/, /介绍一下/],
    ttl: 86400,
    needsContext: false,
  },
];

export interface DetectedPublicQuestion {
  type: PublicQuestionType;
  confidence: number;
  ttl: number;
  needsContext: boolean;
}

export function detectPublicQuestion(
  query: string
): DetectedPublicQuestion | null {
  const normalized = normalizePublicCacheQuery(query);

  let bestMatch: DetectedPublicQuestion | null = null;
  let bestScore = 0;

  for (const pattern of PUBLIC_QUESTION_PATTERNS) {
    let score = 0;

    for (const keyword of pattern.keywords) {
      if (normalized.includes(keyword.toLowerCase())) {
        score += 1;
      }
    }

    for (const regex of pattern.patterns) {
      if (regex.test(normalized)) {
        score += 3;
      }
    }

    if (score > bestScore && score >= 2) {
      bestScore = score;
      const confidence = Math.min(score / 5, 1);
      bestMatch = {
        type: pattern.type,
        confidence,
        ttl: pattern.ttl,
        needsContext: pattern.needsContext,
      };
    }
  }

  return bestMatch;
}

export function buildGlobalCacheKey(
  type: PublicQuestionType,
  context?: { articleSlug?: string; lang?: string; queryKey?: string }
): string {
  const parts = ["global", type];

  if (context?.articleSlug) {
    parts.push(context.articleSlug);
  }

  if (context?.lang) {
    parts.push(context.lang);
  }

  if (context?.queryKey) {
    parts.push(context.queryKey);
  }

  return parts.join(":");
}

export function normalizePublicCacheQuery(query: string): string {
  return query
    .toLowerCase()
    .replace(/[？?!！。，,.]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function getGlobalSearchCache(
  cache: CacheAdapter,
  type: PublicQuestionType,
  context?: { articleSlug?: string; lang?: string; queryKey?: string }
): Promise<CachedSearchContext | null> {
  const key = buildGlobalCacheKey(type, context);
  const entry = await cache.get<CachedSearchContext>(key);
  log.debug(
    `getGlobalSearchCache: key=${key}, hit=${Boolean(entry?.value)}, adapter=${cache.name}`
  );
  return entry?.value ?? null;
}

export async function setGlobalSearchCache(
  cache: CacheAdapter,
  type: PublicQuestionType,
  data: CachedSearchContext,
  ttl: number,
  context?: { articleSlug?: string; lang?: string; queryKey?: string }
): Promise<void> {
  const key = buildGlobalCacheKey(type, context);
  await cache.set(key, data, { ttl });
  log.debug(
    `setGlobalSearchCache: key=${key}, articles=${data.articles.length}, projects=${data.projects.length}, ttl=${ttl}, adapter=${cache.name}`
  );
}

export function getGlobalCacheTTL(type: PublicQuestionType): number {
  const pattern = PUBLIC_QUESTION_PATTERNS.find(p => p.type === type);
  return pattern?.ttl ?? 3600;
}

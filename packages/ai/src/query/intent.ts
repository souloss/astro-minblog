import type { ArticleContext } from "../search/types.js";
import type { QueryIntentCategory } from "./types.js";

const INTENT_KEYWORDS: Record<QueryIntentCategory, string[]> = {
  setup: [
    "搭建",
    "创建",
    "安装",
    "install",
    "setup",
    "create",
    "init",
    "scaffold",
    "新建",
    "开始",
  ],
  config: [
    "配置",
    "设置",
    "config",
    "settings",
    "环境变量",
    ".env",
    "wrangler",
    "tsconfig",
    "主题色",
    "颜色",
  ],
  content: [
    "文章",
    "博客",
    "写作",
    "markdown",
    "mdx",
    "标签",
    "分类",
    "摘要",
    "封面",
    "翻译",
  ],
  feature: [
    "功能",
    "特性",
    "feature",
    "支持",
    "AI",
    "RAG",
    "搜索",
    "评论",
    "RSS",
    "暗色",
    "深色",
  ],
  deployment: [
    "部署",
    "deploy",
    "cloudflare",
    "vercel",
    "netlify",
    "build",
    "构建",
    "CI",
    "CD",
  ],
  troubleshooting: [
    "报错",
    "错误",
    "error",
    "bug",
    "问题",
    "不工作",
    "失败",
    "fail",
    "修复",
    "fix",
  ],
  general: [],
};

function countKeywordHits(
  text: string | undefined,
  keywords: string[]
): number {
  if (!text) return 0;
  const lower = text.toLowerCase();
  return keywords.reduce(
    (hits, kw) => hits + (lower.includes(kw.toLowerCase()) ? 1 : 0),
    0
  );
}

function isRecent(dateTime?: number): boolean {
  if (!dateTime || !Number.isFinite(dateTime)) return false;
  return Date.now() - dateTime <= 365 * 24 * 60 * 60 * 1000;
}

export function classifyIntent(query: string): QueryIntentCategory {
  const q = query.toLowerCase();
  const scores: Partial<Record<QueryIntentCategory, number>> = {};

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS) as [
    QueryIntentCategory,
    string[],
  ][]) {
    if (intent === "general") continue;
    const score = keywords.reduce(
      (acc, kw) => acc + (q.includes(kw.toLowerCase()) ? 1 : 0),
      0
    );
    if (score > 0) scores[intent] = score;
  }

  const sorted = Object.entries(scores).sort(
    (a, b) => (b[1] as number) - (a[1] as number)
  );
  return (sorted[0]?.[0] as QueryIntentCategory) || "general";
}

export function rankArticlesByIntent(
  query: string,
  articles: ArticleContext[]
): ArticleContext[] {
  const intent = classifyIntent(query);
  return rankArticlesByCategory(intent, articles);
}

export function rankArticlesByCategory(
  intent: QueryIntentCategory,
  articles: ArticleContext[]
): ArticleContext[] {
  if (intent === "general" || articles.length <= 1) return articles;

  const keywords = INTENT_KEYWORDS[intent];
  if (!keywords.length) return articles;

  const scored = articles.map((article, index) => {
    const titleHit = countKeywordHits(article.title, keywords) > 0 ? 3 : 0;
    const categoryHit = (article.categories ?? []).some(
      c => countKeywordHits(c, keywords) > 0
    )
      ? 2
      : 0;
    const summaryHit = countKeywordHits(article.summary, keywords) > 0 ? 2 : 0;
    const keyPointHit = article.keyPoints.some(
      kp => countKeywordHits(kp, keywords) > 0
    )
      ? 1
      : 0;
    const recentHit = isRecent(article.dateTime) ? 1 : 0;
    return {
      article,
      index,
      score: titleHit + categoryHit + summaryHit + keyPointHit + recentHit,
    };
  });

  // Iterative max to avoid RangeError on large arrays
  let maxScore = 0;
  for (const s of scored) {
    if (s.score > maxScore) maxScore = s.score;
  }
  if (maxScore === 0) return articles;

  scored.sort((a, b) => b.score - a.score || a.index - b.index);
  return scored.map(s => s.article);
}

import type { Fact, FactCategory } from "./types.js";
import { queryFacts } from "./registry.js";

/**
 * Category detection keywords — when any keyword appears in the user query,
 * the corresponding fact category is considered relevant.
 */
const CATEGORY_KEYWORDS: Record<FactCategory, string[]> = {
  author: [
    "作者",
    "博主",
    "谁",
    "关于我",
    "自我介绍",
    "个人",
    "author",
    "who",
    "about me",
    "introduce",
  ],
  blog: [
    "博客",
    "文章",
    "多少",
    "数量",
    "统计",
    "总共",
    "分类",
    "标签",
    "语言",
    "blog",
    "post",
    "how many",
    "count",
    "statistic",
    "category",
    "tag",
  ],
  content: [
    "写过",
    "提到",
    "讨论",
    "观点",
    "主题",
    "话题",
    "涵盖",
    "领域",
    "wrote",
    "mention",
    "discuss",
    "topic",
    "cover",
    "area",
    "opinion",
  ],
  project: [
    "项目",
    "开源",
    "仓库",
    "工具",
    "产品",
    "project",
    "open source",
    "repo",
    "github",
    "tool",
    "product",
  ],
  tech: [
    "技术",
    "技术栈",
    "框架",
    "库",
    "编程语言",
    "前端",
    "后端",
    "tech",
    "stack",
    "framework",
    "library",
    "language",
    "frontend",
    "backend",
  ],
};

/**
 * Detect which fact categories are relevant to the user query.
 */
function detectRelevantCategories(query: string): FactCategory[] {
  const q = query.toLowerCase();
  const matched: FactCategory[] = [];

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => q.includes(kw))) {
      matched.push(category as FactCategory);
    }
  }

  return matched;
}

/**
 * Extract potential matching tags from the query by splitting into tokens.
 */
function extractQueryTags(query: string): string[] {
  const tokens = query.match(
    /[A-Za-z][A-Za-z0-9.+#-]{1,}|[\u4e00-\u9fa5]{2,6}/g
  );
  return tokens?.map(t => t.toLowerCase()) ?? [];
}

/**
 * Selects facts most relevant to the user's query.
 *
 * Strategy:
 * 1. Always include very-high-confidence core facts (confidence >= 0.95)
 * 2. Add category-matched facts based on query keywords
 * 3. Add tag-matched facts for more specific queries
 * 4. Deduplicate and cap total count
 */
export function matchFactsToQuery(
  query: string,
  lang?: string,
  maxFacts = 15
): Fact[] {
  const categories = detectRelevantCategories(query);
  const queryTags = extractQueryTags(query);

  // Layer 1: always-present core facts (highest confidence)
  const coreFacts = queryFacts({
    minConfidence: 0.95,
    lang,
    limit: 5,
  });

  // Layer 2: category-matched facts
  const categoryFacts =
    categories.length > 0
      ? queryFacts({
          categories,
          minConfidence: 0.7,
          lang,
          limit: 10,
        })
      : [];

  // Layer 3: tag-matched facts (for specificity)
  const tagFacts =
    queryTags.length > 0
      ? queryFacts({
          tags: queryTags,
          minConfidence: 0.6,
          lang,
          limit: 5,
        })
      : [];

  // Merge with deduplication, preserving priority order
  const seen = new Set<string>();
  const result: Fact[] = [];

  for (const fact of [...categoryFacts, ...tagFacts, ...coreFacts]) {
    if (!seen.has(fact.id)) {
      seen.add(fact.id);
      result.push(fact);
    }
  }

  return result.slice(0, maxFacts);
}

/**
 * 构建事实注册表 (Fact Registry)
 *
 * 从博客内容、作者上下文、AI 摘要等数据中提取可验证的事实，
 * 生成 rag-facts.json 供 AI 对话时注入 Prompt，减少幻觉。
 *
 * 用法:
 *   astro-minimax facts build           构建事实注册表
 *   astro-minimax facts build --verbose 显示详细输出
 *
 * 或直接运行脚本:
 *   npx tsx build-fact-registry.ts
 *   npx tsx build-fact-registry.ts --verbose
 */

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";
import {
  loadEnv,
  readJson,
  writeJson,
  truncate,
  parseCliArgs,
} from "./lib/utils.js";
import { extractFrontmatter } from "./lib/frontmatter.js";

const __filename = fileURLToPath(import.meta.url);

// ─── Types (导出供其他模块使用) ────────────────────────────────────────

export type FactCategory = "author" | "blog" | "content" | "project" | "tech";
export type FactSource = "explicit" | "derived" | "aggregated";

export interface Fact {
  id: string;
  category: FactCategory;
  statement: string;
  evidence: string;
  source: FactSource;
  confidence: number;
  tags: string[];
  lang: string;
}

export interface FactRegistryOutput {
  $schema: string;
  generatedAt: string;
  version: number;
  facts: Fact[];
  stats: {
    total: number;
    byCategory: Record<FactCategory, number>;
    avgConfidence: number;
  };
}

export interface BuildFactRegistryOptions {
  cwd?: string;
}

export interface BuildFactRegistryResult {
  success: boolean;
  output: FactRegistryOutput;
  errors: string[];
}

// ─── Internal Types ────────────────────────────────────────────────────

interface AuthorContextData {
  $schema?: string;
  profile?: {
    name?: string;
    siteUrl?: string;
    description?: string;
  };
  posts?: Array<{
    id: string;
    title: string;
    date: string;
    lang: string;
    category: string;
    tags: string[];
    summary?: string;
    keyPoints?: string[];
    url: string;
  }>;
  stableFacts?: {
    focusAreas?: string[];
    recurringTopics?: string[];
    contentFootprint?: { posts: number; zhPosts: number; enPosts: number };
    topTags?: string[];
    flagshipPosts?: Array<{ title: string; date: string; url: string }>;
  };
}

interface AISummariesData {
  articles?: Record<
    string,
    { data?: { summary?: string; keyPoints?: string[]; tags?: string[] } }
  >;
}

interface VoiceProfileData {
  tone?: string;
  style?: string;
  [key: string]: unknown;
}

// ─── Constants ────────────────────────────────────────────────

const SCHEMA_VERSION = 1;

// ─── Fact Builders ────────────────────────────────────────────

function buildAuthorFacts(
  ctx: AuthorContextData,
  env: Record<string, string | undefined>
): Fact[] {
  const facts: Fact[] = [];
  const profile = ctx.profile;
  const authorName = profile?.name || env.SITE_AUTHOR || "";
  const siteUrl = profile?.siteUrl || env.SITE_URL || "";

  if (authorName) {
    facts.push({
      id: "author-name",
      category: "author",
      statement: `博客作者名为 ${authorName}`,
      evidence: "rag-bundle.json → profile.name",
      source: "explicit",
      confidence: 1.0,
      tags: ["作者", "名字", "author", "name", authorName.toLowerCase()],
      lang: "zh",
    });
    facts.push({
      id: "author-name-en",
      category: "author",
      statement: `The blog author is ${authorName}`,
      evidence: "rag-bundle.json → profile.name",
      source: "explicit",
      confidence: 1.0,
      tags: ["author", "name", authorName.toLowerCase()],
      lang: "en",
    });
  }

  if (siteUrl) {
    facts.push({
      id: "author-site",
      category: "author",
      statement: `博客网址为 ${siteUrl}`,
      evidence: "rag-bundle.json → profile.siteUrl",
      source: "explicit",
      confidence: 1.0,
      tags: ["网址", "URL", "site", "url", "博客"],
      lang: "zh",
    });
  }

  if (profile?.description) {
    facts.push({
      id: "author-desc",
      category: "author",
      statement: `博客简介：${truncate(profile.description, 200)}`,
      evidence: "rag-bundle.json → profile.description",
      source: "explicit",
      confidence: 1.0,
      tags: ["简介", "description", "about", "关于"],
      lang: "zh",
    });
  }

  return facts;
}

function buildBlogStatsFacts(ctx: AuthorContextData): Fact[] {
  const facts: Fact[] = [];
  const footprint = ctx.stableFacts?.contentFootprint;
  const posts = ctx.posts ?? [];

  if (footprint) {
    facts.push({
      id: "blog-total-posts",
      category: "blog",
      statement: `博客共有 ${footprint.posts} 篇文章（中文 ${footprint.zhPosts} 篇，英文 ${footprint.enPosts} 篇）`,
      evidence: "rag-bundle.json → stableFacts.contentFootprint",
      source: "derived",
      confidence: 1.0,
      tags: [
        "文章数",
        "总数",
        "统计",
        "多少",
        "数量",
        "posts",
        "count",
        "total",
        "how many",
      ],
      lang: "zh",
    });
    facts.push({
      id: "blog-total-posts-en",
      category: "blog",
      statement: `The blog has ${footprint.posts} posts (${footprint.zhPosts} in Chinese, ${footprint.enPosts} in English)`,
      evidence: "rag-bundle.json → stableFacts.contentFootprint",
      source: "derived",
      confidence: 1.0,
      tags: ["posts", "count", "total", "how many", "statistics"],
      lang: "en",
    });
  } else if (posts.length) {
    facts.push({
      id: "blog-total-posts",
      category: "blog",
      statement: `博客共有 ${posts.length} 篇文章`,
      evidence: `rag-bundle.json → posts.length (${posts.length})`,
      source: "derived",
      confidence: 1.0,
      tags: ["文章数", "总数", "统计", "多少", "数量", "posts", "count"],
      lang: "zh",
    });
  }

  // Categories
  const categories = ctx.stableFacts?.focusAreas;
  if (categories?.length) {
    facts.push({
      id: "blog-categories",
      category: "blog",
      statement: `博客的主要分类包括：${categories.join("、")}`,
      evidence: "rag-bundle.json → stableFacts.focusAreas",
      source: "derived",
      confidence: 0.95,
      tags: [
        "分类",
        "类别",
        "领域",
        "方向",
        "category",
        "area",
        "focus",
        ...categories.map(c => c.toLowerCase()),
      ],
      lang: "zh",
    });
  }

  // Top tags
  const topTags = ctx.stableFacts?.topTags;
  if (topTags?.length) {
    facts.push({
      id: "blog-top-tags",
      category: "blog",
      statement: `博客最常用的标签有：${topTags.slice(0, 10).join("、")}`,
      evidence: "rag-bundle.json → stableFacts.topTags",
      source: "derived",
      confidence: 0.9,
      tags: [
        "标签",
        "tag",
        "topic",
        "主题",
        ...topTags.slice(0, 10).map(t => t.toLowerCase()),
      ],
      lang: "zh",
    });
  }

  // Recurring topics
  const topics = ctx.stableFacts?.recurringTopics;
  if (topics?.length) {
    facts.push({
      id: "blog-recurring-topics",
      category: "blog",
      statement: `博客反复讨论的技术话题包括：${topics.slice(0, 8).join("、")}`,
      evidence: "rag-bundle.json → stableFacts.recurringTopics",
      source: "aggregated",
      confidence: 0.85,
      tags: [
        "话题",
        "主题",
        "讨论",
        "topic",
        "recurring",
        ...topics.slice(0, 8).map(t => t.toLowerCase()),
      ],
      lang: "zh",
    });
  }

  // Date range
  if (posts.length >= 2) {
    const sorted = [...posts].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const oldest = sorted[0];
    const newest = sorted[sorted.length - 1];
    const oldDate = new Date(oldest.date).toISOString().slice(0, 10);
    const newDate = new Date(newest.date).toISOString().slice(0, 10);
    facts.push({
      id: "blog-date-range",
      category: "blog",
      statement: `博客的文章时间跨度从 ${oldDate} 到 ${newDate}`,
      evidence: `earliest: ${oldest.title} (${oldDate}), latest: ${newest.title} (${newDate})`,
      source: "derived",
      confidence: 1.0,
      tags: ["时间", "日期", "最早", "最新", "date", "range", "when"],
      lang: "zh",
    });
  }

  // Language distribution
  if (posts.length) {
    const langs = new Map<string, number>();
    for (const p of posts) {
      langs.set(p.lang, (langs.get(p.lang) || 0) + 1);
    }
    if (langs.size > 1) {
      const desc = [...langs.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(
          ([lang, count]) => `${lang === "zh" ? "中文" : "英文"} ${count} 篇`
        )
        .join("，");
      facts.push({
        id: "blog-lang-dist",
        category: "blog",
        statement: `博客文章的语言分布：${desc}`,
        evidence: "rag-bundle.json → posts[].lang aggregation",
        source: "derived",
        confidence: 1.0,
        tags: ["语言", "中文", "英文", "language", "chinese", "english"],
        lang: "zh",
      });
    }
  }

  return facts;
}

function buildContentFacts(ctx: AuthorContextData): Fact[] {
  const facts: Fact[] = [];
  const posts = ctx.posts ?? [];

  // Category distribution with counts
  const catCounts = new Map<string, number>();
  for (const p of posts) {
    if (p.category) {
      catCounts.set(p.category, (catCounts.get(p.category) || 0) + 1);
    }
  }
  if (catCounts.size > 0) {
    const desc = [...catCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([cat, count]) => `${cat}(${count}篇)`)
      .join("、");
    facts.push({
      id: "content-category-dist",
      category: "content",
      statement: `按分类统计：${desc}`,
      evidence: "rag-bundle.json → posts[].category aggregation",
      source: "derived",
      confidence: 1.0,
      tags: ["分类", "统计", "category", "distribution"],
      lang: "zh",
    });
  }

  // Flagship/latest posts
  const flagship = ctx.stableFacts?.flagshipPosts;
  if (flagship?.length) {
    const desc = flagship
      .map(
        p => `《${p.title}》(${new Date(p.date).toISOString().slice(0, 10)})`
      )
      .join("、");
    facts.push({
      id: "content-flagship",
      category: "content",
      statement: `最新的代表性文章：${desc}`,
      evidence: "rag-bundle.json → stableFacts.flagshipPosts",
      source: "derived",
      confidence: 0.95,
      tags: ["最新", "代表", "推荐", "latest", "recent", "flagship"],
      lang: "zh",
    });
  }

  return facts;
}

async function buildTechStackFacts(): Promise<Fact[]> {
  const facts: Fact[] = [];

  // Try to detect tech stack from config files
  try {
    const pkgRaw = await readFile(join(process.cwd(), "package.json"), "utf-8");
    const pkg = JSON.parse(pkgRaw);
    const allDeps = {
      ...(pkg.dependencies ?? {}),
      ...(pkg.devDependencies ?? {}),
    };

    const techStack: string[] = [];
    const techTags: string[] = [];

    if (allDeps.astro) {
      techStack.push(`Astro ${allDeps.astro.replace(/[^0-9.]/g, "")}`);
      techTags.push("astro");
    }
    if (allDeps.preact || allDeps.react) {
      const framework = allDeps.preact ? "Preact" : "React";
      techStack.push(framework);
      techTags.push(framework.toLowerCase());
    }
    if (allDeps.tailwindcss || allDeps["@tailwindcss/vite"]) {
      techStack.push("Tailwind CSS");
      techTags.push("tailwindcss", "tailwind");
    }
    if (allDeps.typescript) {
      techStack.push("TypeScript");
      techTags.push("typescript", "ts");
    }

    // Check for AI-related deps
    if (allDeps["@astro-minimax/ai"]) {
      techTags.push("ai", "rag", "llm");
    }

    if (techStack.length > 0) {
      const zhStack = allDeps["@astro-minimax/ai"]
        ? [...techStack, "AI 对话（RAG）"]
        : techStack;
      const enStack = allDeps["@astro-minimax/ai"]
        ? [...techStack, "AI Chat (RAG)"]
        : techStack;

      facts.push({
        id: "tech-stack",
        category: "tech",
        statement: `博客使用的技术栈包括：${zhStack.join("、")}`,
        evidence: "package.json → dependencies + devDependencies",
        source: "explicit",
        confidence: 1.0,
        tags: [
          "技术栈",
          "技术",
          "框架",
          "工具",
          "tech",
          "stack",
          "framework",
          ...techTags,
        ],
        lang: "zh",
      });
      facts.push({
        id: "tech-stack-en",
        category: "tech",
        statement: `The blog is built with: ${enStack.join(", ")}`,
        evidence: "package.json → dependencies + devDependencies",
        source: "explicit",
        confidence: 1.0,
        tags: ["tech", "stack", "framework", "built with", ...techTags],
        lang: "en",
      });
    }
  } catch {
    // package.json not found or unreadable
  }

  return facts;
}

function buildSummaryDerivedFacts(summaries: AISummariesData): Fact[] {
  const facts: Fact[] = [];
  const articles = summaries.articles ?? {};
  const entries = Object.entries(articles);

  if (!entries.length) return facts;

  // Aggregate all tags from AI summaries
  const tagCounts = new Map<string, number>();
  for (const [, entry] of entries) {
    for (const tag of entry.data?.tags ?? []) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }

  if (tagCounts.size > 0) {
    const topAiTags = [...tagCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([tag]) => tag);

    facts.push({
      id: "content-ai-tags",
      category: "content",
      statement: `AI 分析得出的高频主题标签：${topAiTags.join("、")}`,
      evidence: `.cache/ai-summaries.json → ${entries.length} articles aggregated tags`,
      source: "aggregated",
      confidence: 0.85,
      tags: [
        "标签",
        "主题",
        "AI",
        "tag",
        "topic",
        ...topAiTags.map(t => t.toLowerCase()),
      ],
      lang: "zh",
    });
  }

  // Extract highly recurring key points
  const keyPointCounts = new Map<string, number>();
  for (const [, entry] of entries) {
    for (const kp of entry.data?.keyPoints ?? []) {
      const normalized = kp.trim().toLowerCase();
      if (normalized.length >= 10) {
        keyPointCounts.set(
          normalized,
          (keyPointCounts.get(normalized) || 0) + 1
        );
      }
    }
  }

  const recurringKPs = [...keyPointCounts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (recurringKPs.length) {
    const desc = recurringKPs.map(([kp]) => truncate(kp, 60)).join("；");
    facts.push({
      id: "content-recurring-kp",
      category: "content",
      statement: `在多篇文章中反复出现的要点：${desc}`,
      evidence: `.cache/ai-summaries.json → keyPoints cross-article aggregation`,
      source: "aggregated",
      confidence: 0.8,
      tags: ["要点", "核心", "反复", "key point", "recurring"],
      lang: "zh",
    });
  }

  return facts;
}

// ─── Article-level Fact Extraction ────────────────────────────

async function buildArticleFacts(blogDir: string): Promise<Fact[]> {
  const facts: Fact[] = [];

  try {
    const files = await collectMarkdownFiles(blogDir);

    // Extract facts about explicitly mentioned technologies from frontmatter tags
    const explicitTechMentions = new Map<string, number>();
    for (const filePath of files) {
      const raw = await readFile(filePath, "utf-8");
      const fm = extractFrontmatter(raw);
      if (fm.data.draft) continue;

      const tags: string[] = Array.isArray(fm.data.tags) ? fm.data.tags : [];
      for (const tag of tags) {
        explicitTechMentions.set(tag, (explicitTechMentions.get(tag) || 0) + 1);
      }
    }

    // Top mentioned technologies from tags
    const topMentions = [...explicitTechMentions.entries()]
      .filter(([, count]) => count >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    if (topMentions.length) {
      const desc = topMentions
        .map(([tech, count]) => `${tech}(${count}次)`)
        .join("、");
      facts.push({
        id: "content-tech-mentions",
        category: "content",
        statement: `文章中高频提及的技术/话题（按标签统计）：${desc}`,
        evidence: `${files.length} markdown files → frontmatter.tags aggregation`,
        source: "aggregated",
        confidence: 0.9,
        tags: [
          "技术",
          "提及",
          "频率",
          "tech",
          "mention",
          ...topMentions.map(([t]) => t.toLowerCase()),
        ],
        lang: "zh",
      });
    }
  } catch {
    // BLOG_DIR doesn't exist or is unreadable
  }

  return facts;
}

async function collectMarkdownFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith("_")) {
      files.push(...(await collectMarkdownFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }

  return files;
}

// ─── Stats Computation ────────────────────────────────────────

function computeStats(facts: Fact[]) {
  const byCategory: Record<FactCategory, number> = {
    author: 0,
    blog: 0,
    content: 0,
    project: 0,
    tech: 0,
  };

  let totalConfidence = 0;
  for (const fact of facts) {
    byCategory[fact.category]++;
    totalConfidence += fact.confidence;
  }

  return {
    total: facts.length,
    byCategory,
    avgConfidence:
      facts.length > 0 ? +(totalConfidence / facts.length).toFixed(3) : 0,
  };
}

// ─── Main Export ─────────────────────────────────────────────────────

export async function buildFactRegistry(
  options: BuildFactRegistryOptions = {}
): Promise<BuildFactRegistryResult> {
  const { cwd = process.cwd() } = options;
  const errors: string[] = [];
  const dataDir = join(cwd, "datas");
  const blogDir = join(cwd, "src/data/blog");

  await loadEnv();

  const authorContext = await readJson<AuthorContextData>(
    join(dataDir, "rag-bundle.json"),
    {}
  );
  const aiSummaries = await readJson<AISummariesData>(
    join(dataDir, ".cache", "ai-summaries.json"),
    {}
  );

  const allFacts: Fact[] = [];

  const authorFacts = buildAuthorFacts(
    authorContext,
    process.env as Record<string, string | undefined>
  );
  allFacts.push(...authorFacts);

  const blogFacts = buildBlogStatsFacts(authorContext);
  allFacts.push(...blogFacts);

  const contentFacts = buildContentFacts(authorContext);
  allFacts.push(...contentFacts);

  const techFacts = await buildTechStackFacts();
  allFacts.push(...techFacts);

  const summaryFacts = buildSummaryDerivedFacts(aiSummaries);
  allFacts.push(...summaryFacts);

  const articleFacts = await buildArticleFacts(blogDir);
  allFacts.push(...articleFacts);

  const stats = computeStats(allFacts);

  const output: FactRegistryOutput = {
    $schema: "fact-registry-v1",
    generatedAt: new Date().toISOString(),
    version: SCHEMA_VERSION,
    facts: allFacts,
    stats,
  };

  await writeJson(join(dataDir, "rag-facts.json"), output);

  return {
    success: errors.length === 0,
    output,
    errors,
  };
}

// ─── CLI Entry Point ─────────────────────────────────────────────────

async function main() {
  const args = parseCliArgs<{ verbose: boolean }>({ verbose: false });
  const cwd = process.cwd();

  console.log("📊 构建事实注册表 (Fact Registry)");
  console.log("━".repeat(50));

  const dataDir = join(cwd, "datas");

  const authorContext = await readJson<AuthorContextData>(
    join(dataDir, "rag-bundle.json"),
    {}
  );
  const aiSummaries = await readJson<AISummariesData>(
    join(dataDir, ".cache", "ai-summaries.json"),
    {}
  );
  const voiceProfile = await readJson<VoiceProfileData>(
    join(dataDir, "rag-voice.json"),
    {}
  );

  const hasAuthorContext = !!authorContext.profile;
  const hasSummaries =
    !!aiSummaries.articles && Object.keys(aiSummaries.articles).length > 0;

  console.log(`\n📂 数据源检测:`);
  console.log(
    `   rag-bundle.json: ${hasAuthorContext ? "✅" : "❌ (缺失)"}`
  );
  console.log(
    `   ai-summaries (cache): ${hasSummaries ? `✅ (${Object.keys(aiSummaries.articles ?? {}).length} 篇)` : "❌ (缺失)"}`
  );
  console.log(
    `   rag-voice.json:      ${voiceProfile.tone ? "✅" : "⚠️ (部分)"}`
  );

  console.log("\n🔍 提取事实...");

  const result = await buildFactRegistry({ cwd });

  console.log(`\n✅ 事实注册表构建完成`);
  console.log(`📄 输出文件: ${join(dataDir, "rag-facts.json")}`);
  console.log(`\n📊 统计:`);
  console.log(`   总事实数: ${result.output.stats.total}`);
  console.log(`   平均置信度: ${result.output.stats.avgConfidence}`);
  console.log(`   按分类:`);
  for (const [cat, count] of Object.entries(result.output.stats.byCategory)) {
    if (count > 0) console.log(`     ${cat}: ${count}`);
  }
}

if (process.argv[1] === __filename) {
  main().catch(error => {
    console.error("❌ 构建失败:", error.message);
    process.exit(1);
  });
}

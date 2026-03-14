#!/usr/bin/env npx tsx
/**
 * 构建作者上下文数据
 *
 * 聚合博客文章数据为统一的 author-context.json，
 * 为 AI 博客分身对话提供上下文。
 *
 * 用法:
 *   pnpm context:build                  构建作者上下文
 *   pnpm context:build --include-body   包含文章正文内容
 */

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import {
  loadEnv,
  readJson,
  writeJson,
  truncate,
  normalizeSpace,
  parseCliArgs,
  DATA_DIR,
  BLOG_DIR,
} from "./lib/utils.js";
import { stripMarkdown } from "./lib/markdown.js";
import { extractFrontmatter } from "./lib/frontmatter.js";
import { hasAPIKey, getConfig } from "./lib/ai-provider.js";

// ─── 常量 ─────────────────────────────────────────────────────

const OUTPUT_FILE = join(DATA_DIR, "author-context.json");
const SOURCES_DIR = join(DATA_DIR, "sources");
const MAX_RECENT_POSTS = 200;

const CATEGORY_LABELS: Record<string, string> = {
  教程: "教程",
  技术: "技术",
  生活: "生活",
  随笔: "随笔",
  其他: "其他",
};

const THEME_STOPWORDS = new Set([
  "可以",
  "这个",
  "那个",
  "一些",
  "以及",
  "并且",
  "如果",
  "因为",
  "所以",
  "还是",
  "一个",
  "我们",
  "他们",
  "你们",
  "自己",
  "进行",
  "使用",
  "通过",
  "关于",
  "相关",
  "作者",
  "文章",
  "项目",
  "内容",
  "技术",
  "博客",
  "最近",
  "持续",
  "方式",
  "经验",
  "记录",
  "分享",
  "实践",
  "问题",
  "方案",
]);

// ─── CLI 参数 ─────────────────────────────────────────────────

interface CliFlags {
  includeBody: boolean;
}

function parseArgs(): CliFlags {
  return parseCliArgs({ includeBody: false });
}

// ─── 文章扫描 ─────────────────────────────────────────────────

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

interface RawPost {
  id: string;
  title: string;
  date: string;
  lang: string;
  category: string;
  tags: string[];
  description: string;
  summary?: string;
  keyPoints?: string[];
  body: string;
  url: string;
}

async function collectPosts(
  siteUrl: string,
  includeBody: boolean
): Promise<RawPost[]> {
  const files = await collectMarkdownFiles(BLOG_DIR);
  const aiSummaries = await readJson<{
    articles?: Record<string, { data?: { summary?: string; keyPoints?: string[] } }>
  }>(join(DATA_DIR, "ai-summaries.json"), {
    articles: {},
  });
  const posts: RawPost[] = [];

  for (const filePath of files) {
    const raw = await readFile(filePath, "utf-8");
    const fm = extractFrontmatter(raw);
    const data = fm.data;

    // 跳过没有标题或日期的文章，以及草稿
    if (!data.title || !data.pubDatetime || data.draft) continue;

    const relativePath = filePath.replace(BLOG_DIR + "/", "");
    const lang = relativePath.startsWith("en/") ? "en" : "zh";
    const id = relativePath.replace(/\.md$/, "");

    const summaryEntry = aiSummaries.articles?.[id]?.data;
    const plainContent = stripMarkdown(fm.body);

    posts.push({
      id,
      title: String(data.title),
      date: String(data.pubDatetime),
      lang,
      category: String(data.category || ""),
      tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
      description: String(data.description || ""),
      summary: summaryEntry?.summary || truncate(plainContent, 150),
      keyPoints: summaryEntry?.keyPoints || [],
      body: includeBody ? fm.body.slice(0, 5000) : "",
      url: `${siteUrl.replace(/\/$/, "")}/${id}`,
    });
  }

  // 按日期降序排列
  posts.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return posts;
}

// ─── 主题分析 ─────────────────────────────────────────────────

function tokenizeThemeText(text: string): string[] {
  const raw = normalizeSpace(text);
  const tokens = raw.match(/[A-Za-z][A-Za-z0-9.+#-]{1,}|[\u4e00-\u9fa5]{2,6}/g) ?? [];
  return tokens.filter((token) => {
    const lower = token.toLowerCase();
    return !THEME_STOPWORDS.has(lower) && token.length >= 2;
  });
}

function buildThemeStats(posts: RawPost[]): string[] {
  const counts = new Map<string, number>();

  for (const post of posts) {
    // 分类权重
    if (post.category) {
      const label = CATEGORY_LABELS[post.category] || post.category;
      counts.set(label, (counts.get(label) || 0) + 3);
    }
    // 标题权重
    for (const token of tokenizeThemeText(post.title)) {
      counts.set(token, (counts.get(token) || 0) + 3);
    }
    // 摘要权重
    for (const token of tokenizeThemeText(post.summary || "")) {
      counts.set(token, (counts.get(token) || 0) + 2);
    }
    // 标签权重
    for (const tag of post.tags) {
      counts.set(tag, (counts.get(tag) || 0) + 2);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([token]) => token);
}

// ─── 稳定事实提取 ─────────────────────────────────────────────

function buildStableFacts(posts: RawPost[]) {
  const categoryCounts = new Map<string, number>();

  for (const post of posts) {
    if (post.category) {
      categoryCounts.set(
        post.category,
        (categoryCounts.get(post.category) || 0) + 1
      );
    }
  }

  const focusAreas = [...categoryCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category]) => CATEGORY_LABELS[category] || category);

  const recurringTopics = buildThemeStats(posts).filter(
    (topic) => !focusAreas.includes(topic)
  );

  // 代表性文章（取最新的几篇）
  const flagshipPosts = posts.slice(0, 5).map((post) => ({
    title: post.title,
    date: post.date,
    url: post.url,
  }));

  // 语言分布
  const langDistribution = {
    zh: posts.filter((p) => p.lang === "zh").length,
    en: posts.filter((p) => p.lang === "en").length,
  };

  // 标签聚合
  const tagCounts = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }
  const topTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([tag]) => tag);

  return {
    focusAreas,
    recurringTopics,
    flagshipPosts,
    contentFootprint: {
      posts: posts.length,
      zhPosts: langDistribution.zh,
      enPosts: langDistribution.en,
    },
    topTags,
  };
}

// ─── 时间线数据 ───────────────────────────────────────────────

function buildTimelineFacts(posts: RawPost[]) {
  const latestPosts = posts.slice(0, 10).map((post) => ({
    date: post.date,
    title: post.title,
    url: post.url,
    lang: post.lang,
  }));

  return {
    latestPosts,
  };
}

// ─── 哈希计算 ─────────────────────────────────────────────────

function computeContextHash(payload: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex")
    .slice(0, 16);
}

// ─── 主流程 ───────────────────────────────────────────────────

async function main() {
  const args = parseArgs();
  await loadEnv();

  const siteUrl = process.env.SITE_URL || "https://example.com";

  console.log("📦 构建作者上下文数据");
  console.log("━".repeat(50));
  console.log(`   站点 URL: ${siteUrl}`);
  console.log(`   输出目录: ${DATA_DIR}`);
  console.log("");

  // 收集博客文章
  console.log("📂 扫描博客文章...");
  const posts = await collectPosts(siteUrl, args.includeBody);
  console.log(`   找到 ${posts.length} 篇文章`);
  console.log(
    `   - 中文: ${posts.filter((p) => p.lang === "zh").length} 篇`
  );
  console.log(
    `   - 英文: ${posts.filter((p) => p.lang === "en").length} 篇`
  );

  // 保存文章摘要到 sources
  await writeJson(join(SOURCES_DIR, "blog-digest.json"), {
    generatedAt: new Date().toISOString(),
    count: posts.length,
    posts: posts.slice(0, MAX_RECENT_POSTS).map((p) => ({
      id: p.id,
      title: p.title,
      date: p.date,
      lang: p.lang,
      category: p.category,
      tags: p.tags,
      summary: p.summary,
      url: p.url,
    })),
  });

  // 构建事实数据
  const stableFacts = buildStableFacts(posts);
  const timelineFacts = buildTimelineFacts(posts);

  // 检查 AI 配置
  const aiConfig = hasAPIKey() ? getConfig() : null;
  if (aiConfig) {
    console.log(`\n🤖 AI 配置:`);
    console.log(`   模型: ${aiConfig.model}`);
    console.log(`   API: ${aiConfig.baseUrl}`);
  }

  // 构建统一上下文
  const baseContext = {
    $schema: "author-context-v1",
    generatedAt: new Date().toISOString(),
    profile: {
      // 从站点配置获取，或使用默认值
      name: process.env.SITE_AUTHOR || "博主",
      siteUrl,
      description: process.env.SITE_DESCRIPTION || "",
    },
    posts: posts.slice(0, MAX_RECENT_POSTS).map((p) => ({
      id: p.id,
      title: p.title,
      date: p.date,
      lang: p.lang,
      category: p.category,
      tags: p.tags,
      summary: p.summary,
      keyPoints: p.keyPoints,
      url: p.url,
      ...(args.includeBody && { body: p.body }),
    })),
    stableFacts,
    timelineFacts,
    aiConfig: aiConfig
      ? {
          model: aiConfig.model,
          provider: aiConfig.provider,
        }
      : null,
  };

  const context = {
    ...baseContext,
    contextHash: computeContextHash(baseContext),
  };

  await writeJson(OUTPUT_FILE, context);

  console.log("\n✅ 构建完成");
  console.log(`📄 输出文件: ${OUTPUT_FILE}`);
  console.log("\n📊 数据概览:");
  console.log(`   文章总数: ${stableFacts.contentFootprint.posts}`);
  console.log(`   聚焦领域: ${stableFacts.focusAreas.join("、")}`);
  console.log(`   热门标签: ${stableFacts.topTags.slice(0, 5).join("、")}`);
}

main().catch((error) => {
  console.error("❌ 构建失败:", error.message);
  process.exit(1);
});
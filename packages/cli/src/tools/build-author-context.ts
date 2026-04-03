#!/usr/bin/env npx tsx
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
import {
  KNOWLEDGE_CACHE_DIR,
  KNOWLEDGE_DERIVED_DIR,
  KNOWLEDGE_RUNTIME_DIR,
  KNOWLEDGE_SOURCES_DIR,
  buildKnowledgeBundle,
} from "./lib/knowledge.js";
import { stripMarkdown } from "./lib/markdown.js";
import {
  chunkMarkdownByHeaders,
  type ArticleChunk,
} from "./lib/markdown-chunker.js";
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
  includeUnderscoreDirs: boolean;
}

function parseArgs(): CliFlags {
  return parseCliArgs({ includeBody: false, includeUnderscoreDirs: true });
}

// ─── 文章扫描 ─────────────────────────────────────────────────

async function collectMarkdownFiles(
  dir: string,
  options: Pick<CliFlags, "includeUnderscoreDirs">
): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (
      entry.isDirectory() &&
      (options.includeUnderscoreDirs || !entry.name.startsWith("_"))
    ) {
      files.push(...(await collectMarkdownFiles(fullPath, options)));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      // Normalize path separators for cross-platform consistency
      files.push(fullPath.replace(/\\/g, "/"));
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
  chunks?: ArticleChunk[];
}

async function collectPosts(
  _siteUrl: string,
  includeBody: boolean,
  options: Pick<CliFlags, "includeUnderscoreDirs">
): Promise<RawPost[]> {
  const files = await collectMarkdownFiles(BLOG_DIR, options);
  const aiSummaries = await readJson<{
    articles?: Record<
      string,
      { data?: { summary?: string; keyPoints?: string[] } }
    >;
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

    // Normalize path separators for Windows compatibility
    const normalizedFilePath = filePath.replace(/\\/g, "/");
    const normalizedBlogDir = BLOG_DIR.replace(/\\/g, "/");
    const relativePath = normalizedFilePath.replace(normalizedBlogDir + "/", "");
    const lang = relativePath.startsWith("en/") ? "en" : "zh";
    const id = relativePath.replace(/\.md$/, "");

    const summaryEntry = aiSummaries.articles?.[id]?.data;
    const plainContent = stripMarkdown(fm.body);

    // URL 格式: /{lang}/posts/{slug}/
    // slug 是 id 的最后部分（去掉语言前缀）
    const slug = id.split("/").slice(1).join("/");

    // 生成段落级 chunks
    const chunks = chunkMarkdownByHeaders(fm.body, id, {
      maxTokens: 512,
      minTokens: 50,
      overlapTokens: 64,
    });

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
      url: `/${lang}/posts/${slug}/`,
      chunks: chunks.length > 0 ? chunks : undefined,
    });
  }

  // 按日期降序排列
  posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return posts;
}

// ─── 主题分析 ─────────────────────────────────────────────────

function tokenizeThemeText(text: string): string[] {
  const raw = normalizeSpace(text);
  const tokens =
    raw.match(/[A-Za-z][A-Za-z0-9.+#-]{1,}|[\u4e00-\u9fa5]{2,6}/g) ?? [];
  return tokens.filter(token => {
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
    topic => !focusAreas.includes(topic)
  );

  // 代表性文章（取最新的几篇）
  const flagshipPosts = posts.slice(0, 5).map(post => ({
    title: post.title,
    date: post.date,
    url: post.url,
  }));

  // 语言分布
  const langDistribution = {
    zh: posts.filter(p => p.lang === "zh").length,
    en: posts.filter(p => p.lang === "en").length,
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
  const latestPosts = posts.slice(0, 10).map(post => ({
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
  const posts = await collectPosts(siteUrl, args.includeBody, {
    includeUnderscoreDirs: args.includeUnderscoreDirs,
  });
  console.log(`   找到 ${posts.length} 篇文章`);
  console.log(`   - 中文: ${posts.filter(p => p.lang === "zh").length} 篇`);
  console.log(`   - 英文: ${posts.filter(p => p.lang === "en").length} 篇`);

  // 保存文章摘要到 sources
  await writeJson(join(SOURCES_DIR, "blog-digest.json"), {
    generatedAt: new Date().toISOString(),
    count: posts.length,
    posts: posts.slice(0, MAX_RECENT_POSTS).map(p => ({
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
    posts: posts.slice(0, MAX_RECENT_POSTS).map(p => ({
      id: p.id,
      title: p.title,
      date: p.date,
      lang: p.lang,
      category: p.category,
      tags: p.tags,
      summary: p.summary || "",
      keyPoints: p.keyPoints || [],
      url: p.url,
      chunks: p.chunks,
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
  const generatedAt = context.generatedAt;
  const summaries = await readJson(join(DATA_DIR, "ai-summaries.json"), {
    meta: { lastUpdated: generatedAt, model: "unknown", totalProcessed: 0 },
    articles: {},
  });
  const voiceProfile = await readJson(
    join(DATA_DIR, "voice-profile.json"),
    null
  );
  const factRegistry = await readJson(
    join(DATA_DIR, "fact-registry.json"),
    null
  );
  const bundle = buildKnowledgeBundle({
    generatedAt,
    summaries,
    authorContext: context,
    voiceProfile,
    factRegistry,
    vectorIndex: null,
  });
  await writeJson(
    join(KNOWLEDGE_SOURCES_DIR, "content-manifest.json"),
    bundle.corpus
  );
  await writeJson(
    join(KNOWLEDGE_RUNTIME_DIR, "article-passages.json"),
    bundle.passages
  );
  await writeJson(join(KNOWLEDGE_RUNTIME_DIR, "knowledge-bundle.json"), bundle);
  await writeJson(join(KNOWLEDGE_DERIVED_DIR, "site-overview.json"), {
    generatedAt,
    stableFacts,
    timelineFacts,
  });
  await writeJson(join(KNOWLEDGE_CACHE_DIR, "build-metadata.json"), {
    generatedAt,
    contextHash: context.contextHash,
    postCount: posts.length,
    chunkCount: posts.reduce((sum, p) => sum + (p.chunks?.length || 0), 0),
  });

  console.log("\n✅ 构建完成");
  console.log(`📄 输出文件: ${OUTPUT_FILE}`);
  console.log("\n📊 数据概览:");
  console.log(`   文章总数: ${stableFacts.contentFootprint.posts}`);

  // 统计 chunks
  const totalChunks = posts.reduce(
    (sum, p) => sum + (p.chunks?.length || 0),
    0
  );
  if (totalChunks > 0) {
    console.log(`   段落总数: ${totalChunks}`);
  }

  console.log(`   聚焦领域: ${stableFacts.focusAreas.join("、")}`);
  console.log(`   热门标签: ${stableFacts.topTags.slice(0, 5).join("、")}`);
}

main().catch(error => {
  console.error("❌ 构建失败:", error.message);
  process.exit(1);
});

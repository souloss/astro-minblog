#!/usr/bin/env npx tsx
/**
 * 生成作者画像报告
 *
 * 基于作者上下文数据生成用于 About 页面的结构化简介。
 * 支持 AI 生成和规则模板两种模式。
 *
 * 用法:
 *   pnpm profile:generate              AI 生成画像报告
 *   pnpm profile:generate --no-ai      使用规则模板
 *   pnpm profile:generate --force      强制重新生成（不回退）
 */

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  loadEnv,
  readJson,
  writeJson,
  truncate,
  parseCliArgs,
  DATA_DIR,
  BLOG_DIR,
  } from "./lib/utils.js";
import { stripMarkdown } from "./lib/markdown.js";
import { extractFrontmatter } from "./lib/frontmatter.js";
import { chatCompletion, hasAPIKey, getConfig } from "./lib/ai-provider.js";

// ─── 常量 ─────────────────────────────────────────────────────

const OUTPUT_REPORT = join(DATA_DIR, "author-profile-report.json");
const OUTPUT_CONTEXT = join(DATA_DIR, "author-profile-context.json");
const DEFAULT_SITE_URL = "https://example.com";

// ─── CLI 参数 ─────────────────────────────────────────────────

interface CliFlags {
  force: boolean;
  noAI: boolean;
}

function parseArgs(): CliFlags {
  return parseCliArgs({ force: false, noAI: false });
}

// ─── 文章收集 ─────────────────────────────────────────────────

interface Post {
  title: string;
  date: string;
  lang: string;
  category: string;
  tags: string[];
  description: string;
  summary?: string;
  keyPoints?: string[];
  url: string;
}

async function collectPosts(siteUrl: string): Promise<Post[]> {
  const entries = await readdir(BLOG_DIR, { withFileTypes: true });
  const aiSummaries = await readJson<{
    articles?: Record<string, { data?: { summary?: string; keyPoints?: string[] } }>
  }>(join(DATA_DIR, "ai-summaries.json"), {
    articles: {},
  });
  const posts: Post[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith("_")) continue;

    const subDir = join(BLOG_DIR, entry.name);
    const subEntries = await readdir(subDir, { withFileTypes: true });

    for (const subEntry of subEntries) {
      if (!subEntry.isFile() || !subEntry.name.endsWith(".md")) continue;

      const filePath = join(subDir, subEntry.name);
      const raw = await readFile(filePath, "utf-8");
      const fm = extractFrontmatter(raw);

      if (!fm.data.title || fm.data.draft) continue;

      const relativePath = filePath.replace(BLOG_DIR + "/", "");
      const id = relativePath.replace(/\.md$/, "");
      const lang = relativePath.startsWith("en/") ? "en" : "zh";
      const summaryEntry = aiSummaries.articles?.[id]?.data;

      posts.push({
        title: String(fm.data.title),
        date: String(fm.data.pubDatetime),
        lang,
        category: String(fm.data.category || ""),
        tags: Array.isArray(fm.data.tags) ? (fm.data.tags as string[]) : [],
        description: String(fm.data.description || ""),
        summary: summaryEntry?.summary || truncate(stripMarkdown(fm.body), 100),
        keyPoints: summaryEntry?.keyPoints || [],
        url: `${siteUrl.replace(/\/$/, "")}/${id}`,
      });
    }
  }

  posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return posts;
}

// ─── 上下文构建 ───────────────────────────────────────────────

function buildContext(posts: Post[], siteUrl: string) {
  const selectedPosts = posts.slice(0, 12);
  const zhPosts = posts.filter((p) => p.lang === "zh");
  const enPosts = posts.filter((p) => p.lang === "en");

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

  // 分类聚合
  const categoryCounts = new Map<string, number>();
  for (const post of posts) {
    if (post.category) {
      categoryCounts.set(
        post.category,
        (categoryCounts.get(post.category) || 0) + 1
      );
    }
  }
  const topCategories = [...categoryCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cat]) => cat);

  return {
    generatedAt: new Date().toISOString(),
    siteUrl,
    sourceInfo: {
      totalPosts: posts.length,
      zhPosts: zhPosts.length,
      enPosts: enPosts.length,
      selectedPosts: selectedPosts.length,
    },
    profile: {
      name: process.env.SITE_AUTHOR || "博主",
      siteUrl,
    },
    posts: selectedPosts.map((post) => ({
      title: post.title,
      date: post.date,
      categories: [post.category].filter(Boolean),
      tags: post.tags.slice(0, 5),
      summary: post.summary,
      keyPoints: post.keyPoints,
      url: post.url,
    })),
    topTags,
    topCategories,
    contentStats: {
      totalPosts: posts.length,
      avgPostPerMonth: Math.round(
        posts.length / Math.max(1, calculateMonthsSpan(posts))
      ),
    },
  };
}

function calculateMonthsSpan(posts: Post[]): number {
  if (posts.length < 2) return 1;
  const latest = new Date(posts[0].date);
  const earliest = new Date(posts[posts.length - 1].date);
  return (
    (latest.getFullYear() - earliest.getFullYear()) * 12 +
    (latest.getMonth() - earliest.getMonth()) +
    1
  );
}

// ─── AI 生成 ───────────────────────────────────────────────────

async function generateReportWithAI(
  context: ReturnType<typeof buildContext>
): Promise<unknown> {
  if (!hasAPIKey()) {
    throw new Error("未配置 AI API Key");
  }

  const config = getConfig();

  const systemPrompt = `你是一位中文科技写作编辑。请基于给定上下文，以第三方视角生成作者画像 JSON。
要求：
1. 严格输出 JSON，不要输出 Markdown 或多余文本。
2. 语气客观、克制、具体，不要夸张和空泛。
3. 结论必须可由上下文支撑，避免编造。
4. 文案使用中文，第三人称，不使用"我"。

输出 schema:
{
  "report": {
    "hero": {"title":"AI 视角下的作者","summary":"...","intro":"..."},
    "identities":[{"name":"...","description":"...","evidence":"..."}],
    "strengths":[{"title":"...","points":["..."]}],
    "styles":[{"trait":"...","description":"..."}],
    "proofs":{
      "posts":[{"title":"...","url":"...","reason":"...","date":"YYYY-MM-DD"}]
    },
    "disclaimer":"..."
  }
}`;

  const contextText = JSON.stringify(context, null, 2).slice(0, 25000);
  const userPrompt = `上下文数据如下，请根据这些信息生成报告：\n${contextText}`;

  const content = await chatCompletion(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    { maxTokens: 3000, responseFormat: "json" }
  );

  const parsed = JSON.parse(content);
  return {
    meta: {
      lastUpdated: new Date().toISOString(),
      model: config.model,
      generatedBy: "ai",
    },
    report: parsed.report || parsed,
  };
}

// ─── 规则模板生成 ─────────────────────────────────────────────

function buildRuleBasedReport(
  context: ReturnType<typeof buildContext>
): unknown {
  const posts = context.posts.slice(0, 5).map((post) => ({
    title: post.title,
    url: post.url,
    reason:
      post.summary?.slice(0, 60) || "该文章体现了作者的写作风格。",
    date: post.date,
  }));

  const topCategories = context.topCategories.slice(0, 3).join("、");
  const authorName = context.profile.name;

  return {
    meta: {
      lastUpdated: new Date().toISOString(),
      model: "rule-based-template",
      generatedBy: "rule-based",
    },
    report: {
      hero: {
        title: `AI 视角下的 ${authorName}`,
        summary: `一位专注于${topCategories}领域的博主，持续输出高质量内容。`,
        intro: `博客已发布 ${context.sourceInfo.totalPosts} 篇文章，涵盖 ${context.topTags.length} 个主题标签。`,
      },
      identities: [
        {
          name: "技术博主",
          description: "持续分享技术经验与实践心得。",
          evidence: `已发布 ${context.sourceInfo.totalPosts} 篇文章。`,
        },
        {
          name: "内容创作者",
          description: "注重内容质量与读者体验。",
          evidence: posts[0]
            ? `近期文章《${posts[0].title}》体现了专业的写作风格。`
            : "",
        },
      ],
      strengths: [
        {
          title: "内容深度",
          points: [
            "文章结构清晰，逻辑性强",
            "注重实践，配合代码示例",
            "持续更新，覆盖多个技术领域",
          ],
        },
        {
          title: "表达风格",
          points: ["语言简洁明了", "注重可读性", "善于总结提炼"],
        },
      ],
      styles: [
        {
          trait: "技术导向",
          description: "专注于技术内容的深度讲解与实践分享。",
        },
        {
          trait: "结构化表达",
          description: "文章结构清晰，便于读者理解和学习。",
        },
      ],
      proofs: { posts },
      disclaimer:
        "该页面由 AI 归纳与规则模板联合生成，旨在帮助访客快速建立认知，可能存在概括偏差，请以原始文章信息为准。",
    },
  };
}

// ─── 主流程 ───────────────────────────────────────────────────

async function main() {
  const args = parseArgs();
  await loadEnv();

  console.log("👤 生成作者画像报告");
  console.log("━".repeat(50));

  const siteUrl = process.env.SITE_URL || DEFAULT_SITE_URL;
  console.log(`   站点 URL: ${siteUrl}`);
  console.log(`   输出目录: ${DATA_DIR}`);
  console.log("");

  // 收集数据
  console.log("📂 收集文章数据...");
  const posts = await collectPosts(siteUrl);
  console.log(`   找到 ${posts.length} 篇文章`);

  const context = buildContext(posts, siteUrl);
  await writeJson(OUTPUT_CONTEXT, context);
  console.log(`   上下文已保存: ${OUTPUT_CONTEXT}`);

  // 生成报告
  let report: unknown;

  if (args.noAI) {
    console.log("\n📝 使用规则模板生成...");
    report = buildRuleBasedReport(context);
  } else {
    console.log("\n🤖 使用 AI 生成...");
    try {
      report = await generateReportWithAI(context);
      console.log("   ✅ AI 生成成功");
    } catch (error) {
      const err = error as Error;
      if (!args.force) {
        console.warn(`   ⚠️  AI 生成失败: ${err.message}`);
        console.log("   📝 回退使用规则模板...");
        report = buildRuleBasedReport(context);
      } else {
        throw error;
      }
    }
  }

  await writeJson(OUTPUT_REPORT, report);

  console.log("\n✅ 画像报告生成完成");
  console.log(`📄 报告文件: ${OUTPUT_REPORT}`);
  console.log(`🧩 上下文文件: ${OUTPUT_CONTEXT}`);
}

main().catch((error) => {
  console.error("❌ 生成失败:", error.message);
  process.exit(1);
});
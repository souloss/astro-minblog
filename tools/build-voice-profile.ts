#!/usr/bin/env npx tsx
/**
 * 构建作者表达风格画像
 *
 * 从博客标题、正文中提取作者的表达风格特征。
 * 纯本地分析，不调用 AI。
 *
 * 用法:
 *   pnpm voice:build   构建风格画像
 */

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  loadEnv,
  writeJson,
  DATA_DIR,
  BLOG_DIR,
} from "./lib/utils.js";
import { extractFrontmatter } from "./lib/frontmatter.js";

// ─── 常量 ─────────────────────────────────────────────────────

const OUTPUT_FILE = join(DATA_DIR, "voice-profile.json");

// ─── 文章收集 ─────────────────────────────────────────────────

interface Post {
  title: string;
  body: string;
  category: string;
  lang: string;
}

async function collectPosts(): Promise<Post[]> {
  const entries = await readdir(BLOG_DIR, { withFileTypes: true });
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
      const lang = relativePath.startsWith("en/") ? "en" : "zh";

      posts.push({
        title: String(fm.data.title),
        body: fm.body,
        category: String(fm.data.category || ""),
        lang,
      });
    }
  }

  return posts;
}

// ─── 标题风格分析 ─────────────────────────────────────────────

function analyzeTitlePatterns(posts: Post[]) {
  const patterns = {
    usesVerticalBar: 0, // "xxx | xxx"
    usesColon: 0, // "xxx:xxx" or "xxx：xxx"
    usesMiddleDot: 0, // "xxx・xxx"
    usesQuestion: 0, // 标题是问句
    usesEmoji: 0,
    usesEnglish: 0, // 中英混用
    usesYear: 0, // 标题带年份
    usesSeriesFormat: 0, // 系列文章
  };

  for (const post of posts) {
    const title = post.title;

    if (title.includes("|") || title.includes("｜")) patterns.usesVerticalBar++;
    if (title.includes(":") || title.includes("：")) patterns.usesColon++;
    if (title.includes("・") || title.includes("·")) patterns.usesMiddleDot++;
    if (/[?？]/.test(title)) patterns.usesQuestion++;
    if (/[\u{1F300}-\u{1F9FF}]/u.test(title)) patterns.usesEmoji++;
    if (/[a-zA-Z]{3,}/.test(title)) patterns.usesEnglish++;
    if (/20\d{2}/.test(title)) patterns.usesYear++;
    if (
      /[壹贰叁肆伍陆柒捌玖拾]|Day\s?\d|Part\s?\d|[（(]\d[）)]/i.test(title)
    ) {
      patterns.usesSeriesFormat++;
    }
  }

  const total = posts.length || 1;

  return {
    total: posts.length,
    patterns,
    style: {
      vertical_bar_rate: Math.round(
        (patterns.usesVerticalBar / total) * 100
      ),
      colon_rate: Math.round((patterns.usesColon / total) * 100),
      question_rate: Math.round((patterns.usesQuestion / total) * 100),
      english_mix_rate: Math.round((patterns.usesEnglish / total) * 100),
      year_in_title_rate: Math.round((patterns.usesYear / total) * 100),
    },
  };
}

// ─── 正文风格分析 ─────────────────────────────────────────────

function analyzeContentPatterns(posts: Post[]) {
  let totalLength = 0;
  let postsWithCode = 0;
  let postsWithLinks = 0;
  let postsWithImages = 0;
  let postsWithHeadings = 0;
  let postsWithLists = 0;
  let postsWithQuotes = 0;

  for (const post of posts) {
    const body = post.body;
    totalLength += body.length;

    if (/```[\s\S]*?```/.test(body)) postsWithCode++;
    if (/\[[^\]]+\]\([^)]+\)/.test(body)) postsWithLinks++;
    if (/!\[[^\]]*\]\([^)]+\)/.test(body)) postsWithImages++;
    if (/^#{1,6}\s/m.test(body)) postsWithHeadings++;
    if (/^[\-\*]\s/m.test(body)) postsWithLists++;
    if (/^>\s/m.test(body)) postsWithQuotes++;
  }

  const total = posts.length || 1;

  return {
    avgLength: Math.round(totalLength / total),
    codeBlockRate: Math.round((postsWithCode / total) * 100),
    linkRate: Math.round((postsWithLinks / total) * 100),
    imageRate: Math.round((postsWithImages / total) * 100),
    headingRate: Math.round((postsWithHeadings / total) * 100),
    listRate: Math.round((postsWithLists / total) * 100),
    quoteRate: Math.round((postsWithQuotes / total) * 100),
  };
}

// ─── 表达习惯提取 ─────────────────────────────────────────────

function extractExpressionHabits(posts: Post[]) {
  const connectors: Record<string, number> = {};

  const connectorPatterns = [
    "其实",
    "说实话",
    "不过",
    "但是",
    "所以",
    "然后",
    "感觉",
    "突然",
    "顺手",
    "顺便",
    "随手",
    "折腾",
    "踩坑",
    "跳坑",
    "体验",
    "分享",
    "推荐",
    "安利",
    "种草",
    "注意",
    "重要",
    "关键",
    "总结",
  ];

  for (const post of posts) {
    const text = `${post.title} ${post.body}`;

    for (const pattern of connectorPatterns) {
      const count = (text.match(new RegExp(pattern, "g")) || []).length;
      if (count > 0) {
        connectors[pattern] = (connectors[pattern] || 0) + count;
      }
    }
  }

  const sortedConnectors = Object.entries(connectors)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 15)
    .map(([word, count]) => ({ word, count }));

  return {
    frequent_expressions: sortedConnectors,
    style_notes: [
      "标题常用竖线分隔格式：「主题 | 标题」",
      "技术类标题直接用英文术语，不强行翻译",
      "生活类标题偏感性，常用问句或感叹",
      "喜欢用「折腾」「踩坑」等口语化表达描述技术探索",
      "分享经验时常用「攻略」「指南」「记」等实用性标题词",
    ],
  };
}

// ─── 分类风格分析 ─────────────────────────────────────────────

function analyzeCategoryStyles(posts: Post[]) {
  const categoryMap = new Map<string, Post[]>();

  for (const post of posts) {
    const cat = post.category || "其他";
    if (!categoryMap.has(cat)) categoryMap.set(cat, []);
    categoryMap.get(cat)!.push(post);
  }

  const categoryStyles: Record<string, { count: number; avgLength: number }> =
    {};

  for (const [cat, catPosts] of categoryMap.entries()) {
    const avgLength =
      catPosts.reduce((sum, p) => sum + p.body.length, 0) / catPosts.length;
    categoryStyles[cat] = {
      count: catPosts.length,
      avgLength: Math.round(avgLength),
    };
  }

  return categoryStyles;
}

// ─── 主流程 ───────────────────────────────────────────────────

async function main() {
  await loadEnv();

  console.log("🎤 构建作者表达风格画像");
  console.log("━".repeat(50));
  console.log("");

  console.log("📂 扫描博客文章...");
  const posts = await collectPosts();
  console.log(`   找到 ${posts.length} 篇文章`);

  const zhPosts = posts.filter((p) => p.lang === "zh");
  const enPosts = posts.filter((p) => p.lang === "en");
  console.log(`   - 中文: ${zhPosts.length} 篇`);
  console.log(`   - 英文: ${enPosts.length} 篇`);

  // 分析各维度
  console.log("\n🔍 分析风格特征...");
  const titleAnalysis = analyzeTitlePatterns(posts);
  const contentAnalysis = analyzeContentPatterns(posts);
  const expressionHabits = extractExpressionHabits(posts);
  const categoryStyles = analyzeCategoryStyles(posts);

  // 构建画像
  const profile = {
    $schema: "voice-profile-v1",
    generatedAt: new Date().toISOString(),
    overall_tone: {
      description:
        "技术博客风格，注重实践与可操作性，语言简洁明了",
      primary_persona: "技术博主",
      communication_style: "先给结论，再补细节",
    },
    blog_title_style: titleAnalysis,
    content_style: contentAnalysis,
    expression_habits: expressionHabits,
    category_styles: categoryStyles,
    style_modes: {
      technical: {
        description: "技术类文章",
        traits: [
          "直接给方案",
          "会提到具体工具和版本",
          "不回避踩过的坑",
          "代码片段简洁",
        ],
      },
      tutorial: {
        description: "教程类文章",
        traits: [
          "步骤清晰",
          "配合截图或代码",
          "注意事项突出",
          "有总结部分",
        ],
      },
      lifestyle: {
        description: "生活类文章",
        traits: ["语气更随意", "偶尔自嘲", "不说教", "分享真实体验"],
      },
    },
  };

  await writeJson(OUTPUT_FILE, profile);

  console.log("\n✅ 风格画像构建完成");
  console.log(`📄 输出文件: ${OUTPUT_FILE}`);
  console.log("\n📊 风格概览:");
  console.log(`   标题竖线分隔率: ${titleAnalysis.style.vertical_bar_rate}%`);
  console.log(`   标题中英混用率: ${titleAnalysis.style.english_mix_rate}%`);
  console.log(`   平均文章长度: ${contentAnalysis.avgLength} 字符`);
  console.log(
    `   高频表达: ${expressionHabits.frequent_expressions
      .slice(0, 5)
      .map((e) => e.word)
      .join("、")}`
  );
}

main().catch((error) => {
  console.error("❌ 构建失败:", error.message);
  process.exit(1);
});
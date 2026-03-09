#!/usr/bin/env npx tsx
/**
 * AI 标签与分类自动生成工具
 *
 * 用法:
 *   pnpm run tools:tags <文章路径>              # 分析并推荐标签和分类
 *   pnpm run tools:tags <文章路径> --write      # 推荐并写入 frontmatter
 *   pnpm run tools:tags --all                    # 分析所有文章（dry-run）
 *
 * 环境变量:
 *   AI_API_KEY / OPENAI_API_KEY（可选，无 key 时使用关键词匹配）
 */

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { extractFrontmatter } from "./lib/frontmatter.js";
import { stripMarkdown } from "./lib/markdown.js";
import {
  getAllPosts,
  getExistingTaxonomy,
  type PostMeta,
} from "./lib/posts.js";
import { chatCompletion, hasAPIKey } from "./lib/ai-provider.js";

interface TagSuggestion {
  tags: string[];
  category: string;
  reasoning: string;
}

const KEYWORD_TAG_MAP: Record<string, string[]> = {
  astro: ["astro"],
  react: ["reactjs"],
  vue: ["vue"],
  next: ["nextjs"],
  tailwind: ["tailwindcss"],
  typescript: ["typescript"],
  javascript: ["javascript"],
  css: ["css"],
  html: ["html"],
  markdown: ["markdown"],
  mdx: ["markdown"],
  api: ["api"],
  database: ["database"],
  docker: ["docker"],
  git: ["git"],
  python: ["python"],
  rust: ["rust"],
  node: ["nodejs"],
  deploy: ["deployment"],
  test: ["testing"],
  performance: ["performance"],
  seo: ["seo"],
  a11y: ["accessibility"],
  ai: ["ai"],
  机器学习: ["ai", "machine-learning"],
  深度学习: ["ai", "deep-learning"],
  大模型: ["ai", "llm"],
};

function localTagSuggestion(
  post: PostMeta,
  existingTags: string[]
): TagSuggestion {
  const text = `${post.title} ${post.description} ${post.body}`.toLowerCase();
  const suggestedTags = new Set<string>();

  for (const [keyword, tags] of Object.entries(KEYWORD_TAG_MAP)) {
    if (text.includes(keyword.toLowerCase())) {
      tags.forEach(t => suggestedTags.add(t));
    }
  }

  for (const tag of existingTags) {
    if (text.includes(tag.toLowerCase()) && !suggestedTags.has(tag)) {
      suggestedTags.add(tag);
    }
  }

  const category = post.category || inferCategory(text);

  return {
    tags: Array.from(suggestedTags).slice(0, 6),
    category,
    reasoning: "基于关键词匹配（本地模式，无需 API Key）",
  };
}

function inferCategory(text: string): string {
  if (
    text.includes("教程") ||
    text.includes("tutorial") ||
    text.includes("how to")
  )
    return "教程";
  if (text.includes("配置") || text.includes("config")) return "教程/配置";
  if (text.includes("发布") || text.includes("release")) return "发布";
  if (
    text.includes("示例") ||
    text.includes("example") ||
    text.includes("showcase")
  )
    return "示例";
  return "技术";
}

async function aiTagSuggestion(
  post: PostMeta,
  existingTags: string[],
  existingCategories: string[]
): Promise<TagSuggestion> {
  const contentPreview = post.body.slice(0, 3000);

  const prompt = `分析以下博客文章，推荐合适的标签和分类。

文章标题: ${post.title}
文章描述: ${post.description}
正文摘要: ${contentPreview}

现有标签体系: ${existingTags.join(", ")}
现有分类体系: ${existingCategories.join(", ")}

请优先使用现有标签和分类以保持一致性。如果确实需要新标签也可以。

回复 JSON 格式:
{
  "tags": ["tag1", "tag2", "tag3"],
  "category": "分类名",
  "reasoning": "推荐理由简述"
}`;

  const result = await chatCompletion(
    [
      {
        role: "system",
        content:
          "你是一个技术博客编辑，擅长内容分类。只回复 JSON，不要其他文字。",
      },
      { role: "user", content: prompt },
    ],
    { maxTokens: 200, responseFormat: "json" }
  );

  return JSON.parse(result) as TagSuggestion;
}

async function main() {
  const args = process.argv.slice(2);
  const all = args.includes("--all");
  const write = args.includes("--write");
  const filePath = args.find(a => !a.startsWith("--"));

  const allPosts = await getAllPosts();
  const { tags: existingTags, categories: existingCategories } =
    getExistingTaxonomy(allPosts);

  console.log(
    `📊 现有标签 (${existingTags.length}): ${existingTags.slice(0, 15).join(", ")}...`
  );
  console.log(
    `📁 现有分类 (${existingCategories.length}): ${existingCategories.join(", ")}\n`
  );

  const postsToAnalyze: PostMeta[] = [];

  if (all) {
    postsToAnalyze.push(...allPosts);
  } else if (filePath) {
    const fullPath = join(process.cwd(), filePath);
    const content = await readFile(fullPath, "utf-8");
    const fm = extractFrontmatter(content);

    postsToAnalyze.push({
      id: filePath,
      filePath: fullPath,
      lang: "zh",
      title: (fm.data.title as string) || "",
      description: (fm.data.description as string) || "",
      tags: Array.isArray(fm.data.tags) ? (fm.data.tags as string[]) : [],
      category: (fm.data.category as string) || "",
      body: stripMarkdown(content),
    });
  } else {
    console.error(
      "用法: pnpm run tools:tags <文章路径> [--write] 或 pnpm run tools:tags --all"
    );
    process.exit(1);
  }

  const mode = hasAPIKey() ? "AI" : "关键词匹配";
  console.log(
    `🔍 使用 ${mode} 模式分析 ${postsToAnalyze.length} 篇文章...\n`
  );

  for (const post of postsToAnalyze) {
    let suggestion: TagSuggestion;

    try {
      if (hasAPIKey()) {
        suggestion = await aiTagSuggestion(
          post,
          existingTags,
          existingCategories
        );
      } else {
        suggestion = localTagSuggestion(post, existingTags);
      }
    } catch (err) {
      console.error(
        `❌ 分析失败 [${post.title}]:`,
        (err as Error).message
      );
      continue;
    }

    console.log(`📝 【${post.title}】`);
    console.log(`   当前标签: [${post.tags.join(", ")}]`);
    console.log(`   推荐标签: [${suggestion.tags.join(", ")}]`);
    console.log(`   当前分类: ${post.category || "(无)"}`);
    console.log(`   推荐分类: ${suggestion.category}`);
    console.log(`   理由: ${suggestion.reasoning}\n`);

    if (write && !all) {
      const content = await readFile(post.filePath, "utf-8");
      let newContent = content;

      const tagsYaml = suggestion.tags.map(t => `  - ${t}`).join("\n");
      newContent = newContent.replace(
        /^tags:\n((?:\s+-\s+.*\n)*)/m,
        `tags:\n${tagsYaml}\n`
      );

      if (post.category) {
        newContent = newContent.replace(
          /^category:.*$/m,
          `category: ${suggestion.category}`
        );
      } else {
        newContent = newContent.replace(
          /^(tags:\n(?:\s+-\s+.*\n)*)/,
          `$1category: ${suggestion.category}\n`
        );
      }

      await writeFile(post.filePath, newContent, "utf-8");
      console.log(`   ✍️  已更新 frontmatter\n`);
    }
  }
}

main().catch(console.error);

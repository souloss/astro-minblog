#!/usr/bin/env npx tsx
/**
 * AI 辅助写作 - 关联文章数据生成
 * 基于文章标题和标签，生成 related 字段建议
 * 用法: pnpm run tools:generate-related
 */

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const BLOG_PATH = join(process.cwd(), "src/data/blog");

interface PostMeta {
  filePath: string;
  title: string;
  tags: string[];
  description: string;
}

function extractFrontmatter(content: string): Record<string, unknown> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const frontmatter: Record<string, unknown> = {};
  const lines = match[1].split("\n");

  for (const line of lines) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    let value: unknown = line.slice(colonIndex + 1).trim();

    if (value === "true") value = true;
    else if (value === "false") value = false;
    else if (typeof value === "string" && value.startsWith("[")) {
      try {
        value = JSON.parse(value.replace(/'/g, '"'));
      } catch {
        // keep as string
      }
    }

    frontmatter[key] = value;
  }

  return frontmatter;
}

async function getAllPosts(): Promise<PostMeta[]> {
  const posts: PostMeta[] = [];

  async function walk(dir: string) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith("_")) {
        await walk(fullPath);
      } else if (entry.name.endsWith(".md") || entry.name.endsWith(".mdx")) {
        const content = await readFile(fullPath, "utf-8");
        const fm = extractFrontmatter(content);
        if (fm.draft) continue;

        posts.push({
          filePath: fullPath.replace(process.cwd() + "/", ""),
          title: (fm.title as string) || "",
          tags: (fm.tags as string[]) || [],
          description: (fm.description as string) || "",
        });
      }
    }
  }

  await walk(BLOG_PATH);
  return posts;
}

function similarity(a: PostMeta, b: PostMeta): number {
  let score = 0;
  const aTags = new Set(a.tags.map(t => t.toLowerCase()));
  const bTags = new Set(b.tags.map(t => t.toLowerCase()));

  for (const tag of aTags) {
    if (bTags.has(tag)) score += 2;
  }

  const aWords = new Set(a.title.toLowerCase().split(/\s+/));
  const bWords = new Set(b.title.toLowerCase().split(/\s+/));
  for (const w of aWords) {
    if (w.length > 2 && bWords.has(w)) score += 1;
  }

  return score;
}

async function main() {
  const posts = await getAllPosts();
  console.log(`共 ${posts.length} 篇文章\n`);

  for (const post of posts.slice(0, 5)) {
    const scores = posts
      .filter(p => p.filePath !== post.filePath)
      .map(p => ({ post: p, score: similarity(post, p) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    console.log(`【${post.title}】`);
    console.log("  推荐关联:", scores.map(s => s.post.title).join(", "));
    console.log("");
  }
}

main().catch(console.error);

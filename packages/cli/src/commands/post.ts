import { existsSync } from "node:fs";
import { join } from "node:path";

export async function postCommand(args: string[]): Promise<void> {
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(`
Manage blog posts

Usage:
  astro-minimax post <subcommand> [options]

Subcommands:
  new <title>       Create a new blog post
  list              List all posts
  stats             Show post statistics

Options for "new":
  --lang=<zh|en>        Post language (default: zh)
  --category=<path>     Category path (e.g., "Tutorial/Frontend")

Description:
  The "new" subcommand creates a markdown file with proper frontmatter
  in the correct language directory (src/data/blog/<lang>/).

Examples:
  astro-minimax post new "Hello World"
  astro-minimax post new "Getting Started" --lang=en
  astro-minimax post new "Tutorial" --category="Tutorial/Frontend"
  astro-minimax post list
  astro-minimax post stats
`);
    return;
  }

  const subcommand = args[0];
  const subArgs = args.slice(1);

  const contentDir = join(process.cwd(), "src", "data", "blog");
  if (!existsSync(contentDir)) {
    console.error("Error: Not in an astro-minimax blog directory.");
    console.error("Run this command from your blog's root directory.");
    process.exit(1);
  }

  switch (subcommand) {
    case "new":
      await createNewPost(subArgs);
      break;
    case "list":
      await listPosts();
      break;
    case "stats":
      await showStats();
      break;
    default:
      console.error(`Unknown subcommand: ${subcommand}`);
      console.error("Available: new, list, stats");
      process.exit(1);
  }
}

async function createNewPost(args: string[]): Promise<void> {
  if (args.length === 0 || args[0].startsWith("--")) {
    console.error("Error: Post title is required.");
    console.error('Usage: astro-minimax post new "<title>"');
    process.exit(1);
  }

  const title = args.find((a) => !a.startsWith("--")) || "";
  const langArg = args.find((a) => a.startsWith("--lang="));
  const categoryArg = args.find((a) => a.startsWith("--category="));

  const lang = langArg ? langArg.split("=")[1] : "zh";
  const category = categoryArg ? categoryArg.split("=")[1] : "Blog";

  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-|-$/g, "");

  const now = new Date().toISOString();
  const frontmatter = `---
title: "${title.replace(/"/g, '\\"')}"
pubDatetime: ${now}
modDatetime: ${now}
description: "${title.replace(/"/g, '\\"')}"
category: ${category}
tags:
  - draft
draft: false
---

# ${title}

Write your content here...
`;

  const { writeFile, mkdir } = await import("node:fs/promises");
  const postDir = join(process.cwd(), "src", "data", "blog", lang);
  const postPath = join(postDir, `${slug}.md`);

  await mkdir(postDir, { recursive: true });
  await writeFile(postPath, frontmatter);

  console.log(`\n  ✅ Created: ${postPath}\n`);
  console.log(`  Title:    ${title}`);
  console.log(`  Language: ${lang}`);
  console.log(`  Category: ${category}\n`);
}

interface PostInfo {
  title: string;
  date: string;
  draft: boolean;
  filePath: string;
  relativePath: string;
}

async function collectMarkdownFiles(dir: string): Promise<string[]> {
  const { readdir } = await import("node:fs/promises");
  const files: string[] = [];

  async function walk(d: string) {
    if (!existsSync(d)) return;
    const entries = await readdir(d, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(d, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith("_")) {
        await walk(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith(".md") || entry.name.endsWith(".mdx"))) {
        files.push(fullPath);
      }
    }
  }

  await walk(dir);
  return files;
}

function parseTitle(content: string, fallback: string): string {
  const m = content.match(/^title:\s*(?:["'](.+?)["']|(.+))$/m);
  return m?.[1] ?? m?.[2]?.trim() ?? fallback;
}

function parseDate(content: string): string {
  const m = content.match(/^(?:pubDatetime|date):\s*(.+)$/m);
  if (!m) return "";
  try {
    return new Date(m[1].trim()).toISOString().slice(0, 10);
  } catch {
    return m[1].trim().slice(0, 10);
  }
}

function isDraft(content: string): boolean {
  return /^draft:\s*true$/m.test(content);
}

async function getPostInfos(langDir: string, lang: string): Promise<PostInfo[]> {
  const { readFile } = await import("node:fs/promises");
  const files = await collectMarkdownFiles(langDir);
  const posts: PostInfo[] = [];

  for (const filePath of files) {
    const content = await readFile(filePath, "utf-8");
    const relativePath = filePath.replace(langDir + "/", "");
    posts.push({
      title: parseTitle(content, relativePath),
      date: parseDate(content),
      draft: isDraft(content),
      filePath,
      relativePath,
    });
  }

  posts.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  return posts;
}

async function listPosts(): Promise<void> {
  const blogDir = join(process.cwd(), "src", "data", "blog");
  const zhDir = join(blogDir, "zh");
  const enDir = join(blogDir, "en");

  console.log("\n  Blog Posts\n");

  for (const [lang, dir] of [["zh", zhDir], ["en", enDir]] as const) {
    if (!existsSync(dir)) continue;

    const posts = await getPostInfos(dir, lang);
    const published = posts.filter(p => !p.draft);
    const drafts = posts.filter(p => p.draft);

    console.log(`  [${ lang === "zh" ? "中文" : "English" }] ${published.length} published${drafts.length ? `, ${drafts.length} draft(s)` : ""}`);
    console.log(`  ${"─".repeat(50)}`);

    for (const post of published) {
      const dateStr = post.date ? `${post.date} ` : "";
      console.log(`    ${dateStr} ${post.title}`);
    }

    if (drafts.length) {
      console.log(`\n    Drafts:`);
      for (const post of drafts) {
        console.log(`    ✏️  ${post.title}`);
      }
    }

    console.log();
  }
}

async function showStats(): Promise<void> {
  const blogDir = join(process.cwd(), "src", "data", "blog");
  const zhDir = join(blogDir, "zh");
  const enDir = join(blogDir, "en");

  const zhPosts = existsSync(zhDir) ? await collectMarkdownFiles(zhDir) : [];
  const enPosts = existsSync(enDir) ? await collectMarkdownFiles(enDir) : [];

  console.log("\n  Post Statistics\n");
  console.log(`  Chinese (zh):  ${zhPosts.length}`);
  console.log(`  English (en):  ${enPosts.length}`);
  console.log(`  Total:         ${zhPosts.length + enPosts.length}\n`);
}

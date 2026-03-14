/**
 * 博客文章读取与遍历工具
 */

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { extractFrontmatter } from "./frontmatter.js";
import { stripMarkdown } from "./markdown.js";

export const BLOG_PATH = join(process.cwd(), "src/data/blog");

export interface PostMeta {
  id: string;
  filePath: string;
  lang: string;
  title: string;
  description: string;
  tags: string[];
  category: string;
  body: string;
  draft?: boolean;
}

export async function getAllPosts(opts?: {
  includeDrafts?: boolean;
  stripBody?: boolean;
}): Promise<PostMeta[]> {
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
        const isDraft = fm.data.draft === true;

        if (isDraft && !opts?.includeDrafts) continue;

        const relativePath = fullPath.replace(BLOG_PATH + "/", "");
        const lang = relativePath.startsWith("en/") ? "en" : "zh";
        const id = relativePath.replace(/\.(md|mdx)$/, "");

        posts.push({
          id,
          filePath: fullPath,
          lang,
          title: (fm.data.title as string) || "",
          description: (fm.data.description as string) || "",
          tags: Array.isArray(fm.data.tags) ? (fm.data.tags as string[]) : [],
          category: (fm.data.category as string) || "",
          body: opts?.stripBody === false ? fm.body : stripMarkdown(content),
          draft: isDraft,
        });
      }
    }
  }

  await walk(BLOG_PATH);
  return posts;
}

export function getExistingTaxonomy(posts: PostMeta[]): {
  tags: string[];
  categories: string[];
} {
  const tagSet = new Set<string>();
  const catSet = new Set<string>();

  for (const post of posts) {
    post.tags.forEach(t => tagSet.add(t));
    if (post.category) catSet.add(post.category);
  }

  return {
    tags: Array.from(tagSet).sort(),
    categories: Array.from(catSet).sort(),
  };
}

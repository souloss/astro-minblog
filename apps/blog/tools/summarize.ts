#!/usr/bin/env npx tsx
/**
 * AI 辅助写作 - 文章摘要生成
 *
 * 用法:
 *   pnpm run tools:summarize <文章路径>                # 为单篇文章生成摘要
 *   pnpm run tools:summarize <文章路径> --write        # 生成并写入 frontmatter
 *   pnpm run tools:summarize --all                      # 分析所有缺少 description 的文章
 *   pnpm run tools:summarize --all --dry-run            # 预览所有推荐但不写入
 *   pnpm run tools:summarize --all --write              # 批量生成并写入
 *
 * 环境变量:
 *   AI_API_KEY / OPENAI_API_KEY（可选，无 key 时使用前 200 字摘录）
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  extractFrontmatter,
  updateFrontmatterField,
} from "./lib/frontmatter.js";
import { stripMarkdown } from "./lib/markdown.js";
import { getAllPosts } from "./lib/posts.js";
import { chatCompletion, hasAPIKey } from "./lib/ai-provider.js";
import { writeFile } from "node:fs/promises";

async function generateSummary(
  content: string,
  title: string
): Promise<string> {
  if (!hasAPIKey()) {
    return content.replace(/\n+/g, " ").slice(0, 200).trim() + "...";
  }

  try {
    return await chatCompletion(
      [
        {
          role: "system",
          content:
            "你是一个技术博客编辑，擅长撰写简洁的文章摘要。根据文章内容生成 100-150 字的摘要，要求准确概括核心内容。使用与文章相同的语言。",
        },
        {
          role: "user",
          content: `文章标题: ${title}\n\n正文:\n${content.slice(0, 4000)}`,
        },
      ],
      { maxTokens: 200 }
    );
  } catch (err) {
    console.error("  摘要生成失败:", (err as Error).message);
    return content.replace(/\n+/g, " ").slice(0, 200).trim() + "...";
  }
}

async function main() {
  const args = process.argv.slice(2);
  const all = args.includes("--all");
  const dryRun = args.includes("--dry-run");
  const write = args.includes("--write");
  const filePath = args.find(a => !a.startsWith("--"));

  const mode = hasAPIKey() ? "AI" : "文本摘录";
  console.log(`📝 摘要生成模式: ${mode}\n`);

  if (all) {
    const allPosts = await getAllPosts();
    const needsSummary = allPosts.filter(
      p => !p.description || p.description.length < 10
    );

    console.log(
      `📚 共 ${allPosts.length} 篇文章，${needsSummary.length} 篇需要摘要\n`
    );

    if (needsSummary.length === 0) {
      console.log("✅ 所有文章都已有摘要！");
      return;
    }

    for (const post of needsSummary) {
      const relativePath = post.filePath.replace(process.cwd() + "/", "");
      console.log(`📄 ${relativePath}`);
      console.log(`   标题: ${post.title}`);

      const summary = await generateSummary(post.body, post.title);
      console.log(
        `   摘要: ${summary.slice(0, 100)}${summary.length > 100 ? "..." : ""}`
      );

      if (write && !dryRun) {
        const content = await readFile(post.filePath, "utf-8");
        const newContent = updateFrontmatterField(
          content,
          "description",
          JSON.stringify(summary)
        );
        await writeFile(post.filePath, newContent, "utf-8");
        console.log(`   ✍️  已写入 frontmatter`);
      } else if (dryRun) {
        console.log(`   (dry-run 模式，未写入)`);
      }

      console.log("");
      if (hasAPIKey()) await new Promise(r => setTimeout(r, 500));
    }

    console.log(`✅ 完成！处理了 ${needsSummary.length} 篇文章`);
  } else if (filePath) {
    const fullPath = join(process.cwd(), filePath);
    const content = await readFile(fullPath, "utf-8");
    const fm = extractFrontmatter(content);
    const body = stripMarkdown(content);
    const title = (fm.data.title as string) || "";

    console.log(`📄 文件: ${filePath}`);
    console.log(`   标题: ${title}`);
    console.log(`   当前摘要: ${(fm.data.description as string) || "(无)"}\n`);

    const summary = await generateSummary(body, title);
    console.log(`🔍 生成的摘要:\n   ${summary}\n`);

    if (write) {
      const newContent = updateFrontmatterField(
        content,
        "description",
        JSON.stringify(summary)
      );
      await writeFile(fullPath, newContent, "utf-8");
      console.log(`✍️  已写入 frontmatter`);
    } else {
      console.log(`💡 使用 --write 参数写入 frontmatter`);
    }
  } else {
    console.error("用法:");
    console.error("  pnpm run tools:summarize <文章路径> [--write]");
    console.error("  pnpm run tools:summarize --all [--dry-run] [--write]");
    process.exit(1);
  }
}

main().catch(console.error);

#!/usr/bin/env npx tsx
/**
 * 多语言翻译工具 - 将文章翻译为目标语言
 *
 * 用法:
 *   pnpm run tools:translate <源文件> [目标语言]
 *   示例: pnpm run tools:translate src/data/blog/zh/post.md en
 *
 * 环境变量:
 *   AI_API_KEY / OPENAI_API_KEY — API key
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname, basename, join } from "node:path";
import { chatCompletion } from "./lib/ai-provider.js";

async function main() {
  const args = process.argv.slice(2);
  const filePath = args[0];
  const targetLang = args[1] || "en";

  if (!filePath) {
    console.error("用法: pnpm run tools:translate <源文件> [目标语言]");
    process.exit(1);
  }

  const fullPath = resolve(process.cwd(), filePath);
  const content = await readFile(fullPath, "utf-8");

  const langName =
    targetLang === "en" ? "英文" : targetLang === "zh" ? "中文" : targetLang;

  console.log(`🌐 翻译为 ${langName}...`);

  const translated = await chatCompletion(
    [
      {
        role: "system",
        content: `你是一个专业的技术文档翻译。将内容翻译为${langName}，保持 Markdown 格式和 frontmatter 结构。只输出翻译结果。`,
      },
      { role: "user", content },
    ],
    { maxTokens: 4000 }
  );

  const outDir = dirname(fullPath)
    .replace(/\/zh\/?$/, `/${targetLang}`)
    .replace(/\/en\/?$/, `/${targetLang}`);
  const outPath = join(outDir, basename(fullPath));

  await mkdir(outDir, { recursive: true });
  await writeFile(outPath, translated, "utf-8");

  console.log(`✅ 已翻译并保存到: ${outPath}`);
}

main().catch(err => {
  console.error("❌ 错误:", err.message || err);
  process.exit(1);
});

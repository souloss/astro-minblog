#!/usr/bin/env npx tsx
/**
 * 多语言翻译工具 - 将文章翻译为目标语言
 * 用法: pnpm run tools:translate <源文件> [目标语言]
 * 示例: pnpm run tools:translate src/data/blog/zh/post.md en
 * 需要设置 OPENAI_API_KEY 环境变量
 */

const args = process.argv.slice(2);
const filePath = args[0];
const targetLang = args[1] || "en";

if (!filePath) {
  console.error("用法: pnpm run tools:translate <源文件> [目标语言]");
  process.exit(1);
}

async function translate(content: string, target: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("请设置 OPENAI_API_KEY 环境变量");
    process.exit(1);
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `你是一个专业的技术文档翻译。将内容翻译为${target === "en" ? "英文" : target === "zh" ? "中文" : target}，保持 Markdown 格式和 frontmatter 结构。只输出翻译结果。`,
        },
        {
          role: "user",
          content,
        },
      ],
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    throw new Error(`API 错误: ${response.status} ${await response.text()}`);
  }

  const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content?.trim() || "";
}

async function main() {
  const fs = await import("node:fs/promises");
  const path = await import("node:path");

  const fullPath = path.resolve(process.cwd(), filePath);
  const content = await fs.readFile(fullPath, "utf-8");

  const translated = await translate(content, targetLang);

  const outDir = path.dirname(fullPath).replace(/\/zh\/?$/, "/en").replace(/\/en\/?$/, "/zh");
  const outPath = path.join(outDir, path.basename(fullPath));

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, translated, "utf-8");

  console.log(`已翻译并保存到: ${outPath}`);
}

main().catch(console.error);

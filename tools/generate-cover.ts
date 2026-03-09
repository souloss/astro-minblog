#!/usr/bin/env npx tsx
/**
 * AI 封面图生成工具
 *
 * 用法:
 *   pnpm run tools:cover <文章路径>                    # 生成封面图
 *   pnpm run tools:cover <文章路径> --write            # 生成并写入 frontmatter
 *   pnpm run tools:cover <文章路径> --style <风格>     # 指定风格 (abstract|minimal|tech|illustration)
 *
 * 环境变量:
 *   AI_API_KEY / OPENAI_API_KEY — API key
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, basename } from "node:path";
import { extractFrontmatter } from "./lib/frontmatter.js";
import { generateImage } from "./lib/ai-provider.js";

const COVERS_DIR = join(process.cwd(), "src/assets/covers");

interface GenerateOptions {
  filePath: string;
  style: string;
  write: boolean;
}

function parseArgs(): GenerateOptions {
  const args = process.argv.slice(2);
  const filePath = args.find(a => !a.startsWith("--"));
  const style = args.includes("--style")
    ? args[args.indexOf("--style") + 1] || "abstract"
    : "abstract";
  const write = args.includes("--write");

  if (!filePath) {
    console.error(
      "用法: pnpm run tools:cover <文章路径> [--write] [--style abstract|minimal|tech|illustration]"
    );
    process.exit(1);
  }

  return { filePath, style, write };
}

const STYLE_PROMPTS: Record<string, string> = {
  abstract:
    "Create an abstract, modern cover image with geometric shapes, gradients and soft lighting. The composition should feel clean, professional and tech-oriented.",
  minimal:
    "Create a minimalist cover image with plenty of negative space, subtle textures and a refined color palette. Simple, elegant composition.",
  tech: "Create a technology-themed cover image with digital elements like circuit patterns, code fragments, data visualizations. Modern and futuristic.",
  illustration:
    "Create a flat illustration style cover image with bold colors and simplified shapes. Friendly and approachable design.",
};

function generateFileName(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[\u4e00-\u9fff]/g, m => m)
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
  return `cover-${slug}-${Date.now().toString(36)}.png`;
}

async function main() {
  const { filePath, style, write } = parseArgs();

  const fullPath = join(process.cwd(), filePath);
  const content = await readFile(fullPath, "utf-8");
  const { data } = extractFrontmatter(content);

  const title = (data.title as string) || basename(filePath, ".md");
  const description = (data.description as string) || "";

  if (data.ogImage && !write) {
    console.log(`⚠️  文章已有 ogImage: ${data.ogImage}`);
    console.log(`   使用 --write 强制覆盖\n`);
  }

  const stylePrompt = STYLE_PROMPTS[style] || STYLE_PROMPTS.abstract;
  const prompt = `${stylePrompt}\n\nThis is for a blog post titled: "${title}"\nDescription: "${description}"\n\nDo NOT include any text, letters, numbers or words in the image. Pure visual design only. Aspect ratio: 16:9, high quality.`;

  console.log(`🎨 生成封面图...`);
  console.log(`   风格: ${style}`);
  console.log(`   标题: ${title}\n`);

  const imageBuffer = await generateImage(prompt);

  await mkdir(COVERS_DIR, { recursive: true });
  const fileName = generateFileName(title);
  const outputPath = join(COVERS_DIR, fileName);
  await writeFile(outputPath, imageBuffer);

  const relativePath = `../../../assets/covers/${fileName}`;
  console.log(`\n✅ 封面图已生成: ${outputPath}`);
  console.log(`   相对路径 (用于 frontmatter): ${relativePath}`);

  if (write) {
    const ogImageLine = `ogImage: ${relativePath}`;

    let newContent: string;
    if (data.ogImage) {
      newContent = content.replace(/^ogImage:.*$/m, ogImageLine);
    } else {
      const lines = content.split("\n");
      const closingIdx = lines.indexOf("---", 1);
      if (closingIdx > 0) {
        lines.splice(closingIdx, 0, ogImageLine);
      }
      newContent = lines.join("\n");
    }

    await writeFile(fullPath, newContent, "utf-8");
    console.log(`   ✍️  已更新 frontmatter ogImage 字段`);
  } else {
    console.log(`\n💡 添加到 frontmatter:\n   ogImage: ${relativePath}`);
  }
}

main().catch(err => {
  console.error("❌ 错误:", err.message || err);
  process.exit(1);
});

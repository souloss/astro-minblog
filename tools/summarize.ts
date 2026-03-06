#!/usr/bin/env npx tsx
/**
 * AI 辅助写作 - 文章摘要生成
 * 用法: pnpm run tools:summarize <文章路径>
 * 需要设置 OPENAI_API_KEY 或 ANTHROPIC_API_KEY 环境变量
 */

(async () => {
  const args = process.argv.slice(2);
  const filePath = args[0];

  if (!filePath) {
    console.error("用法: pnpm run tools:summarize <文章路径>");
    process.exit(1);
  }

  async function generateSummary(content: string): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.warn("未设置 OPENAI_API_KEY 或 ANTHROPIC_API_KEY，返回前 200 字作为占位摘要");
      return content.slice(0, 200).replace(/#{1,6}\s/g, "").trim() + "...";
    }

    try {
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
              content: "你是一个技术博客编辑，擅长撰写简洁的摘要。用中文回复。",
            },
            {
              role: "user",
              content: `请为以下文章生成 100-150 字的摘要：\n\n${content.slice(0, 4000)}`,
            },
          ],
          max_tokens: 200,
        }),
      });

      if (!response.ok) {
        throw new Error(`API 错误: ${response.status}`);
      }

      const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
      return data.choices?.[0]?.message?.content?.trim() || "";
    } catch (err) {
      console.error("摘要生成失败:", err);
      return content.slice(0, 200).replace(/#{1,6}\s/g, "").trim() + "...";
    }
  }

  const fs = await import("node:fs/promises");
  const path = await import("node:path");

  const fullPath = path.resolve(process.cwd(), filePath);
  const content = await fs.readFile(fullPath, "utf-8");

  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  const body = frontmatterMatch ? content.slice(frontmatterMatch[0].length) : content;

  const summary = await generateSummary(body);
  console.log("生成的摘要:\n", summary);
})().catch(console.error);
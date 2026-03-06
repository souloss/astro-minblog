/**
 * AI Article Summarizer
 * Generates summaries for blog posts using OpenAI-compatible API.
 *
 * Usage: npx tsx tools/summarize.ts [--file <path>] [--all]
 *
 * Environment variables:
 *   AI_API_KEY   - API key for the AI service
 *   AI_BASE_URL  - Base URL for OpenAI-compatible API (default: https://api.openai.com/v1)
 *   AI_MODEL     - Model to use (default: gpt-4o-mini)
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";

const BLOG_DIR = "src/data/blog";

interface SummarizeOptions {
  file?: string;
  all?: boolean;
}

function parseArgs(): SummarizeOptions {
  const args = process.argv.slice(2);
  const opts: SummarizeOptions = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--file" && args[i + 1]) {
      opts.file = args[++i];
    } else if (args[i] === "--all") {
      opts.all = true;
    }
  }

  return opts;
}

function extractFrontmatter(content: string): {
  frontmatter: string;
  body: string;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { frontmatter: "", body: content };
  return { frontmatter: match[1], body: match[2] };
}

function getMarkdownFiles(dir: string): string[] {
  const files: string[] = [];

  function walk(d: string) {
    const entries = readdirSync(d);
    for (const entry of entries) {
      const fullPath = join(d, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory() && !entry.startsWith("_")) {
        walk(fullPath);
      } else if ([".md", ".mdx"].includes(extname(entry))) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

async function summarize(content: string): Promise<string> {
  const apiKey = process.env.AI_API_KEY;
  const baseUrl = process.env.AI_BASE_URL || "https://api.openai.com/v1";
  const model = process.env.AI_MODEL || "gpt-4o-mini";

  if (!apiKey) {
    throw new Error(
      "AI_API_KEY environment variable is required. Set it before running."
    );
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are a technical blog summarizer. Generate a concise 1-2 sentence summary of the given article in the same language as the content. Focus on the key technical points.",
        },
        {
          role: "user",
          content: `Summarize this article:\n\n${content.slice(0, 4000)}`,
        },
      ],
      max_tokens: 200,
    }),
  });

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  return data.choices[0]?.message?.content?.trim() || "";
}

async function processFile(filePath: string) {
  const content = readFileSync(filePath, "utf-8");
  const { frontmatter, body } = extractFrontmatter(content);

  if (!body.trim()) {
    console.log(`  Skipping (empty body): ${filePath}`);
    return;
  }

  console.log(`  Processing: ${filePath}`);
  const summary = await summarize(body);

  if (summary && !frontmatter.includes("description:")) {
    const newContent = `---\n${frontmatter}\ndescription: "${summary.replace(/"/g, '\\"')}"\n---\n${body}`;
    writeFileSync(filePath, newContent, "utf-8");
    console.log(`  Updated with summary: ${summary.slice(0, 80)}...`);
  } else {
    console.log(`  Summary: ${summary}`);
  }
}

async function main() {
  const opts = parseArgs();

  if (opts.file) {
    await processFile(opts.file);
  } else if (opts.all) {
    const files = getMarkdownFiles(BLOG_DIR);
    console.log(`Found ${files.length} markdown files`);
    for (const file of files) {
      await processFile(file);
    }
  } else {
    console.log("Usage: npx tsx tools/summarize.ts [--file <path>] [--all]");
    console.log("\nOptions:");
    console.log("  --file <path>  Process a single file");
    console.log("  --all          Process all blog posts");
    console.log("\nEnvironment:");
    console.log("  AI_API_KEY     Required. API key for AI service");
    console.log("  AI_BASE_URL    API base URL (default: OpenAI)");
    console.log("  AI_MODEL       Model name (default: gpt-4o-mini)");
  }
}

main().catch(console.error);

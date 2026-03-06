/**
 * AI Article Translator
 * Translates blog posts between languages using OpenAI-compatible API.
 *
 * Usage: npx tsx tools/translate.ts --file <path> --to <lang>
 *
 * Environment variables:
 *   AI_API_KEY   - API key for the AI service
 *   AI_BASE_URL  - Base URL for OpenAI-compatible API (default: https://api.openai.com/v1)
 *   AI_MODEL     - Model to use (default: gpt-4o-mini)
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, basename, dirname } from "path";

const LANG_NAMES: Record<string, string> = {
  zh: "Chinese (Simplified)",
  en: "English",
  ja: "Japanese",
  ko: "Korean",
};

interface TranslateOptions {
  file?: string;
  to?: string;
}

function parseArgs(): TranslateOptions {
  const args = process.argv.slice(2);
  const opts: TranslateOptions = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--file" && args[i + 1]) {
      opts.file = args[++i];
    } else if (args[i] === "--to" && args[i + 1]) {
      opts.to = args[++i];
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

async function translate(
  content: string,
  targetLang: string
): Promise<string> {
  const apiKey = process.env.AI_API_KEY;
  const baseUrl = process.env.AI_BASE_URL || "https://api.openai.com/v1";
  const model = process.env.AI_MODEL || "gpt-4o-mini";

  if (!apiKey) {
    throw new Error("AI_API_KEY environment variable is required.");
  }

  const langName = LANG_NAMES[targetLang] || targetLang;

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
          content: `You are a professional technical translator. Translate the given Markdown content to ${langName}. Preserve all Markdown formatting, code blocks, frontmatter YAML, links, and HTML tags exactly. Only translate natural language text. Do not translate code, URLs, or technical identifiers.`,
        },
        {
          role: "user",
          content,
        },
      ],
      max_tokens: 8000,
    }),
  });

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  return data.choices[0]?.message?.content?.trim() || "";
}

async function main() {
  const opts = parseArgs();

  if (!opts.file || !opts.to) {
    console.log("Usage: npx tsx tools/translate.ts --file <path> --to <lang>");
    console.log("\nOptions:");
    console.log("  --file <path>  Source markdown file");
    console.log("  --to <lang>    Target language (zh, en, ja, ko)");
    console.log("\nExample:");
    console.log(
      "  npx tsx tools/translate.ts --file src/data/blog/my-post.md --to en"
    );
    return;
  }

  const content = readFileSync(opts.file, "utf-8");
  const { frontmatter, body } = extractFrontmatter(content);

  console.log(`Translating ${opts.file} to ${opts.to}...`);

  const translatedBody = await translate(body, opts.to);

  const updatedFrontmatter = frontmatter
    .replace(/lang:\s*\w+/, `lang: ${opts.to}`)
    .replace(/lang: \w+/, `lang: ${opts.to}`);

  const finalFrontmatter = updatedFrontmatter.includes("lang:")
    ? updatedFrontmatter
    : `${updatedFrontmatter}\nlang: ${opts.to}`;

  const outputDir = join(dirname(opts.file), "..", opts.to);
  mkdirSync(outputDir, { recursive: true });
  const outputPath = join(outputDir, basename(opts.file));

  writeFileSync(
    outputPath,
    `---\n${finalFrontmatter}\n---\n${translatedBody}`,
    "utf-8"
  );
  console.log(`Translated file saved to: ${outputPath}`);
}

main().catch(console.error);

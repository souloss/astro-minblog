import { existsSync } from "node:fs";
import { join } from "node:path";
import { runTool } from "./run-tool.js";
import { handleProfileCommand } from "./profile.js";
import { handleFactsCommand } from "./facts.js";
import { handleExtensionsCommand } from "./extensions.js";

export async function aiCommand(args: string[]): Promise<void> {
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    printMainHelp();
    return;
  }

  const subcommand = args[0];
  const subArgs = args.slice(1);

  const blogDir = process.cwd();
  const contentDir = join(blogDir, "src", "data", "blog");
  const datasDir = join(blogDir, "datas");

  const needsBlogDir = ["process", "seo", "summary", "eval", "profile", "facts"];
  if (needsBlogDir.includes(subcommand) && !existsSync(contentDir)) {
    console.error("Error: Not in an astro-minimax blog directory.");
    console.error("Run this command from your blog's root directory.");
    process.exit(1);
  }

  switch (subcommand) {
    case "process":
    case "seo":
    case "summary":
    case "eval":
      await handleToolCommand(subcommand, subArgs, blogDir);
      break;
    case "profile":
      await handleProfileCommand(subArgs, blogDir, datasDir);
      break;
    case "facts":
      await handleFactsCommand(subArgs, blogDir, datasDir);
      break;
    case "extensions":
      await handleExtensionsCommand(subArgs, blogDir, datasDir);
      break;
    default:
      console.error(`Unknown subcommand: ${subcommand}`);
      console.error("Available: process, seo, summary, eval, profile, facts, extensions");
      process.exit(1);
  }
}

function printMainHelp(): void {
  console.log(`
AI-powered features for astro-minimax

Usage:
  astro-minimax ai <subcommand> [options]

Content Processing:
  process           Process posts with AI (summaries + SEO metadata)
  seo               Generate SEO metadata only
  summary           Generate summaries only

Quality & Evaluation:
  eval              Evaluate AI chat quality with golden test set

Author Profile:
  profile build     Build complete author profile (context + voice + facts + report)
  profile context   Build author context from posts
  profile voice     Build writing style profile
  profile facts     Build fact registry for AI accuracy
  profile report    Generate author profile report

Fact Registry:
  facts build       Build fact registry from blog content
  facts validate    Validate fact registry structure and content
  facts status      Show fact registry status

AI Extensions:
  extensions build      Validate and organize extension files
  extensions validate   Validate extension file structure and data
  extensions status     Show extension status summary
  extensions load       Test loading extensions (development)

Options:
  --force            Reprocess all posts (ignore cache)
  --slug=<slug>      Process only the specified post
  --recent=<n>       Process only recent N posts
  --new-only         Process only posts without existing data
  --dry-run          Preview what would be processed
  --lang=<zh|en>     Process only specified language
  --verbose, -v      Show detailed output
  --json             Output in JSON format

Examples:
  astro-minimax ai process
  astro-minimax ai process --force
  astro-minimax ai process --slug=zh/getting-started
  astro-minimax ai eval
  astro-minimax ai profile build
  astro-minimax ai facts build
  astro-minimax ai extensions status

Documentation: https://github.com/souloss/astro-minimax
`);
}

async function handleToolCommand(
  subcommand: string,
  args: string[],
  cwd: string
): Promise<void> {
  const scriptMap: Record<string, { script: string; extraArgs?: string[] }> = {
    process: { script: "ai-process.js" },
    seo: { script: "ai-process.js", extraArgs: ["--task=seo"] },
    summary: { script: "ai-process.js", extraArgs: ["--task=summary"] },
    eval: { script: "eval-ai-chat.js" },
  };

  const config = scriptMap[subcommand];
  const toolArgs = [...(config.extraArgs || []), ...args];
  await runTool(config.script, toolArgs, cwd);
}

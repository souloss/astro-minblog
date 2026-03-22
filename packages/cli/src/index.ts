#!/usr/bin/env node
import { join, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { initCommand } from "./commands/init.js";
import { postCommand } from "./commands/post.js";
import { aiCommand } from "./commands/ai.js";
import { profileCommand } from "./commands/profile.js";
import { dataCommand } from "./commands/data.js";
import { hooksCommand } from "./commands/hooks.js";
import { factsCommand } from "./commands/facts.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const VERSION = "0.6.0";

interface Command {
  name: string;
  description: string;
  run: (args: string[]) => Promise<void> | void;
}

const commands: Command[] = [
  { name: "init", description: "Create a new blog project", run: initCommand },
  { name: "post", description: "Manage blog posts", run: postCommand },
  {
    name: "ai",
    description: "AI content processing (process, seo, summary, eval)",
    run: aiCommand,
  },
  {
    name: "profile",
    description: "Author profile (build, context, voice, report)",
    run: profileCommand,
  },
  { name: "data", description: "Data status and management", run: dataCommand },
  {
    name: "hooks",
    description: "Git hooks setup (install, uninstall)",
    run: hooksCommand,
  },
  {
    name: "facts",
    description: "Fact registry (build, validate, status)",
    run: factsCommand,
  },
];

function printHelp(): void {
  console.log(`
astro-minimax v${VERSION} - A minimalist Astro blog CLI

Usage:
  astro-minimax <command> [subcommand] [options]

Commands:
  init <project>    Create a new blog project
  post              Manage blog posts (new, list, stats)
  ai                AI content processing (process, seo, summary, eval)
  profile           Author profile (build, context, voice, report)
  data              Data management (status, clear)
  facts             Fact registry (build, validate, status)
  hooks             Git hooks setup (install, uninstall)

Run "astro-minimax <command> --help" for detailed usage.

Examples:
  astro-minimax init my-blog
  astro-minimax post new "Hello World"
  astro-minimax ai process
  astro-minimax profile build
  astro-minimax facts build
  astro-minimax hooks install

Documentation: https://github.com/souloss/astro-minimax
`);
}

function printVersion(): void {
  console.log(`astro-minimax v${VERSION}`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    printHelp();
    process.exit(0);
  }

  if (args[0] === "--help" || args[0] === "-h") {
    printHelp();
    process.exit(0);
  }

  if (args[0] === "--version" || args[0] === "-v") {
    printVersion();
    process.exit(0);
  }

  const commandName = args[0];
  const command = commands.find(c => c.name === commandName);

  if (!command) {
    console.error(`Unknown command: ${commandName}`);
    console.error(
      "\nAvailable commands: init, post, ai, profile, data, facts, hooks"
    );
    console.error('Run "astro-minimax --help" for usage.');
    process.exit(1);
  }

  try {
    await command.run(args.slice(1));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`\nError: ${message}\n`);
    process.exit(1);
  }
}

main();

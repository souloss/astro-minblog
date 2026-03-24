#!/usr/bin/env node
import { join, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { initCommand } from "./commands/init.js";
import { postCommand } from "./commands/post.js";
import { aiCommand } from "./commands/ai/index.js";
import { dataCommand } from "./commands/data.js";
import { hooksCommand } from "./commands/hooks.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

import { createRequire } from "node:module";
const _require = createRequire(import.meta.url);
const VERSION: string = (_require("../package.json") as { version: string }).version;

interface Command {
  name: string;
  description: string;
  run: (args: string[]) => Promise<void> | void;
}

const commands: Command[] = [
  { name: "init", description: "Create a new blog project", run: initCommand },
  { name: "post", description: "Manage blog posts", run: postCommand },
  { name: "ai", description: "AI features (process, profile, facts, extensions, eval)", run: aiCommand },
  { name: "data", description: "Data status and management", run: dataCommand },
  { name: "hooks", description: "Git hooks setup (install, uninstall)", run: hooksCommand },
];

function printHelp(): void {
  console.log(`
astro-minimax v${VERSION} - A minimalist Astro blog CLI

Usage:
  astro-minimax <command> [subcommand] [options]

Commands:
  init <project>    Create a new blog project
  post              Manage blog posts (new, list, stats)
  ai                AI features (process, profile, facts, extensions, eval)
  data              Data management (status, clear)
  hooks             Git hooks setup (install, uninstall)

Run "astro-minimax <command> --help" for detailed usage.

Examples:
  astro-minimax init my-blog
  astro-minimax post new "Hello World"
  astro-minimax ai process
  astro-minimax ai profile build
  astro-minimax ai facts build
  astro-minimax ai extensions status
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
      "\nAvailable commands: init, post, ai, data, hooks"
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
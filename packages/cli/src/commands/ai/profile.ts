import { runTool } from "./run-tool.js";

export async function handleProfileCommand(
  args: string[],
  cwd: string
): Promise<void> {
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(`
Author profile management

Usage:
  astro-minimax ai profile build

Subcommands:
  build             Build complete author profile (context + voice + facts + report)

Description:
  Runs the canonical author profile pipeline behind a single retained entrypoint.
  Internal generation steps remain implementation details of this build flow.

Examples:
  astro-minimax ai profile build
`);
    return;
  }

  const subcommand = args[0];
  const subArgs = args.slice(1);

  const scriptMap: Record<string, string[]> = {
    build: [
      "build-author-context.js",
      "build-voice-profile.js",
      "build-fact-registry.js",
      "generate-author-profile.js",
    ],
  };

  const scripts = scriptMap[subcommand];
  if (!scripts) {
    console.error(`Unknown subcommand: ${subcommand}`);
    console.error("Available: build");
    process.exit(1);
  }

  for (const script of scripts) {
    await runTool(script, subArgs, cwd);
  }
}

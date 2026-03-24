import { runTool } from "./run-tool.js";

export async function handleProfileCommand(
  args: string[],
  cwd: string,
  datasDir: string
): Promise<void> {
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(`
Author profile management

Usage:
  astro-minimax ai profile <subcommand>

Subcommands:
  build             Build complete author profile (context + voice + facts + report)
  context           Build author context from posts
  voice             Build writing style profile
  facts             Build fact registry for AI accuracy
  report            Generate author profile report

Description:
  Generates author-related data for AI-powered features:
  - Author context: Writing patterns, topics, expertise
  - Voice profile: Style characteristics for AI responses
  - Fact registry: Verified facts to reduce AI hallucination
  - Profile report: Structured author profile for About page

Examples:
  astro-minimax ai profile build
  astro-minimax ai profile context
  astro-minimax ai profile voice
  astro-minimax ai profile facts
  astro-minimax ai profile report
`);
    return;
  }

  const subcommand = args[0];
  const subArgs = args.slice(1);

  const scriptMap: Record<string, string | string[]> = {
    build: [
      "build-author-context.js",
      "build-voice-profile.js",
      "build-fact-registry.js",
      "generate-author-profile.js",
    ],
    context: "build-author-context.js",
    voice: "build-voice-profile.js",
    facts: "build-fact-registry.js",
    report: "generate-author-profile.js",
  };

  const scripts = scriptMap[subcommand];
  if (!scripts) {
    console.error(`Unknown subcommand: ${subcommand}`);
    console.error("Available: build, context, voice, facts, report");
    process.exit(1);
  }

  if (Array.isArray(scripts)) {
    for (const script of scripts) {
      await runTool(script, subArgs, cwd);
    }
  } else {
    await runTool(scripts, subArgs, cwd);
  }
}

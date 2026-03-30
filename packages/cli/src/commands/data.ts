import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";

export async function dataCommand(args: string[]): Promise<void> {
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(`
Data status and management

Usage:
  astro-minimax data <subcommand>

Subcommands:
  status            Show data files status
  clear             Clear all generated data caches

Description:
  View and manage generated data files in datas/.
  Runtime consumers should rely on datas/knowledge/runtime/knowledge-bundle.json
  plus the optional datas/knowledge/runtime/vector-index.json.

Examples:
  astro-minimax data status
  astro-minimax data clear
`);
    return;
  }

  const subcommand = args[0];

  const datasDir = join(process.cwd(), "datas");
  if (!existsSync(datasDir)) {
    console.error("Error: Not in an astro-minimax blog directory.");
    process.exit(1);
  }

  switch (subcommand) {
    case "status":
      showStatus(datasDir);
      break;
    case "clear":
      await clearData(datasDir);
      break;
    default:
      console.error(`Unknown subcommand: ${subcommand}`);
      console.error("Available: status, clear");
      process.exit(1);
  }
}

function showStatus(datasDir: string): void {
  console.log("\n  Data Files Status:\n");

  const files = [
    {
      name: "knowledge/runtime/knowledge-bundle.json",
      desc: "Canonical runtime bundle",
    },
    {
      name: "knowledge/runtime/vector-index.json",
      desc: "Optional runtime vector companion",
    },
    {
      name: "knowledge/runtime/article-passages.json",
      desc: "Optional runtime passage companion",
    },
    {
      name: "knowledge/sources/content-manifest.json",
      desc: "Canonical source manifest",
    },
    {
      name: "knowledge/derived/site-overview.json",
      desc: "Derived site overview",
    },
    {
      name: "knowledge/cache/build-metadata.json",
      desc: "Knowledge pipeline build metadata",
    },
  ];

  for (const file of files) {
      const path = join(datasDir, file.name);
      if (existsSync(path)) {
        const content = readFileSync(path, "utf-8");
        const stat = JSON.parse(content);
        const articles = stat.articles
          ? Object.keys(stat.articles).length
          : Array.isArray(stat.corpus?.documents)
            ? stat.corpus.documents.length
            : 0;
        const passages = Array.isArray(stat.passages?.passages)
          ? stat.passages.passages.length
          : 0;
        const updated = stat.meta?.lastUpdated || stat.generatedAt || "never";

        console.log(`  ✅ ${file.name}`);
        console.log(`     ${file.desc}`);
        if (articles > 0) console.log(`     ${articles} articles processed`);
        if (passages > 0) console.log(`     ${passages} passages indexed`);
        console.log(`     Last updated: ${updated}`);
        console.log();
      } else {
      console.log(`  ⬜ ${file.name}`);
      console.log(`     ${file.desc} - not generated`);
      console.log();
    }
  }
}

async function clearData(datasDir: string): Promise<void> {
  const clearableFiles = [
    "knowledge/runtime/knowledge-bundle.json",
    "knowledge/runtime/vector-index.json",
    "knowledge/runtime/article-passages.json",
    "knowledge/sources/content-manifest.json",
    "knowledge/derived/site-overview.json",
    "knowledge/cache/build-metadata.json",
  ];

  console.log("\n  Clearing generated data...\n");

  let cleared = 0;
  for (const file of clearableFiles) {
    const path = join(datasDir, file);
    if (existsSync(path)) {
      unlinkSync(path);
      console.log(`  ✓ Removed ${file}`);
      cleared++;
    }
  }

  const sourcesDir = join(datasDir, "sources", "blog-digest.json");
  if (existsSync(sourcesDir)) {
    unlinkSync(sourcesDir);
    console.log(`  ✓ Removed sources/blog-digest.json`);
    cleared++;
  }

  console.log(`\n  Cleared ${cleared} file(s).\n`);
  console.log("  Run 'astro-minimax ai process' to regenerate.\n");
}

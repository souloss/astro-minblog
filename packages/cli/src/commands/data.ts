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
  Runtime consumers should rely on datas/rag-bundle.json
  plus the optional datas/rag-extensions.json.

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
      name: "rag-bundle.json",
      desc: "Canonical RAG runtime bundle",
    },
    {
      name: "rag-extensions.json",
      desc: "Extension knowledge bundle",
    },
    {
      name: "rag-facts.json",
      desc: "Structured fact registry",
    },
    {
      name: "rag-voice.json",
      desc: "Author voice profile",
    },
    {
      name: "seo-meta.json",
      desc: "SEO metadata for articles",
    },
    {
      name: "content-manifest.json",
      desc: "Source content manifest",
    },
    {
      name: "build-meta.json",
      desc: "Build metadata and integrity hashes",
    },
    {
      name: "qa-taxonomy.json",
      desc: "QA evaluation test set",
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
        const passages = Array.isArray(stat.passages)
          ? stat.passages.length
          : Array.isArray(stat.passages?.passages)
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
    "rag-bundle.json",
    "rag-extensions.json",
    "rag-facts.json",
    "rag-voice.json",
    "seo-meta.json",
    "content-manifest.json",
    "build-meta.json",
    "qa-taxonomy.json",
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

  console.log(`\n  Cleared ${cleared} file(s).\n`);
  console.log("  Run 'astro-minimax ai process' to regenerate.\n");
}
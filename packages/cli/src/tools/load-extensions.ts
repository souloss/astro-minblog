#!/usr/bin/env npx tsx

import { join, dirname } from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const cwd = process.cwd();
const extensionsDir = join(cwd, "datas", "extensions");

const verbose = process.argv.includes("--verbose") || process.argv.includes("-v");

console.log("\nLoading Extensions");
console.log("━".repeat(50));

if (!existsSync(extensionsDir)) {
  console.log("\nExtensions directory not found: " + extensionsDir + "\n");
  process.exit(1);
}

console.log("\nDirectory: " + extensionsDir);

async function main() {
  try {
    type LoadResult = { searchable: Map<string, unknown>; facts: Map<string, unknown>; context: unknown[]; voiceStyle: unknown; semanticFallback: unknown[] };
    let loadExtensions: (pattern: string, cwd: string) => Promise<LoadResult>;

    const aiExtensionsPath = join(__dirname, "..", "..", "..", "ai", "dist", "extensions", "loader.js");
    const mod = await import(aiExtensionsPath) as { loadExtensions: typeof loadExtensions };
    loadExtensions = mod.loadExtensions;
    const loaded = await loadExtensions("datas/extensions/*.json", cwd);

    console.log("\nLoad Results:");
    console.log("  searchable: " + loaded.searchable.size);
    console.log("  facts: " + loaded.facts.size);
    console.log("  context: " + loaded.context.length);
    console.log("  voiceStyle: " + (loaded.voiceStyle ? "loaded" : "not configured"));
    console.log("  semanticFallback: " + loaded.semanticFallback.length + " rules");

    if (verbose) {
      if (loaded.searchable.size > 0) {
        console.log("\nsearchable extensions:");
        for (const [id] of loaded.searchable) {
          console.log("  - " + id);
        }
      }
      if (loaded.facts.size > 0) {
        console.log("\nfacts extensions:");
        for (const [id] of loaded.facts) {
          console.log("  - " + id);
        }
      }
    }

    console.log("\nLoaded successfully\n");
  } catch (err) {
    console.log("\nLoad failed: " + (err instanceof Error ? err.message : String(err)) + "\n");
    process.exit(1);
  }
}

main();
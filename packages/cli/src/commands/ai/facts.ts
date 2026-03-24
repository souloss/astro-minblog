import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { FactCategory, FactSource, FactRegistryFile, ValidationResult } from "./types.js";
import { runTool } from "./run-tool.js";

export async function handleFactsCommand(
  args: string[],
  cwd: string,
  datasDir: string
): Promise<void> {
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(`
Fact Registry management

Usage:
  astro-minimax ai facts <subcommand>

Subcommands:
  build             Build fact registry from blog content
  validate          Validate fact registry structure and content
  status            Show fact registry status

Description:
  Manage and validate the fact registry used to ground AI responses.

Examples:
  astro-minimax ai facts build
  astro-minimax ai facts build --verbose
  astro-minimax ai facts validate
  astro-minimax ai facts status
`);
    return;
  }

  const subcommand = args[0];
  const subArgs = args.slice(1);

  switch (subcommand) {
    case "build":
      await buildFacts(subArgs, cwd, datasDir);
      break;
    case "validate":
      await validateFacts(datasDir);
      break;
    case "status":
      showFactsStatus(datasDir);
      break;
    default:
      console.error(`Unknown subcommand: ${subcommand}`);
      console.error("Available: build, validate, status");
      process.exit(1);
  }
}

async function buildFacts(
  args: string[],
  cwd: string,
  datasDir: string
): Promise<void> {
  console.log("\n📊 构建事实注册表 (Fact Registry)");
  console.log("━".repeat(50));

  try {
    const { buildFactRegistry } = await import("../../tools/build-fact-registry.js");
    const result = await buildFactRegistry({ cwd });

    console.log(`\n✅ 事实注册表构建完成`);
    console.log(`📄 输出文件: ${join(datasDir, "fact-registry.json")}`);
    console.log(`\n📊 统计:`);
    console.log(`   总事实数: ${result.output.stats.total}`);
    console.log(`   平均置信度: ${result.output.stats.avgConfidence}`);
    console.log(`   按分类:`);
    for (const [cat, count] of Object.entries(result.output.stats.byCategory)) {
      if (count > 0) console.log(`     ${cat}: ${count}`);
    }
    console.log();
  } catch (error) {
    console.error(
      `\n❌ 构建失败: ${error instanceof Error ? error.message : String(error)}\n`
    );
    process.exit(1);
  }
}

function showFactsStatus(datasDir: string): void {
  const factsFile = join(datasDir, "fact-registry.json");

  console.log("\n  Fact Registry Status:\n");

  if (!existsSync(factsFile)) {
    console.log("  ⬜ fact-registry.json");
    console.log("     Not generated yet");
    console.log("\n  Run 'astro-minimax ai facts build' to generate.\n");
    return;
  }

  try {
    const content = readFileSync(factsFile, "utf-8");
    const registry = JSON.parse(content) as FactRegistryFile;

    console.log("  ✅ fact-registry.json");
    console.log(`     Version: ${registry.version}`);
    console.log(`     Generated: ${registry.generatedAt}`);
    console.log(`     Total facts: ${registry.stats.total}`);
    console.log(`     Avg confidence: ${registry.stats.avgConfidence}`);
    console.log("\n  By category:");
    for (const [cat, count] of Object.entries(registry.stats.byCategory)) {
      if (count > 0) {
        console.log(`    ${cat}: ${count}`);
      }
    }
    console.log();
  } catch (error) {
    console.log("  ❌ fact-registry.json");
    console.log(
      `     Error reading file: ${error instanceof Error ? error.message : String(error)}`
    );
    console.log();
  }
}

async function validateFacts(datasDir: string): Promise<void> {
  const factsFile = join(datasDir, "fact-registry.json");

  console.log("\n📋 Validating Fact Registry\n");
  console.log("━".repeat(50));

  if (!existsSync(factsFile)) {
    console.log("\n❌ fact-registry.json not found");
    console.log("\n  Run 'astro-minimax ai facts build' to generate.\n");
    process.exit(1);
  }

  let registry: FactRegistryFile;
  try {
    const content = readFileSync(factsFile, "utf-8");
    registry = JSON.parse(content) as FactRegistryFile;
  } catch (error) {
    console.log("\n❌ Failed to parse fact-registry.json");
    console.log(
      `   Error: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }

  const result = validateFactRegistry(registry);

  console.log("\n  📊 Validation Results:\n");

  console.log("  Statistics:");
  console.log(`    Total facts: ${result.stats.totalFacts}`);
  console.log(`    Average confidence: ${result.stats.avgConfidence}`);
  console.log("\n  By category:");
  for (const [cat, count] of Object.entries(result.stats.byCategory)) {
    console.log(`    ${cat}: ${count}`);
  }

  const coverage = result.stats.coverage;
  console.log("\n  Coverage:");
  console.log(`    Author facts: ${coverage.hasAuthorFacts ? "✅" : "❌"}`);
  console.log(`    Blog facts: ${coverage.hasBlogFacts ? "✅" : "❌"}`);
  console.log(
    `    Content facts: ${coverage.hasContentFacts ? "✅" : "⚠️ (optional)"}`
  );
  console.log(
    `    Tech facts: ${coverage.hasTechFacts ? "✅" : "⚠️ (optional)"}`
  );

  if (result.errors.length > 0) {
    console.log("\n  ❌ Errors:");
    for (const error of result.errors) {
      console.log(`    - ${error}`);
    }
  }

  if (result.warnings.length > 0) {
    console.log("\n  ⚠️  Warnings:");
    for (const warning of result.warnings) {
      console.log(`    - ${warning}`);
    }
  }

  console.log("\n" + "━".repeat(50));
  if (result.valid) {
    console.log("\n✅ Fact registry is valid\n");
  } else {
    console.log("\n❌ Fact registry has validation errors\n");
    process.exit(1);
  }
}

function validateFactRegistry(registry: FactRegistryFile): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (registry.$schema !== "fact-registry-v1") {
    errors.push(
      `Invalid schema: expected 'fact-registry-v1', got '${registry.$schema}'`
    );
  }

  if (registry.version !== 1) {
    warnings.push(`Unexpected version: ${registry.version} (expected 1)`);
  }

  if (!registry.generatedAt) {
    errors.push("Missing generatedAt field");
  }

  if (!Array.isArray(registry.facts)) {
    errors.push("facts field must be an array");
    return {
      valid: false,
      errors,
      warnings,
      stats: {
        totalFacts: 0,
        byCategory: { author: 0, blog: 0, content: 0, project: 0, tech: 0 },
        avgConfidence: 0,
        coverage: {
          hasAuthorFacts: false,
          hasBlogFacts: false,
          hasContentFacts: false,
          hasTechFacts: false,
        },
      },
    };
  }

  const seenIds = new Set<string>();
  const byCategory: Record<FactCategory, number> = {
    author: 0,
    blog: 0,
    content: 0,
    project: 0,
    tech: 0,
  };
  let totalConfidence = 0;

  for (let i = 0; i < registry.facts.length; i++) {
    const fact = registry.facts[i];
    const prefix = `facts[${i}]`;

    if (!fact.id) {
      errors.push(`${prefix}: missing id`);
    } else if (seenIds.has(fact.id)) {
      errors.push(`${prefix}: duplicate id '${fact.id}'`);
    } else {
      seenIds.add(fact.id);
    }

    if (!fact.statement) {
      errors.push(`${prefix}: missing statement`);
    }

    if (!fact.evidence) {
      warnings.push(`${prefix}: missing evidence for fact '${fact.id}'`);
    }

    const validCategories: FactCategory[] = [
      "author",
      "blog",
      "content",
      "project",
      "tech",
    ];
    if (!validCategories.includes(fact.category)) {
      errors.push(`${prefix}: invalid category '${fact.category}'`);
    } else {
      byCategory[fact.category]++;
    }

    const validSources: FactSource[] = ["explicit", "derived", "aggregated"];
    if (!validSources.includes(fact.source)) {
      errors.push(`${prefix}: invalid source '${fact.source}'`);
    }

    if (
      typeof fact.confidence !== "number" ||
      fact.confidence < 0 ||
      fact.confidence > 1
    ) {
      errors.push(
        `${prefix}: confidence must be between 0 and 1, got '${fact.confidence}'`
      );
    } else {
      totalConfidence += fact.confidence;
    }

    if (!Array.isArray(fact.tags)) {
      warnings.push(`${prefix}: tags should be an array`);
    }

    if (!fact.lang) {
      warnings.push(`${prefix}: missing lang field`);
    }
  }

  if (registry.stats && registry.stats.total !== registry.facts.length) {
    warnings.push(
      `Stats mismatch: reported ${registry.stats.total} facts, actual ${registry.facts.length}`
    );
  }

  const avgConfidence =
    registry.facts.length > 0
      ? +(totalConfidence / registry.facts.length).toFixed(3)
      : 0;

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      totalFacts: registry.facts.length,
      byCategory,
      avgConfidence,
      coverage: {
        hasAuthorFacts: byCategory.author > 0,
        hasBlogFacts: byCategory.blog > 0,
        hasContentFacts: byCategory.content > 0,
        hasTechFacts: byCategory.tech > 0,
      },
    },
  };
}

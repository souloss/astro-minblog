import { spawn } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync, mkdirSync } from "node:fs";
import { join, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const toolsDir = join(__dirname, "..", "tools");

type FactCategory = "author" | "blog" | "content" | "project" | "tech";
type FactSource = "explicit" | "derived" | "aggregated";
type ExtensionType = "searchable" | "facts" | "context" | "voice-style" | "semantic-fallback";

interface Fact {
  id: string;
  category: FactCategory;
  statement: string;
  evidence: string;
  source: FactSource;
  confidence: number;
  tags: string[];
  lang: string;
}

interface FactRegistryFile {
  $schema: string;
  generatedAt: string;
  version: number;
  facts: Fact[];
  stats: {
    total: number;
    byCategory: Record<FactCategory, number>;
    avgConfidence: number;
  };
}

interface Extension {
  id: string;
  type: ExtensionType;
  name: string;
  description?: string;
  enabled?: boolean;
  priority: number;
  data: unknown;
}

interface ExtensionFile {
  $schema: string;
  version: number;
  extensions: Extension[];
}

const VALID_EXTENSION_TYPES: ExtensionType[] = [
  "searchable",
  "facts",
  "context",
  "voice-style",
  "semantic-fallback",
];

const EMOJI = {
  success: "\u2705",
  error: "\u274c",
  warning: "\u26a0\ufe0f",
  info: "\u2139\ufe0f",
  folder: "\ud83d\udcc2",
  package: "\ud83d\udce6",
  build: "\ud83d\udd27",
  validate: "\ud83d\udccb",
  chart: "\ud83d\udcca",
};

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

async function handleProfileCommand(
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

async function handleFactsCommand(
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
    const { buildFactRegistry } = await import("../tools/build-fact-registry.js");
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

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    totalFacts: number;
    byCategory: Record<FactCategory, number>;
    avgConfidence: number;
    coverage: {
      hasAuthorFacts: boolean;
      hasBlogFacts: boolean;
      hasContentFacts: boolean;
      hasTechFacts: boolean;
    };
  };
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

async function handleExtensionsCommand(
  args: string[],
  cwd: string,
  datasDir: string
): Promise<void> {
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(`
Extension management for AI chat system

Usage:
  astro-minimax ai extensions <subcommand> [options]

Subcommands:
  build             Validate and organize extension files
  validate          Validate extension file structure and data
  status            Show extension status summary
  load              Test loading extensions (development)

Options:
  --verbose, -v     Show detailed output
  --json            Output in JSON format

Description:
  Manage extension data that augments the AI chat system.
  Extensions are stored in datas/extensions/*.json

Extension Types:
  searchable         Add searchable documents to AI knowledge
  facts              Add structured facts to the registry
  context            Add custom prompt sections
  voice-style        Define AI personality modes
  semantic-fallback  Define query rewriting rules

Examples:
  astro-minimax ai extensions status
  astro-minimax ai extensions validate
  astro-minimax ai extensions validate travel.json
  astro-minimax ai extensions build --verbose
  astro-minimax ai extensions load
`);
    return;
  }

  const subcommand = args[0];
  const subArgs = args.slice(1);
  const extensionsDir = join(datasDir, "extensions");

  switch (subcommand) {
    case "build":
      await buildExtensions(subArgs, cwd, extensionsDir);
      break;
    case "validate":
      await validateExtensions(subArgs, extensionsDir);
      break;
    case "status":
      showExtensionsStatus(subArgs, extensionsDir);
      break;
    case "load":
      await loadExtensionsCmd(subArgs, cwd);
      break;
    default:
      console.error("Unknown subcommand: " + subcommand);
      console.error("Available: build, validate, status, load");
      process.exit(1);
  }
}

async function buildExtensions(
  args: string[],
  cwd: string,
  extensionsDir: string
): Promise<void> {
  const verbose = args.includes("--verbose") || args.includes("-v");

  console.log("\n" + EMOJI.build + " Building Extensions");
  console.log("━".repeat(50));

  if (!existsSync(extensionsDir)) {
    console.log("\n" + EMOJI.folder + " Creating extensions directory: " + extensionsDir);
    mkdirSync(extensionsDir, { recursive: true });
  }

  const files = getExtensionFiles(extensionsDir);

  if (files.length === 0) {
    console.log("\n" + EMOJI.warning + "  No extension files found");
    console.log("   Directory: " + extensionsDir);
    console.log("\n   Create example file:");
    console.log("   datas/extensions/travel.json");
    console.log("\n   Reference: https://github.com/souloss/astro-minimax/docs/extensions.md\n");
    return;
  }

  let totalExtensions = 0;
  let validFiles = 0;
  let errorCount = 0;

  for (const file of files) {
    const fileName = basename(file);

    try {
      const content = readFileSync(file, "utf-8");
      const parsed = JSON.parse(content) as ExtensionFile;
      const result = validateExtensionFile(parsed, fileName);

      if (result.valid) {
        validFiles++;
        totalExtensions += parsed.extensions.length;

        if (verbose) {
          console.log("\n  " + EMOJI.success + " " + fileName);
          for (const ext of parsed.extensions) {
            console.log("     - " + ext.id + " (" + ext.type + ") priority=" + ext.priority);
          }
        }
      } else {
        errorCount++;
        console.log("\n  " + EMOJI.error + " " + fileName);
        for (const error of result.errors) {
          console.log("     Error: " + error);
        }
      }
    } catch (err) {
      errorCount++;
      console.log("\n  " + EMOJI.error + " " + fileName);
      console.log("     Error: " + (err instanceof Error ? err.message : String(err)));
    }
  }

  console.log("\n" + "━".repeat(50));
  console.log("\n" + EMOJI.chart + " Build Statistics:");
  console.log("   Files: " + files.length);
  console.log("   Valid: " + validFiles);
  console.log("   Extensions: " + totalExtensions);

  if (errorCount > 0) {
    console.log("   Errors: " + errorCount);
    console.log("\n" + EMOJI.error + " Build completed with errors\n");
    process.exit(1);
  } else {
    console.log("\n" + EMOJI.success + " Build completed successfully\n");
  }
}

async function validateExtensions(
  args: string[],
  extensionsDir: string
): Promise<void> {
  const verbose = args.includes("--verbose") || args.includes("-v");
  const specificFile = args.find((a) => !a.startsWith("-") && a.endsWith(".json"));

  console.log("\n" + EMOJI.validate + " Validating Extensions");
  console.log("━".repeat(50));

  if (!existsSync(extensionsDir)) {
    console.log("\n" + EMOJI.error + " Extensions directory not found");
    console.log("   Path: " + extensionsDir);
    console.log("\n  Run 'astro-minimax ai extensions build' to create directory\n");
    process.exit(1);
  }

  const files = specificFile
    ? [join(extensionsDir, specificFile)]
    : getExtensionFiles(extensionsDir);

  if (files.length === 0) {
    console.log("\n" + EMOJI.warning + "  No extension files found");
    console.log("   Directory: " + extensionsDir + "\n");
    return;
  }

  let validCount = 0;
  let errorCount = 0;
  let warningCount = 0;

  for (const file of files) {
    const fileName = basename(file);

    if (!existsSync(file)) {
      console.log("\n  " + EMOJI.error + " " + fileName);
      console.log("     Error: File does not exist");
      errorCount++;
      continue;
    }

    try {
      const content = readFileSync(file, "utf-8");
      const parsed = JSON.parse(content) as ExtensionFile;
      const result = validateExtensionFile(parsed, fileName);

      if (result.valid) {
        validCount++;
        console.log("\n  " + EMOJI.success + " " + fileName);
        console.log("     Extensions: " + result.stats.totalExtensions);

        if (verbose) {
          console.log("     By type:");
          for (const [type, count] of Object.entries(result.stats.byType)) {
            if (count > 0) console.log("       " + type + ": " + count);
          }
        }
      } else {
        errorCount++;
        console.log("\n  " + EMOJI.error + " " + fileName);
        for (const error of result.errors) {
          console.log("     Error: " + error);
        }
      }

      if (result.warnings.length > 0) {
        warningCount += result.warnings.length;
        if (verbose) {
          for (const warning of result.warnings) {
            console.log("     Warning: " + warning);
          }
        }
      }
    } catch (err) {
      errorCount++;
      console.log("\n  " + EMOJI.error + " " + fileName);
      console.log("     Error: " + (err instanceof Error ? err.message : String(err)));
    }
  }

  console.log("\n" + "━".repeat(50));
  console.log("\n" + EMOJI.chart + " Validation Statistics:");
  console.log("   Files: " + files.length);
  console.log("   Valid: " + validCount);
  console.log("   Errors: " + errorCount);
  console.log("   Warnings: " + warningCount);

  if (errorCount > 0) {
    console.log("\n" + EMOJI.error + " Validation failed\n");
    process.exit(1);
  } else {
    console.log("\n" + EMOJI.success + " Validation passed\n");
  }
}

function showExtensionsStatus(args: string[], extensionsDir: string): void {
  const jsonOutput = args.includes("--json");
  const specificExt = args.find((a) => !a.startsWith("-"));

  if (!existsSync(extensionsDir)) {
    if (jsonOutput) {
      console.log(JSON.stringify({ extensions: [], error: "Directory not found" }));
    } else {
      console.log("\n  Extensions Status:\n");
      console.log("  " + EMOJI.folder + " datas/extensions/");
      console.log("     Directory not found");
      console.log("\n  Run 'astro-minimax ai extensions build' to create.\n");
    }
    return;
  }

  const files = getExtensionFiles(extensionsDir);
  const allExtensions: Array<{ file: string; ext: Extension; mtime: Date }> = [];

  for (const file of files) {
    try {
      const content = readFileSync(file, "utf-8");
      const parsed = JSON.parse(content) as ExtensionFile;
      const stat = statSync(file);

      for (const ext of parsed.extensions) {
        allExtensions.push({
          file: basename(file),
          ext,
          mtime: stat.mtime,
        });
      }
    } catch {
      // Skip invalid files
    }
  }

  if (specificExt) {
    const found = allExtensions.filter(
      (e) => e.ext.id === specificExt || e.file === specificExt
    );

    if (found.length === 0) {
      console.log("\n" + EMOJI.error + " Extension not found: " + specificExt);
      console.log('\n  Use "astro-minimax ai extensions status" to list all extensions\n');
      process.exit(2);
    }

    for (const { file, ext, mtime } of found) {
      if (jsonOutput) {
        console.log(
          JSON.stringify(
            {
              id: ext.id,
              type: ext.type,
              name: ext.name,
              description: ext.description,
              priority: ext.priority,
              enabled: ext.enabled !== false,
              file,
              lastModified: mtime.toISOString(),
            },
            null,
            2
          )
        );
      } else {
        console.log("\n" + EMOJI.package + " Extension: " + ext.id + " (" + ext.name + ")");
        console.log("━".repeat(50));
        console.log("  File: " + file);
        console.log("  Type: " + ext.type);
        console.log("  Priority: " + ext.priority);
        console.log(
          "  Status: " + (ext.enabled !== false ? EMOJI.success + " Enabled" : EMOJI.error + " Disabled")
        );
        if (ext.description) {
          console.log("  Description: " + ext.description);
        }
        console.log("  Updated: " + mtime.toISOString().slice(0, 10));

        console.log("\n  " + EMOJI.chart + " Data Summary:");
        console.log(getExtensionDataSummary(ext));
        console.log();
      }
    }
    return;
  }

  if (jsonOutput) {
    console.log(
      JSON.stringify(
        {
          extensions: allExtensions.map(({ file, ext, mtime }) => ({
            id: ext.id,
            type: ext.type,
            name: ext.name,
            priority: ext.priority,
            enabled: ext.enabled !== false,
            file,
            lastModified: mtime.toISOString(),
          })),
          total: allExtensions.length,
        },
        null,
        2
      )
    );
  } else {
    console.log("\n  Extensions Status:\n");

    if (allExtensions.length === 0) {
      console.log("  " + EMOJI.warning + " No extensions found");
      console.log("\n  Create extension files: datas/extensions/*.json\n");
      return;
    }

    const sorted = [...allExtensions].sort((a, b) => b.ext.priority - a.ext.priority);

    console.log("  ID                    TYPE                 PRIORITY   STATUS");
    console.log("  " + "─".repeat(65));

    for (const { ext } of sorted) {
      const id = ext.id.padEnd(20);
      const type = ext.type.padEnd(20);
      const priority = String(ext.priority).padStart(8);
      const status = ext.enabled !== false ? EMOJI.success : EMOJI.error;
      console.log("  " + id + " " + type + " " + priority + "   " + status);
    }

    console.log("\n  " + "─".repeat(65));
    console.log("  Total: " + allExtensions.length + " extensions\n");
  }
}

async function loadExtensionsCmd(args: string[], cwd: string): Promise<void> {
  const verbose = args.includes("--verbose") || args.includes("-v");

  console.log("\n" + EMOJI.folder + " Loading Extensions");
  console.log("━".repeat(50));

  const toolArgs = [join(__dirname, "..", "tools", "load-extensions.ts")];
  if (verbose) toolArgs.push("--verbose");

  await runToolDirect(toolArgs, cwd);
}

interface ExtensionValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    totalExtensions: number;
    byType: Record<ExtensionType, number>;
    enabled: number;
    disabled: number;
  };
}

function validateExtensionFile(
  file: ExtensionFile,
  fileName: string
): ExtensionValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const byType: Record<ExtensionType, number> = {
    searchable: 0,
    facts: 0,
    context: 0,
    "voice-style": 0,
    "semantic-fallback": 0,
  };

  if (!file.$schema || typeof file.$schema !== "string") {
    errors.push("$schema must be a string");
  }

  if (typeof file.version !== "number") {
    errors.push("version must be a number");
  } else if (file.version !== 1) {
    warnings.push("version=" + file.version + ", expected 1");
  }

  if (!Array.isArray(file.extensions)) {
    errors.push("extensions must be an array");
    return {
      valid: false,
      errors,
      warnings,
      stats: { totalExtensions: 0, byType, enabled: 0, disabled: 0 },
    };
  }

  const seenIds = new Set<string>();
  let enabled = 0;
  let disabled = 0;

  for (let i = 0; i < file.extensions.length; i++) {
    const ext = file.extensions[i];
    const prefix = "extensions[" + i + "]";

    if (!ext.id || typeof ext.id !== "string") {
      errors.push(prefix + ": id must be a non-empty string");
    } else if (seenIds.has(ext.id)) {
      errors.push(prefix + ": duplicate id '" + ext.id + "'");
    } else {
      seenIds.add(ext.id);
    }

    if (!ext.type || !VALID_EXTENSION_TYPES.includes(ext.type)) {
      errors.push(prefix + ": type must be one of: " + VALID_EXTENSION_TYPES.join(", "));
    } else {
      byType[ext.type]++;
    }

    if (!ext.name || typeof ext.name !== "string") {
      warnings.push(prefix + ": name is recommended");
    }

    if (typeof ext.priority !== "number" || ext.priority < 0 || ext.priority > 100) {
      warnings.push(prefix + ": priority should be between 0-100");
    }

    if (!ext.data || typeof ext.data !== "object") {
      errors.push(prefix + ": data must be an object");
    }

    if (ext.enabled !== false) {
      enabled++;
    } else {
      disabled++;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      totalExtensions: file.extensions.length,
      byType,
      enabled,
      disabled,
    },
  };
}

function getExtensionDataSummary(ext: Extension): string {
  const data = ext.data as Record<string, unknown>;

  switch (ext.type) {
    case "searchable": {
      const docs = (data.documents as unknown[]) || [];
      return "     Documents: " + docs.length;
    }
    case "facts": {
      const facts = (data.facts as unknown[]) || [];
      return "     Facts: " + facts.length;
    }
    case "context": {
      const title = data.sectionTitle || "N/A";
      return "     Title: " + title;
    }
    case "voice-style": {
      const modes = (data.modes as unknown[]) || [];
      return "     Modes: " + modes.length;
    }
    case "semantic-fallback": {
      const rules = (data.rules as unknown[]) || [];
      return "     Rules: " + rules.length;
    }
    default:
      return "     (Unknown type)";
  }
}

function getExtensionFiles(extensionsDir: string): string[] {
  if (!existsSync(extensionsDir)) return [];

  const files: string[] = [];
  const entries = readdirSync(extensionsDir);

  for (const entry of entries) {
    if (entry.endsWith(".json") && !entry.startsWith("_")) {
      files.push(join(extensionsDir, entry));
    }
  }

  return files.sort();
}

async function runTool(script: string, args: string[], cwd: string): Promise<void> {
  const scriptPath = join(toolsDir, script);

  return new Promise((resolve, reject) => {
    const child = spawn("npx", ["tsx", scriptPath, ...args], {
      stdio: "inherit",
      shell: true,
      cwd,
    });

    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Process exited with code ${code}`));
    });

    child.on("error", reject);
  });
}

async function runToolDirect(args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("npx", ["tsx", ...args], {
      stdio: "inherit",
      shell: true,
      cwd,
    });

    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error("Process exited with code " + code));
    });

    child.on("error", reject);
  });
}
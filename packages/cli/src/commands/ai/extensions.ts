import { existsSync, readdirSync, readFileSync, statSync, mkdirSync } from "node:fs";
import { join, basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  ExtensionType,
  Extension,
  ExtensionFile,
  ExtensionValidationResult,
} from "./types.js";
import { VALID_EXTENSION_TYPES, EMOJI } from "./types.js";
import { runToolDirect } from "./run-tool.js";
import { transformAllExtensions } from "../../tools/transform-extensions.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function handleExtensionsCommand(
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

Extension Data Format:
  Each file in datas/extensions/ should follow the simple format:
  { "title": "Topic Name", "items": [{ "title": "...", "content": "...", "tags": [...] }] }
  
  Optional: add "voiceHint" for topic-specific tone adjustment.

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
      await buildExtensions(subArgs, cwd, extensionsDir, datasDir);
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
  extensionsDir: string,
  datasDir: string
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
  let simpleFormatFiles = 0;
  let errorCount = 0;

  for (const file of files) {
    const fileName = basename(file);

    try {
      const content = readFileSync(file, "utf-8");
      const parsed = JSON.parse(content);

      // Detect simple format: { title, items: [...] }
      if (parsed.title && Array.isArray(parsed.items)) {
        simpleFormatFiles++;
        validFiles++;
        if (verbose) {
          console.log("\n  " + EMOJI.success + " " + fileName + " (simple format, " + parsed.items.length + " items)");
        }
        continue;
      }

      // Legacy format: { $schema, version, extensions: [...] }
      const legacyResult = validateExtensionFile(parsed as ExtensionFile, fileName);

      if (legacyResult.valid) {
        validFiles++;
        totalExtensions += (parsed as ExtensionFile).extensions.length;

        if (verbose) {
          console.log("\n  " + EMOJI.success + " " + fileName + " (legacy format)");
          for (const ext of (parsed as ExtensionFile).extensions) {
            console.log("     - " + ext.id + " (" + ext.type + ") priority=" + ext.priority);
          }
        }
      } else {
        errorCount++;
        console.log("\n  " + EMOJI.error + " " + fileName);
        for (const error of legacyResult.errors) {
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
  console.log("   Simple format: " + simpleFormatFiles);
  console.log("   Legacy extensions: " + totalExtensions);

  if (errorCount > 0) {
    console.log("   Errors: " + errorCount);
    console.log("\n" + EMOJI.error + " Build completed with errors\n");
    process.exit(1);
  }

  // Transform all extensions (simple + legacy) into compiled bundle
  if (validFiles > 0) {
    const runtimeDir = join(datasDir, "knowledge", "runtime");
    await transformAllExtensions(extensionsDir, runtimeDir);
    console.log("\n" + EMOJI.success + " Build completed successfully");
    console.log("  📦 Extension bundle: " + join(runtimeDir, "extensions-bundle.json") + "\n");
  } else {
    console.log("\n" + EMOJI.warning + "  No valid extension files found\n");
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

  let files: string[];
  if (specificFile) {
    const resolved = resolve(extensionsDir, specificFile);
    if (!resolved.startsWith(resolve(extensionsDir))) {
      console.log("\n" + EMOJI.error + " Invalid file path: must be within extensions directory\n");
      process.exit(1);
    }
    files = [resolved];
  } else {
    files = getExtensionFiles(extensionsDir);
  }

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

  const toolArgs = [join(__dirname, "..", "..", "tools", "load-extensions.ts")];
  if (verbose) toolArgs.push("--verbose");

  await runToolDirect(toolArgs, cwd);
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

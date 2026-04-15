import { createLogger } from "../utils/logger.js";
const loaderLog = createLogger("extensions");
import type { Extension, ExtensionFile, LoadedExtensions } from "./types.js";
import { getExtensionRegistry } from "./registry.js";
import { join } from "path";
import { existsSync } from "fs";
import { readFile } from "fs/promises";

const DEFAULT_EXTENSIONS_GLOB = "datas/extensions/*.json";

export async function loadExtensionsFromGlob(
  pattern: string = DEFAULT_EXTENSIONS_GLOB,
  basePath: string = process.cwd()
): Promise<Extension[]> {
  const extensions: Extension[] = [];

  const { glob } = await import("glob");

  const fullPattern = join(basePath, pattern);
  const files = await glob(fullPattern);

  for (const file of files) {
    try {
      const content = await readFile(file, "utf-8");
      const parsed = JSON.parse(content) as ExtensionFile;

      if (parsed.extensions && Array.isArray(parsed.extensions)) {
        for (const ext of parsed.extensions) {
          if (ext.enabled !== false) {
            extensions.push(ext);
          }
        }
      }
    } catch (err) {
      loaderLog.warn(`Failed to load ${file}:`, err);
    }
  }

  return extensions;
}

async function loadExtensionsFromBundle(
  bundlePath: string
): Promise<LoadedExtensions> {
  const registry = getExtensionRegistry();

  const content = await readFile(bundlePath, "utf-8");
  const bundle = JSON.parse(content);

  if (bundle.$schema !== "extension-bundle-v1") {
    throw new Error("Invalid extension bundle schema");
  }

  const transformed = bundle.transformed ?? bundle;

  // Register all searchable extensions
  for (const entry of transformed.searchable ?? []) {
    registry.register({
      id: entry.id,
      type: "searchable",
      name: entry.id,
      priority: 50,
      data: { documents: entry.documents },
    });
  }

  // Register all facts
  for (const entry of transformed.facts ?? []) {
    registry.register({
      id: entry.id,
      type: "facts",
      name: entry.id,
      priority: 50,
      data: { facts: entry.facts },
    });
  }

  // Register all context sections
  for (const ctx of transformed.context ?? []) {
    registry.register({
      id: `ctx-${ctx.sectionTitle}`,
      type: "context",
      name: ctx.sectionTitle,
      priority: 50,
      data: ctx,
    });
  }

  // Register voice style
  if (transformed.voiceStyle && transformed.voiceStyle.modes?.length > 0) {
    registry.register({
      id: "bundle-voice-style",
      type: "voice-style",
      name: "Bundle Voice Style",
      priority: 50,
      data: transformed.voiceStyle,
    });
  }

  return registry.getLoadedExtensions();
}

export async function loadExtensions(
  pattern?: string,
  basePath?: string
): Promise<LoadedExtensions> {
  const registry = getExtensionRegistry();
  const base = basePath ?? process.cwd();

  // Try compiled bundle first (production)
  const bundlePath = join(base, "datas", "knowledge", "runtime", "extensions-bundle.json");
  try {
    if (existsSync(bundlePath)) {
      return await loadExtensionsFromBundle(bundlePath);
    }
  } catch {
    // Fall through to glob-based loading
  }

  // Fallback: glob-based loading (development)
  const extensions = await loadExtensionsFromGlob(pattern, basePath);
  for (const ext of extensions) {
    registry.register(ext);
  }
  return registry.getLoadedExtensions();
}

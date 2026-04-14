import { createLogger } from "../utils/logger.js";
const loaderLog = createLogger("extensions");
import type { Extension, ExtensionFile, LoadedExtensions } from "./types.js";
import { getExtensionRegistry } from "./registry.js";

const DEFAULT_EXTENSIONS_GLOB = "datas/extensions/*.json";

export async function loadExtensionsFromGlob(
  pattern: string = DEFAULT_EXTENSIONS_GLOB,
  basePath: string = process.cwd()
): Promise<Extension[]> {
  const extensions: Extension[] = [];

  const { glob } = await import("glob");
  const { readFile } = await import("fs/promises");
  const { join } = await import("path");

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

export async function loadExtensions(
  pattern?: string,
  basePath?: string
): Promise<LoadedExtensions> {
  const registry = getExtensionRegistry();
  const extensions = await loadExtensionsFromGlob(pattern, basePath);

  for (const ext of extensions) {
    registry.register(ext);
  }

  return registry.getLoadedExtensions();
}

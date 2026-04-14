import { createLogger } from "../utils/logger.js";
const extLog = createLogger("extensions");
import type {
  Extension,
  ExtensionData,
  ExtensionType,
  LoadedExtensions,
  ExtensionRegistryInterface,
  SearchableData,
  FactsData,
  ContextData,
  VoiceStyleData,
  VoiceStyleMode,
  SemanticFallbackRule,
} from "./types.js";

function compilePatterns(patterns: unknown[]): {
  compiled: RegExp[];
  errors: string[];
} {
  const compiled: RegExp[] = [];
  const errors: string[] = [];

  for (const pattern of patterns) {
    try {
      if (pattern instanceof RegExp) {
        compiled.push(pattern);
      } else if (typeof pattern === "string") {
        compiled.push(new RegExp(pattern, "i"));
      } else {
        errors.push(`Invalid pattern type: ${typeof pattern}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Failed to compile pattern "${pattern}": ${msg}`);
    }
  }

  return { compiled, errors };
}

function mergeVoiceStyleData(
  existing: VoiceStyleData | null,
  newData: VoiceStyleData,
  newPriority: number
): VoiceStyleData {
  if (!existing) {
    return { ...newData, _highestPriority: newPriority } as VoiceStyleData;
  }

  const mergedModes: VoiceStyleMode[] = [...existing.modes];
  const existingModeIds = new Set(existing.modes.map(m => m.id));

  for (const mode of newData.modes) {
    if (!existingModeIds.has(mode.id)) {
      mergedModes.push(mode);
    }
  }

  const existingPriority = existing._highestPriority ?? 0;

  return {
    modes: mergedModes,
    defaultMode: newData.defaultMode ?? existing.defaultMode,
    overallTone:
      newPriority >= existingPriority
        ? (newData.overallTone ?? existing.overallTone)
        : existing.overallTone,
    frequentExpressions: [
      ...(existing.frequentExpressions ?? []),
      ...(newData.frequentExpressions ?? []),
    ].slice(0, 10),
    _highestPriority: Math.max(existingPriority, newPriority),
  } as VoiceStyleData;
}

class ExtensionRegistry implements ExtensionRegistryInterface {
  private extensions: Map<string, Extension> = new Map();
  private loadedCache: LoadedExtensions | null = null;

  register<T extends ExtensionData>(extension: Extension<T>): void {
    if (this.extensions.has(extension.id)) {
      extLog.warn(
        `Extension "${extension.id}" already registered, overwriting`
      );
    }
    this.extensions.set(extension.id, extension);
    this.loadedCache = null;
  }

  unregister(id: string): void {
    this.extensions.delete(id);
    this.loadedCache = null;
  }

  get<T extends ExtensionData>(id: string): Extension<T> | undefined {
    return this.extensions.get(id) as Extension<T> | undefined;
  }

  getAll(): Extension[] {
    return Array.from(this.extensions.values())
      .filter(ext => ext.enabled !== false)
      .sort((a, b) => b.priority - a.priority);
  }

  getByType(type: ExtensionType): Extension[] {
    return this.getAll().filter(ext => ext.type === type);
  }

  getLoadedExtensions(): LoadedExtensions {
    if (this.loadedCache) {
      return this.loadedCache;
    }

    const result: LoadedExtensions = {
      searchable: new Map(),
      facts: new Map(),
      context: [],
      voiceStyle: null,
      semanticFallback: [],
    };

    const sorted = this.getAll();

    for (const ext of sorted) {
      switch (ext.type) {
        case "searchable": {
          result.searchable.set(ext.id, ext.data as SearchableData);
          break;
        }
        case "facts": {
          result.facts.set(ext.id, ext.data as FactsData);
          break;
        }
        case "context": {
          result.context.push(ext.data as ContextData);
          break;
        }
        case "voice-style": {
          result.voiceStyle = mergeVoiceStyleData(
            result.voiceStyle,
            ext.data as VoiceStyleData,
            ext.priority
          );
          break;
        }
        case "semantic-fallback": {
          const rulesData = ext.data as { rules: SemanticFallbackRule[] };
          for (const rule of rulesData.rules) {
            const { compiled, errors } = compilePatterns(rule.patterns);

            if (errors.length > 0) {
              for (const err of errors) {
                extLog.warn(`${ext.id}/${rule.id}: ${err}`);
              }
            }

            if (compiled.length > 0) {
              result.semanticFallback.push({
                id: rule.id,
                patterns: compiled,
                fallbackQuery: rule.fallbackQuery,
                primaryQuery: rule.primaryQuery,
                complexity: rule.complexity,
              });
            }
          }
          break;
        }
      }
    }

    this.loadedCache = result;
    return result;
  }

  clear(): void {
    this.extensions.clear();
    this.loadedCache = null;
  }
}

let globalRegistry: ExtensionRegistry | null = null;

export function getExtensionRegistry(): ExtensionRegistryInterface {
  if (!globalRegistry) {
    globalRegistry = new ExtensionRegistry();
  }
  return globalRegistry;
}

export function resetExtensionRegistry(): void {
  globalRegistry = null;
}

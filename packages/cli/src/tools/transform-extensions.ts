import { existsSync, readdirSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";

// --- Input interfaces (simple format users write) ---

export interface SimpleExtensionItem {
  title: string;
  url?: string;
  content: string;
  tags: string[];
  date?: string;
}

export interface SimpleExtensionFile {
  title: string;
  items: SimpleExtensionItem[];
  voiceHint?: string;
}

// --- Output bundle interfaces ---

export interface ExtensionBundle {
  $schema: "extension-bundle-v1";
  version: 1;
  generatedAt: string;
  source: string;
  transformed: {
    searchable: Array<{
      id: string;
      documents: Array<{
        id: string;
        title: string;
        url: string;
        excerpt: string;
        content: string;
        categories: string[];
        dateTime: number;
        keyPoints: string[];
      }>;
    }>;
    facts: Array<{
      id: string;
      facts: Array<{
        id: string;
        category: string;
        statement: string;
        evidence: string;
        confidence: number;
        tags: string[];
        lang: string;
      }>;
    }>;
    context: Array<{
      sectionTitle: string;
      content: string;
      position: "before-articles";
    }>;
    voiceStyle: {
      modes: Array<{
        id: string;
        name: string;
        description: string;
        matchKeywords: string[];
        traits: string[];
      }>;
      overallTone?: string;
    } | null;
  };
}

// --- Utility functions ---

function hasCJK(text: string): boolean {
  return /[\u4e00-\u9fff\u3400-\u4dbf]/.test(text);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + "…";
}

// --- Transform a single simple extension file ---

function transformSimpleFile(
  file: SimpleExtensionFile,
  fileName: string
): ExtensionBundle {
  const allTags = file.items.flatMap((item) => item.tags);
  const uniqueTags = [...new Set(allTags)];

  // Build searchable
  const searchable = file.items.map((item) => {
    const itemId = slugify(item.title);
    return {
      id: itemId,
      documents: [
        {
          id: itemId,
          title: item.title,
          url: item.url ?? "",
          excerpt: truncate(item.content, 200),
          content: item.content,
          categories: item.tags,
          dateTime: item.date ? new Date(item.date).getTime() : Date.now(),
          keyPoints: item.tags.slice(0, 3),
        },
      ],
    };
  });

  // Build facts — 2 facts per item (author fact + tag-derived facts)
  const facts = file.items.map((item) => {
    const itemId = slugify(item.title);
    const lang = hasCJK(item.content) ? "zh" : "en";
    const itemFacts: ExtensionBundle["transformed"]["facts"][number]["facts"] = [];

    // Fact 1: author content fact
    itemFacts.push({
      id: `${itemId}-author`,
      category: "author",
      statement: `博主在「${file.title}」相关领域有内容：${item.title}`,
      evidence: item.url ?? "",
      confidence: 0.9,
      tags: item.tags,
      lang,
    });

    // Fact 2: tag-derived facts (limit 5 per item)
    const tagFacts = item.tags.slice(0, 5);
    for (const tag of tagFacts) {
      itemFacts.push({
        id: `${itemId}-tag-${slugify(tag)}`,
        category: "tech",
        statement: `博主了解 ${tag}`,
        evidence: item.url ?? "",
        confidence: 0.8,
        tags: [tag],
        lang,
      });
    }

    return {
      id: itemId,
      facts: itemFacts,
    };
  });

  // Build context — one section per file
  const context: ExtensionBundle["transformed"]["context"] = [
    {
      sectionTitle: `关于「${file.title}」的额外知识`,
      content: `## 关于「${file.title}」的额外知识\n作者在以下方面有 ${file.items.length} 条外部记录：${uniqueTags.join("、")}。`,
      position: "before-articles",
    },
  ];

  // Build voiceStyle — only if voiceHint is present
  const voiceStyle = file.voiceHint
    ? {
        modes: [
          {
            id: slugify(file.title),
            name: file.title,
            description: file.voiceHint,
            matchKeywords: uniqueTags.slice(0, 8),
            traits: [file.voiceHint],
          },
        ],
      }
    : null;

  return {
    $schema: "extension-bundle-v1",
    version: 1,
    generatedAt: new Date().toISOString(),
    source: fileName,
    transformed: {
      searchable,
      facts,
      context,
      voiceStyle,
    },
  };
}

// --- Main entry: transform all extensions ---

export async function transformAllExtensions(
  extensionsDir: string,
  outputDir: string
): Promise<void> {
  if (!existsSync(extensionsDir)) {
    console.log("  ⚠️  Extensions directory not found: " + extensionsDir);
    return;
  }

  const entries = readdirSync(extensionsDir).filter(
    (e) => e.endsWith(".json") && !e.startsWith("_")
  );

  if (entries.length === 0) {
    console.log("  ⚠️  No extension files found in " + extensionsDir);
    return;
  }

  // Ensure output directories exist
  const individualDir = join(outputDir, "extensions");
  mkdirSync(outputDir, { recursive: true });
  mkdirSync(individualDir, { recursive: true });

  // Combined bundle accumulators
  const combinedSearchable: ExtensionBundle["transformed"]["searchable"] = [];
  const combinedFacts: ExtensionBundle["transformed"]["facts"] = [];
  const combinedContext: ExtensionBundle["transformed"]["context"] = [];
  let combinedVoiceStyle: ExtensionBundle["transformed"]["voiceStyle"] = null;

  let transformedCount = 0;
  let skippedCount = 0;

  for (const entry of entries) {
    const filePath = join(extensionsDir, entry);

    try {
      const content = readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(content);

      // Check if it's the OLD format ($schema + extensions array)
      if (parsed.$schema && Array.isArray(parsed.extensions)) {
        console.log("  ⏭️  Skipping old-format file: " + entry);
        skippedCount++;
        continue;
      }

      // Try to validate as simple format
      if (
        typeof parsed.title !== "string" ||
        !Array.isArray(parsed.items)
      ) {
        console.log("  ⚠️  Skipping unrecognized format: " + entry);
        skippedCount++;
        continue;
      }

      const simpleFile = parsed as SimpleExtensionFile;
      const bundle = transformSimpleFile(simpleFile, entry);

      // Write individual bundle for debugging
      const individualPath = join(
        individualDir,
        entry.replace(/\.json$/, ".bundle.json")
      );
      writeFileSync(individualPath, JSON.stringify(bundle, null, 2), "utf-8");

      // Accumulate into combined
      combinedSearchable.push(...bundle.transformed.searchable);
      combinedFacts.push(...bundle.transformed.facts);
      combinedContext.push(...bundle.transformed.context);

      // Merge voiceStyle
      if (bundle.transformed.voiceStyle) {
        if (!combinedVoiceStyle) {
          combinedVoiceStyle = {
            modes: [...bundle.transformed.voiceStyle.modes],
            overallTone: bundle.transformed.voiceStyle.overallTone,
          };
        } else {
          combinedVoiceStyle.modes.push(
            ...bundle.transformed.voiceStyle.modes
          );
          if (bundle.transformed.voiceStyle.overallTone) {
            combinedVoiceStyle.overallTone =
              bundle.transformed.voiceStyle.overallTone;
          }
        }
      }

      transformedCount++;
    } catch (err) {
      console.log(
        "  ❌ Failed to process " +
          entry +
          ": " +
          (err instanceof Error ? err.message : String(err))
      );
    }
  }

  // Write combined bundle
  const combinedBundle = {
    $schema: "extension-bundle-v1" as const,
    version: 1,
    generatedAt: new Date().toISOString(),
    source: "combined",
    transformed: {
      searchable: combinedSearchable,
      facts: combinedFacts,
      context: combinedContext,
      voiceStyle: combinedVoiceStyle,
    },
  };

  const combinedPath = join(outputDir, "extensions-bundle.json");
  writeFileSync(combinedPath, JSON.stringify(combinedBundle, null, 2), "utf-8");

  // Print summary
  console.log("\n  📊 Transform Summary:");
  console.log("     Files processed: " + transformedCount);
  console.log("     Files skipped: " + skippedCount);
  console.log("     Searchable entries: " + combinedSearchable.length);
  console.log("     Fact groups: " + combinedFacts.length);
  console.log("     Context sections: " + combinedContext.length);
  console.log("     Voice style modes: " + (combinedVoiceStyle?.modes.length ?? 0));
  console.log("     Bundle written: " + combinedPath);
}

import type {
  LoadedExtensions,
  VoiceStyleMode,
  PromptContext,
  ContextData,
  SemanticFallbackRule,
} from "./types.js";
import type { ArticleContext, ProjectContext } from "../search/types.js";
import type { Fact } from "../fact-registry/types.js";

export function resolveVoiceStyleMode(
  query: string,
  categories: string[],
  extensions: LoadedExtensions
): VoiceStyleMode | null {
  const voiceStyle = extensions.voiceStyle;
  if (!voiceStyle || !voiceStyle.modes.length) return null;

  const lowerQuery = query.toLowerCase();

  for (const mode of voiceStyle.modes) {
    if (mode.matchKeywords) {
      for (const keyword of mode.matchKeywords) {
        if (lowerQuery.includes(keyword.toLowerCase())) {
          return mode;
        }
      }
    }
  }

  for (const mode of voiceStyle.modes) {
    if (mode.matchCategories) {
      for (const category of categories) {
        if (mode.matchCategories.includes(category)) {
          return mode;
        }
      }
    }
  }

  if (voiceStyle.defaultMode) {
    return voiceStyle.modes.find(m => m.id === voiceStyle.defaultMode) ?? null;
  }

  return null;
}

export function buildVoiceStylePrompt(
  mode: VoiceStyleMode | null,
  extensions: LoadedExtensions
): string {
  const voiceStyle = extensions.voiceStyle;
  if (!voiceStyle) return "";

  const lines: string[] = ["## 语言风格（L5 style_only，仅影响表达）"];

  if (voiceStyle.overallTone) {
    lines.push(`语气基调：${voiceStyle.overallTone}`);
  }

  if (voiceStyle.frequentExpressions?.length) {
    const words = voiceStyle.frequentExpressions.slice(0, 6).join("、");
    lines.push(`高频表达：${words}`);
  }

  if (mode) {
    lines.push("");
    lines.push(`当前回答风格模式：${mode.description}（${mode.name}）`);
    lines.push("本轮表达参考：");
    for (const trait of mode.traits.slice(0, 4)) {
      lines.push(`- ${trait}`);
    }
  }

  return lines.join("\n");
}

export function buildContextSections(
  context: PromptContext,
  extensions: LoadedExtensions
): string {
  const sections: string[] = [];

  for (const ctx of extensions.context) {
    if (ctx.matchCondition) {
      const { queryPatterns, categories, tags } = ctx.matchCondition;

      if (queryPatterns?.length) {
        const matches = queryPatterns.some(p => p.test(context.userQuery));
        if (!matches) continue;
      }

      if (categories?.length) {
        const articleCategories = new Set(
          context.articles.flatMap(a => a.categories ?? [])
        );
        const hasMatch = categories.some(c => articleCategories.has(c));
        if (!hasMatch) continue;
      }

      if (tags?.length) {
        const articleTags = new Set(
          context.articles.flatMap(a => a.keyPoints ?? [])
        );
        const hasMatch = tags.some(t => articleTags.has(t));
        if (!hasMatch) continue;
      }
    }

    const content =
      typeof ctx.content === "function" ? ctx.content(context) : ctx.content;

    if (content) {
      sections.push(`## ${ctx.sectionTitle}\n${content}`);
    }
  }

  return sections.join("\n\n");
}

function replaceCaptureGroups(
  template: string,
  match: RegExpMatchArray
): string {
  return template.replace(/\$(\d+)/g, (_, groupIndex: string) => {
    const index = parseInt(groupIndex, 10);
    return match[index] ?? "";
  });
}

export function getSemanticFallback(
  query: string,
  extensions: LoadedExtensions
): { query: string; primaryQuery?: string; complexity?: string } | null {
  for (const rule of extensions.semanticFallback) {
    for (const pattern of rule.patterns) {
      const match = pattern.exec(query);
      if (match) {
        const fallbackQuery = rule.fallbackQuery.includes("$")
          ? replaceCaptureGroups(rule.fallbackQuery, match)
          : rule.fallbackQuery;

        const primaryQuery = rule.primaryQuery?.includes("$")
          ? replaceCaptureGroups(rule.primaryQuery, match)
          : rule.primaryQuery;

        return {
          query: fallbackQuery,
          primaryQuery,
          complexity: rule.complexity,
        };
      }
    }
  }
  return null;
}

export function mergeSearchDocuments(
  baseDocuments: ArticleContext[],
  extensions: LoadedExtensions
): ArticleContext[] {
  const allDocs = [...baseDocuments];

  for (const [, data] of extensions.searchable) {
    for (const doc of data.documents) {
      allDocs.push({
        title: doc.title,
        url: doc.url,
        summary: doc.excerpt,
        keyPoints: doc.keyPoints ?? [],
        categories: doc.categories,
        dateTime: doc.dateTime,
        score: 0,
      });
    }
  }

  return allDocs;
}

export function mergeFacts(
  baseFacts: Fact[],
  extensions: LoadedExtensions
): Fact[] {
  const allFacts: Fact[] = [...baseFacts];

  for (const [, data] of extensions.facts) {
    for (const fact of data.facts) {
      allFacts.push({
        id: fact.id,
        category: fact.category as Fact["category"],
        statement: fact.statement,
        evidence: fact.evidence ?? "",
        source: "explicit",
        confidence: fact.confidence,
        tags: fact.tags,
        lang: fact.lang,
      });
    }
  }

  return allFacts;
}

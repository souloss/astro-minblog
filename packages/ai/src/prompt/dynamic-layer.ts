import type { DynamicLayerConfig } from "./types.js";
import { sanitizePromptInput } from "../utils/text.js";
import type {
  PromptContext,
  ContextData,
  LoadedExtensions,
} from "../extensions/types.js";
import { getLang } from "../utils/i18n.js";

const LABELS = {
  zh: {
    relatedContent: "与当前问题相关的内容",
    relatedArticles: "相关文章",
    relatedProjects: "相关项目",
    summary: "摘要",
    keyPoints: "要点",
    excerpt: "内容节选",
    readingTime: (minutes: number) => `阅读时间：约 ${minutes} 分钟`,
    instruction: (query: string) =>
      `基于以上内容回答用户关于「${query}」的问题。如果以上内容与问题不相关，如实告知并提供力所能及的帮助。`,
    answerModeHint: (mode: string) => {
      const hints: Record<string, string> = {
        fact: "当前为事实查询模式：先给结论，再补依据；如有直接对应的文章，点明标题或给出链接。",
        count: "当前为计数模式：第一句先说数字或「至少 X」，禁止伪精确。",
        list: "当前为列表模式：直接列 2-6 项同一维度的内容。",
        opinion:
          "当前为观点模式：先「我觉得/我的看法是」，再用 2-3 个观点展开。",
        recommendation: "当前为推荐模式：先给 2-4 个推荐项，再说明理由。",
        unknown:
          "当前为未知/隐私模式：第一句必须包含「未公开」或「不提供」，1-2 句收尾。",
        general: "",
      };
      return hints[mode] || "";
    },
  },
  en: {
    relatedContent: "Content related to the current question",
    relatedArticles: "Related Articles",
    relatedProjects: "Related Projects",
    summary: "Summary",
    keyPoints: "Key points",
    excerpt: "Excerpt",
    readingTime: (minutes: number) => `Reading time: ~${minutes} min`,
    instruction: (query: string) =>
      `Answer the user's question about "${query}" based on the content above. If the above content is not relevant, say so honestly and provide whatever help you can.`,
    answerModeHint: (mode: string) => {
      const hints: Record<string, string> = {
        fact: "Current mode: fact query. Give conclusion first, then supporting evidence; cite article title/link if directly relevant.",
        count:
          'Current mode: count query. State the number or "at least X" in the first sentence; avoid false precision.',
        list: "Current mode: list query. List 2-6 items of the same dimension directly.",
        opinion:
          'Current mode: opinion query. Start with "I think / In my view", then expand with 2-3 clear points.',
        recommendation:
          "Current mode: recommendation query. Give 2-4 recommendations first, then explain why.",
        unknown:
          'Current mode: unknown/privacy query. First sentence must include "not disclosed" or "not available", wrap up in 1-2 sentences.',
        general: "",
      };
      return hints[mode] || "";
    },
  },
} as const;

interface ContextSectionsByPosition {
  beforeArticles: string[];
  afterArticles: string[];
  beforeFacts: string[];
  afterFacts: string[];
}

function matchesCondition(
  ctx: ContextData,
  promptContext: PromptContext
): boolean {
  if (!ctx.matchCondition) return true;

  const { queryPatterns, categories, tags } = ctx.matchCondition;

  if (queryPatterns?.length) {
    const matches = queryPatterns.some(p => p.test(promptContext.userQuery));
    if (!matches) return false;
  }

  if (categories?.length) {
    const articleCategories = new Set(
      promptContext.articles.flatMap(a => a.categories ?? [])
    );
    const hasMatch = categories.some(c => articleCategories.has(c));
    if (!hasMatch) return false;
  }

  if (tags?.length) {
    const articleTags = new Set(
      promptContext.articles.flatMap(a => a.keyPoints ?? [])
    );
    const hasMatch = tags.some(t => articleTags.has(t));
    if (!hasMatch) return false;
  }

  return true;
}

function getContextSectionsByPosition(
  extensions: LoadedExtensions | undefined,
  promptContext: PromptContext
): ContextSectionsByPosition {
  const result: ContextSectionsByPosition = {
    beforeArticles: [],
    afterArticles: [],
    beforeFacts: [],
    afterFacts: [],
  };

  if (!extensions?.context?.length) return result;

  const positionMap: Record<string, keyof ContextSectionsByPosition> = {
    "before-articles": "beforeArticles",
    "after-articles": "afterArticles",
    "before-facts": "beforeFacts",
    "after-facts": "afterFacts",
  };

  for (const ctx of extensions.context) {
    if (!matchesCondition(ctx, promptContext)) continue;

    const content =
      typeof ctx.content === "function"
        ? ctx.content(promptContext)
        : ctx.content;

    if (content) {
      const section = `## ${ctx.sectionTitle}\n${content}`;
      const positionKey = positionMap[ctx.position];
      if (positionKey) {
        result[positionKey].push(section);
      }
    }
  }

  return result;
}

export function buildDynamicLayer(config: DynamicLayerConfig): string {
  const {
    userQuery,
    articles,
    projects,
    evidenceSection,
    factSection,
    answerMode,
    extensions,
  } = config;
  const lang = getLang(config.lang);
  const l = LABELS[lang];

  const promptContext: PromptContext = {
    userQuery,
    lang,
    articles,
    projects,
  };

  const contextSections = getContextSectionsByPosition(
    extensions,
    promptContext
  );

  const hasContextSections = Object.values(contextSections).some(
    arr => arr.length > 0
  );

  if (
    !articles.length &&
    !projects.length &&
    !factSection &&
    !evidenceSection &&
    !config.chunksSection &&
    !hasContextSections
  )
    return "";

  const lines: string[] = [];
  lines.push(`## ${l.relatedContent}`);

  const chunksSection = config.chunksSection || "";
  const preferInjectedChunks =
    config.preferInjectedChunks === true && !!chunksSection;

  if (chunksSection) {
    lines.push("");
    lines.push("### 当前文章相关原文段落");
    lines.push(
      "回答当前文章局部阅读问题时，优先依据下面这些原文段落，而不是只依据摘要。"
    );
    lines.push(
      "每个段落标注了 [段落 N] 编号（N 从 0 递增），代表文章的阅读顺序。" +
        "段落的展示顺序可能因用户关注区域而调整，不一定是 0→N 顺序。"
    );
    lines.push(
      '【重要】当用户引用原文片段问"后面是什么"或"前面是什么"时：' +
        "1) 在下方段落中找到包含该片段的段落编号 N；" +
        '2) "后面是什么" = 引用 [段落 N+1] 的完整原文内容；' +
        '3) "前面是什么" = 引用 [段落 N-1] 的完整原文内容。' +
        "必须引用对应编号段落的原文，不要重复已引用的段落，不要概括或改写。"
    );
    lines.push(chunksSection);
    lines.push("");
  }

  if (contextSections.beforeArticles.length > 0) {
    lines.push("");
    lines.push(contextSections.beforeArticles.join("\n\n"));
  }

  if (articles.length) {
    lines.push("");
    lines.push(`### ${l.relatedArticles}`);

    for (const article of articles.slice(0, 8)) {
      lines.push(`**[${article.title}](${article.url})**`);
      if (article.readingTime) lines.push(l.readingTime(article.readingTime));
      if (!preferInjectedChunks && article.summary)
        lines.push(`${l.summary}：${article.summary.slice(0, 120)}`);
      if (!preferInjectedChunks && article.keyPoints.length) {
        lines.push(
          `${l.keyPoints}：${article.keyPoints.slice(0, 3).join("；")}`
        );
      }
      if (!preferInjectedChunks && article.fullContent) {
        lines.push(`${l.excerpt}：${article.fullContent.slice(0, 600)}`);
      }
      lines.push("");
    }
  }

  if (contextSections.afterArticles.length > 0) {
    lines.push(contextSections.afterArticles.join("\n\n"));
  }

  if (projects.length) {
    lines.push(`### ${l.relatedProjects}`);
    for (const project of projects.slice(0, 4)) {
      lines.push(
        `- **[${project.name}](${project.url})**：${project.description.slice(0, 100)}`
      );
    }
    lines.push("");
  }

  if (contextSections.beforeFacts.length > 0) {
    lines.push(contextSections.beforeFacts.join("\n\n"));
  }

  if (factSection) {
    lines.push(factSection);
    lines.push("");
  }

  if (contextSections.afterFacts.length > 0) {
    lines.push(contextSections.afterFacts.join("\n\n"));
  }

  if (evidenceSection) {
    lines.push(evidenceSection);
  }

  lines.push(`---`);
  lines.push(l.instruction(sanitizePromptInput(userQuery, 50)));

  if (answerMode && answerMode !== "general") {
    const hint = l.answerModeHint(answerMode);
    if (hint) {
      lines.push("");
      lines.push(hint);
    }
  }

  return lines.join("\n");
}

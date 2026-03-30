import { getLang } from "../utils/i18n.js";
import type { Fact, FactCategory } from "./types.js";

const CATEGORY_LABELS: Record<string, Record<FactCategory, string>> = {
  zh: {
    author: "关于作者",
    blog: "博客数据",
    content: "内容事实",
    project: "项目信息",
    tech: "技术相关",
  },
  en: {
    author: "About the Author",
    blog: "Blog Statistics",
    content: "Content Facts",
    project: "Project Info",
    tech: "Tech Related",
  },
};

const SECTION_TEXT = {
  zh: {
    title: "已验证事实（基于博客真实数据）",
    instruction:
      "以上事实来自博客的真实数据。回答时优先使用这些已验证的事实，不要编造与之矛盾的信息。如果某个问题的答案不在已验证事实中，请如实说明。",
  },
  en: {
    title: "Verified Facts (based on real blog data)",
    instruction:
      "The above facts are derived from real blog data. Prioritize these verified facts when answering. Do not fabricate information that contradicts them. If the answer is not among verified facts, state that honestly.",
  },
} as const;

/**
 * Formats matched facts into a prompt section ready for injection.
 * Groups facts by category with clear structure.
 */
export function buildFactSection(facts: Fact[], lang: string = "zh"): string {
  if (!facts.length) return "";

  const l = getLang(lang);
  const labels = CATEGORY_LABELS[l];
  const text = SECTION_TEXT[l];

  // Group by category
  const grouped = new Map<FactCategory, Fact[]>();
  for (const fact of facts) {
    const group = grouped.get(fact.category) ?? [];
    group.push(fact);
    grouped.set(fact.category, group);
  }

  const lines: string[] = [];
  lines.push(`## ${text.title}`);

  for (const [category, categoryFacts] of grouped) {
    const label = labels[category] ?? category;
    lines.push("");
    lines.push(`### ${label}`);
    for (const fact of categoryFacts) {
      lines.push(`- ${fact.statement}`);
    }
  }

  lines.push("");
  lines.push(`> ${text.instruction}`);

  return lines.join("\n");
}

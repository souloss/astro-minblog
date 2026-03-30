import type { SemiStaticLayerConfig } from "./types.js";
import { t, getLang } from "../utils/i18n.js";

export function buildSemiStaticLayer(config: SemiStaticLayerConfig): string {
  const { authorContext, lang: configLang, preferArticleLocal } = config;
  if (!authorContext) return "";

  const lang = getLang(configLang);
  const lines: string[] = [];
  const { posts } = authorContext;

  if (!posts.length) return "";

  const totalPosts = posts.length;
  const categories = [...new Set(posts.map(p => p.category).filter(Boolean))];
  const recentPosts = posts
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  if (!preferArticleLocal) {
    lines.push("## " + t("ai.semiStatic.blogOverview", lang));
    lines.push(
      "- " + t("ai.semiStatic.totalPosts", lang, { count: totalPosts })
    );
    if (categories.length) {
      lines.push(
        "- " +
          t("ai.semiStatic.mainCategories", lang, {
            categories: categories
              .slice(0, 8)
              .join(lang === "zh" ? "、" : ", "),
          })
      );
    }

    lines.push("");
    lines.push("## " + t("ai.semiStatic.latestArticles", lang));
    for (const post of recentPosts) {
      const date = post.date
        ? new Date(post.date).toISOString().slice(0, 10)
        : "";
      const summary = post.summary ? ` — ${post.summary.slice(0, 60)}` : "";
      lines.push(
        `- [${post.title}](${post.url})${date ? ` (${date})` : ""}${summary}`
      );
    }
  }

  return lines.join("\n");
}

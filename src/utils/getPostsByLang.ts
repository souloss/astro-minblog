import type { CollectionEntry } from "astro:content";

/**
 * Detect language from post id/path.
 * Posts under zh/ → "zh", posts under en/ → "en".
 * Root-level posts default to "zh".
 */
export function getPostLang(post: CollectionEntry<"blog">): "zh" | "en" {
  const id = post.id;
  if (id.startsWith("zh/")) return "zh";
  if (id.startsWith("en/")) return "en";
  return "zh";
}

/**
 * Filter blog posts by language (directory-based).
 */
export function getPostsByLang(
  posts: CollectionEntry<"blog">[],
  lang: "zh" | "en" | string
): CollectionEntry<"blog">[] {
  return posts.filter(post => getPostLang(post) === lang);
}

export default getPostsByLang;

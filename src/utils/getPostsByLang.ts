import type { CollectionEntry } from "astro:content";

/**
 * Detect language from post filePath (directory-based).
 * Posts under .../zh/ → "zh", posts under .../en/ → "en".
 * Fallback: check id for "zh/" or "en/" prefix. Default "zh".
 */
export function getPostLang(post: CollectionEntry<"blog">): "zh" | "en" {
  const path = post.filePath ?? post.id;
  if (path.includes("/zh/")) return "zh";
  if (path.includes("/en/")) return "en";
  if (post.id.startsWith("zh/")) return "zh";
  if (post.id.startsWith("en/")) return "en";
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

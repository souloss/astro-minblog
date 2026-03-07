import type { CollectionEntry } from "astro:content";
import { slugifyStr } from "./slugify";

/**
 * Calculate content similarity score between two posts
 * based on shared tags and category overlap.
 */
function getSimilarityScore(
  a: CollectionEntry<"blog">,
  b: CollectionEntry<"blog">
): number {
  if (a.id === b.id) return -1;

  let score = 0;

  const aTags = new Set(a.data.tags.map(t => slugifyStr(t)));
  const bTags = new Set(b.data.tags.map(t => slugifyStr(t)));
  for (const tag of aTags) {
    if (bTags.has(tag)) score += 3;
  }

  if (a.data.category && b.data.category) {
    if (a.data.category === b.data.category) {
      score += 5;
    } else {
      const aParts = a.data.category.split("/");
      const bParts = b.data.category.split("/");
      if (aParts[0] === bParts[0]) score += 2;
    }
  }

  if (a.data.series && b.data.series && a.data.series.name === b.data.series.name) {
    score += 4;
  }

  return score;
}

/**
 * Get related posts sorted by similarity score.
 */
export function getRelatedPosts(
  currentPost: CollectionEntry<"blog">,
  allPosts: CollectionEntry<"blog">[],
  count = 3
): CollectionEntry<"blog">[] {
  return allPosts
    .map(post => ({ post, score: getSimilarityScore(currentPost, post) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map(({ post }) => post);
}

export default getRelatedPosts;

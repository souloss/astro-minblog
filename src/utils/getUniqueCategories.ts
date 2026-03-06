import type { CollectionEntry } from "astro:content";

export type CategoryEntry = { category: string };

const getUniqueCategories = (
  posts: CollectionEntry<"blog">[]
): CategoryEntry[] => {
  const categories = new Set<string>();

  posts.forEach(post => {
    if (post.data.category) {
      categories.add(post.data.category);
    }
  });

  return Array.from(categories)
    .sort((a, b) => a.localeCompare(b))
    .map(category => ({ category }));
};

export default getUniqueCategories;

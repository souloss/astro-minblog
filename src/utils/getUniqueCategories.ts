import type { CollectionEntry } from "astro:content";

export type CategoryEntry = { category: string; count: number };

export type CategoryTreeNode = {
  name: string;
  fullPath: string;
  count: number;
  children: CategoryTreeNode[];
};

const getUniqueCategories = (
  posts: CollectionEntry<"blog">[]
): CategoryEntry[] => {
  const countMap = new Map<string, number>();

  posts.forEach(post => {
    if (post.data.category) {
      countMap.set(
        post.data.category,
        (countMap.get(post.data.category) ?? 0) + 1
      );
    }
  });

  return Array.from(countMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, count]) => ({ category, count }));
};

export function getCategoryTree(
  posts: CollectionEntry<"blog">[]
): CategoryTreeNode[] {
  const flat = getUniqueCategories(posts);
  const root: CategoryTreeNode[] = [];

  for (const { category, count } of flat) {
    const parts = category.split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const fullPath = parts.slice(0, i + 1).join("/");
      let node = current.find(n => n.fullPath === fullPath);

      if (!node) {
        node = { name: parts[i], fullPath, count: 0, children: [] };
        current.push(node);
      }

      if (i === parts.length - 1) {
        node.count = count;
      }

      current = node.children;
    }
  }

  return root;
}

/**
 * Get all category paths including parent categories (for generating category pages).
 * This extracts all possible category paths from the category tree.
 */
export function getAllCategoryPaths(tree: CategoryTreeNode[]): string[] {
  const paths: string[] = [];

  function traverse(nodes: CategoryTreeNode[]) {
    for (const node of nodes) {
      paths.push(node.fullPath);
      if (node.children.length > 0) {
        traverse(node.children);
      }
    }
  }

  traverse(tree);
  return paths;
}

export default getUniqueCategories;

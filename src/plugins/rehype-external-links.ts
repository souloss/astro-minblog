/* eslint-disable @typescript-eslint/no-explicit-any */

interface HastNode {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

/**
 * Rehype plugin that adds `rel="nofollow noopener noreferrer"` and
 * `target="_blank"` to external links (those starting with `http`).
 */
export function rehypeExternalLinks() {
  return function (tree: HastNode) {
    walkLinks(tree);
  };
}

function walkLinks(node: HastNode) {
  if (
    node.type === "element" &&
    node.tagName === "a" &&
    node.properties
  ) {
    const href = node.properties.href as string | undefined;
    if (href && /^https?:\/\//.test(href)) {
      node.properties.target = "_blank";
      node.properties.rel = "nofollow noopener noreferrer";
    }
  }
  if (node.children) {
    for (const child of node.children) {
      walkLinks(child);
    }
  }
}

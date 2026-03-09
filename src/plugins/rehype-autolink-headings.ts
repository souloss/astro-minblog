/* eslint-disable @typescript-eslint/no-explicit-any */

interface HastNode {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
  value?: string;
}

const HEADING_RE = /^h[1-6]$/;

/**
 * Rehype plugin that prepends a `#` anchor link to headings that have an `id`.
 */
export function rehypeAutolinkHeadings() {
  return function (tree: HastNode) {
    walkHeadings(tree);
  };
}

function walkHeadings(node: HastNode) {
  if (
    node.type === "element" &&
    node.tagName &&
    HEADING_RE.test(node.tagName) &&
    node.properties?.id
  ) {
    const link: HastNode = {
      type: "element",
      tagName: "a",
      properties: {
        href: `#${node.properties.id}`,
        class: "heading-anchor",
        ariaHidden: "true",
        tabIndex: -1,
      },
      children: [{ type: "text", value: "#" }],
    };
    node.children = node.children || [];
    node.children.unshift(link);
  }
  if (node.children) {
    for (const child of node.children) {
      walkHeadings(child);
    }
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */

interface HastNode {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

/**
 * Rehype plugin that wraps `<table>` elements in a scrollable container
 * to prevent horizontal overflow on mobile.
 */
export function rehypeTableScroll() {
  return function (tree: HastNode) {
    walkAndWrapTables(tree);
  };
}

function walkAndWrapTables(node: HastNode) {
  if (!node.children) return;

  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    if (child.type === "element" && child.tagName === "table") {
      const wrapper: HastNode = {
        type: "element",
        tagName: "div",
        properties: { className: ["overflow-x-auto", "w-full"] },
        children: [child],
      };
      node.children[i] = wrapper;
    } else {
      walkAndWrapTables(child);
    }
  }
}

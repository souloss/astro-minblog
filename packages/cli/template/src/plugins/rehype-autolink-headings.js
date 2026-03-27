const HEADING_RE = /^h[1-6]$/;

function walkHeadings(node) {
  if (
    node?.type === "element" &&
    node.tagName &&
    HEADING_RE.test(node.tagName) &&
    node.properties?.id
  ) {
    const link = {
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
  if (node?.children) {
    for (const child of node.children) walkHeadings(child);
  }
}

export function rehypeAutolinkHeadings() {
  return function (tree) {
    walkHeadings(tree);
  };
}

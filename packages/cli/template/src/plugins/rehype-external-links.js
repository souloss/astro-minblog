function walkLinks(node) {
  if (node?.type === "element" && node.tagName === "a" && node.properties) {
    const href = node.properties.href;
    if (typeof href === "string" && /^https?:\/\//.test(href)) {
      node.properties.target = "_blank";
      node.properties.rel = "nofollow noopener noreferrer";
    }
  }
  if (node?.children) {
    for (const child of node.children) walkLinks(child);
  }
}

export function rehypeExternalLinks() {
  return function (tree) {
    walkLinks(tree);
  };
}

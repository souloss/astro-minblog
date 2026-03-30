function walkAndWrapTables(node) {
  if (!node?.children) return;

  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    if (child?.type === "element" && child.tagName === "table") {
      node.children[i] = {
        type: "element",
        tagName: "div",
        properties: { className: ["overflow-x-auto", "w-full"] },
        children: [child],
      };
    } else {
      walkAndWrapTables(child);
    }
  }
}

export function rehypeTableScroll() {
  return function (tree) {
    walkAndWrapTables(tree);
  };
}

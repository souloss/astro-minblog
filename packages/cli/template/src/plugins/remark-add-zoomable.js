function visitImages(node, fn) {
  if (node?.type === "image") fn(node);
  if (node?.children) {
    for (const child of node.children) visitImages(child, fn);
  }
}

export function remarkAddZoomable({ className = "zoomable" } = {}) {
  return function (tree) {
    visitImages(tree, node => {
      node.data = node.data || {};
      node.data.hProperties = node.data.hProperties || {};
      node.data.hProperties.class = className;
    });
  };
}

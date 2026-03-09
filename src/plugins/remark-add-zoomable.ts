/* eslint-disable @typescript-eslint/no-explicit-any */

interface MdastNode {
  type: string;
  children?: MdastNode[];
  data?: { hProperties?: Record<string, unknown>; [key: string]: unknown };
}

function visitImages(node: MdastNode, fn: (n: MdastNode) => void) {
  if (node.type === "image") fn(node);
  if (node.children) {
    for (const child of node.children) {
      visitImages(child, fn);
    }
  }
}

/**
 * Remark plugin that adds a `zoomable` class to all images,
 * enabling click-to-zoom via the lightbox script.
 */
export function remarkAddZoomable({ className = "zoomable" } = {}) {
  return function (tree: MdastNode) {
    visitImages(tree, node => {
      node.data = node.data || {};
      node.data.hProperties = node.data.hProperties || {};
      (node.data.hProperties as Record<string, unknown>).class = className;
    });
  };
}

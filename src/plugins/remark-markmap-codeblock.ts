import { visit } from "unist-util-visit";

/**
 * Remark plugin to transform markmap code blocks into pre elements for client-side rendering
 */
export function remarkMarkmapCodeblock() {
  return (tree: any) => {
    visit(tree, "code", (node, index, parent) => {
      if (node.lang === "markmap" && parent && typeof index === "number") {
        const markmapDiv = {
          type: "html",
          value: `<pre class="markmap">${node.value}</pre>`,
        };
        parent.children[index] = markmapDiv;
      }
    });
  };
}

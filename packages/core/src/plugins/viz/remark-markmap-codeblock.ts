import { visit } from "unist-util-visit";
import type { Root, Code, Html, Parent } from "mdast";
import { Transformer } from "markmap-lib";

const transformer = new Transformer();

export function remarkMarkmapCodeblock() {
  return (tree: Root) => {
    visit(tree, "code", (node: Code, index: number | undefined, parent: Parent | undefined) => {
      if (node.lang === "markmap" && parent && typeof index === "number") {
        const markdownContent = node.value;
        
        const { root } = transformer.transform(markdownContent);
        
        // Encode the source markdown as a data attribute for the code view toggle
        const encodedSource = markdownContent
          .replace(/&/g, '&amp;')
          .replace(/"/g, '&quot;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');

        const markmapDiv: Html = {
          type: "html",
          value: `<div class="markmap-wrap" data-viz-type="markmap" data-source="${encodedSource}"><script type="application/json">${JSON.stringify(root)}</script><script type="application/json">{}</script></div>`,
        };
        parent.children[index] = markmapDiv;
      }
    });
  };
}
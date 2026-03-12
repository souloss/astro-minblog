import { visit } from "unist-util-visit";
import type { Root, Code, Html, Parent } from "mdast";

/**
 * Remark plugin to transform markmap code blocks into markmap visualizations.
 * 
 * This is a lightweight alternative to remark-markmap.
 * For full rendering support (CDN scripts, toolbar, etc.), use remark-markmap directly.
 * 
 * When using this plugin, include MarkmapInit.astro for client-side rendering.
 */
export function remarkMarkmapCodeblock() {
  return (tree: Root) => {
    visit(tree, "code", (node: Code, index: number | undefined, parent: Parent | undefined) => {
      if (node.lang === "markmap" && parent && typeof index === "number") {
        // Transform the code block into a pre element for client-side rendering
        const markmapDiv: Html = {
          type: "html",
          value: `<pre class="markmap">${node.value}</pre>`,
        };
        parent.children[index] = markmapDiv;
      }
    });
  };
}

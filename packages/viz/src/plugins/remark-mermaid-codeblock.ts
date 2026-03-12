import { visit } from "unist-util-visit";
import type { Root, Code, Html, Parent } from "mdast";

/**
 * Remark plugin to transform mermaid code blocks into mermaid divs for client-side rendering
 */
export function remarkMermaidCodeblock() {
  return (tree: Root) => {
    visit(tree, "code", (node: Code, index: number | undefined, parent: Parent | undefined) => {
      if (node.lang === "mermaid" && parent && typeof index === "number") {
        // Transform the code block into a pre element with mermaid class
        const mermaidDiv: Html = {
          type: "html",
          value: `<pre class="mermaid">${node.value}</pre>`,
        };
        parent.children[index] = mermaidDiv;
      }
    });
  };
}

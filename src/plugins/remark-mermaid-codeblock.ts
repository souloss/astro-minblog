import { visit } from "unist-util-visit";

/**
 * Remark plugin to transform mermaid code blocks into mermaid divs for client-side rendering
 */
export function remarkMermaidCodeblock() {
  return (tree: any) => {
    visit(tree, "code", (node, index, parent) => {
      if (node.lang === "mermaid" && parent && typeof index === "number") {
        // Transform the code block into a pre element with mermaid class
        const mermaidDiv = {
          type: "html",
          value: `<pre class="mermaid">${node.value}</pre>`,
        };
        parent.children[index] = mermaidDiv;
      }
    });
  };
}


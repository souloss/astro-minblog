/**
 * CustomShiki transformer that adds file name labels to code blocks.
 *
 * This transformer looks for the `file="filename"` meta attribute in code blocks
 * and creates a styled label showing the filename embedded in the top border.
 *
 * @param {Object} options - Configuration options for the transformer
 * @param {string} [options.style="v2"] - The styling variant to use
 *   - `"v1"`: Simple border-top with title
 *   - `"v2"`: Badge-style embedded in border (default)
 * @param {boolean} [options.hideDot=false] - Whether to hide the green dot indicator
 */
export const transformerFileName = ({
  style = "v2",
  hideDot = false,
} = {}) => ({
  pre(node) {
    const raw = this.options.meta?.__raw?.split(" ");

    if (!raw) return;

    const metaMap = new Map();

    for (const item of raw) {
      const [key, value] = item.split("=");
      if (!key || !value) continue;
      metaMap.set(key, value.replace(/["'`]/g, ""));
    }

    const file = metaMap.get("file");

    if (!file) return;

    // Add additional margin to code block
    this.addClassToHast(
      node,
      `mt-8 ${style === "v1" ? "rounded-tl-none" : "rounded-t-lg"}`
    );

    // Style the pre element with border-top for embedding filename
    const existingStyle = node.properties.style || "";
    node.properties.style = existingStyle + `--file-name: "${file}";`;

    // Add file name embedded in top border
    node.children.push({
      type: "element",
      tagName: "span",
      properties: {
        class: [
          "absolute left-3 -top-2.5 px-2 py-0.5 text-xs font-mono text-foreground/80 select-none",
          "bg-background border border-border/60 rounded-md",
          "shadow-sm",
          hideDot
            ? ""
            : "pl-5 before:inline-block before:size-1.5 before:bg-green-500 before:rounded-full before:absolute before:top-1/2 before:-translate-y-1/2 before:left-2 before:shadow-[0_0_4px_rgba(34,197,94,0.5)]",
        ],
      },
      children: [
        {
          type: "text",
          value: file,
        },
      ],
    });
  },
});

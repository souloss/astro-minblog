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
      `mt-8 has-file-name ${style === "v1" ? "rounded-tl-none" : "rounded-t-lg"}`
    );

    // Style the pre element with border-top for embedding filename
    const existingStyle = node.properties.style || "";
    node.properties.style = existingStyle + `--file-name: "${file}";`;

    // Add file name embedded in top border
    node.children.push({
      type: "element",
      tagName: "span",
      properties: {
        class: ["code-file-badge", hideDot ? "is-dot-hidden" : ""],
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

interface HastElement {
  type: "element";
  tagName: string;
  properties: Record<string, unknown>;
  children: (HastElement | HastText)[];
}

interface HastText {
  type: "text";
  value: string;
}

interface ShikiTransformerContext {
  options: {
    lang: string;
    meta?: { __raw?: string; [key: string]: unknown };
  };
  source: string;
  lines: unknown[];
  addClassToHast?: (node: HastElement, cls: string) => void;
}

interface ShikiTransformer {
  name: string;
  pre?: (this: ShikiTransformerContext, node: HastElement) => void;
}

function el(
  tag: string,
  props: Record<string, unknown>,
  children: (HastElement | HastText)[] | string = []
): HastElement {
  return {
    type: "element",
    tagName: tag,
    properties: props,
    children:
      typeof children === "string"
        ? [{ type: "text" as const, value: children }]
        : children,
  };
}

function parseMetaString(str = ""): Record<string, string | true> {
  return Object.fromEntries(
    str.split(" ").reduce(
      (acc: [string, string | true][], cur) => {
        const matched = cur.match(/(.+)?=("(.+)"|'(.+)')$/);
        if (matched === null) return acc;
        const key = matched[1];
        const value = matched[3] || matched[4] || true;
        acc.push([key, value]);
        return acc;
      },
      [] as [string, string | true][]
    )
  );
}

/**
 * Wraps the default `<pre>` in a `<div>` container for richer layout
 * (title bar, language label, copy button, collapse toggle).
 */
export const updateStyle = (): ShikiTransformer => ({
  name: "shiki-transformer-update-style",
  pre(node) {
    const container: HastElement = {
      type: "element",
      tagName: "pre",
      properties: {},
      children: node.children,
    };
    node.children = [container];
    node.tagName = "div";
  },
});

/**
 * Parses `title="..."` or `file="..."` from the code-fence meta string
 * and prepends a styled title bar to the code block.
 */
export const addTitle = (): ShikiTransformer => ({
  name: "shiki-transformer-add-title",
  pre(node) {
    const rawMeta = this.options.meta?.__raw;
    if (!rawMeta) return;
    const meta = parseMetaString(rawMeta);
    const label = meta.title || meta.file;
    if (!label) return;

    node.children.unshift(
      el("div", { class: "code-title" }, label.toString())
    );
  },
});

/**
 * Appends a language label (e.g. `ts`, `css`) to the top-right of the block.
 */
export const addLanguage = (): ShikiTransformer => ({
  name: "shiki-transformer-add-language",
  pre(node) {
    node.children.push(el("span", { class: "code-language" }, this.options.lang));
  },
});

const clipboardSvg: HastElement = el(
  "svg",
  {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": "2",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
  },
  [
    el("rect", {
      x: "9",
      y: "9",
      width: "13",
      height: "13",
      rx: "2",
      ry: "2",
    }),
    el("path", {
      d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1",
    }),
  ]
);

const checkSvg: HastElement = el(
  "svg",
  {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": "2",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
  },
  [el("polyline", { points: "20 6 9 17 4 12" })]
);

/**
 * Injects a copy-to-clipboard button at build time.
 */
export const addCopyButton = (timeout = 2000): ShikiTransformer => ({
  name: "shiki-transformer-copy-button",
  pre(node) {
    node.children.push(
      el(
        "button",
        {
          class: "code-copy",
          "aria-label": "Copy code",
          "data-code": this.source,
          onclick: `navigator.clipboard.writeText(this.dataset.code);this.classList.add('copied');setTimeout(()=>this.classList.remove('copied'),${timeout})`,
        },
        [
          el("span", { class: "ready" }, [clipboardSvg]),
          el("span", { class: "success" }, [checkSvg]),
        ]
      )
    );
  },
});

const chevronSvg: HastElement = el(
  "svg",
  {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": "2",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
  },
  [el("polyline", { points: "6 9 12 15 18 9" })]
);

/**
 * Collapses code blocks that exceed `maxLines` lines.
 */
export const addCollapse = (maxLines = 15): ShikiTransformer => ({
  name: "shiki-transformer-add-collapse",
  pre(node) {
    if (this.lines.length <= maxLines) return;
    node.properties = {
      ...node.properties,
      class: `${(node.properties?.class as string) || ""} collapsed`,
    };
    node.children.push(
      el(
        "button",
        {
          class: "code-collapse-toggle",
          "aria-label": "Toggle collapse code block",
          onclick: "this.parentElement.classList.toggle('collapsed')",
        },
        [chevronSvg, el("span", {}, " Expand")]
      )
    );
    node.children.push(el("div", { class: "code-collapse-fade" }));
  },
});

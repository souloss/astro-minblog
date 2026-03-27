function el(tag, props, children = []) {
  return {
    type: "element",
    tagName: tag,
    properties: props,
    children:
      typeof children === "string"
        ? [{ type: "text", value: children }]
        : children,
  };
}

function parseMetaString(str = "") {
  return Object.fromEntries(
    str.split(" ").reduce((acc, cur) => {
      const matched = cur.match(/(.+)?=("(.+)"|'(.+)')$/);
      if (matched === null) return acc;
      const key = matched[1];
      const value = matched[3] || matched[4] || true;
      acc.push([key, value]);
      return acc;
    }, [])
  );
}

export const updateStyle = () => ({
  name: "shiki-transformer-update-style",
  pre(node) {
    const container = {
      type: "element",
      tagName: "pre",
      properties: {},
      children: node.children,
    };
    node.children = [container];
    node.tagName = "div";
    return node;
  },
});

export const addTitle = () => ({
  name: "shiki-transformer-add-title",
  pre(node) {
    const rawMeta = this.options.meta?.__raw;
    if (!rawMeta) return node;
    const meta = parseMetaString(rawMeta);
    const label = meta.title || meta.file;
    if (!label) return node;
    node.children.unshift(el("div", { class: "code-title" }, String(label)));
    return node;
  },
});

export const addLanguage = () => ({
  name: "shiki-transformer-add-language",
  pre(node) {
    node.children.push(
      el("span", { class: "code-language" }, this.options.lang)
    );
    return node;
  },
});

export const addCopyButton = (timeout = 2000) => ({
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
        "Copy"
      )
    );
    return node;
  },
});

export const addCollapse = (maxLines = 15) => ({
  name: "shiki-transformer-add-collapse",
  pre(node) {
    if (this.lines.length <= maxLines) return node;
    const existingClass = Array.isArray(node.properties.class)
      ? node.properties.class.join(" ")
      : typeof node.properties.class === "string"
        ? node.properties.class
        : "";
    node.properties = {
      ...node.properties,
      class: `${existingClass} collapsed`.trim(),
    };
    node.children.push(
      el(
        "button",
        {
          class: "code-collapse-toggle",
          "aria-label": "Toggle collapse code block",
          onclick: "this.parentElement.classList.toggle('collapsed')",
        },
        "Expand"
      )
    );
    return node;
  },
});

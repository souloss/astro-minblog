import { visit } from "unist-util-visit";
import bx from "@iconify-json/bx/icons.json" with { type: "json" };
import lucide from "@iconify-json/lucide/icons.json" with { type: "json" };

// ── Icon resolution helpers ──────────────────────────────────────────────────

type IconSet = Record<string, { body: string; width?: number; height?: number }>;

const ICON_SETS: Record<string, IconSet> = {
  bx: (bx as { icons: IconSet }).icons,
  lucide: (lucide as { icons: IconSet }).icons,
};

const SET_ALIASES: Record<string, string> = {
  b: "bx",
  l: "lucide",
};

const SET_PREFIXES: Record<string, string> = {
  bx: "bx-",
  lucide: "",
};

function getIconSvg(icon: string): string {
  const [prefix, ...rest] = icon.split(":");
  const setName = SET_ALIASES[prefix] || prefix;
  const set = ICON_SETS[setName];
  if (!set) return "";

  const namePart = rest.join(":");
  const prefixStr = SET_PREFIXES[setName] || "";
  const iconName = namePart.startsWith(prefixStr) ? namePart : prefixStr + namePart;
  const iconData = set[iconName];
  if (!iconData) return "";

  const w = iconData.width ?? 16;
  const h = iconData.height ?? 16;
  return `<svg class="icon" style="width:1em;height:1em;vertical-align:middle;fill:currentColor;overflow:hidden;" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">${iconData.body}</svg>`;
}

// ── Color resolution ─────────────────────────────────────────────────────────

const NAMED_COLORS: Record<string, string> = {
  white: "#ffffff",
  black: "#000000",
  red: "#ef4444",
  orange: "#f97316",
  yellow: "#eab308",
  green: "#22c55e",
  blue: "#3b82f6",
  indigo: "#6366f1",
  purple: "#a855f7",
  pink: "#ec4899",
  gray: "#6b7280",
};

function resolveColor(value: string): string {
  if (!value) return "";
  if (value.startsWith("#") || value.startsWith("rgb") || value.startsWith("hsl")) return value;
  return NAMED_COLORS[value.toLowerCase()] || value;
}

// ── HTML helpers ─────────────────────────────────────────────────────────────

const DOWNLOAD_ICON = `<svg class="icon" style="width:1em;height:1em;vertical-align:middle;fill:currentColor;overflow:hidden;" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="M561.00682908 685.55838913a111.03077546 111.03077546 0 0 1-106.8895062 0L256.23182837 487.72885783a55.96309219 55.96309219 0 0 1 79.13181253-79.18777574L450.70357448 523.88101491V181.55477937a55.96309219 55.96309219 0 0 1 111.92618438 0v344.06109173l117.07478902-117.07478901a55.96309219 55.96309219 0 0 1 79.13181252 79.18777574zM282.81429711 797.1487951h447.70473912a55.96309219 55.96309219 0 0 1 0 111.92618438H282.81429711a55.96309219 55.96309219 0 0 1 0-111.92618438z"></path></svg>`;

function escapeHtml(text: string): string {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Gallery image extraction ─────────────────────────────────────────────────

interface GalleryImage {
  alt: string;
  src: string;
}

interface MdastNode {
  type: string;
  children?: MdastNode[];
  value?: string;
  url?: string;
  alt?: string;
  name?: string;
  attributes?: Record<string, string>;
  data?: {
    hName?: string;
    hProperties?: Record<string, unknown>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

function extractGalleryImages(children: MdastNode[] | undefined): GalleryImage[] {
  const images: GalleryImage[] = [];

  function walk(nodes: MdastNode[] | undefined): void {
    for (const child of nodes || []) {
      if (child.type === "image") {
        images.push({ alt: child.alt || "", src: child.url || "" });
      } else if (child.type === "text" || child.type === "inlineCode") {
        const text = child.value || "";
        const imgRegex = /!\[(.*?)\]\((.*?)\)/g;
        let m: RegExpExecArray | null;
        while ((m = imgRegex.exec(text)) !== null) {
          images.push({ alt: m[1], src: m[2] });
        }
      } else if (child.children) {
        walk(child.children);
      }
    }
  }

  walk(children);
  return images;
}

// ── Image directive renderer ─────────────────────────────────────────────────

function renderImageDirective(attrs: Record<string, string>): string {
  const src = attrs.src || "";
  const alt = attrs.alt || "";
  const width = attrs.width || "";
  const height = attrs.height || "";
  const bg = attrs.bg || "";
  const padding = attrs.padding || "";
  const download = attrs.download || "";
  const ratio = attrs.ratio || "";
  const fancybox = attrs.fancybox;

  let imgStyle = "";
  if (width) imgStyle += `width:${width};`;
  if (height) imgStyle += `height:${height};`;

  const useZoom = fancybox !== "false";
  const zoomAttr = useZoom ? ' data-zoomable="1"' : "";

  let imgWrap = '<div class="md-image-img-wrap">';
  imgWrap += '<div class="md-image-loading"></div>';
  let imgHtml = `<img class="md-image-img" src="${escapeHtml(src)}" alt="${escapeHtml(alt)}"${zoomAttr}`;
  if (imgStyle && !ratio) imgHtml += ` style="${imgStyle}"`;
  imgHtml +=
    ' loading="lazy" decoding="async" onerror="this.classList.add(\'md-image-error\');this.closest(\'.md-image-img-wrap\').classList.add(\'has-error\');" onload="this.classList.add(\'md-image-loaded\');this.closest(\'.md-image-img-wrap\').classList.add(\'is-loaded\');" />';
  imgWrap += imgHtml;
  imgWrap += "</div>";

  let inner = imgWrap;

  if (download && download.length > 0) {
    const href = download === "true" ? src : download;
    const downloadAttr = alt ? ` download="${escapeHtml(alt)}"` : "";
    inner += `<a class="md-image-download" target="_blank"${downloadAttr} href="${escapeHtml(href)}">${DOWNLOAD_ICON}</a>`;
  }

  let bgStyle = "";
  if (bg) bgStyle += `background:${resolveColor(bg)};`;
  if (padding) bgStyle += `padding:${padding};`;
  if (ratio) {
    bgStyle += `aspect-ratio:${ratio};`;
    if (imgStyle) bgStyle += imgStyle;
  } else if (imgStyle) {
    bgStyle += "width:100%;";
  }

  let wrap = '<div class="md-directive md-directive-image">';
  wrap += `<div class="md-image-bg"${bgStyle ? ` style="${bgStyle}"` : ""}>`;
  wrap += inner;
  wrap += "</div>";

  if (alt) {
    wrap += `<div class="md-image-meta"><span class="md-image-caption">${escapeHtml(alt)}</span></div>`;
  }
  wrap += "</div>";

  return wrap;
}

// ── Main plugin ──────────────────────────────────────────────────────────────

export function remarkImageDirectives(): (tree: any) => void {
  return (tree: any) => {
    // ── Container directive: image (treat as block image, ignore children) ──
    // Handles ::image{...} when parsed as containerDirective without closing :::
    visit(tree, "containerDirective", (node: MdastNode) => {
      if (node.name !== "image") return;
      const attrs = node.attributes || {};
      const html = renderImageDirective(attrs);
      // Replace the entire container with just the rendered image,
      // discarding any accidentally-swallowed children
      node.data = { hName: "div", hProperties: {} };
      node.children = [{ type: "html", value: html }];
    });

    // ── Leaf directive: image ──
    visit(tree, "leafDirective", (node: MdastNode) => {
      if (node.name !== "image") return;
      const attrs = node.attributes || {};
      const html = renderImageDirective(attrs);
      node.data = { hName: "div", hProperties: {} };
      node.children = [{ type: "html", value: html }];
    });

    // ── Text directive: image ──
    const imageTextDirectives: { node: MdastNode; index: number | undefined; parent: MdastNode | undefined }[] = [];
    visit(tree, "textDirective", (node: MdastNode, index: number | undefined, parent: MdastNode | undefined) => {
      if (node.name === "image") {
        imageTextDirectives.push({ node, index, parent });
      }
    });

    for (const { node, parent } of imageTextDirectives) {
      const attrs = node.attributes || {};
      const html = renderImageDirective(attrs);

      if (parent && parent.type === "paragraph") {
        // Replace the entire paragraph with raw html block
        Object.assign(parent, {
          type: "html",
          value: html,
        });
        delete parent.children;
      } else {
        Object.assign(node, {
          type: "html",
          value: html,
        });
        delete node.name;
        delete node.attributes;
        delete node.children;
        delete node.data;
      }
    }

    // ── Container directive: gallery / banner ──
    visit(tree, "containerDirective", (node: MdastNode) => {
      const name = node.name;
      const attrs = node.attributes || {};

      if (name === "gallery") {
        const layout = attrs.layout || "grid";
        const size = attrs.size || "m";
        const ratio = attrs.ratio || "";

        const images = extractGalleryImages(node.children);

        let html = `<div class="md-directive md-directive-gallery md-gallery-${layout}"`;
        const dataAttrs: string[] = [];
        if (size) dataAttrs.push(`data-gallery-size="${escapeHtml(size)}"`);
        if (ratio) dataAttrs.push(`data-gallery-ratio="${escapeHtml(ratio)}"`);
        if (dataAttrs.length) html += " " + dataAttrs.join(" ");
        html += ">";

        for (const img of images) {
          html += `<div class="md-gallery-cell">`;
          html += `<img src="${escapeHtml(img.src)}" alt="${escapeHtml(img.alt)}" data-zoomable="1" loading="lazy" decoding="async" />`;
          if (img.alt) {
            html += `<div class="md-gallery-meta"><span class="md-gallery-caption">${escapeHtml(img.alt)}</span></div>`;
          }
          html += "</div>";
        }

        html += "</div>";

        node.data = { hName: "div", hProperties: {} };
        node.children = [{ type: "html", value: html }];
      } else if (name === "banner") {
        const title = attrs.title || "";
        const subtitle = attrs.subtitle || "";
        const bg = attrs.bg || "";
        const avatar = attrs.avatar || "";
        const link = attrs.link || "";

        let html = '<div class="md-directive md-directive-banner">';
        if (bg) {
          html += `<img class="md-banner-bg" src="${escapeHtml(bg)}" alt="" loading="lazy" />`;
        }
        html += '<div class="md-banner-content">';
        html += '<div class="md-banner-top">';
        if (!link) {
          html += `<button class="md-banner-back" onclick="window.history.back()"><svg viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M7.78 12.53a.75.75 0 01-1.06 0L2.47 8.28a.75.75 0 010-1.06l4.25-4.25a.75.75 0 011.06 1.06L4.81 7h7.44a.75.75 0 010 1.5H4.81l2.97 2.97a.75.75 0 010 1.06z"></path></svg></button>`;
        } else {
          html += "<div></div>";
        }
        html += "</div>"; // end top

        html += '<div class="md-banner-bottom">';
        if (avatar) {
          html += `<img class="md-banner-avatar" src="${escapeHtml(avatar)}" alt="" loading="lazy" />`;
        }
        if (title || subtitle) {
          html += '<div class="md-banner-text">';
          if (title) html += `<div class="md-banner-title">${escapeHtml(title)}</div>`;
          if (subtitle) html += `<div class="md-banner-subtitle">${escapeHtml(subtitle)}</div>`;
          html += "</div>";
        }
        html += "</div>"; // end bottom
        html += "</div>"; // end content

        if (link) {
          html += `<a class="md-banner-link" href="${escapeHtml(link)}" target="_blank"></a>`;
        }
        html += "</div>";

        node.data = { hName: "div", hProperties: {} };
        node.children = [{ type: "html", value: html }];
      }
    });
  };
}

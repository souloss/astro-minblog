import type { Root } from "mdast";
import type { Plugin } from "unified";
import type {
  ContainerDirective,
  LeafDirective,
} from "mdast-util-directive";
import { visit } from "unist-util-visit";
import lucide from "@iconify-json/lucide/icons.json" with { type: "json" };

// ── Types ────────────────────────────────────────────────────────

interface PhotoAttrs {
  src?: string | null;
  alt?: string | null;
  type?: string | null;
  brand?: string | null;
  logo?: string | null;
  model?: string | null;
  focal?: string | null;
  aperture?: string | null;
  shutter?: string | null;
  iso?: string | null;
  datetime?: string | null;
  fancybox?: string | boolean | null;
}

interface GalleryImage {
  alt: string;
  src: string;
}

type DirectiveNode = LeafDirective | ContainerDirective;

// ── HTML escaping ────────────────────────────────────────────────

function escapeHtml(text: string | null | undefined): string {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "\x26amp;")
    .replace(/</g, "\x26lt;")
    .replace(/>/g, "\x26gt;")
    .replace(/"/g, "\x26quot;");
}

// ── Brand logos (inline SVGs) ────────────────────────────────────
// All use currentColor so they adapt to light/dark themes automatically.

const BRAND_LOGOS: Record<string, string> = {
  fujifilm: `<svg class="md-photo-logo" viewBox="0 0 130 22" xmlns="http://www.w3.org/2000/svg"><text x="0" y="17" font-family="system-ui, -apple-system, Arial, sans-serif" font-size="17" font-weight="800" letter-spacing="0.5" fill="currentColor">FUJ<tspan fill="#e60012">I</tspan>FILM</text></svg>`,
  canon: `<svg class="md-photo-logo" viewBox="0 0 90 22" xmlns="http://www.w3.org/2000/svg"><text x="0" y="17" font-family="system-ui, -apple-system, Arial, sans-serif" font-size="17" font-weight="700" fill="currentColor">Canon</text></svg>`,
  nikon: `<svg class="md-photo-logo md-photo-nikon" viewBox="0 0 110 24" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="2" width="22" height="20" rx="2" fill="#FFCC00"/><text x="28" y="18" font-family="system-ui, -apple-system, Arial, sans-serif" font-size="16" font-weight="700" fill="currentColor">Nikon</text></svg>`,
  sony: `<svg class="md-photo-logo" viewBox="0 0 70 22" xmlns="http://www.w3.org/2000/svg"><text x="0" y="17" font-family="system-ui, -apple-system, Arial, sans-serif" font-size="16" font-weight="700" letter-spacing="1" fill="currentColor">SONY</text></svg>`,
  leica: `<svg class="md-photo-logo" viewBox="0 0 75 22" xmlns="http://www.w3.org/2000/svg"><text x="0" y="17" font-family="system-ui, -apple-system, Arial, sans-serif" font-size="16" font-weight="700" letter-spacing="1.5" fill="currentColor">LEICA</text></svg>`,
  panasonic: `<svg class="md-photo-logo" viewBox="0 0 100 22" xmlns="http://www.w3.org/2000/svg"><text x="0" y="17" font-family="system-ui, -apple-system, Arial, sans-serif" font-size="15" font-weight="700" letter-spacing="1" fill="currentColor">LUMIX</text></svg>`,
  olympus: `<svg class="md-photo-logo" viewBox="0 0 110 22" xmlns="http://www.w3.org/2000/svg"><text x="0" y="17" font-family="system-ui, -apple-system, Arial, sans-serif" font-size="14" font-weight="700" letter-spacing="0.5" fill="currentColor">OM SYSTEM</text></svg>`,
  hasselblad: `<svg class="md-photo-logo" viewBox="0 0 130 22" xmlns="http://www.w3.org/2000/svg"><text x="0" y="17" font-family="system-ui, -apple-system, Arial, sans-serif" font-size="14" font-weight="700" letter-spacing="1" fill="currentColor">HASSELBLAD</text></svg>`,
  dji: `<svg class="md-photo-logo" viewBox="0 0 55 22" xmlns="http://www.w3.org/2000/svg"><text x="0" y="17" font-family="system-ui, -apple-system, Arial, sans-serif" font-size="17" font-weight="700" fill="currentColor">DJI</text></svg>`,
  vivo: `<svg class="md-photo-logo" viewBox="0 0 65 22" xmlns="http://www.w3.org/2000/svg"><text x="0" y="17" font-family="system-ui, -apple-system, Arial, sans-serif" font-size="17" font-weight="700" fill="currentColor">vivo</text></svg>`,
  xiaomi: `<svg class="md-photo-logo" viewBox="0 0 85 22" xmlns="http://www.w3.org/2000/svg"><text x="0" y="17" font-family="system-ui, -apple-system, Arial, sans-serif" font-size="15" font-weight="600" fill="currentColor">xiaomi</text></svg>`,
  oppo: `<svg class="md-photo-logo" viewBox="0 0 80 22" xmlns="http://www.w3.org/2000/svg"><text x="0" y="17" font-family="system-ui, -apple-system, Arial, sans-serif" font-size="17" font-weight="700" fill="currentColor">OPPO</text></svg>`,
  apple: `<svg class="md-photo-logo" viewBox="0 0 130 22" xmlns="http://www.w3.org/2000/svg"><text x="0" y="17" font-family="system-ui, -apple-system, Arial, sans-serif" font-size="13" font-weight="600" fill="currentColor">Shot on iPhone</text></svg>`,
  samsung: `<svg class="md-photo-logo" viewBox="0 0 120 22" xmlns="http://www.w3.org/2000/svg"><text x="0" y="17" font-family="system-ui, -apple-system, Arial, sans-serif" font-size="14" font-weight="700" letter-spacing="0.8" fill="currentColor">SAMSUNG</text></svg>`,
  huawei: `<svg class="md-photo-logo" viewBox="0 0 90 22" xmlns="http://www.w3.org/2000/svg"><text x="0" y="17" font-family="system-ui, -apple-system, Arial, sans-serif" font-size="15" font-weight="700" letter-spacing="0.5" fill="currentColor">HUAWEI</text></svg>`,
  google: `<svg class="md-photo-logo" viewBox="0 0 110 22" xmlns="http://www.w3.org/2000/svg"><text x="0" y="17" font-family="system-ui, -apple-system, Arial, sans-serif" font-size="13" font-weight="600" fill="currentColor">Google Pixel</text></svg>`,
  oneplus: `<svg class="md-photo-logo" viewBox="0 0 100 22" xmlns="http://www.w3.org/2000/svg"><text x="0" y="17" font-family="system-ui, -apple-system, Arial, sans-serif" font-size="15" font-weight="700" fill="currentColor">OnePlus</text></svg>`,
  realme: `<svg class="md-photo-logo" viewBox="0 0 85 22" xmlns="http://www.w3.org/2000/svg"><text x="0" y="17" font-family="system-ui, -apple-system, Arial, sans-serif" font-size="15" font-weight="700" fill="currentColor">realme</text></svg>`,
  honor: `<svg class="md-photo-logo" viewBox="0 0 90 22" xmlns="http://www.w3.org/2000/svg"><text x="0" y="17" font-family="system-ui, -apple-system, Arial, sans-serif" font-size="15" font-weight="700" letter-spacing="0.5" fill="currentColor">HONOR</text></svg>`,
  meizu: `<svg class="md-photo-logo" viewBox="0 0 85 22" xmlns="http://www.w3.org/2000/svg"><text x="0" y="17" font-family="system-ui, -apple-system, Arial, sans-serif" font-size="15" font-weight="700" letter-spacing="0.5" fill="currentColor">MEIZU</text></svg>`,
};

const BRAND_ALIASES: Record<string, string> = {
  fuji: "fujifilm",
  富士: "fujifilm",
  佳能: "canon",
  尼康: "nikon",
  索尼: "sony",
  徕卡: "leica",
  松下: "panasonic",
  奥林巴斯: "olympus",
  大疆: "dji",
  苹果: "apple",
  华为: "huawei",
  谷歌: "google",
  一加: "oneplus",
  真我: "realme",
  荣耀: "honor",
  魅族: "meizu",
  小米: "xiaomi",
};

function getBrandLogo(brand: string | null | undefined): string {
  if (!brand) return "";
  const key = brand.toLowerCase().trim();
  const resolved = BRAND_ALIASES[key] || key;
  return BRAND_LOGOS[resolved] || "";
}

// ── Gallery image extraction ─────────────────────────────────────

function extractGalleryImages(
  children: DirectiveNode["children"]
): GalleryImage[] {
  const images: GalleryImage[] = [];

  function walk(nodes: readonly unknown[]): void {
    for (const child of nodes) {
      const node = child as Record<string, unknown>;
      if (node.type === "image") {
        const img = node as { alt?: string; url?: string };
        images.push({ alt: img.alt || "", src: img.url || "" });
      } else if (node.type === "text" || node.type === "inlineCode") {
        const text = String(node.value || "");
        const imgRegex = /!\[(.*?)\]\((.*?)\)/g;
        let m: RegExpExecArray | null;
        while ((m = imgRegex.exec(text)) !== null) {
          images.push({ alt: m[1], src: m[2] });
        }
      } else if (Array.isArray(node.children)) {
        walk(node.children as unknown[]);
      }
    }
  }

  walk(children as unknown[]);
  return images;
}

// ── Photo directive renderer ─────────────────────────────────────

function renderPhotoDirective(attrs: PhotoAttrs): { html: string; className: string } {
  const src = attrs.src || "";
  const alt = attrs.alt || "";
  const type = attrs.type || "blur";
  const brand = attrs.brand || "";
  const logo = attrs.logo || "";
  const model = attrs.model || "";
  const focal = attrs.focal || "";
  const aperture = attrs.aperture || "";
  const shutter = attrs.shutter || "";
  const iso = attrs.iso || "";
  const datetime = attrs.datetime || "";
  const fancybox = attrs.fancybox;
  const useZoom = fancybox !== "false" && fancybox !== false;
  const zoomAttr = useZoom ? ' data-zoomable="1"' : "";
  const logoSvg = getBrandLogo(logo || brand);

  const exifParts: string[] = [];
  if (focal) exifParts.push(escapeHtml(focal));
  if (aperture) exifParts.push(escapeHtml(aperture));
  if (shutter) exifParts.push(escapeHtml(shutter));
  if (iso) exifParts.push(escapeHtml(iso));
  const exifStr = exifParts.join(" ");

  if (type === "blur") {
    // Blur: blurred background + clear centered image + bottom info bar
    const className = "md-directive md-directive-photo md-photo-blur";
    let html = "";
    html += `<div class="md-photo-bg" style="background-image:url('${escapeHtml(src)}');"></div>`;
    html += `<div class="md-photo-img-wrap">`;
    html += `<img class="md-photo-img" src="${escapeHtml(src)}" alt="${escapeHtml(alt)}"${zoomAttr} loading="lazy" decoding="async" />`;
    html += `</div>`;
    html += `<div class="md-photo-bar">`;
    if (logoSvg) {
      html += `<div class="md-photo-brand">${logoSvg}</div>`;
    } else if (brand) {
      html += `<div class="md-photo-brand-text">${escapeHtml(brand)}</div>`;
    }
    if (exifStr) {
      html += `<div class="md-photo-exif">${exifStr}</div>`;
    }
    html += `</div>`;
    return { html, className };
  }

  // Watermark: simple image + info bar (三栏：左品牌型号 / 中Logo / 右EXIF时间)
  const className = "md-directive md-directive-photo md-photo-watermark";
  let html = "";
  html += `<div class="md-photo-img-wrap">`;
  html += `<img class="md-photo-img" src="${escapeHtml(src)}" alt="${escapeHtml(alt)}"${zoomAttr} loading="lazy" decoding="async" />`;
  html += `</div>`;
  html += `<div class="md-photo-bar">`;
  html += `<div class="md-photo-left">`;
  if (brand) {
    html += `<div class="md-photo-brand-name">${escapeHtml(brand)}</div>`;
  }
  if (model) {
    html += `<div class="md-photo-model">${escapeHtml(model)}</div>`;
  }
  html += `</div>`;
  html += `<div class="md-photo-center">`;
  if (logoSvg) {
    html += `<div class="md-photo-logo-wrap">${logoSvg}</div>`;
  }
  html += `</div>`;
  html += `<div class="md-photo-right">`;
  if (exifStr) {
    html += `<div class="md-photo-exif">${exifStr}</div>`;
  }
  if (datetime) {
    html += `<div class="md-photo-datetime">${escapeHtml(datetime)}</div>`;
  }
  html += `</div>`;
  html += `</div>`;
  return { html, className };
}

// ── Plugin ───────────────────────────────────────────────────────

export const remarkPhotoDirectives: Plugin<[], Root> = () => {
  return (tree) => {
    // ── Leaf directive: photo ──
    visit(tree, "leafDirective", (node: LeafDirective) => {
      if (node.name !== "photo") return;
      const attrs: PhotoAttrs = node.attributes || {};
      const { html, className } = renderPhotoDirective(attrs);
      node.data = { hName: "div", hProperties: { class: className } };
      node.children = [{ type: "html", value: html }];
    });

    // ── Container directive: photo ──
    visit(tree, "containerDirective", (node: ContainerDirective) => {
      if (node.name !== "photo") return;
      const attrs: PhotoAttrs = { ...(node.attributes || {}) };
      // If src is not provided, try to extract from first child image
      if (!attrs.src) {
        const images = extractGalleryImages(node.children);
        const first = images[0];
        if (first && first.src) {
          attrs.src = first.src;
        }
      }
      const { html, className } = renderPhotoDirective(attrs);
      node.data = { hName: "div", hProperties: { class: className } };
      node.children = [{ type: "html", value: html }];
    });
  };
};

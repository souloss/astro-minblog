import { type CollectionEntry } from "astro:content";
import postOgImage from "./og-templates/post";
import siteOgImage from "./og-templates/site";

// Lazy-load resvg only when needed (build time)
// This allows the module to be externalized for Cloudflare Workers
let ResvgClass: typeof import("@resvg/resvg-js").Resvg | null = null;

async function getResvg() {
  if (!ResvgClass) {
    try {
      const module = await import("@resvg/resvg-js");
      ResvgClass = module.Resvg;
    } catch {
      throw new Error(
        "@resvg/resvg-js is not available. OG images must be prerendered at build time."
      );
    }
  }
  return ResvgClass;
}

async function svgBufferToPngBuffer(svg: string) {
  const Resvg = await getResvg();
  const resvg = new Resvg(svg);
  const pngData = resvg.render();
  return pngData.asPng();
}

export async function generateOgImageForPost(post: CollectionEntry<"blog">, ogDescription?: string) {
  const svg = await postOgImage(post, ogDescription);
  return svgBufferToPngBuffer(svg);
}

export async function generateOgImageForSite() {
  const svg = await siteOgImage();
  return svgBufferToPngBuffer(svg);
}

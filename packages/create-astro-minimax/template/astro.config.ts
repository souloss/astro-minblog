import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import minimax from "@astro-minimax/core";
import minimaxViz from "@astro-minimax/viz";
import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";
import remarkToc from "remark-toc";
import remarkCollapse from "remark-collapse";
import remarkMath from "remark-math";
import remarkEmoji from "remark-emoji";
import rehypeKatex from "rehype-katex";
import { remarkReadingTime } from "@astro-minimax/core/plugins/remark-reading-time";
import { remarkAddZoomable } from "@astro-minimax/core/plugins/remark-add-zoomable";
import { rehypeExternalLinks } from "@astro-minimax/core/plugins/rehype-external-links";
import { rehypeTableScroll } from "@astro-minimax/core/plugins/rehype-table-scroll";
import { rehypeAutolinkHeadings } from "@astro-minimax/core/plugins/rehype-autolink-headings";
import { SITE } from "./src/config";
import { SOCIALS, SHARE_LINKS } from "./src/constants";

export default defineConfig({
  site: SITE.website,
  output: "static",
  integrations: [
    minimax({
      site: SITE,
      socials: SOCIALS,
      shareLinks: SHARE_LINKS,
      blogPath: "src/data/blog",
    }),
    minimaxViz({ mermaid: true, markmap: true }),
    sitemap(),
    mdx(),
  ],
  markdown: {
    remarkPlugins: [
      remarkToc,
      [remarkCollapse, { test: "Table of contents" }],
      remarkMath,
      remarkEmoji,
      remarkReadingTime,
      [remarkAddZoomable as any, { className: "zoomable" }],
    ],
    rehypePlugins: [
      rehypeKatex,
      rehypeExternalLinks,
      rehypeTableScroll,
      rehypeAutolinkHeadings,
    ],
  },
  vite: {
    plugins: [tailwindcss() as never],
    resolve: {
      alias: [
        { find: "@/", replacement: new URL("./src/", import.meta.url).pathname },
      ],
    },
  },
});

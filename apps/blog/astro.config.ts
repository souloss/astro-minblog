import { defineConfig, envField } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import minimax from "@astro-minimax/core";
import minimaxViz from "@astro-minimax/viz";
import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";
import preact from "@astrojs/preact";
import remarkToc from "remark-toc";
import remarkCollapse from "remark-collapse";
import remarkMath from "remark-math";
import remarkGithubAlerts from "remark-github-alerts";
import remarkEmoji from "remark-emoji";
import rehypeKatex from "rehype-katex";
import { remarkReadingTime } from "@astro-minimax/core/plugins/remark-reading-time";
import { remarkAddZoomable } from "@astro-minimax/core/plugins/remark-add-zoomable";
import { rehypeExternalLinks } from "@astro-minimax/core/plugins/rehype-external-links";
import { rehypeTableScroll } from "@astro-minimax/core/plugins/rehype-table-scroll";
import { rehypeAutolinkHeadings } from "@astro-minimax/core/plugins/rehype-autolink-headings";
import {
  transformerNotationDiff,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from "@shikijs/transformers";
import {
  updateStyle,
  addTitle,
  addLanguage,
  addCopyButton,
  addCollapse,
} from "@astro-minimax/core/plugins/shiki-transformers";
import { SITE } from "./src/config";
import { SOCIALS, SHARE_LINKS } from "./src/constants";
import { FRIENDS } from "./src/data/friends";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asTransformer = (t: any) => t;

const shikiTransformers = [
  asTransformer(updateStyle()),
  asTransformer(addTitle()),
  asTransformer(addLanguage()),
  asTransformer(addCopyButton(2000)),
  asTransformer(addCollapse(15)),
  transformerNotationHighlight(),
  transformerNotationWordHighlight(),
  transformerNotationDiff({ matchAlgorithm: "v3" }),
];

export default defineConfig({
  site: SITE.website,
  output: "static",
  prefetch: {
    prefetchAll: true,
    defaultStrategy: "hover",
  },
  integrations: [
    minimax({
      site: SITE,
      socials: SOCIALS,
      shareLinks: SHARE_LINKS,
      friends: FRIENDS,
      blogPath: "src/data/blog",
    }),
    minimaxViz({ mermaid: true, markmap: true }),
    preact({ compat: true }),
    sitemap({
      filter: page => SITE.showArchives || !page.endsWith("/archives"),
    }),
    mdx({
      shikiConfig: {
        themes: { light: "github-light", dark: "night-owl" },
        defaultColor: false,
        wrap: false,
        transformers: shikiTransformers,
      },
    }),
  ],
  markdown: {
    remarkPlugins: [
      remarkToc,
      [remarkCollapse, { test: "Table of contents" }],
      remarkMath,
      remarkGithubAlerts,
      remarkEmoji,
      remarkReadingTime,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [remarkAddZoomable as any, { className: "zoomable" }],
    ],
    rehypePlugins: [
      rehypeKatex,
      rehypeExternalLinks,
      rehypeTableScroll,
      rehypeAutolinkHeadings,
    ],
    shikiConfig: {
      themes: { light: "github-light", dark: "night-owl" },
      defaultColor: false,
      wrap: false,
      transformers: shikiTransformers,
    },
  },
  vite: {
    plugins: [tailwindcss() as never],
    resolve: {
      alias: [
        { find: "@/components/media", replacement: new URL("../../packages/viz/src/components", import.meta.url).pathname },
        { find: "@/", replacement: new URL("./src/", import.meta.url).pathname },
      ],
    },
    optimizeDeps: {
      exclude: ["@resvg/resvg-js"],
    },
    ssr: {
      external: ["@resvg/resvg-js", "sharp"],
    },
    build: {
      rollupOptions: {
        external: [/@resvg\/resvg-js/, /@resvg\/resvg-js-linux-.*/, /\.node$/],
        output: {
          chunkFileNames: "assets/[name]-[hash].js",
          entryFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash].[ext]",
        },
      },
      cssMinify: true,
      minify: "esbuild",
      sourcemap: false,
      reportCompressedSize: true,
    },
  },
  image: {
    responsiveStyles: true,
    layout: "constrained",
  },
  env: {
    schema: {
      PUBLIC_GOOGLE_SITE_VERIFICATION: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
    },
  },
  experimental: {
    preserveScriptOrder: true,
  },
});

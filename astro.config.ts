import { defineConfig, envField } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";
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
import { remarkMermaidCodeblock } from "@astro-minimax/viz/plugins/remark-mermaid-codeblock";
import remarkMarkmap from "remark-markmap";
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
import path from "path";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asTransformer = (t: any) => t;

// https://astro.build/config
export default defineConfig({
  site: SITE.website,
  output: "static",
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover',
  },
  trailingSlash: 'always',
  integrations: [
    sitemap({
      filter: page => SITE.showArchives || !page.endsWith("/archives"),
    }),
    mdx({
      shikiConfig: {
        themes: { light: "github-light", dark: "night-owl" },
        defaultColor: false,
        wrap: false,
        transformers: [
          asTransformer(updateStyle()),
          asTransformer(addTitle()),
          asTransformer(addLanguage()),
          asTransformer(addCopyButton(2000)),
          asTransformer(addCollapse(15)),
          transformerNotationHighlight(),
          transformerNotationWordHighlight(),
          transformerNotationDiff({ matchAlgorithm: "v3" }),
        ],
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
      remarkMermaidCodeblock,
      // remark-markmap with dark theme support
      [remarkMarkmap, {
        darkThemeSelector: () => document.documentElement.matches('[data-theme="dark"]') ||
                                 document.documentElement.classList.contains('dark') ||
                                 (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
      }],
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
      transformers: [
        asTransformer(updateStyle()),
        asTransformer(addTitle()),
        asTransformer(addLanguage()),
        asTransformer(addCopyButton(2000)),
        asTransformer(addCollapse(15)),
        transformerNotationHighlight(),
        transformerNotationWordHighlight(),
        transformerNotationDiff({ matchAlgorithm: "v3" }),
      ],
    },
  },
  vite: {
    // eslint-disable-next-line
    // @ts-ignore
    // This will be fixed in Astro 6 with Vite 7 support
    // See: https://github.com/withastro/astro/issues/14030
    plugins: [tailwindcss()],
    resolve: {
      alias: [
        // Map @/ aliases to packages/core for components that moved there
        // More specific aliases must come before the general @/ fallback
        // Media components live in @astro-minimax/viz, not core
        { find: "@/components/media", replacement: path.resolve("./packages/viz/src/components") },
        { find: "@/components", replacement: path.resolve("./packages/core/src/components") },
        { find: "@/layouts", replacement: path.resolve("./packages/core/src/layouts") },
        { find: "@/utils", replacement: path.resolve("./packages/core/src/utils") },
        { find: "@/styles", replacement: path.resolve("./packages/core/src/styles") },
        { find: "@/plugins", replacement: path.resolve("./packages/core/src/plugins") },
        { find: "@/scripts", replacement: path.resolve("./packages/core/src/scripts") },
        { find: "@/assets/icons", replacement: path.resolve("./packages/core/src/assets/icons") },
        // @/ fallback: resolves @/config, @/constants, @/assets/images, etc.
        { find: "@/", replacement: path.resolve("./src/") + "/" },
      ],
    },
    optimizeDeps: {
      exclude: ["@resvg/resvg-js"],
    },
    ssr: {
      // Externalize native modules that can't run in Cloudflare Workers
      // These are only used during prerendering (build time), not at runtime
      external: ["@resvg/resvg-js", "sharp"],
    },
    build: {
      rollupOptions: {
        external: [/@resvg\/resvg-js/, /@resvg\/resvg-js-linux-.*/, /\.node$/],
        output: {
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
        },
      },
      // Performance optimizations
      cssMinify: true,
      minify: 'esbuild',
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

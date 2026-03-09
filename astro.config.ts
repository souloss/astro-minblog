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
import { remarkReadingTime } from "./src/plugins/remark-reading-time";
import { remarkAddZoomable } from "./src/plugins/remark-add-zoomable";
import { rehypeExternalLinks } from "./src/plugins/rehype-external-links";
import { rehypeTableScroll } from "./src/plugins/rehype-table-scroll";
import { rehypeAutolinkHeadings } from "./src/plugins/rehype-autolink-headings";
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
} from "./src/plugins/shiki-transformers";
import { SITE } from "./src/config";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asTransformer = (t: any) => t;

// https://astro.build/config
export default defineConfig({
  site: SITE.website,
  output: "static",
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
      },
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

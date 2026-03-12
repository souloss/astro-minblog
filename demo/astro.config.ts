import { defineConfig, envField } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";
import remarkToc from "remark-toc";
import remarkMath from "remark-math";
import remarkGithubAlerts from "remark-github-alerts";
import remarkEmoji from "remark-emoji";
import rehypeKatex from "rehype-katex";

// Import plugins from @astro-minimax packages
import { remarkReadingTime } from "@astro-minimax/core/plugins/remark-reading-time";
import { rehypeExternalLinks } from "@astro-minimax/core/plugins/rehype-external-links";
import { rehypeTableScroll } from "@astro-minimax/core/plugins/rehype-table-scroll";
import { rehypeAutolinkHeadings } from "@astro-minimax/core/plugins/rehype-autolink-headings";

import remarkMarkmap from "remark-markmap";
import {
  updateStyle,
  addTitle,
  addLanguage,
  addCopyButton,
  addCollapse,
} from "@astro-minimax/core/plugins/shiki-transformers";
import {
  transformerNotationDiff,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from "@shikijs/transformers";
import { SITE } from "./src/config";
import path from "path";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asTransformer = (t: any) => t;

const shikiConfig = {
  themes: { light: "github-light" as const, dark: "night-owl" as const },
  defaultColor: false as const,
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
};

export default defineConfig({
  site: SITE.website,
  output: "static",
  integrations: [
    sitemap(),
    mdx({ shikiConfig }),
  ],
  markdown: {
    remarkPlugins: [
      remarkToc,
      remarkMath,
      remarkGithubAlerts,
      remarkEmoji,
      remarkReadingTime,
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
    shikiConfig,
  },
  vite: {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    plugins: [tailwindcss()],
    resolve: {
      alias: [
        // @/config and @/constants resolve to demo's src/
        // all other @/ paths also resolve to demo's src/ for any custom files
        { find: "@/", replacement: path.resolve("./src/") + "/" },
      ],
    },
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

import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { defineConfig, envField } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import minimax from "@astro-minimax/core";
import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";
import preact from "@astrojs/preact";

import remarkMath from "remark-math";
import remarkGithubAlerts from "./src/plugins/remark-github-alerts.js";
import remarkEmoji from "remark-emoji";
import rehypeKatex from "rehype-katex";
import { remarkReadingTime } from "./src/plugins/remark-reading-time.js";
import { rehypeExternalLinks } from "./src/plugins/rehype-external-links.js";
import { rehypeTableScroll } from "./src/plugins/rehype-table-scroll.js";
import { rehypeAutolinkHeadings } from "./src/plugins/rehype-autolink-headings.js";
import {
  transformerNotationDiff,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from "@shikijs/transformers";
import { SITE } from "./src/config";
import { SOCIALS, SHARE_LINKS } from "./src/constants";
import { FRIENDS } from "./src/data/friends";

const __dirname = dirname(fileURLToPath(import.meta.url));

const shikiTransformers = [
  transformerNotationHighlight(),
  transformerNotationWordHighlight(),
  transformerNotationDiff({ matchAlgorithm: "v3" }),
];

const zoomableRemarkPlugin = [
  new URL("./src/plugins/remark-add-zoomable.js", import.meta.url).pathname,
  { className: "zoomable" },
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
      viz: { mermaid: true, markmap: true },
    }),
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
      remarkMath,
      remarkGithubAlerts,
      remarkEmoji,
      remarkReadingTime,
      zoomableRemarkPlugin,
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
    plugins: [
      tailwindcss(),
      {
        name: "astro-minimax-sw-cache-version",
        apply: "build",
        closeBundle() {
          const swPath = resolve(__dirname, "dist/sw.js");
          try {
            let sw = readFileSync(swPath, "utf-8");
            const gitHash = execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
            sw = sw.replace("__SW_CACHE_VERSION__", gitHash);
            writeFileSync(swPath, sw);
          } catch {
            // sw.js may not exist if not using PWA template
          }
        },
      },
    ],
    server: {
      fs: {
        strict: true,
        allow: ["./src", "./.astro"],
      },
      proxy: {
        "/api": {
          target: `http://localhost:${process.env.AI_DEV_PORT || "8787"}`,
          changeOrigin: true,
        },
      },
      warmup: {
        clientFiles: [
          "./src/components/**/*.astro",
          "./src/layouts/**/*.astro",
        ],
      },
    },
    resolve: {
      alias: {
        "@/": new URL("./src/", import.meta.url).pathname,
        react: "preact/compat",
        "react-dom": "preact/compat",
        "react/jsx-runtime": "preact/jsx-runtime",
      },
      dedupe: [
        "preact",
        "preact/hooks",
        "preact/compat",
        "preact/debug",
        "preact/devtools",
        "react",
        "react-dom",
      ],
    },
    optimizeDeps: {
      include: [
        "@ai-sdk/react",
        "react",
        "react-dom",
        "preact",
        "preact/hooks",
      ],
    },
    ssr: {
      noExternal: ["@ai-sdk/react"],
    },
  },
  env: {
    schema: {
      SITE_URL: envField.string({
        context: "server",
        access: "public",
        optional: true,
      }),
      SITE_AUTHOR: envField.string({
        context: "server",
        access: "public",
        optional: true,
      }),
      PUBLIC_GOOGLE_SITE_VERIFICATION: envField.string({
        context: "client",
        access: "public",
        optional: true,
      }),
      AI_BASE_URL: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      AI_API_KEY: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      AI_MODEL: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      AI_BINDING_NAME: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      NOTIFY_TELEGRAM_BOT_TOKEN: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      NOTIFY_TELEGRAM_CHAT_ID: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      NOTIFY_WEBHOOK_URL: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      NOTIFY_RESEND_API_KEY: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      NOTIFY_RESEND_FROM: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      NOTIFY_RESEND_TO: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
    },
  },
});

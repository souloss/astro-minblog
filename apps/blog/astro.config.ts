import { defineConfig, envField } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import { visualizer } from "rollup-plugin-visualizer";
import minimax from "@astro-minimax/core";
import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";
import preact from "@astrojs/preact";

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

const asTransformer = (t: unknown) => t as never;

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
      viz: { mermaid: true, markmap: true },
      preferences: {
        theme: {
          colorScheme: "teal",
          mode: "system",
          radius: "lg",
        },
        appearance: {
          fontSize: 1,
        },
        layout: {
          postsLayout: "card",
        },
        reading: {
          fontSize: "md",
          lineHeight: "comfortable",
          contentWidth: "medium",
          theme: "light",
          fontFamily: "system",
          focusMode: false,
        },
        widgets: {
          themeToggle: true,
          backToTop: true,
          readingTime: true,
          stickyBackToTop: true,
        },
        animations: {
          enabled: true,
          cardHover: true,
          smoothScroll: true,
        },
      },
    }),
    // Preact integration with React compatibility mode.
    // 
    // WHY: @ai-sdk/react (used by AI chat) is a React library that uses React hooks.
    // Preact's compat layer shims React to work with Preact's smaller runtime (3kb vs 40kb).
    // This lets us use @ai-sdk/react without shipping full React to the browser.
    //
    // NO include/exclude needed: Astro Preact integration only has ONE JSX framework
    // (Preact) in this project, so it automatically handles all .tsx/.jsx files.
    // The old include/exclude patterns were redundant and could break @ai-sdk/react imports.
    preact({
      compat: true,
    }),
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
      // remarkAddZoomable needs options parameter cast
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
    plugins: [
      tailwindcss() as never,
      process.env.ANALYZE === 'true' && visualizer({
        open: true,
        filename: 'stats.html',
        gzipSize: true,
        brotliSize: true,
      }),
      {
        name: "astro-minimax-media-resolver",
        enforce: "pre" as const,
        async resolveId(source, importer, options) {
          if (source.startsWith("@/components/media")) {
            const vizDir = new URL("../../packages/core/src/components/viz", import.meta.url).pathname;
            return this.resolve(source.replace("@/components/media", vizDir), importer, { ...options, skipSelf: true });
          }
        },
      },
    ],
    server: {
      fs: {
        strict: true,
        allow: [
          new URL("../../packages", import.meta.url).pathname,
          new URL("../../node_modules", import.meta.url).pathname,
          "./src",
          "./.astro",
        ],
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
        "@/components/media": new URL("../../packages/core/src/components/viz", import.meta.url).pathname,
        // Base path alias for src/ directory
        "@/" : new URL("./src/", import.meta.url).pathname,
        // React compatibility: redirect React imports to Preact compat layer.
        // 
        // WHY: @ai-sdk/react imports from 'react' and 'react-dom'.
        // We alias these to preact/compat so the React hooks (@ai-sdk/react uses
        // useState, useEffect, etc.) work with Preact instead of full React.
        // This is the standard pattern for using React libraries with Preact.
        "react": "preact/compat",
        "react-dom": "preact/compat",
        "react/jsx-runtime": "preact/jsx-runtime",
      },
      // Dedupe: ensure only ONE copy of Preact and its variants is loaded.
      // 
      // WHY: When multiple packages depend on different versions or copies of Preact,
      // the hooks module (__H) can become undefined. This prevents multiple Preact
      // instances by forcing all imports to use the same resolved module.
      // The __H error (hooks undefined) occurs when Preact loads inconsistently.
      dedupe: ["preact", "preact/hooks", "preact/compat", "preact/debug", "preact/devtools", "react", "react-dom"],
    },
    // Pre-bundle dependencies to speed up development and ensure consistency.
    // 
    // WHY: By explicitly including these packages in optimizeDeps, Vite pre-bundles
    // them on startup. This prevents lazy-loading race conditions where modules
    // might load from different copies during dev. Particularly important for
    // @ai-sdk/react which uses hooks that must resolve consistently.
    // 
    // NOTE: Local workspace packages (@astro-minimax/*) are excluded from optimization
    // because they're linked via workspace protocol and should be loaded fresh on changes.
    optimizeDeps: {
      noDiscovery: true,
      exclude: ["@resvg/resvg-js", "@astro-minimax/ai", "@astro-minimax/core"],
      include: [
        "preact",
        "preact/hooks",
        "preact/compat",
        "preact/debug",
        "preact/devtools",
        "preact/jsx-runtime",
        "preact/jsx-dev-runtime",
        "@ai-sdk/react",
        "ai",
        "mermaid",
        "markmap-lib",
        "katex",
        "dayjs",
        "lodash.kebabcase",
        "slugify",
      ],
    },
    // SSR configuration for Cloudflare Pages deployment.
    // 
    // WHY: @resvg/resvg-js and sharp are native modules that don't work in
    // Cloudflare's V8 runtime. Marking them as external means they're not
    // bundled and are expected to be available in the deployment environment.
    // noExternal lists packages that should be bundled despite being typically external.
    ssr: {
      external: ["@resvg/resvg-js", "sharp"],
      noExternal: [
        "@astro-minimax/ai",
        "@astro-minimax/core",
        "@ai-sdk/react",
        "ai",
      ],
    },
    build: {
      rollupOptions: {
        // Mark native modules and platform-specific builds as external
        external: [/@resvg\/resvg-js/, /@resvg\/resvg-js-linux-.*/, /\.node$/],
      },
      cssMinify: true,
      minify: "esbuild",
      sourcemap: false,
      reportCompressedSize: true,
    },
    // Environment-specific build configuration for client-side rendering
    environments: {
      client: {
        build: {
          rollupOptions: {
            output: {
              chunkFileNames: "assets/[name]-[hash].js",
              entryFileNames: "assets/[name]-[hash].js",
              assetFileNames: "assets/[name]-[hash].[ext]",
              manualChunks(id) {
                if (id.includes('preact/') || id.includes('preact\\') || 
                    id.includes('react/') || id.includes('react\\')) {
                  return 'vendor-preact';
                }
                if (id.includes('@ai-sdk')) {
                  return 'vendor-ai';
                }
                if (id.includes('mermaid')) {
                  return 'vendor-mermaid';
                }
                if (id.includes('markmap')) {
                  return 'vendor-markmap';
                }
                if (id.includes('katex')) {
                  return 'vendor-katex';
                }
              },
            },
          },
        },
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
});

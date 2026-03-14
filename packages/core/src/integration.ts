import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { AstroIntegration } from "astro";
import type { SiteConfig, SocialLink, FriendLink } from "./types";

export interface MinimaxUserConfig {
  site: SiteConfig | Record<string, unknown>;
  socials?: readonly SocialLink[] | SocialLink[];
  shareLinks?: readonly SocialLink[] | SocialLink[];
  friends?: readonly FriendLink[] | FriendLink[];
  blogPath?: string;
}

export default function minimax(
  userConfig: MinimaxUserConfig
): AstroIntegration {
  const blogPath = userConfig.blogPath ?? "src/data/blog";

  return {
    name: "@astro-minimax/core",
    hooks: {
      "astro:config:setup": ({ injectRoute, updateConfig, config }) => {
        const projectRoot = fileURLToPath(config.root);
        const require = createRequire(
          resolve(projectRoot, "__placeholder.js")
        );

        const installedPkgs = new Set<string>();
        for (const pkg of ["@astro-minimax/viz", "@astro-minimax/ai"]) {
          try {
            require.resolve(`${pkg}/package.json`);
            installedPkgs.add(pkg);
          } catch {
            // package not installed — skip
          }
        }

        const cssLines: string[] = [
          '@import "tailwindcss";',
          '@source "../src";',
          '@import "@astro-minimax/core/styles/source.css";',
        ];

        for (const pkg of installedPkgs) {
          cssLines.push(`@import "${pkg}/styles/source.css";`);
        }

        cssLines.push('@import "@astro-minimax/core/styles/theme.css";');

        const astroDir = resolve(projectRoot, ".astro");
        mkdirSync(astroDir, { recursive: true });
        const entryPath = resolve(astroDir, "minimax-styles.css");
        writeFileSync(entryPath, cssLines.join("\n") + "\n");

        updateConfig({
          vite: {
            plugins: [
              {
                name: "astro-minimax-virtual-modules",
                resolveId(id: string) {
                  const virtuals = [
                    "virtual:astro-minimax/config",
                    "virtual:astro-minimax/constants",
                    "virtual:astro-minimax/user-data",
                    "virtual:astro-minimax/styles",
                    "virtual:astro-minimax/ai-widget",
                  ];
                  if (virtuals.includes(id)) {
                    if (id === "virtual:astro-minimax/styles") return entryPath;
                    return "\0" + id;
                  }
                },
                load(id: string) {
                  if (id === "\0virtual:astro-minimax/config") {
                    return [
                      `export const SITE = ${JSON.stringify(userConfig.site)};`,
                      `export const BLOG_PATH = ${JSON.stringify(blogPath)};`,
                    ].join("\n");
                  }
                  if (id === "\0virtual:astro-minimax/constants") {
                    return [
                      `export const SOCIALS = ${JSON.stringify(userConfig.socials ?? [])};`,
                      `export const SHARE_LINKS = ${JSON.stringify(userConfig.shareLinks ?? [])};`,
                    ].join("\n");
                  }
                  if (id === "\0virtual:astro-minimax/user-data") {
                    return `export const FRIENDS = ${JSON.stringify(userConfig.friends ?? [])};`;
                  }
                  if (id === "\0virtual:astro-minimax/ai-widget") {
                    if (installedPkgs.has("@astro-minimax/ai")) {
                      return `export { default } from "@astro-minimax/ai/components/AIChatWidget.astro";`;
                    }
                    return `export default function() { return null; }`;
                  }
                },
              },
            ],
          },
        });

        const features =
          (userConfig.site as SiteConfig).features ?? {};

        injectRoute({
          pattern: "/",
          entrypoint: "@astro-minimax/core/pages/index.astro",
        });
        injectRoute({
          pattern: "/404",
          entrypoint: "@astro-minimax/core/pages/404.astro",
        });
        injectRoute({
          pattern: "/robots.txt",
          entrypoint: "@astro-minimax/core/pages/robots.txt.ts",
        });
        injectRoute({
          pattern: "/og.png",
          entrypoint: "@astro-minimax/core/pages/og.png.ts",
        });
        injectRoute({
          pattern: "/rss.xml",
          entrypoint: "@astro-minimax/core/pages/rss.xml.ts",
        });
        injectRoute({
          pattern: "/[lang]",
          entrypoint: "@astro-minimax/core/pages/[lang]/index.astro",
        });
        injectRoute({
          pattern: "/[lang]/about",
          entrypoint: "@astro-minimax/core/pages/[lang]/about.astro",
        });
        injectRoute({
          pattern: "/[lang]/rss.xml",
          entrypoint: "@astro-minimax/core/pages/[lang]/rss.xml.ts",
        });
        injectRoute({
          pattern: "/[lang]/posts/[...page]",
          entrypoint:
            "@astro-minimax/core/pages/[lang]/posts/[...page].astro",
        });
        injectRoute({
          pattern: "/[lang]/posts/[...slug]",
          entrypoint:
            "@astro-minimax/core/pages/[lang]/posts/[...slug]/index.astro",
        });
        injectRoute({
          pattern: "/[lang]/posts/[...slug].png",
          entrypoint:
            "@astro-minimax/core/pages/[lang]/posts/[...slug]/index.png.ts",
        });

        if (features.tags !== false) {
          injectRoute({
            pattern: "/[lang]/tags",
            entrypoint: "@astro-minimax/core/pages/[lang]/tags/index.astro",
          });
          injectRoute({
            pattern: "/[lang]/tags/[tag]/[...page]",
            entrypoint:
              "@astro-minimax/core/pages/[lang]/tags/[tag]/[...page].astro",
          });
        }
        if (features.categories !== false) {
          injectRoute({
            pattern: "/[lang]/categories",
            entrypoint:
              "@astro-minimax/core/pages/[lang]/categories/index.astro",
          });
          injectRoute({
            pattern: "/[lang]/categories/[...path]",
            entrypoint:
              "@astro-minimax/core/pages/[lang]/categories/[...path].astro",
          });
        }
        if (features.series !== false) {
          injectRoute({
            pattern: "/[lang]/series",
            entrypoint:
              "@astro-minimax/core/pages/[lang]/series/index.astro",
          });
          injectRoute({
            pattern: "/[lang]/series/[series]",
            entrypoint:
              "@astro-minimax/core/pages/[lang]/series/[series]/index.astro",
          });
        }
        if (features.archives !== false) {
          injectRoute({
            pattern: "/[lang]/archives",
            entrypoint:
              "@astro-minimax/core/pages/[lang]/archives/index.astro",
          });
        }
        if (features.search !== false) {
          injectRoute({
            pattern: "/[lang]/search",
            entrypoint: "@astro-minimax/core/pages/[lang]/search.astro",
          });
        }
        if (features.friends !== false) {
          injectRoute({
            pattern: "/[lang]/friends",
            entrypoint: "@astro-minimax/core/pages/[lang]/friends.astro",
          });
        }
        if (features.projects !== false) {
          injectRoute({
            pattern: "/[lang]/projects",
            entrypoint: "@astro-minimax/core/pages/[lang]/projects.astro",
          });
        }
      },

      "astro:config:done": ({ injectTypes }) => {
        injectTypes({
          filename: "astro-minimax.d.ts",
          content: `declare module "virtual:astro-minimax/config" {
  import type { SiteConfig } from "@astro-minimax/core/types";
  export const SITE: SiteConfig;
  export const BLOG_PATH: string;
}
declare module "virtual:astro-minimax/constants" {
  import type { SocialLink } from "@astro-minimax/core/types";
  export const SOCIALS: SocialLink[];
  export const SHARE_LINKS: SocialLink[];
}
declare module "virtual:astro-minimax/user-data" {
  import type { FriendLink } from "@astro-minimax/core/types";
  export const FRIENDS: FriendLink[];
}
declare module "virtual:astro-minimax/styles" {}
declare module "virtual:astro-minimax/ai-widget" {
  const AIChatWidget: import("astro").AstroComponentFactory;
  export default AIChatWidget;
}`,
        });
      },
    },
  };
}

import { fileURLToPath } from "node:url";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { AstroIntegration } from "astro";
import type { RemarkPlugin, RehypePlugin } from "@astrojs/markdown-remark";
import type { SiteConfig, SocialLink, FriendLink } from "./types";
import type { DeepPartial, Preferences } from "./preferences/types";
import { remarkMermaidCodeblock } from "./plugins/viz/remark-mermaid-codeblock";
import { remarkMarkmapCodeblock } from "./plugins/viz/remark-markmap-codeblock";
import { rehypeMermaidProcessed } from "./plugins/viz/rehype-mermaid-processed";

const VIRTUAL_MODULE_IDS = new Set([
  "virtual:astro-minimax/config",
  "virtual:astro-minimax/constants",
  "virtual:astro-minimax/user-data",
  "virtual:astro-minimax/styles",
  "virtual:astro-minimax/ai-widget",
  "virtual:astro-minimax/ai-seo",
  "virtual:astro-minimax/viz-mermaid-init",
  "virtual:astro-minimax/viz-markmap-init",
  "virtual:astro-minimax/preferences-defaults",
  "virtual:astro-minimax/preferences-client-init",
]);

export interface VizConfig {
  mermaid?: boolean;
  markmap?: boolean;
}

export interface MinimaxUserConfig {
  site: SiteConfig | Record<string, unknown>;
  socials?: readonly SocialLink[] | SocialLink[];
  shareLinks?: readonly SocialLink[] | SocialLink[];
  friends?: readonly FriendLink[] | FriendLink[];
  blogPath?: string;
  viz?: VizConfig;
  /** Default preferences for new users */
  preferences?: DeepPartial<Preferences>;
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
        // Get source directory for Tailwind @source directive
        const srcDir = fileURLToPath(config.srcDir);

        // Check if packages are installed by looking in the project's node_modules
        // NOT using require.resolve which can find monorepo sibling packages
        const installedPkgs = new Set<string>();
        for (const pkg of ["@astro-minimax/ai"]) {
          const pkgPath = resolve(
            projectRoot,
            "node_modules",
            pkg,
            "package.json"
          );
          if (existsSync(pkgPath)) {
            installedPkgs.add(pkg);
          }
        }

        const vizConfig = userConfig.viz ?? { mermaid: true, markmap: true };
        const remarkPlugins: (
          | string
          | RemarkPlugin
          | [string, unknown]
          | [RemarkPlugin, unknown]
        )[] = [];
        const rehypePlugins: (
          | string
          | RehypePlugin
          | [string, unknown]
          | [RehypePlugin, unknown]
        )[] = [];
        if (vizConfig.mermaid !== false) {
          remarkPlugins.push(remarkMermaidCodeblock);
          rehypePlugins.push(rehypeMermaidProcessed);
        }
        if (vizConfig.markmap !== false) {
          remarkPlugins.push(remarkMarkmapCodeblock);
        }

        const cssLines: string[] = [
          '@import "tailwindcss";',
          `@source "${srcDir.replace(/\\/g, "/")}";`,
          '@import "@astro-minimax/core/styles/source.css";',
        ];

        for (const pkg of installedPkgs) {
          cssLines.push(`@import "${pkg}/styles/source.css";`);
        }

        cssLines.push('@import "@astro-minimax/core/styles/theme.css";');
        cssLines.push('@import "@astro-minimax/core/styles/actions.css";');

        const astroDir = resolve(projectRoot, ".astro");
        mkdirSync(astroDir, { recursive: true });
        const entryPath = resolve(astroDir, "minimax-styles.css");
        writeFileSync(entryPath, cssLines.join("\n") + "\n");

        updateConfig({
          markdown: {
            remarkPlugins,
            rehypePlugins,
          },
          vite: {
            plugins: [
              {
                name: "astro-minimax-virtual-modules",
                resolveId(id: string) {
                  if (VIRTUAL_MODULE_IDS.has(id)) {
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
                  if (id === "\0virtual:astro-minimax/viz-mermaid-init") {
                    if (vizConfig.mermaid !== false) {
                      return `export { default } from "@astro-minimax/core/components/viz/MermaidInit.astro";`;
                    }
                    return `export { default } from "@astro-minimax/core/components/Empty.astro";`;
                  }
                  if (id === "\0virtual:astro-minimax/viz-markmap-init") {
                    if (vizConfig.markmap !== false) {
                      return `export { default } from "@astro-minimax/core/components/viz/MarkmapInit.astro";`;
                    }
                    return `export { default } from "@astro-minimax/core/components/Empty.astro";`;
                  }
                  if (id === "\0virtual:astro-minimax/ai-widget") {
                    if (installedPkgs.has("@astro-minimax/ai")) {
                      return `export { default } from "@astro-minimax/ai/components/AIChatWidget.astro";`;
                    }
                    return `export { default } from "@astro-minimax/core/components/Empty.astro";`;
                  }
                  if (id === "\0virtual:astro-minimax/ai-seo") {
                    const seoPath = resolve(
                      projectRoot,
                      "datas",
                      "ai-seo.json"
                    );
                    if (existsSync(seoPath)) {
                      try {
                        const data = JSON.parse(readFileSync(seoPath, "utf-8"));
                        return `export default ${JSON.stringify(data)};`;
                      } catch {
                        // fallback to empty
                      }
                    }
                    return "export default { meta: {}, articles: {} };";
                  }
                  if (id === "\0virtual:astro-minimax/preferences-defaults") {
                    return `export const userDefaults = ${JSON.stringify(userConfig.preferences ?? {})};`;
                  }
                  if (
                    id === "\0virtual:astro-minimax/preferences-client-init"
                  ) {
                    return `import "@astro-minimax/core/preferences/client-init"; export default null;`;
                  }
                },
              },
            ],
          },
        });

        const features = (userConfig.site as SiteConfig).features ?? {};

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
          entrypoint: "@astro-minimax/core/pages/[lang]/posts/[...page].astro",
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
            entrypoint: "@astro-minimax/core/pages/[lang]/series/index.astro",
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
            entrypoint: "@astro-minimax/core/pages/[lang]/archives/index.astro",
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
}
declare module "virtual:astro-minimax/viz-mermaid-init" {
  const MermaidInit: import("astro").AstroComponentFactory;
  export default MermaidInit;
}
declare module "virtual:astro-minimax/viz-markmap-init" {
  const MarkmapInit: import("astro").AstroComponentFactory;
  export default MarkmapInit;
}
declare module "virtual:astro-minimax/ai-seo" {
  interface ArticleSeoData {
    metaDescription: string;
    keywords: string[];
    ogDescription: string;
  }
  interface AiSeoData {
    meta: {
      lastUpdated: string;
      model: string;
      totalProcessed: number;
    };
    articles: Record<string, {
      data: ArticleSeoData;
      contentHash: string;
      processedAt: string;
    }>;
  }
  const aiSeo: AiSeoData;
  export default aiSeo;
}`,
        });
      },
    },
  };
}

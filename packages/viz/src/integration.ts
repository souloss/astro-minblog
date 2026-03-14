import type { AstroIntegration } from "astro";
import { remarkMermaidCodeblock } from "./plugins/remark-mermaid-codeblock";
import remarkMarkmap from "remark-markmap";

export interface VizConfig {
  mermaid?: boolean;
  markmap?: boolean;
}

export default function minimaxViz(config: VizConfig = {}): AstroIntegration {
  return {
    name: "@astro-minimax/viz",
    hooks: {
      "astro:config:setup": ({ updateConfig }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const remarkPlugins: any[] = [];

        if (config.mermaid !== false) {
          remarkPlugins.push(remarkMermaidCodeblock);
        }

        if (config.markmap !== false) {
          remarkPlugins.push([
            remarkMarkmap,
            {
              darkThemeSelector: () =>
                document.documentElement.matches('[data-theme="dark"]') ||
                document.documentElement.classList.contains("dark") ||
                (window.matchMedia?.("(prefers-color-scheme: dark)").matches ??
                  false),
            },
          ]);
        }

        if (remarkPlugins.length > 0) {
          updateConfig({ markdown: { remarkPlugins } });
        }
      },
    },
  };
}

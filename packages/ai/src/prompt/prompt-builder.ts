import { buildStaticLayer } from "./static-layer.js";
import { buildSemiStaticLayer } from "./semi-static-layer.js";
import { buildDynamicLayer } from "./dynamic-layer.js";
import type { PromptBuildConfig } from "./types.js";

export function buildSystemPrompt(config: PromptBuildConfig): string {
  const lang = config.static.lang || config.dynamic.lang;

  const layers = [
    buildStaticLayer(config.static),
    buildSemiStaticLayer({
      ...config.semiStatic,
      lang,
      preferArticleLocal: config.dynamic.preferInjectedChunks,
    }),
    buildDynamicLayer(config.dynamic),
  ].filter(Boolean);

  return layers.join("\n\n");
}

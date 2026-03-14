import { buildStaticLayer } from './static-layer.js';
import { buildSemiStaticLayer } from './semi-static-layer.js';
import { buildDynamicLayer } from './dynamic-layer.js';
import type { PromptBuildConfig } from './types.js';

/**
 * Assembles the three-layer system prompt.
 *
 * Structure:
 * 1. Static layer    — Author identity, role, behavior constraints (rarely changes)
 * 2. Semi-static layer — Blog metadata loaded at startup (changes on rebuild)
 * 3. Dynamic layer   — Per-request search results + evidence analysis
 */
export function buildSystemPrompt(config: PromptBuildConfig): string {
  const layers = [
    buildStaticLayer(config.static),
    buildSemiStaticLayer(config.semiStatic),
    buildDynamicLayer(config.dynamic),
  ].filter(Boolean);

  return layers.join('\n\n');
}

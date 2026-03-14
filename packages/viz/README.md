# @astro-minimax/viz

Visualization plugin package for astro-minimax — Mermaid diagrams, Markmap mind maps, Rough.js drawings, Excalidraw whiteboards, Asciinema terminal recordings, and more.

## Installation

```bash
pnpm add @astro-minimax/viz
```

Peer dependencies: `astro`, `mermaid`.

## Usage

```ts
// astro.config.ts
import minimaxViz from "@astro-minimax/viz";

export default defineConfig({
  integrations: [
    minimaxViz({ mermaid: true, markmap: true }),
  ],
});
```

### VizConfig

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `mermaid` | `boolean` | `true` | Enable Mermaid diagram support via remark plugin |
| `markmap` | `boolean` | `true` | Enable Markmap mind map support via remark plugin |

## Components

Import components in `.astro` or `.mdx` files:

```astro
---
import MermaidInit from "@astro-minimax/viz/components/MermaidInit.astro";
import Markmap from "@astro-minimax/viz/components/Markmap.astro";
import RoughDrawing from "@astro-minimax/viz/components/RoughDrawing.astro";
import ExcalidrawEmbed from "@astro-minimax/viz/components/ExcalidrawEmbed.astro";
import AsciinemaPlayer from "@astro-minimax/viz/components/AsciinemaPlayer.astro";
import MusicPlayer from "@astro-minimax/viz/components/MusicPlayer.astro";
import MarkmapInit from "@astro-minimax/viz/components/MarkmapInit.astro";
---
```

### Mermaid Diagrams

Use fenced code blocks with `mermaid` language in Markdown:

````md
```mermaid
graph TD
  A --> B
```
````

The `remark-mermaid-codeblock` plugin transforms these into `<MermaidInit>` components at build time.

### Markmap Mind Maps

Use fenced code blocks with `markmap` language:

````md
```markmap
# Root
## Branch A
## Branch B
```
````

### Rough.js Drawings

```astro
<RoughDrawing type="bar" data={[...]} width={600} height={400} />
```

### Excalidraw Whiteboards

```astro
<ExcalidrawEmbed src="/drawings/example.excalidraw" />
```

### Asciinema Terminal Recordings

```astro
<AsciinemaPlayer src="/casts/demo.cast" />
```

### Music Player

```astro
<MusicPlayer src="/audio/track.mp3" title="Track Name" />
```

## Remark Plugins

- **`remark-mermaid-codeblock`** — Transforms `mermaid` code blocks into client-rendered components
- **`remark-markmap`** — Transforms `markmap` code blocks into interactive mind maps (with dark mode support)

## CSS Architecture

`source.css` declares `@source "../"` so Tailwind scans all viz component files for utility classes. The core integration auto-detects this package and includes it in the generated entry CSS.

## Exports

```json
{
  ".": "./src/integration.ts",
  "./components/*.astro": "./src/components/*.astro",
  "./styles/source.css": "./src/styles/source.css",
  "./plugins/remark-mermaid-codeblock": "./src/plugins/remark-mermaid-codeblock.ts",
  "./plugins/remark-markmap-codeblock": "./src/plugins/remark-markmap-codeblock.ts",
  "./scripts/*": "./src/scripts/*.ts"
}
```

## Development

Components use Tailwind CSS design tokens from `@astro-minimax/core/styles/theme.css` (e.g., `--viz-bg`, `--viz-border`). Changes are hot-reloaded via the monorepo dev server.

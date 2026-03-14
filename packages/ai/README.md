# @astro-minimax/ai

Vendor-agnostic AI integration package with a full RAG pipeline for astro-minimax blogs. Provides a chat widget, provider abstraction, prompt engineering, search indexing, and streaming response utilities.

## Installation

```bash
pnpm add @astro-minimax/ai
```

Peer dependencies: `preact` (for chat UI), `@ai-sdk/react` (optional), `@cloudflare/workers-types` (optional).

## Features

- **Chat Widget** — Floating AI assistant panel with Tailwind-based UI
- **Provider System** — Vendor-agnostic AI provider factory (OpenAI-compatible, Workers AI, mock)
- **RAG Pipeline** — Search indexing, intent detection, keyword extraction, evidence analysis, citation guard
- **Prompt Engineering** — Multi-layer prompt builder (static, semi-static, dynamic layers)
- **Streaming** — SSE-based streaming response utilities

## Chat Widget

The chat UI is automatically injected by `@astro-minimax/core` when this package is installed. No manual setup needed.

### How It Works

1. `@astro-minimax/core` integration detects `@astro-minimax/ai` at build time
2. `Layout.astro` conditionally renders `AIChatWidget` via `virtual:astro-minimax/ai-widget`
3. The widget reads AI config from `virtual:astro-minimax/config` (SITE.ai settings)

### Configuration

In your `src/config.ts`:

```ts
export const SITE = {
  // ...other config
  ai: {
    enabled: true,
    mockMode: false,         // true for demo mode without API
    apiEndpoint: "/api/chat",
    welcomeMessage: "Hi! Ask me anything about this blog.",
    placeholder: "Type your question...",
  },
};
```

### UI Design

`ChatPanel.tsx` uses Tailwind utility classes with the core theme's design tokens:
- `bg-background`, `text-foreground`, `border-border` — semantic color tokens
- `bg-accent/15`, `text-accent` — accent colors
- `dark:` variant — works with `@custom-variant dark` from theme.css

## CSS Architecture

`src/styles/source.css` declares `@source "../"` so Tailwind scans all AI component files. The core integration auto-detects this package and includes it in the generated entry CSS.

## Exports

| Export | Description |
|--------|-------------|
| `.` | Core types and utilities |
| `./providers` | AI provider factory and types |
| `./middleware` | Rate limiter and middleware utilities |
| `./search` | Search index, search API, session cache |
| `./intelligence` | Intent detection, keyword extraction, evidence analysis, citation guard |
| `./prompt` | Multi-layer prompt builder |
| `./data` | Metadata loader and data types |
| `./stream` | Streaming response utilities and mock stream |
| `./components/*` | Astro/Preact components (AIChatWidget, ChatPanel, AIChatContainer) |
| `./styles/source.css` | Tailwind source declaration |

## API Endpoint

The chat widget sends requests to `SITE.ai.apiEndpoint` (default: `/api/chat`). The endpoint should accept POST requests with:

```json
{
  "messages": [{ "role": "user", "content": "..." }],
  "sessionId": "uuid"
}
```

And return an SSE stream following the AI SDK response format.

## Development

```bash
# Build TypeScript (providers, middleware, etc.)
pnpm --filter @astro-minimax/ai build

# Watch mode
pnpm --filter @astro-minimax/ai build:watch
```

Components in `src/components/` are consumed directly as source files (not built) — Astro processes `.astro` files and Vite handles `.tsx` files.

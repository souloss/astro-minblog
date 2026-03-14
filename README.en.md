# astro-minimax

English | [**简体中文**](./README.md)

![astro-minimax](apps/blog/public/astro-minimax-og.jpg)
![Typescript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![GitHub](https://img.shields.io/github/license/souloss/astro-minimax?color=%232F3741&style=for-the-badge)

> **astro-minima-X** — Minima as the foundation, X for infinite extensibility.

astro-minimax is a minimal, modern, and modular Astro blog theme. Built on a minimal aesthetic with rich visualization components and feature extensions. Supports i18n, AI chat, Mermaid diagrams, Markmap mind maps, terminal replay, and more.

## Design Philosophy

- **Minimal First** — Clean design, content-focused
- **Modular & Pluggable** — Core theme + visualization plugins + AI integration separated, use what you need
- **Modern** — Astro v5, Tailwind v4, strict TypeScript
- **Content-System Separation** — Flexible integration via NPM packages or GitHub Template

## Features

### Core

- [x] Type-safe Markdown / MDX
- [x] High performance (Lighthouse 90+)
- [x] Accessible
- [x] Responsive design
- [x] SEO friendly
- [x] Light/Dark theme with View Transitions
- [x] Full-text search (Pagefind)
- [x] Dynamic OG image generation
- [x] Multi-language (Chinese/English)
- [x] Categories, tags, series & archives

### Content Enhancement

- [x] 📊 **Mermaid Diagrams** — Flowcharts, sequence diagrams
- [x] 🧠 **Markmap Mind Maps** — Interactive mind maps
- [x] ✏️ **Rough.js Drawings** — Hand-drawn style SVG
- [x] 🖌️ **Excalidraw Embeds** — Whiteboard-style diagrams
- [x] 📺 **Asciinema Replay** — Embedded terminal recordings

### Interactive Features

- [x] 🤖 **AI Chat Widget** — Multi-provider AI assistant with automatic failover
- [x] 💬 **Waline Comments** — Interactive comment system
- [x] 📊 **Umami Analytics** — Privacy-friendly web analytics
- [x] ☕ **Sponsorship** — Support multiple payment methods

## Two Integration Methods

### Method 1: GitHub Template (Recommended)

```bash
pnpm create astro@latest --template souloss/astro-minimax
cd my-blog && pnpm install && pnpm run dev
```

### Method 2: NPM Packages

```bash
pnpm add @astro-minimax/core
pnpm add @astro-minimax/viz  # optional, visualization plugins
pnpm add @astro-minimax/ai   # optional, AI chat integration
```

See [Getting Started](apps/blog/src/data/blog/en/getting-started.md) for details.

## Project Structure

This project uses a monorepo structure managed by pnpm workspace:

```bash
astro-minimax/
├── pnpm-workspace.yaml          # Workspace config
├── package.json                 # Root: workspace scripts + shared devDeps
├── tsconfig.json                # Root: base TS config
│
├── packages/
│   ├── core/                    # @astro-minimax/core — Core theme package
│   │   └── src/
│   │       ├── layouts/         #   Layout components
│   │       ├── components/      #   UI components (nav, blog, social, etc.)
│   │       ├── utils/           #   Utility functions
│   │       ├── plugins/         #   Remark/Rehype plugins
│   │       ├── styles/          #   Global styles
│   │       ├── scripts/         #   Client scripts
│   │       ├── assets/icons/    #   SVG icons
│   │       └── types.ts         #   Type definitions
│   │
│   ├── viz/                     # @astro-minimax/viz — Visualization plugins
│   │   └── src/
│   │       ├── components/      #   Mermaid, Markmap, Rough.js, Excalidraw, Asciinema
│   │       ├── plugins/         #   Remark plugins
│   │       └── scripts/         #   Client scripts
│   │
│   └── ai/                      # @astro-minimax/ai — AI integration package
│       └── src/
│           ├── components/      #   ChatPanel, AIChatWidget
│           ├── providers/       #   Cloudflare Workers AI, OpenAI compatible
│           ├── prompt/          #   Prompt building system
│           ├── search/          #   RAG retrieval
│           └── intelligence/    #   Intent detection, citation verification
│
└── apps/
    └── blog/                    # Example blog / dev preview site
        ├── astro.config.ts      #   Astro configuration
        ├── package.json
        ├── wrangler.toml        #   Cloudflare deployment config
        ├── functions/           #   Cloudflare Pages Functions (AI API)
        ├── tools/               #   AI data build scripts
        ├── datas/               #   AI-related data
        ├── public/              #   Static assets
        └── src/
            ├── config.ts        #   Site configuration
            ├── constants.ts     #   Social link constants
            ├── content.config.ts#   Content collection definition
            ├── data/
            │   ├── blog/zh/     #   Chinese blog posts
            │   └── blog/en/     #   English blog posts
            └── pages/           #   Page routes
```

## Tech Stack

| Category | Technology |
|----------|-----------|
| **Framework** | [Astro v5](https://astro.build/) |
| **Styling** | [TailwindCSS v4](https://tailwindcss.com/) |
| **Search** | [Pagefind](https://pagefind.app/) |
| **Comments** | [Waline](https://waline.js.org/) |
| **Diagrams** | [Mermaid](https://mermaid.js.org/) |
| **Mind Maps** | [Markmap](https://markmap.js.org/) |
| **AI** | [Vercel AI SDK](https://sdk.vercel.ai/) + Cloudflare Workers AI |
| **Analytics** | [Umami](https://umami.is/) |
| **Deployment** | Cloudflare Pages / Vercel / Netlify / Docker |

## Commands

All commands are run from the project root:

| Command | Action |
|---------|--------|
| `pnpm install` | Install all workspace dependencies |
| `pnpm run dev` | Start blog dev server |
| `pnpm run build` | Build blog for production (with type check and search index) |
| `pnpm run preview` | Preview build |
| `pnpm run format` | Format code |
| `pnpm run format:check` | Check code formatting |

Additional scripts available in `apps/blog/`:

| Command | Action |
|---------|--------|
| `pnpm run lint` | ESLint code check |
| `pnpm run ai:process` | AI data processing pipeline |
| `pnpm run tools:summarize` | Generate post summaries |
| `pnpm run tools:translate` | AI-assisted translation |

## Documentation

- [Getting Started](apps/blog/src/data/blog/en/getting-started.md)
- [Configure Theme](apps/blog/src/data/blog/en/how-to-configure-astro-minimax-theme.md)
- [Add Posts](apps/blog/src/data/blog/en/adding-new-post.md)
- [Feature Overview](apps/blog/src/data/blog/en/feature-overview.md)
- [Deployment Guide](apps/blog/src/data/blog/en/deployment-guide.md)
- [Customize Colors](apps/blog/src/data/blog/en/customizing-astro-minimax-theme-color-schemes.md)
- [Dynamic OG Images](apps/blog/src/data/blog/en/dynamic-og-images.md)

## Packages

| Package | Version | Description |
|---------|---------|-------------|
| [`@astro-minimax/core`](packages/core/) | 0.1.0 | Core theme: layouts, components, styles, utilities, Remark/Rehype plugins |
| [`@astro-minimax/viz`](packages/viz/) | 0.1.4 | Visualization plugins: Mermaid, Markmap, Rough.js, Excalidraw, Asciinema |
| [`@astro-minimax/ai`](packages/ai/) | 0.2.0 | AI integration: multi-provider, auto failover, RAG retrieval, streaming |

## Credits

Built upon [AstroPaper](https://github.com/satnaing/astro-paper).

## License

MIT License - Copyright © 2026

---

Crafted by [Souloss](https://souloss.cn).

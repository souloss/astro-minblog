# astro-minimax

English | [**简体中文**](./README.md)

![astro-minimax](apps/blog/public/astro-minimax-og.jpg)
![Typescript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![GitHub](https://img.shields.io/github/license/souloss/astro-minimax?color=%232F3741&style=for-the-badge)

> **astro-minima-X** — Minima as the foundation, X for infinite extensibility.

astro-minimax is a minimal, modern, and modular Astro blog theme. Built on a minimal aesthetic with rich visualization components and feature extensions. Supports i18n, AI chat, multiple search providers, Mermaid diagrams, Markmap mind maps, and more.

## Design Philosophy

- **Minimal First** — Clean design, content-focused
- **Modular & Pluggable** — Four independent packages, compose what you need
- **Modern** — Astro v6, Tailwind v4, strict TypeScript, AI SDK v6
- **Content-System Separation** — Flexible integration via CLI / NPM packages / GitHub Template

## Features

### Core

- [x] Type-safe Markdown / MDX
- [x] High performance (Lighthouse 90+)
- [x] Accessible
- [x] Responsive design
- [x] SEO friendly
- [x] Light/Dark theme with View Transitions
- [x] Full-text search (Pagefind or Algolia DocSearch)
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

- [x] 🤖 **AI Chat** — Multi-provider failover, RAG retrieval, streaming, source priority anti-hallucination
- [x] 📖 **Read & Chat** — AI reading companion with context-aware responses
- [x] 🔒 **AI Privacy Protection** — Auto-refuses sensitive personal info queries
- [x] 🧪 **AI Quality Evaluation** — Golden test set with automated assessment
- [x] 💬 **Waline Comments** — Interactive comment system
- [x] 🔔 **Multi-channel Notifications** — Telegram / Email / Webhook
- [x] 📊 **Umami Analytics** — Privacy-friendly web analytics
- [x] ☕ **Sponsorship** — Multiple payment methods

## Three Integration Methods

### Method 1: CLI (Recommended)

```bash
npx @astro-minimax/cli init my-blog
cd my-blog && pnpm install && pnpm run dev
```

### Method 2: GitHub Template

```bash
pnpm create astro@latest --template souloss/astro-minimax
cd my-blog && pnpm install && pnpm run dev
```

### Method 3: NPM Packages

```bash
pnpm add @astro-minimax/core    # Core theme (includes visualizations)
pnpm add @astro-minimax/ai      # optional, AI chat
pnpm add -D @astro-minimax/cli  # recommended, CLI tools
```

See [Getting Started](apps/blog/src/data/blog/en/getting-started.md) for details.

## Project Structure

```bash
astro-minimax/
├── packages/
│   ├── core/      # @astro-minimax/core — Core theme (layouts, components, styles, routing, plugins, visualizations)
│   ├── ai/        # @astro-minimax/ai — AI integration (RAG, multi-provider, streaming)
│   ├── notify/    # @astro-minimax/notify — Multi-channel notifications
│   └── cli/       # @astro-minimax/cli — CLI toolchain (scaffolding, processing, evaluation)
└── apps/
    └── blog/      # Example blog / dev preview site
```

## Tech Stack

| Category | Technology |
|----------|-----------|
| **Framework** | [Astro v6](https://astro.build/) |
| **Styling** | [TailwindCSS v4](https://tailwindcss.com/) |
| **Search** | [Pagefind](https://pagefind.app/) / [Algolia DocSearch](https://docsearch.algolia.com/) |
| **Comments** | [Waline](https://waline.js.org/) |
| **Diagrams** | [Mermaid](https://mermaid.js.org/) |
| **Mind Maps** | [Markmap](https://markmap.js.org/) |
| **AI** | [Vercel AI SDK v6](https://sdk.vercel.ai/) + Cloudflare Workers AI |
| **Notifications** | Telegram / Email (Resend) / Webhook |
| **Analytics** | [Umami](https://umami.is/) |
| **Deployment** | Cloudflare Pages / Vercel / Netlify / Docker |

## CLI Commands

Full command-line toolkit via `@astro-minimax/cli`:

```bash
# Blog management
astro-minimax init my-blog       # Create new blog
astro-minimax post new "Title"   # Create new post
astro-minimax post list          # List all posts
astro-minimax post stats         # Post statistics

# AI content processing
astro-minimax ai process         # AI process articles (summaries + SEO)
astro-minimax ai eval            # Evaluate AI chat quality

# Author profile
astro-minimax ai profile build   # Build complete profile (context + voice + facts + report)

# Data management
astro-minimax data status        # View data file status
astro-minimax data clear         # Clear generated caches
```

Shortcut scripts are also available: `pnpm run ai:process`, `pnpm run ai:profile:build`, etc.

## Packages

| Package | Version | Description |
|---------|---------|-------------|
| [`@astro-minimax/core`](packages/core/) | 0.9.0 | Core theme: layouts, components, styles, route injection, virtual modules, visualizations |
| [`@astro-minimax/ai`](packages/ai/) | 0.9.0 | AI integration: multi-provider failover, RAG, source priority, privacy protection |
| [`@astro-minimax/notify`](packages/notify/) | 0.9.0 | Notifications: Telegram Bot, Email (Resend), Webhook |
| [`@astro-minimax/cli`](packages/cli/) | 0.9.0 | CLI tools: scaffolding, AI processing, profile building, quality evaluation |

## Documentation

- [Getting Started](apps/blog/src/data/blog/en/getting-started.md)
- [Feature Overview](apps/blog/src/data/blog/en/feature-overview.md)
- [Configure Theme](apps/blog/src/data/blog/en/how-to-configure-astro-minimax-theme.md)
- [Add Posts](apps/blog/src/data/blog/en/adding-new-post.md)
- [Deployment Guide](apps/blog/src/data/blog/en/deployment-guide.md)
- [Notification System](apps/blog/src/data/blog/en/notification-guide.md)
- [Customize Colors](apps/blog/src/data/blog/en/how-to-configure-astro-minimax-theme.md)
- [Dynamic OG Images](apps/blog/src/data/blog/en/dynamic-og-images.md)

## Credits

Built upon [AstroPaper](https://github.com/satnaing/astro-paper).

## License

MIT License - Copyright © 2026

---

Crafted by [Souloss](https://souloss.cn).

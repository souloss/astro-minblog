---
author: Souloss
pubDatetime: 2025-03-08T00:00:00.000Z
title: astro-minblog 1.0
slug: astro-minblog-v1
featured: true
category: Release Notes
ogImage: ../../../../assets/images/astro-minblog-v1.png
tags:
  - release
description: "astro-minblog 1.0: The first release of an independent blog theme based on AstroPaper, featuring AI chat, Mermaid diagrams, Waline comments, and more."
---

astro-minblog is a minimal, responsive, accessible and SEO-friendly Astro blog theme. This project is built on top of [AstroPaper](https://github.com/satnaing/astro-paper) and has evolved through multiple versions into a fully-featured independent theme.

![astro-minblog](@/assets/images/astro-minblog-v1.png)

## Table of contents

## Project Origins

astro-minblog originated from deep customization and feature expansion of the AstroPaper theme. While preserving the minimal, high-performance, and accessible nature of the original, we've added numerous practical features making it more suitable for Chinese users and modern blogging needs.

## Core Features

### 🚀 Framework Evolution

| Version | Astro | Key Features                                       |
| ------- | ----- | -------------------------------------------------- |
| v1.0    | v5    | Full i18n support, AI integration, modern search   |
| Early   | v2-v4 | Content Collections, View Transitions, type safety |

### 🎨 Unique Features

astro-minblog adds the following features on top of AstroPaper:

#### AI & Interaction

- 🤖 **AI Chat Widget** - Built-in AI assistant with streaming responses
- 💬 **Waline Comments** - Full-featured comment system with reactions and notifications

#### Content Enhancement

- 📊 **Mermaid Diagrams** - Native support for flowcharts, sequence diagrams, Gantt charts, etc.
- 🧠 **Markmap Mind Maps** - Interactive mind maps from Markdown outline syntax
- 🎬 **Bilibili Embeds** - One-click Bilibili video embedding
- 📑 **Dual TOC** - Inline and floating table of contents

#### Visualization Components

- ✏️ **Rough.js Drawings** - Hand-drawn style SVG graphics with theme-aware colors
- 🎞️ **Two.js Animations** - Smooth 2D SVG animations with configurable shapes and autoplay
- 🎨 **p5.js Sketches** - Creative coding canvas with mouse interaction and generative art
- 📽️ **Reveal.js Slides** - Embeddable slide presentations with auto theme switching
- 🖌️ **Excalidraw Embeds** - Whiteboard-style collaborative diagrams
- 📦 **VizContainer** - Unified wrapper with zoom controls and fullscreen support for all visual components

#### i18n & Organization

- 🌐 **Multi-language** - Built-in Chinese/English support
- 🏷️ **Categories & Series** - Hierarchical content organization
- 📖 **Related Posts** - Smart recommendation algorithm
- 🔗 **Friends Page** - Friend links management

#### Social & Sponsorship

- ☕ **Sponsor Component** - Support WeChat Pay, Alipay, and other donation methods
- ©️ **Copyright Notice** - Automatic CC license display
- 🔗 **Share Links** - One-click sharing to social platforms

#### User Experience

- ⏰ **Scheduled Posts** - Time-based publication control
- 🌍 **Timezone Support** - Global and per-post timezone settings
- 📍 **Reading Position** - Persistent scroll position memory
- 🎨 **Theme Switching** - Improved light/dark mode transitions with all components reactively updating
- 📖 **Series Navigation** - Redesigned series index and detail pages with better visual hierarchy
- 🗂️ **Projects Page** - Dedicated page to showcase project portfolio
- ⚙️ **Config-Driven Navigation** - Header navigation items configurable via `config.ts`

#### Developer Tools

- 🛠️ **AI Toolchain** - Build-time tools for summary generation, tag suggestion, cover image generation, content vectorization
- 🧮 **Vector Search** - Semantic search based on TF-IDF / OpenAI Embeddings

### 🔧 Tech Stack

**Core Framework**

- [Astro v5](https://astro.build/) - Modern static site generator
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [TailwindCSS v4](https://tailwindcss.com/) - Atomic CSS

**Feature Integration**

- [Pagefind](https://pagefind.app/) - Static full-text search
- [Waline](https://waline.js.org/) - Comment system
- [Mermaid](https://mermaid.js.org/) - Diagram rendering
- [Rough.js](https://roughjs.com/) - Hand-drawn style graphics
- [Two.js](https://two.js.org/) - 2D animation engine
- [p5.js](https://p5js.org/) - Creative coding library
- [Reveal.js](https://revealjs.com/) - Presentation framework
- [Shiki](https://shiki.style/) - Code highlighting

**Deployment & Analytics**

- [Vercel](https://vercel.com/) / [Cloudflare Pages](https://pages.cloudflare.com/) - Deployment platforms
- [Umami](https://umami.is/) - Privacy-friendly traffic analytics

## Version Evolution Summary

### Base Architecture (Inherited from AstroPaper)

- **Type-safe Content Management** - Type-safe Markdown frontmatter via Content Collections API
- **View Transitions** - Page transition animations for better UX
- **Dynamic OG Images** - Auto-generated social sharing images
- **Responsive Design** - Mobile-first, adapts to all screen sizes
- **SEO Optimization** - JSON-LD structured data, sitemap, RSS feed

### Performance Optimizations

- **Removed React Dependency** - Replaced Fuse.js with Pagefind, reducing bundle size
- **Tailwind v4** - Faster builds, smaller CSS output
- **Astro SVG Component** - Experimental SVG component, less boilerplate
- **pnpm Package Manager** - More efficient dependency management

## Project Structure

```bash
/
├── src/
│   ├── components/
│   │   ├── ai/          # AI chat widget
│   │   ├── blog/        # Post components, TOC, comments, copyright
│   │   ├── media/       # Mermaid, Rough.js, Two.js, p5.js, Reveal.js, Excalidraw
│   │   ├── nav/         # Header, footer, pagination, floating actions
│   │   ├── social/      # Sponsorship, social links
│   │   └── ui/          # Cards, tags, alerts, timeline, collapse
│   ├── data/
│   │   ├── blog/        # Blog posts (en/, zh/)
│   │   ├── vectors/     # Vector index (for AI search)
│   │   └── friends.ts   # Friend links data
│   ├── pages/
│   │   └── [lang]/      # Multi-language routes
│   ├── config.ts        # Site configuration
│   └── constants.ts     # Constants definition
├── tools/               # AI toolchain
│   ├── lib/             # Shared utilities
│   ├── summarize.ts     # Summary generation
│   ├── generate-tags.ts # Tag suggestion
│   ├── generate-cover.ts# Cover image generation
│   ├── generate-related.ts # Related posts
│   └── vectorize.ts     # Content vectorization
└── public/
    └── pagefind/        # Search index
```

## Quick Start

```bash
# Create project from template
pnpm create astro@latest --template souloss/astro-minblog

# Install dependencies
pnpm install

# Start development server
pnpm run dev
```

## Acknowledgements

astro-minblog wouldn't exist without the support of these projects and individuals:

- [AstroPaper](https://github.com/satnaing/astro-paper) - Original theme by [Sat Naing](https://github.com/satnaing)
- [Astro](https://astro.build/) - Excellent static site framework
- All contributors and users for their support

## Roadmap

astro-minblog will continue to evolve. Future plans include:

- 🤖 More AI feature integrations
- 📱 PWA support
- 🎨 More preset themes
- 📊 Advanced data visualization with D3.js integration

---

Thank you for choosing astro-minblog! If you like it, please consider giving a [GitHub Star](https://github.com/souloss/astro-minblog) ⭐

[Souloss](https://souloss.cn) - Creator of astro-minblog

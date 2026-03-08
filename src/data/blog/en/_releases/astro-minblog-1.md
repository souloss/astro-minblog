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
- 🎬 **Bilibili Embeds** - One-click Bilibili video embedding
- 📑 **Dual TOC** - Inline and floating table of contents

#### i18n & Organization

- 🌐 **Multi-language** - Built-in Chinese/English support
- 🏷️ **Categories & Series** - Hierarchical content organization
- 📖 **Related Posts** - Smart recommendation algorithm
- 🔗 **Friends Page** - Friend links management

#### User Experience

- ⏰ **Scheduled Posts** - Time-based publication control
- 🌍 **Timezone Support** - Global and per-post timezone settings
- 📍 **Reading Position** - Persistent scroll position memory

### 🔧 Tech Stack

**Core Framework**

- [Astro v5](https://astro.build/) - Modern static site generator
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [TailwindCSS v4](https://tailwindcss.com/) - Atomic CSS

**Feature Integration**

- [Pagefind](https://pagefind.app/) - Static full-text search
- [Waline](https://waline.js.org/) - Comment system
- [Mermaid](https://mermaid.js.org/) - Diagram rendering
- [Shiki](https://shiki.style/) - Code highlighting

**Deployment & Analytics**

- [Vercel](https://vercel.com/) / [Cloudflare Pages](https://pages.cloudflare.com/) - Deployment platforms
- [Google Analytics](https://analytics.google.com/) - Traffic analysis

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
│   │   ├── blog/        # Post components, TOC, comments
│   │   ├── media/       # Mermaid, Bilibili, music player
│   │   ├── nav/         # Header, footer, pagination
│   │   └── ui/          # Cards, tags, alerts
│   ├── data/
│   │   ├── blog/        # Blog posts (en/, zh/)
│   │   └── friends.ts   # Friend links data
│   ├── pages/
│   │   └── [lang]/      # Multi-language routes
│   ├── config.ts        # Site configuration
│   └── constants.ts     # Constants definition
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
- 📊 Data visualization components

---

Thank you for choosing astro-minblog! If you like it, please consider giving a [GitHub Star](https://github.com/souloss/astro-minblog) ⭐

[Souloss](https://souloss.cn) - Creator of astro-minblog

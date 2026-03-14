---
title: "Getting Started: Two Integration Methods"
pubDatetime: 2026-03-12T00:00:00.000Z
modDatetime: 2026-03-14T00:00:00.000Z
author: Souloss
description: "Start using astro-minimax via GitHub Template for quick setup or NPM packages for modular integration."
tags:
  - docs
  - configuration
category: Blog/Tutorial
featured: true
draft: false
---

## Table of contents

## Overview

astro-minimax offers two integration methods for different use cases:

| Method | Best For | Updates |
|--------|----------|---------|
| **GitHub Template** | One-time setup, full customization | Manual upstream merge |
| **NPM Packages** | Content-system separation, continuous updates | `pnpm update` |

---

## Method 1: GitHub Template (Recommended for Beginners)

### 1. Create Repository

Click **"Use this template"** on the GitHub repo page, or via CLI:

```bash
pnpm create astro@latest --template souloss/astro-minimax
```

### 2. Install Dependencies

```bash
cd your-blog
pnpm install
```

### 3. Understand the Project Structure

astro-minimax uses a monorepo structure. Your blog site lives in the `apps/blog/` directory:

```
your-blog/
├── pnpm-workspace.yaml       # Workspace config
├── package.json               # Root: unified command entry
├── packages/
│   ├── core/                  # Core theme (layouts, components, styles)
│   ├── viz/                   # Visualization plugins (Mermaid, Markmap, etc.)
│   └── ai/                    # AI integration
└── apps/
    └── blog/                  # Your blog site
        ├── astro.config.ts    # Astro config
        ├── public/            # Static assets
        └── src/
            ├── config.ts      # Site configuration (edit this)
            ├── constants.ts   # Social links
            ├── content.config.ts
            └── data/
                ├── blog/zh/   # Chinese posts
                └── blog/en/   # English posts
```

### 4. Configure Your Site

Edit `apps/blog/src/config.ts` with your blog details:

```typescript
export const SITE = {
  website: "https://your-domain.com/",
  author: "Your Name",
  title: "My Blog",
  desc: "A personal tech blog",
  lang: "en",
  timezone: "Asia/Shanghai",
  features: {
    tags: true,
    categories: true,
    search: true,
    darkMode: true,
    // Enable more features as needed
    ai: false,
    waline: false,
    sponsor: false,
  },
  // ...
};
```

See [Configure Theme](/en/posts/how-to-configure-astro-minimax-theme) for the full configuration reference.

### 5. Add Content

Place your articles in `apps/blog/src/data/blog/en/` (English) or `apps/blog/src/data/blog/zh/` (Chinese).

Articles use Markdown or MDX format and require frontmatter:

```yaml
---
title: My First Post
pubDatetime: 2026-03-14T10:00:00Z
description: This is the post description.
tags:
  - getting-started
---

Post content here...
```

See [Adding New Posts](/en/posts/adding-new-post) for details.

### 6. Develop & Build

All commands run from the project root:

```bash
# Local development
pnpm run dev

# Build for production (includes type check and search index)
pnpm run build

# Preview build
pnpm run preview
```

### 7. Deploy

astro-minimax supports multiple deployment platforms. Cloudflare Pages is recommended:

```bash
# Connect your Git repo to Cloudflare Pages
# Build command: pnpm run build
# Build output directory: apps/blog/dist
```

You can also deploy to Vercel, Netlify, or use Docker. See [Deployment Guide](/en/posts/deployment-guide) for details.

### 8. Get Upstream Updates

```bash
# Add upstream remote
git remote add upstream https://github.com/souloss/astro-minimax.git

# Fetch and merge
git fetch upstream
git merge upstream/main

# Resolve conflicts and commit
```

---

## Method 2: NPM Package Integration

For users who want to separate content from the theme system. The core theme, visualization plugins, and AI features are published as independent npm packages.

### 1. Create Astro Project

```bash
pnpm create astro@latest my-blog
cd my-blog
```

### 2. Install Theme Packages

```bash
# Core theme (layouts, components, styles)
pnpm add @astro-minimax/core

# Visualization plugins (Mermaid, Markmap, Rough.js, etc. — optional)
pnpm add @astro-minimax/viz

# AI chat integration (optional)
pnpm add @astro-minimax/ai
```

### 3. Configure Astro

Import theme plugins in `astro.config.ts`:

```typescript
import { defineConfig } from 'astro/config';
import { remarkMermaidCodeblock } from '@astro-minimax/viz/plugins';
import { remarkReadingTime } from '@astro-minimax/core/plugins/remark-reading-time';
import { rehypeExternalLinks } from '@astro-minimax/core/plugins/rehype-external-links';

export default defineConfig({
  markdown: {
    remarkPlugins: [remarkMermaidCodeblock, remarkReadingTime],
    rehypePlugins: [rehypeExternalLinks],
  },
});
```

### 4. Use Layouts & Components

```astro
---
import Layout from '@astro-minimax/core/layouts/Layout.astro';
import Header from '@astro-minimax/core/components/nav/Header.astro';
import Footer from '@astro-minimax/core/components/nav/Footer.astro';
import Card from '@astro-minimax/core/components/ui/Card.astro';
---

<Layout title="My Blog">
  <Header />
  <main>
    <slot />
  </main>
  <Footer />
</Layout>
```

### 5. Update

```bash
pnpm update @astro-minimax/core @astro-minimax/viz @astro-minimax/ai
```

---

## Content Directory Structure

Regardless of integration method, your blog content structure stays consistent:

```
src/data/blog/
├── zh/                # Chinese articles
│   ├── my-post.md
│   └── _examples/     # Example articles (directories starting with _ are excluded from URLs)
├── en/                # English articles
│   ├── my-post.md
│   └── _examples/
```

> GitHub Template users: content lives at `apps/blog/src/data/blog/`. NPM integration users: at `src/data/blog/` in your project root.

## Next Steps

- [Configure Theme](/en/posts/how-to-configure-astro-minimax-theme) — Full configuration reference
- [Add Posts](/en/posts/adding-new-post) — Frontmatter format reference
- [Feature Overview](/en/posts/feature-overview) — Complete feature guide
- [Deployment Guide](/en/posts/deployment-guide) — Multi-platform deployment
- [Customize Colors](/en/posts/customizing-astro-minimax-theme-color-schemes) — Theme color customization

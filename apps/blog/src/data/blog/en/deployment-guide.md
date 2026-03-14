---
title: "Deployment Guide: Deploy astro-minimax to Multiple Platforms"
pubDatetime: 2026-03-14T00:00:00.000Z
author: Souloss
description: "A comprehensive guide to deploying your astro-minimax blog to Cloudflare Pages, Vercel, Netlify, Docker, and more."
tags:
  - docs
  - deployment
category: Blog/Deployment
featured: false
draft: false
---

This guide covers how to deploy your astro-minimax blog to various platforms. astro-minimax generates static sites, so it can be deployed to almost any static hosting service.

## Table of contents

## Prerequisites

Before deploying, make sure your blog builds successfully locally:

```bash
# Run from project root
pnpm run build
```

Build output goes to `apps/blog/dist/`.

> If the build fails, run `pnpm run dev` first to identify and fix errors.

## Cloudflare Pages (Recommended)

Cloudflare Pages is the recommended platform because astro-minimax's AI chat feature is built on Cloudflare Workers AI.

### Git Integration

1. Push your code to GitHub / GitLab
2. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/) → Pages → Create a project
3. Connect your Git repository
4. Configure build settings:

| Setting | Value |
|---------|-------|
| Framework preset | Astro |
| Build command | `pnpm run build` |
| Build output directory | `apps/blog/dist` |
| Root directory | `/` (keep default) |
| Node.js version | `22` (set `NODE_VERSION=22` in environment variables) |

5. Click **Save and Deploy**

### Environment Variables

If AI chat is enabled, configure in Cloudflare Pages:

| Variable | Description |
|----------|-------------|
| `NODE_VERSION` | `22` (recommended) |
| `AI_BINDING_NAME` | AI Binding name (defaults to `AI`) |

### AI Binding Configuration

The project includes `apps/blog/wrangler.toml` which defines the AI Binding:

```toml
name = "astro-minimax"
pages_build_output_dir = "dist"
compatibility_date = "2026-03-12"

[ai]
binding = "AI"
```

Cloudflare Pages automatically detects this configuration and enables Workers AI.

### Custom Domain

After deployment, add a custom domain in Cloudflare Pages settings. Cloudflare automatically provisions SSL certificates.

---

## Vercel

### Git Integration

1. Log in to [Vercel](https://vercel.com/) → New Project → Import Git repository
2. Configure build settings:

| Setting | Value |
|---------|-------|
| Framework preset | Astro |
| Build command | `pnpm run build` |
| Output directory | `apps/blog/dist` |
| Install command | `pnpm install` |
| Root directory | `.` (keep default) |

3. Set `NODE_VERSION=22` in environment variables
4. Click **Deploy**

### Notes

- Vercel doesn't support Cloudflare Workers AI. The AI chat feature needs an alternative AI provider (e.g., OpenAI) on Vercel
- You'll need to modify `ai.apiEndpoint` in `src/config.ts` to point to your AI API

---

## Netlify

### Git Integration

1. Log in to [Netlify](https://app.netlify.com/) → New site → Import Git repository
2. Configure build settings:

| Setting | Value |
|---------|-------|
| Build command | `pnpm run build` |
| Publish directory | `apps/blog/dist` |

3. Set `NODE_VERSION=22` in environment variables
4. Click **Deploy site**

### netlify.toml (Optional)

Create `netlify.toml` in the project root for unified configuration:

```toml
[build]
  command = "pnpm run build"
  publish = "apps/blog/dist"

[build.environment]
  NODE_VERSION = "22"
```

---

## Docker

astro-minimax supports Docker containerized deployment.

### Development

Use `docker-compose.yml` for a quick dev server:

```yaml
services:
  app:
    image: node:lts
    ports:
      - 4321:4321
    working_dir: /app
    command: pnpm run dev -- --host 0.0.0.0
    volumes:
      - ./:/app
```

```bash
docker compose up
```

### Production

Use a multi-stage Dockerfile for production images:

```dockerfile
# Build stage
FROM node:lts AS base
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ packages/
COPY apps/blog/package.json apps/blog/
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

# Runtime stage
FROM nginx:mainline-alpine-slim AS runtime
COPY --from=base /app/apps/blog/dist /usr/share/nginx/html
EXPOSE 80
```

```bash
# Build image
docker build -t my-blog .

# Run container
docker run -p 80:80 my-blog
```

---

## Static File Hosting

astro-minimax generates pure static files and can be deployed to any static file server:

### GitHub Pages

1. Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pages: write
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: apps/blog/dist
      - uses: actions/deploy-pages@v4
```

2. In repo Settings → Pages, select **GitHub Actions** as the Source

### Self-hosted Server

Upload the contents of `apps/blog/dist/` to your server's web root:

```bash
rsync -avz apps/blog/dist/ user@server:/var/www/html/
```

---

## Deployment Checklist

Before deploying, verify:

- [ ] `SITE.website` in `src/config.ts` is set to your correct domain
- [ ] `pnpm run build` succeeds locally
- [ ] Build output directory is set to `apps/blog/dist`
- [ ] Environment variable `NODE_VERSION` is set to `22`
- [ ] If using AI features, API configuration is correctly set
- [ ] `public/robots.txt` content is appropriate
- [ ] OG images are properly configured

## FAQ

### Build fails: pnpm not found

Ensure the deployment platform supports pnpm. Most platforms need the Node.js version specified in environment variables:

```
NODE_VERSION=22
```

### Search doesn't work

Pagefind search index is generated during build. Make sure the build command includes the `pagefind --site dist` step (already included in `pnpm run build`).

### AI chat doesn't work

The AI chat feature depends on Cloudflare Workers AI. If deploying to other platforms:

1. Set `ai.mockMode` to `true` (shows preset responses only), or
2. Configure an alternative AI API endpoint

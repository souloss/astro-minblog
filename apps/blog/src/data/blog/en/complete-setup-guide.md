---
title: "Complete Setup Guide: From Zero to Production"
pubDatetime: 2026-03-18T00:00:00.000Z
author: Souloss
description: "End-to-end tutorial: create blog, configure all features, deploy to Cloudflare Pages, set up Waline comments, Umami analytics, and notifications."
tags:
  - docs
  - tutorial
  - getting-started
category: Tutorial/Getting Started
featured: true
draft: false
---

This guide walks you through building a complete blog from scratch with astro-minimax.

## Overview

```mermaid
flowchart LR
    A[Create Blog] --> B[Configure Site]
    B --> C[Deploy to Cloudflare]
    C --> D[Setup Comments]
    D --> E[Setup Analytics]
    E --> F[Setup Notifications]
    F --> G[Setup AI Chat]
    G --> H[Complete]

    style A fill:#22c55e,color:#fff
    style H fill:#3b82f6,color:#fff
```

**Estimated time**: 45-60 minutes

## Prerequisites

Before starting, ensure you have these accounts:

| Account    | Purpose                | Sign up                                  |
| ---------- | ---------------------- | ---------------------------------------- |
| GitHub     | Code hosting           | [github.com](https://github.com)         |
| Cloudflare | Blog deployment        | [cloudflare.com](https://cloudflare.com) |
| Vercel     | Comments and analytics | [vercel.com](https://vercel.com)         |

> Database uses Vercel's built-in Neon PostgreSQL, no additional registration needed.

---

## Part 1: Create Blog

### Step 1.1: Use CLI to Create Project

Open terminal and run:

```bash
npx @astro-minimax/cli init my-blog
cd my-blog
pnpm install
```

### Step 1.2: Local Preview

```bash
pnpm run dev
```

Visit http://localhost:4321 to preview.

### Step 1.3: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
gh repo create my-blog --private --source=. --push
```

> [!TIP]
> If you don't have `gh` CLI, create a repo on GitHub and push manually.

---

## Part 2: Configure Site

### Step 2.1: Edit src/config.ts

```typescript
export const SITE = {
  website: "https://your-domain.com/",  // Your domain
  author: "Your Name",                   // Your name
  title: "My Blog",                      // Blog title
  desc: "A personal tech blog",          // Blog description
  lang: "en",
  timezone: "America/New_York",
  features: {
    tags: true,
    categories: true,
    search: true,
    darkMode: true,
    ai: true,        // Enable AI chat
    waline: true,    // Enable comments
    sponsor: true,   // Enable sponsor
  },
  // Other config...
};
```

### Step 2.2: Add First Post

Create `src/data/blog/en/my-first-post.md`:

```yaml
---
title: My First Post
pubDatetime: 2026-03-18T10:00:00Z
author: Your Name
description: This is my first blog post.
tags:
  - getting-started
category: General
---
Post content goes here...
```

---

## Part 3: Deploy to Cloudflare Pages

### Step 3.1: Create Project

1. Login to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Click **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
3. Select your GitHub repository

### Step 3.2: Configure Build Settings

| Setting                | Value            |
| ---------------------- | ---------------- |
| Framework preset       | Astro            |
| Build command          | `pnpm run build` |
| Build output directory | `dist` |

### Step 3.3: Set Environment Variables

In **Settings** → **Environment variables**, add:

| Variable       | Value |
| -------------- | ----- |
| `NODE_VERSION` | `22`  |

### Step 3.4: Wait for Deployment

Click **Save and Deploy** and wait for build to complete. You'll get a `.pages.dev` domain.

> [!NOTE]
> For details, see [Deployment Guide](/en/posts/deployment-guide) and [Environment Variables](/en/posts/cloudflare-env-vars).

---

## Part 4: Setup Comments

Waline is a lightweight comment system deployed on Vercel with Neon PostgreSQL database.

### Step 4.1: Deploy Waline to Vercel

1. Click one-click deploy: [Waline Vercel Deploy](https://vercel.com/new/clone?repository-url=https://github.com/walinejs/waline/tree/main/example)
2. Enter project name and click **Create**
3. Wait for deployment (may fail initially due to missing database, this is normal)

### Step 4.2: Create Neon PostgreSQL Database

1. Go to Waline project in Vercel Dashboard
2. Click **Storage** → **Create Database**
3. Select **Neon PostgreSQL**
4. Configure database (defaults work fine) and click **Create**
5. `DATABASE_URL` environment variable is auto-injected

### Step 4.3: Initialize Database

1. Click the created database in Vercel Storage
2. Click **Query** tab
3. Copy content from [waline.pgsql](https://github.com/walinejs/waline/blob/main/assets/waline.pgsql)
4. Paste and click **Run Query**

### Step 4.4: Configure Environment Variables and Redeploy

1. Go to **Settings** → **Environment Variables**
2. Confirm `DATABASE_URL` exists (auto-injected)
3. Add these variables:

| Variable   | Value                         |
| ---------- | ----------------------------- |
| `PG_SSL`   | `true`                        |
| `SITE_URL` | `https://your-blog.pages.dev` |

4. Go to **Deployments** → **Redeploy**

### Step 4.5: Update Blog Config

```typescript
// src/config.ts
waline: {
  enabled: true,
  serverURL: "https://your-waline.vercel.app/",
  lang: "en-US",
  pageview: true,
  reaction: true,
  requiredMeta: ["nick", "mail"],
},
```

> [!TIP]
> See [Waline Setup Guide](/en/posts/setup-waline-on-vercel) for complete instructions.

---

## Part 5: Setup Analytics

Umami is a privacy-friendly web analytics tool, deployed for free on Vercel + Neon.

### Step 5.1: Fork and Deploy Umami

1. Fork [Umami repository](https://github.com/umami-software/umami)
2. Import the forked repo in Vercel
3. Select **Next.js** framework and click **Deploy** (may fail initially, normal)

### Step 5.2: Create Neon Database

1. Go to Umami project → **Storage** → **Create Database**
2. Select **Neon PostgreSQL**, configure and create
3. `DATABASE_URL` is auto-injected to environment variables

### Step 5.3: Redeploy

1. Go to **Deployments** → **Redeploy**
2. Wait for deployment to complete

### Step 5.4: Get Website ID

1. Visit your Umami instance
2. First login (default: admin/umami), **change password immediately**
3. Add website → Enter domain
4. Copy Website ID

### Step 5.5: Update Blog Config

```typescript
// src/config.ts
umami: {
  enabled: true,
  websiteId: "your-website-id",
  src: "https://your-umami-domain/script.js",
},
```

> [!TIP]
> See [Umami Setup Guide](/en/posts/setup-umami-analytics) for complete instructions.

---

## Part 6: Setup Notifications

Receive Telegram notifications when comments are posted or AI chats occur.

### Step 6.1: Create Telegram Bot

1. Search `@BotFather` in Telegram
2. Send `/newbot`
3. Follow prompts to set bot name
4. Get Bot Token (format: `123456789:ABCdef...`)

### Step 6.2: Get Chat ID

1. Search `@userinfobot` in Telegram
2. Send `/start`
3. Get your Chat ID (numeric)

### Step 6.3: Configure Cloudflare Environment Variables

Add in Cloudflare Dashboard:

| Variable                    | Value          |
| --------------------------- | -------------- |
| `NOTIFY_TELEGRAM_BOT_TOKEN` | Your Bot Token |
| `NOTIFY_TELEGRAM_CHAT_ID`   | Your Chat ID   |

> [!TIP]
> See [Notification Guide](/en/posts/notification-guide) for complete instructions.

---

## Part 7: Setup AI Chat

astro-minimax has built-in AI chat assistant powered by Cloudflare Workers AI.

### Step 7.1: Enable AI Feature

```typescript
// src/config.ts
features: {
  ai: true,
},
ai: {
  enabled: true,
  mockMode: false,
  apiEndpoint: "/api/chat",
},
```

### Step 7.2: Build AI Data

```bash
pnpm run ai:process      # Generate post summaries
pnpm run ai:profile:build # Build author profile
```

### Step 7.3: Verify AI Binding

The project already includes `wrangler.toml`:

```toml
[ai]
binding = "minimaxAI"
```

Cloudflare Pages automatically detects and enables Workers AI.

> [!TIP]
> See [AI Configuration Guide](/en/posts/ai-guide) for complete instructions.

---

## Part 8: Environment Variables Summary

Add all required environment variables in Cloudflare Dashboard:

**Path**: `Workers & Pages → [your-project] → Settings → Environment variables`

| Variable                    | Value                   | Purpose                |
| --------------------------- | ----------------------- | ---------------------- |
| `NODE_VERSION`              | `22`                    | Build environment      |
| `NOTIFY_TELEGRAM_BOT_TOKEN` | `123456:ABC...`         | Telegram notifications |
| `NOTIFY_TELEGRAM_CHAT_ID`   | `123456789`             | Telegram notifications |
| `SITE_URL`                  | `https://your-blog.com` | Site URL               |
| `SITE_AUTHOR`               | `Your Name`             | Author name            |

Redeploy after adding variables.

> [!TIP]
> See [Environment Variables Guide](/en/posts/cloudflare-env-vars) for complete instructions.

---

## Part 9: Verification Checklist

After deployment, verify these features:

- [ ] Blog accessible
- [ ] Custom domain configured (optional)
- [ ] Search working
- [ ] Comments working
- [ ] Analytics collecting data
- [ ] Telegram notifications received
- [ ] AI chat responding
- [ ] RSS feed valid
- [ ] OG images displaying

---

## Troubleshooting

### Deployment Failed

1. Check build logs for errors
2. Confirm `NODE_VERSION=22` is set
3. Check `pnpm-lock.yaml` is up to date

### Comments Not Showing

1. Check Waline `serverURL` configuration
2. Check `PG_SSL` environment variable is set to `true`
3. Confirm database schema is initialized
4. Check browser console for errors

### AI Not Responding

1. Check AI feature is enabled (`ai.enabled: true`)
2. Check AI binding in `wrangler.toml`
3. Run `pnpm run ai:process` to generate data

### Notifications Not Sending

1. Check Telegram Bot Token and Chat ID
2. Try sending a message to the bot first
3. Check Cloudflare environment variables

---

## Next Steps

- [Add Posts](/en/posts/adding-new-post) — Learn post format and frontmatter
- [Theme Configuration](/en/posts/how-to-configure-astro-minimax-theme) — Customize theme styles
- [CLI Commands](/en/posts/cli-guide) — Master common commands
- [Feature Overview](/en/posts/feature-overview) — Explore more features

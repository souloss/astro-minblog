---
title: "从零开始：完整博客搭建指南"
pubDatetime: 2026-03-18T00:00:00.000Z
author: Souloss
description: "End-to-end tutorial: create blog, configure all features, deploy to Cloudflare Pages, set up Waline comments, Umami analytics, and notifications."
tags:
  - docs
  - tutorial
  - getting-started
category: 教程/入门
featured: true
draft: false
---

本指南将带你从零开始，完整搭建一个功能齐全的 astro-minimax 博客。

## 概览

```mermaid
flowchart LR
    A[创建博客] --> B[配置站点]
    B --> C[部署到 Cloudflare]
    C --> D[配置评论系统]
    D --> E[配置访问统计]
    E --> F[配置通知系统]
    F --> G[配置 AI 聊天]
    G --> H[完成]

    style A fill:#22c55e,color:#fff
    style H fill:#3b82f6,color:#fff
```

**预计时间**：45-60 分钟

## 前置准备

在开始之前，请确保你有以下账号：

| 账号       | 用途           | 注册地址                                 |
| ---------- | -------------- | ---------------------------------------- |
| GitHub     | 代码托管       | [github.com](https://github.com)         |
| Cloudflare | 博客部署       | [cloudflare.com](https://cloudflare.com) |
| Vercel     | 评论和统计部署 | [vercel.com](https://vercel.com)         |

> 数据库使用 Vercel 自带的 Neon PostgreSQL，无需额外注册。

---

## Part 1: 创建博客

### Step 1.1: 使用 CLI 创建项目

打开终端，运行以下命令：

```bash
npx @astro-minimax/cli init my-blog
cd my-blog
pnpm install
```

### Step 1.2: 本地预览

```bash
pnpm run dev
```

访问 http://localhost:4321 预览博客。

### Step 1.3: 推送到 GitHub

```bash
git init
git add .
git commit -m "Initial commit"
gh repo create my-blog --private --source=. --push
```

> [!TIP]
> 如果没有安装 `gh` 命令，可以在 GitHub 网页上手动创建仓库并推送代码。

---

## Part 2: 配置站点信息

### Step 2.1: 编辑 src/config.ts

```typescript
export const SITE = {
  website: "https://your-domain.com/",  // 你的域名
  author: "Your Name",                   // 你的名字
  title: "My Blog",                      // 博客标题
  desc: "A personal tech blog",          // 博客描述
  lang: "zh",
  timezone: "Asia/Shanghai",
  features: {
    tags: true,
    categories: true,
    search: true,
  },
   darkMode: true,
   ai: {
     enabled: true,
   },
   waline: {
     enabled: true,
     serverURL: "https://your-waline.vercel.app/",
   },
   sponsor: {
     enabled: true,
   },
  // 其他配置...
};
```

### Step 2.2: 添加第一篇文章

创建 `src/data/blog/zh/my-first-post.md`：

```yaml
---
title: 我的第一篇文章
pubDatetime: 2026-03-18T10:00:00Z
author: Your Name
description: 这是我的第一篇博客文章。
tags:
  - 入门
category: 随笔
---
文章正文内容...
```

---

## Part 3: 部署到 Cloudflare Pages

### Step 3.1: 创建项目

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 点击 **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
3. 选择你的 GitHub 仓库

### Step 3.2: 配置构建设置

| 设置         | 值               |
| ------------ | ---------------- |
| 框架预设     | Astro            |
| 构建命令     | `pnpm run build` |
| 构建输出目录 | `dist` |

### Step 3.3: 设置环境变量

在 **Settings** → **Environment variables** 中添加：

| 变量           | 值   |
| -------------- | ---- |
| `NODE_VERSION` | `22` |

### Step 3.4: 等待部署

点击 **Save and Deploy**，等待构建完成。部署成功后，你会获得一个 `.pages.dev` 域名。

> [!NOTE]
> 详细配置请参考 [部署指南](/zh/posts/deployment-guide) 和 [环境变量配置](/zh/posts/cloudflare-env-vars)。

---

## Part 4: 配置评论系统

Waline 是一个轻量级的评论系统，部署在 Vercel 上，使用 Neon PostgreSQL 数据库。

### Step 4.1: 部署 Waline 到 Vercel

1. 点击一键部署：[Waline Vercel 部署](https://vercel.com/new/clone?repository-url=https://github.com/walinejs/waline/tree/main/example)
2. 输入项目名称，点击 **Create** 创建项目
3. 等待部署完成（首次可能因缺少数据库而失败，这是正常的）

### Step 4.2: 创建 Neon PostgreSQL 数据库

1. 在 Vercel Dashboard 进入 Waline 项目
2. 点击 **Storage** → **Create Database**
3. 选择 **Neon PostgreSQL**
4. 配置数据库（可使用默认设置），点击 **Create**
5. Vercel 会自动注入 `DATABASE_URL` 环境变量

### Step 4.3: 初始化数据库

1. 在 Vercel Storage 点击创建的数据库
2. 点击 **Query** 标签
3. 复制 [waline.pgsql](https://github.com/walinejs/waline/blob/main/assets/waline.pgsql) 内容
4. 粘贴并点击 **Run Query** 执行

### Step 4.4: 配置环境变量并重新部署

1. 进入 **Settings** → **Environment Variables**
2. 确认已有 `DATABASE_URL`（自动注入）
3. 添加以下变量：

| 变量       | 值                            |
| ---------- | ----------------------------- |
| `PG_SSL`   | `true`                        |
| `SITE_URL` | `https://your-blog.pages.dev` |

4. 进入 **Deployments** → **Redeploy** 重新部署

### Step 4.5: 更新博客配置

```typescript
// src/config.ts
waline: {
  enabled: true,
  serverURL: "https://your-waline.vercel.app/",
  lang: "zh-CN",
  pageview: true,
  reaction: true,
  requiredMeta: ["nick", "mail"],
},
```

> [!TIP]
> 完整配置请参考 [Waline 部署指南](/zh/posts/setup-waline-on-vercel)。

---

## Part 5: 配置访问统计

Umami 是一个隐私友好的网站分析工具，使用 Vercel + Neon 免费部署。

### Step 5.1: Fork 并部署 Umami

1. Fork [Umami 仓库](https://github.com/umami-software/umami)
2. 在 Vercel 导入 Fork 的仓库
3. 框架选择 **Next.js**，点击 **Deploy**（首次可能失败，正常）

### Step 5.2: 创建 Neon 数据库

1. 进入 Umami 项目 → **Storage** → **Create Database**
2. 选择 **Neon PostgreSQL**，配置后创建
3. `DATABASE_URL` 会自动注入到环境变量

### Step 5.3: 重新部署

1. 进入 **Deployments** → **Redeploy**
2. 等待部署完成

### Step 5.4: 获取 Website ID

1. 访问 Umami 实例
2. 首次登录（默认：admin/umami），**立即修改密码**
3. 添加网站 → 输入域名
4. 复制 Website ID

### Step 5.5: 更新博客配置

```typescript
// src/config.ts
umami: {
  enabled: true,
  websiteId: "your-website-id",
  src: "https://your-umami-domain/script.js",
},
```

> [!TIP]
> 完整配置请参考 [Umami 配置指南](/zh/posts/setup-umami-analytics)。

---

## Part 6: 配置通知系统

当博客收到评论或用户进行 AI 对话时，可以收到 Telegram 通知。

### Step 6.1: 创建 Telegram Bot

1. 在 Telegram 搜索 `@BotFather`
2. 发送 `/newbot`
3. 按提示设置 Bot 名称
4. 获得 Bot Token（格式：`123456789:ABCdef...`）

### Step 6.2: 获取 Chat ID

1. 在 Telegram 搜索 `@userinfobot`
2. 发送 `/start`
3. 获取你的 Chat ID（纯数字）

### Step 6.3: 配置 Cloudflare 环境变量

在 Cloudflare Dashboard 添加：

| 变量                        | 值             |
| --------------------------- | -------------- |
| `NOTIFY_TELEGRAM_BOT_TOKEN` | 你的 Bot Token |
| `NOTIFY_TELEGRAM_CHAT_ID`   | 你的 Chat ID   |

> [!TIP]
> 完整配置请参考 [通知系统指南](/zh/posts/notification-guide)。

---

## Part 7: 配置 AI 聊天

astro-minimax 内置 AI 聊天助手，基于 Cloudflare Workers AI。

### Step 7.1: 启用 AI 功能

```typescript
// src/config.ts
ai: {
  enabled: true,
  mockMode: false,
  apiEndpoint: "/api/chat",
},
```

### Step 7.2: 构建 AI 数据

```bash
pnpm run ai:process      # 生成文章摘要
pnpm run ai:profile:build # 构建作者画像
```

### Step 7.3: 验证 AI Binding

项目已包含 `wrangler.toml` 配置：

```toml
[ai]
binding = "minimaxAI"
```

Cloudflare Pages 会自动识别并启用 Workers AI。

> [!TIP]
> 完整配置请参考 [AI 配置指南](/zh/posts/ai-guide)。

---

## Part 8: 配置环境变量汇总

在 Cloudflare Dashboard 中添加所有需要的环境变量：

**路径**：`Workers & Pages → [your-project] → Settings → Environment variables`

| 变量                        | 值                      | 用途          |
| --------------------------- | ----------------------- | ------------- |
| `NODE_VERSION`              | `22`                    | 构建环境      |
| `AI_BINDING_NAME`           | `minimaxAI`             | Workers AI 绑定名 |
| `NOTIFY_TELEGRAM_BOT_TOKEN` | `123456:ABC...`         | Telegram 通知 |
| `NOTIFY_TELEGRAM_CHAT_ID`   | `123456789`             | Telegram 通知 |
| `SITE_URL`                  | `https://your-blog.com` | 站点 URL      |
| `SITE_AUTHOR`               | `Your Name`             | 作者名称      |

添加后需要重新部署才能生效。

> [!TIP]
> 完整配置请参考 [环境变量配置指南](/zh/posts/cloudflare-env-vars)。

---

## Part 9: 验证清单

部署完成后，检查以下功能：

- [ ] 博客可以正常访问
- [ ] 自定义域名已配置（可选）
- [ ] 搜索功能正常
- [ ] 评论系统可用
- [ ] 访问统计正常收集
- [ ] Telegram 通知正常接收
- [ ] AI 聊天正常响应
- [ ] RSS 订阅可用
- [ ] OG 图片正常显示

---

## 故障排除

### 部署失败

1. 检查构建日志中的错误信息
2. 确认 `NODE_VERSION=22` 已设置
3. 检查 `pnpm-lock.yaml` 是否最新

### 评论不显示

1. 检查 Waline `serverURL` 配置是否正确
2. 检查 `PG_SSL` 环境变量是否设置为 `true`
3. 确认数据库表结构已初始化
4. 检查浏览器控制台是否有错误

### AI 不响应

1. 检查 AI 功能是否启用（`ai.enabled: true`）
2. 检查 `wrangler.toml` 中的 AI binding
3. 运行 `pnpm run ai:process` 生成数据

### 通知不发送

1. 检查 Telegram Bot Token 和 Chat ID 是否正确
2. 尝试向 Bot 发送消息后再测试
3. 检查 Cloudflare 环境变量是否已设置

---

## 下一步

- [添加文章](/zh/posts/adding-new-post) — 了解文章格式和 frontmatter
- [主题配置](/zh/posts/how-to-configure-astro-minimax-theme) — 自定义主题样式
- [CLI 命令](/zh/posts/cli-guide) — 掌握常用命令
- [功能特性](/zh/posts/feature-overview) — 探索更多功能

---
title: "快速开始：两种使用方式"
pubDatetime: 2026-03-12T00:00:00.000Z
modDatetime: 2026-03-14T00:00:00.000Z
author: Souloss
description: "通过 GitHub Template 一键创建或 NPM 包集成两种方式开始使用 astro-minimax。"
tags:
  - docs
  - configuration
category: 教程/博客
featured: true
draft: false
---

## Table of contents

## 概览

astro-minimax 提供两种使用方式，适合不同场景：

| 方式 | 适合场景 | 更新方式 |
|------|----------|----------|
| **GitHub Template** | 一次性创建，完全自定义 | 手动合并上游更新 |
| **NPM 包集成** | 内容与系统分离，持续获取更新 | `pnpm update` |

---

## 方式一：GitHub Template（推荐新手）

### 1. 创建仓库

点击 GitHub 仓库页面的 **"Use this template"** 按钮，或通过命令行：

```bash
pnpm create astro@latest --template souloss/astro-minimax
```

### 2. 安装依赖

```bash
cd your-blog
pnpm install
```

### 3. 了解项目结构

astro-minimax 采用 monorepo 结构，你的博客站点位于 `apps/blog/` 目录下：

```
your-blog/
├── pnpm-workspace.yaml       # Workspace 配置
├── package.json               # 根级：统一命令入口
├── packages/
│   ├── core/                  # 核心主题包（布局、组件、样式）
│   ├── viz/                   # 可视化插件包（Mermaid、Markmap 等）
│   └── ai/                    # AI 集成包
└── apps/
    └── blog/                  # 你的博客站点
        ├── astro.config.ts    # Astro 配置
        ├── public/            # 静态资源
        └── src/
            ├── config.ts      # 站点配置（修改这里）
            ├── constants.ts   # 社交链接
            ├── content.config.ts
            └── data/
                ├── blog/zh/   # 中文文章
                └── blog/en/   # 英文文章
```

### 4. 配置站点

编辑 `apps/blog/src/config.ts`，设置你的博客信息：

```typescript
export const SITE = {
  website: "https://your-domain.com/",
  author: "Your Name",
  title: "My Blog",
  desc: "A personal tech blog",
  lang: "zh",
  timezone: "Asia/Shanghai",
  features: {
    tags: true,
    categories: true,
    search: true,
    darkMode: true,
    // 按需启用更多功能
    ai: false,
    waline: false,
    sponsor: false,
  },
  // ...
};
```

详细配置请参考 [主题配置指南](/zh/posts/how-to-configure-astro-minimax-theme)。

### 5. 添加内容

将你的文章放到 `apps/blog/src/data/blog/zh/`（中文）或 `apps/blog/src/data/blog/en/`（英文）目录下。

文章使用 Markdown 或 MDX 格式，需要包含 frontmatter：

```yaml
---
title: 我的第一篇文章
pubDatetime: 2026-03-14T10:00:00Z
description: 这是文章描述。
tags:
  - 入门
---

文章正文...
```

详见 [添加文章指南](/zh/posts/adding-new-post)。

### 6. 开发与构建

所有命令都从项目根目录运行：

```bash
# 本地开发
pnpm run dev

# 构建生产站点（含类型检查和搜索索引生成）
pnpm run build

# 预览构建结果
pnpm run preview
```

### 7. 部署

astro-minimax 支持多种部署平台，推荐 Cloudflare Pages：

```bash
# 连接 Git 仓库到 Cloudflare Pages
# 构建命令：pnpm run build
# 构建输出目录：apps/blog/dist
```

也可以部署到 Vercel、Netlify 或使用 Docker。详见 [部署指南](/zh/posts/deployment-guide)。

### 8. 获取上游更新

```bash
# 添加上游仓库
git remote add upstream https://github.com/souloss/astro-minimax.git

# 拉取更新
git fetch upstream
git merge upstream/main

# 解决冲突后提交
```

---

## 方式二：NPM 包集成

适合希望将内容与主题系统分离的用户。主题核心、可视化插件和 AI 功能作为独立 npm 包发布。

### 1. 创建 Astro 项目

```bash
pnpm create astro@latest my-blog
cd my-blog
```

### 2. 安装主题包

```bash
# 核心主题（布局、组件、样式）
pnpm add @astro-minimax/core

# 可视化插件（Mermaid、Markmap、Rough.js 等，可选）
pnpm add @astro-minimax/viz

# AI 聊天集成（可选）
pnpm add @astro-minimax/ai
```

### 3. 配置 Astro

在 `astro.config.ts` 中引入主题的插件：

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

### 4. 使用布局和组件

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

### 5. 更新

```bash
pnpm update @astro-minimax/core @astro-minimax/viz @astro-minimax/ai
```

---

## 内容目录结构

无论使用哪种方式，博客内容结构保持一致：

```
src/data/blog/
├── zh/                # 中文文章
│   ├── my-post.md
│   └── _examples/     # 示例文章（以 _ 开头的目录不参与 URL 生成）
├── en/                # 英文文章
│   ├── my-post.md
│   └── _examples/
```

> GitHub Template 用户：内容位于 `apps/blog/src/data/blog/`。NPM 集成用户：位于项目根目录的 `src/data/blog/`。

## 下一步

- [配置主题](/zh/posts/how-to-configure-astro-minimax-theme) — 详细配置指南
- [添加文章](/zh/posts/adding-new-post) — Frontmatter 格式说明
- [功能特性](/zh/posts/feature-overview) — 完整功能介绍
- [部署指南](/zh/posts/deployment-guide) — 多平台部署方案
- [自定义配色](/zh/posts/customizing-astro-minimax-theme-color-schemes) — 主题颜色定制

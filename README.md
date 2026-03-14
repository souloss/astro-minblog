# astro-minimax

[**English**](./README.en.md) | 简体中文

![astro-minimax](apps/blog/public/astro-minimax-og.jpg)
![Typescript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![GitHub](https://img.shields.io/github/license/souloss/astro-minimax?color=%232F3741&style=for-the-badge)

> **astro-minima-X** — 极简（Minima）为底座，X 代表无限扩展。

astro-minimax 是一个极简、现代化、模块化的 Astro 博客主题。以极简风格为核心，同时提供丰富的可视化组件和功能扩展。支持多语言、AI 聊天、Mermaid 图表、Markmap 思维导图、终端回放等。

## 设计哲学

- **极简优先** — 简洁的设计，内容为核心
- **模块化可插拔** — 核心主题 + 可视化插件 + AI 集成分离，按需使用
- **现代化** — Astro v5、Tailwind v4、TypeScript 严格模式
- **内容与系统分离** — 通过 NPM 包或 GitHub Template 灵活集成

## 功能特性

### 核心功能

- [x] 类型安全的 Markdown / MDX
- [x] 极致性能（Lighthouse 90+）
- [x] 无障碍支持
- [x] 响应式设计
- [x] SEO 友好
- [x] 明暗主题切换（View Transitions 动画）
- [x] 全文搜索（Pagefind）
- [x] 动态 OG 图片生成
- [x] 多语言支持（中文/英文）
- [x] 分类、标签、系列、归档

### 内容增强

- [x] 📊 **Mermaid 图表** — 流程图、时序图等
- [x] 🧠 **Markmap 思维导图** — 交互式思维导图
- [x] ✏️ **Rough.js 手绘图形** — 手绘风格 SVG
- [x] 🖌️ **Excalidraw 嵌入** — 白板风格图表
- [x] 📺 **Asciinema 终端回放** — 嵌入终端录制

### 互动功能

- [x] 🤖 **AI 聊天组件** — 多 Provider 自动故障转移的 AI 助手
- [x] 💬 **Waline 评论** — 互动评论系统
- [x] 📊 **Umami 统计** — 隐私友好的访问分析
- [x] ☕ **赞助打赏** — 支持多种支付方式

## 两种使用方式

### 方式一：GitHub Template（推荐新手）

```bash
pnpm create astro@latest --template souloss/astro-minimax
cd my-blog && pnpm install && pnpm run dev
```

### 方式二：NPM 包集成

```bash
pnpm add @astro-minimax/core
pnpm add @astro-minimax/viz  # 可选，可视化插件
pnpm add @astro-minimax/ai   # 可选，AI 聊天集成
```

详见 [快速开始指南](apps/blog/src/data/blog/zh/getting-started.md)。

## 项目结构

本项目采用 monorepo 结构，使用 pnpm workspace 管理：

```bash
astro-minimax/
├── pnpm-workspace.yaml          # Workspace 配置
├── package.json                 # 根级：workspace 脚本 + 共享 devDeps
├── tsconfig.json                # 根级：基础 TS 配置
│
├── packages/
│   ├── core/                    # @astro-minimax/core — 核心主题包
│   │   └── src/
│   │       ├── layouts/         #   布局组件
│   │       ├── components/      #   UI 组件（导航、博客、社交等）
│   │       ├── utils/           #   工具函数
│   │       ├── plugins/         #   Remark/Rehype 插件
│   │       ├── styles/          #   全局样式
│   │       ├── scripts/         #   客户端脚本
│   │       ├── assets/icons/    #   SVG 图标
│   │       └── types.ts         #   类型定义
│   │
│   ├── viz/                     # @astro-minimax/viz — 可视化插件包
│   │   └── src/
│   │       ├── components/      #   Mermaid, Markmap, Rough.js, Excalidraw, Asciinema
│   │       ├── plugins/         #   Remark 插件
│   │       └── scripts/         #   客户端脚本
│   │
│   └── ai/                      # @astro-minimax/ai — AI 集成包
│       └── src/
│           ├── components/      #   ChatPanel, AIChatWidget
│           ├── providers/       #   Cloudflare Workers AI, OpenAI 兼容
│           ├── prompt/          #   Prompt 构建系统
│           ├── search/          #   RAG 检索
│           └── intelligence/    #   意图检测、引用校验
│
└── apps/
    └── blog/                    # 示例博客 / 开发预览站
        ├── astro.config.ts      #   Astro 配置
        ├── package.json
        ├── wrangler.toml        #   Cloudflare 部署配置
        ├── functions/           #   Cloudflare Pages Functions (AI API)
        ├── tools/               #   AI 数据构建脚本
        ├── datas/               #   AI 相关数据
        ├── public/              #   静态资源
        └── src/
            ├── config.ts        #   站点配置
            ├── constants.ts     #   社交链接常量
            ├── content.config.ts#   内容集合定义
            ├── data/
            │   ├── blog/zh/     #   中文博客
            │   └── blog/en/     #   英文博客
            └── pages/           #   页面路由
```

## 技术栈

| 类别 | 技术 |
|------|------|
| **主框架** | [Astro v5](https://astro.build/) |
| **样式** | [TailwindCSS v4](https://tailwindcss.com/) |
| **搜索** | [Pagefind](https://pagefind.app/) |
| **评论** | [Waline](https://waline.js.org/) |
| **图表** | [Mermaid](https://mermaid.js.org/) |
| **思维导图** | [Markmap](https://markmap.js.org/) |
| **AI** | [Vercel AI SDK](https://sdk.vercel.ai/) + Cloudflare Workers AI |
| **统计** | [Umami](https://umami.is/) |
| **部署** | Cloudflare Pages / Vercel / Netlify / Docker |

## 命令

所有命令均从项目根目录运行：

| 命令 | 操作 |
|------|------|
| `pnpm install` | 安装所有 workspace 依赖 |
| `pnpm run dev` | 启动博客开发服务器 |
| `pnpm run build` | 构建博客生产站点（含类型检查和搜索索引） |
| `pnpm run preview` | 预览构建结果 |
| `pnpm run format` | 代码格式化 |
| `pnpm run format:check` | 检查代码格式 |

在 `apps/blog/` 下还有更多特定脚本：

| 命令 | 操作 |
|------|------|
| `pnpm run lint` | ESLint 代码检查 |
| `pnpm run ai:process` | AI 数据处理管线 |
| `pnpm run tools:summarize` | 生成文章摘要 |
| `pnpm run tools:translate` | AI 辅助翻译 |

## 文档

- [快速开始](apps/blog/src/data/blog/zh/getting-started.md)
- [主题配置](apps/blog/src/data/blog/zh/how-to-configure-astro-minimax-theme.md)
- [添加文章](apps/blog/src/data/blog/zh/adding-new-post.md)
- [功能特性](apps/blog/src/data/blog/zh/feature-overview.md)
- [部署指南](apps/blog/src/data/blog/zh/deployment-guide.md)
- [自定义配色](apps/blog/src/data/blog/zh/customizing-astro-minimax-theme-color-schemes.md)
- [动态 OG 图片](apps/blog/src/data/blog/zh/dynamic-og-images.md)

## 包说明

| 包 | 版本 | 说明 |
|----|------|------|
| [`@astro-minimax/core`](packages/core/) | 0.1.0 | 核心主题：布局、组件、样式、工具函数、Remark/Rehype 插件 |
| [`@astro-minimax/viz`](packages/viz/) | 0.1.4 | 可视化插件：Mermaid、Markmap、Rough.js、Excalidraw、Asciinema |
| [`@astro-minimax/ai`](packages/ai/) | 0.2.0 | AI 集成：多 Provider、自动故障转移、RAG 检索、流式响应 |

## 致谢

基于 [AstroPaper](https://github.com/satnaing/astro-paper) 二次开发。

## 许可证

MIT License - Copyright © 2026

---

由 [Souloss](https://souloss.cn) 用心打造。

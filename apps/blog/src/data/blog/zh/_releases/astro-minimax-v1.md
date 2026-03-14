---
author: Souloss
pubDatetime: 2025-03-08T00:00:00.000Z
title: astro-minimax 1.0
featured: true
category: 发布说明
ogImage: ../../../../assets/images/astro-minimax-v1.png
tags:
  - release
description: "astro-minimax 1.0: 基于 AstroPaper 二次开发的独立博客主题首次发布，集成 AI 聊天、Mermaid 图表、Waline 评论等独特功能。"
---

astro-minimax 是一个极简、响应式、无障碍且对 SEO 友好的 Astro 博客主题。本项目基于 [AstroPaper](https://github.com/satnaing/astro-paper) 二次开发，经过多个版本的迭代，现已成为一个功能完善的独立主题。

![astro-minimax](@/assets/images/astro-minimax-v1.png)

## Table of contents

## 项目起源

astro-minimax 源自对 AstroPaper 主题的深度定制和功能扩展。在保留原主题极简、高性能、无障碍等优点的基础上，新增了大量实用功能，使其更适合中文用户和现代博客需求。

## 特性
### 🎨 独特功能

astro-minimax 在 AstroPaper 基础上新增以下功能：

#### AI 与交互

- 🤖 **AI 聊天组件** - 内置 AI 助手，支持流式响应
- 💬 **Waline 评论** - 功能完善的评论系统，支持互动和通知

#### 内容增强

- 📊 **Mermaid 图表** - 原生支持流程图、时序图、甘特图等
- 🧠 **Markmap 思维导图** - 从 Markdown 大纲语法生成交互式思维导图
- 🎬 **Bilibili 嵌入** - B站视频一键嵌入
- 📑 **双 TOC** - 内联与浮动目录并存

#### 可视化组件

- ✏️ **Rough.js 手绘图形** - 手绘风格 SVG 图形，自动适配主题配色
- 🖌️ **Excalidraw 嵌入** - 白板风格的协作式图表
- 📦 **VizContainer 容器** - 统一的可视化组件包装器，支持缩放控制和全屏模式

#### 国际化与组织

- 🌐 **多语言支持** - 内置中文/英文双语支持
- 🏷️ **分类与系列** - 层级化内容组织
- 📖 **相关文章** - 智能推荐算法
- 🔗 **友链页面** - 友情链接管理

#### 社交与赞助

- ☕ **赞助组件** - 支持微信支付、支付宝等多种打赏方式
- ©️ **版权声明** - CC 协议自动展示
- 🔗 **分享链接** - 一键分享到社交平台

#### 用户体验

- ⏰ **定时发布** - 基于时间的发布控制
- 🌍 **时区支持** - 全局与单篇文章时区设置
- 📍 **阅读位置** - 持久化滚动位置记忆
- 🎨 **主题切换优化** - 改进的亮/暗模式切换，所有组件响应式更新
- 📖 **系列导航优化** - 重新设计的系列索引和详情页，视觉层次更清晰
- 🗂️ **项目展示页** - 专用页面展示项目作品集
- ⚙️ **配置化导航** - 通过 `config.ts` 配置头部导航项

#### 开发者工具

- 🛠️ **AI 辅助工具链** - 摘要生成、标签推荐、封面图生成、内容向量化等构建时工具
- 🧮 **向量检索** - 基于 TF-IDF / OpenAI Embeddings 的语义搜索

### 🔧 技术栈

**核心框架**

- [Astro v5](https://astro.build/) - 现代化静态站点生成器
- [TypeScript](https://www.typescriptlang.org/) - 类型安全
- [TailwindCSS v4](https://tailwindcss.com/) - 原子化 CSS

**功能集成**

- [Pagefind](https://pagefind.app/) - 静态全文搜索
- [Waline](https://waline.js.org/) - 评论系统
- [Mermaid](https://mermaid.js.org/) - 图表渲染
- [Rough.js](https://roughjs.com/) - 手绘风格图形
- [Shiki](https://shiki.style/) - 代码高亮

**部署与监控**

- [Vercel](https://vercel.com/) / [Cloudflare Pages](https://pages.cloudflare.com/) - 部署平台
- [Umami](https://umami.is/) - 隐私友好的流量分析

## 版本演进总结

### 基础架构（继承自 AstroPaper）

- **类型安全的内容管理** - 通过 Content Collections API 实现类型安全的 Markdown frontmatter
- **View Transitions** - 页面切换动画，提升用户体验
- **动态 OG 图片** - 自动生成社交分享图片
- **响应式设计** - 移动端优先，适配各种屏幕尺寸
- **SEO 优化** - JSON-LD 结构化数据、站点地图、RSS 订阅

### 性能优化

- **移除 React 依赖** - 使用 Pagefind 替代 Fuse.js，减少包体积
- **Tailwind v4** - 更快的构建速度，更小的 CSS 体积
- **Astro SVG 组件** - 实验性 SVG 组件，减少预定义代码
- **pnpm 包管理** - 更高效的依赖管理

## 目录结构

```bash
/
├── src/
│   ├── components/
│   │   ├── ai/          # AI 聊天组件
│   │   ├── blog/        # 文章组件、目录、评论、版权
│   │   ├── media/       # Mermaid、Markmap、Rough.js、Excalidraw
│   │   ├── nav/         # 页头、页脚、分页、浮动操作
│   │   ├── social/      # 赞助、社交链接
│   │   └── ui/          # 卡片、标签、提示框、时间线、折叠
│   ├── data/
│   │   ├── blog/        # 博客文章 (en/, zh/)
│   │   ├── vectors/     # 向量索引（AI 检索用）
│   │   └── friends.ts   # 友链数据
│   ├── pages/
│   │   └── [lang]/      # 多语言路由
│   ├── config.ts        # 站点配置
│   └── constants.ts     # 常量定义
├── tools/               # AI 辅助工具链
│   ├── lib/             # 共享工具库
│   ├── summarize.ts     # 摘要生成
│   ├── generate-tags.ts # 标签推荐
│   ├── generate-cover.ts# 封面图生成
│   ├── generate-related.ts # 关联文章推荐
│   └── vectorize.ts     # 内容向量化
└── public/
    └── pagefind/        # 搜索索引
```

## 快速开始

```bash
# 使用模板创建项目
pnpm create astro@latest --template souloss/astro-minimax

# 安装依赖
pnpm install

# 启动开发服务器
pnpm run dev
```

## 致谢

astro-minimax 的诞生离不开以下项目和个人的支持：

- [AstroPaper](https://github.com/satnaing/astro-paper) - 原主题作者 [Sat Naing](https://github.com/satnaing)
- [Astro](https://astro.build/) - 出色的静态站点框架
- 所有贡献者和用户的支持

## 展望

astro-minimax 将持续迭代，未来计划：

- 🤖 更多 AI 功能集成
- 📱 PWA 支持
- 🎨 更多预设主题
- 📊 基于 D3.js 的高级数据可视化

---

感谢你选择 astro-minimax！如果觉得不错，欢迎 [GitHub Star](https://github.com/souloss/astro-minimax) ⭐

[Souloss](https://souloss.cn) - astro-minimax 作者

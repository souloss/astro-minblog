# astro-minblog 📄

[**English**](./README.en.md) | 简体中文

![astro-minblog](public/astro-minblog-og.jpg)
[![Figma](https://img.shields.io/badge/Figma-F24E1E?style=for-the-badge&logo=figma&logoColor=white)](https://www.figma.com/community/file/1356898632249991861)
![Typescript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![GitHub](https://img.shields.io/github/license/souloss/astro-minblog?color=%232F3741&style=for-the-badge)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-%23FE5196?logo=conventionalcommits&logoColor=white&style=for-the-badge)](https://conventionalcommits.org)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg?style=for-the-badge)](http://commitizen.github.io/cz-cli/)

astro-minblog 是一个极简、响应式、无障碍且对 SEO 友好的 Astro 博客主题。支持多语言、AI 聊天、Mermaid 图表、Bilibili 嵌入等丰富功能。

阅读[博客文章](https://demo-astromin.souloss.cn/zh/posts/)或查看[文档部分](#-文档)了解更多信息。

## 🔥 功能特性

### 核心功能

- [x] 类型安全的 Markdown
- [x] 极致性能
- [x] 无障碍支持（键盘/VoiceOver）
- [x] 响应式设计（移动端 ~ 桌面端）
- [x] SEO 友好
- [x] 明暗主题切换
- [x] 模糊搜索
- [x] 草稿文章与分页
- [x] 站点地图与 RSS 订阅
- [x] 遵循最佳实践
- [x] 高度可定制
- [x] 动态 OG 图片生成

### 特性

- [x] 🤖 **AI 聊天组件** - 内置 AI 助手，支持流式响应
- [x] 📊 **Mermaid 图表** - 原生支持流程图、时序图等
- [x] 🎬 **Bilibili 嵌入** - B站视频嵌入组件
- [x] 🎵 **音乐播放器嵌入** - APlayer音乐播放器
- [x] 💬 **Waline 评论** - 功能完善的评论系统，支持互动
- [x] 🌐 **多语言支持** - 内置国际化支持（中文/英文）
- [x] 🔗 **友链页面** - 友情链接管理
- [x] 📑 **双 TOC** - 内联与浮动目录并存
- [x] 🏷️ **分类与系列** - 层级化内容组织
- [x] 📖 **相关文章** - 智能推荐算法
- [x] ⏰ **定时发布** - 基于时间的发布控制
- [x] 🌍 **时区支持** - 全局与单篇文章时区设置
- [x] 📍 **阅读位置** - 持久化滚动位置记忆


## 🚀 项目结构

astro-minblog 的目录结构如下：

```bash
/
├── public/
│   ├── pagefind/ # 构建时自动生成
│   ├── favicon.svg
│   └── astro-minblog-og.jpg
├── src/
│   ├── assets/
│   │   ├── icons/
│   │   └── images/
│   ├── components/
│   │   ├── ai/          # AI 聊天组件
│   │   ├── blog/        # 文章组件、目录、评论
│   │   ├── media/       # Mermaid、Bilibili、音乐播放器
│   │   ├── nav/         # 页头、页脚、分页
│   │   └── ui/          # 卡片、标签、提示框
│   ├── data/
│   │   ├── blog/        # 博客文章 (en/, zh/)
│   │   └── friends.ts   # 友链数据
│   ├── layouts/
│   ├── pages/
│   │   └── [lang]/      # 多语言路由
│   ├── scripts/
│   ├── styles/
│   ├── utils/
│   ├── config.ts
│   ├── constants.ts
│   ├── content.config.ts
│   ├── env.d.ts
│   └── remark-collapse.d.ts
└── astro.config.ts
```

Astro 会在 `src/pages/` 目录中查找 `.astro` 或 `.md` 文件，每个页面根据文件名暴露为路由。

静态资源（如图片）可放置在 `public/` 目录中。

所有博客文章存储在 `src/data/blog` 目录，按语言组织（`en/`、`zh/`）。

### 配置与设置

- 主题配置 - [markdown](src/data/blog/zh/how-to-configure-astro-minblog-theme.md) | [博客文章](https://demo-astromin.souloss.cn/zh/posts/how-to-configure-astro-minblog-theme/)
- 添加文章 - [markdown](src/data/blog/zh/adding-new-post.md) | [博客文章](https://demo-astromin.souloss.cn/zh/posts/adding-new-post/)
- 自定义配色方案 - [markdown](src/data/blog/zh/customizing-astro-minblog-theme-color-schemes.md) | [博客文章](https://demo-astromin.souloss.cn/zh/posts/customizing-astro-minblog-theme-color-schemes/)
- 预定义配色方案 - [markdown](src/data/blog/zh/predefined-color-schemes.md) | [博客文章](https://demo-astromin.souloss.cn/zh/posts/predefined-color-schemes/)

### 高级功能

- 动态 OG 图片 - [markdown](src/data/blog/zh/dynamic-og-images.md) | [博客文章](https://demo-astromin.souloss.cn/zh/posts/dynamic-og-images/)
- LaTeX 公式 - [markdown](src/data/blog/zh/how-to-add-latex-equations-in-blog-posts.md) | [博客文章](https://demo-astromin.souloss.cn/zh/posts/how-to-add-latex-equations-in-blog-posts/)
- 更新依赖 - [markdown](src/data/blog/zh/how-to-update-dependencies.md) | [博客文章](https://demo-astromin.souloss.cn/zh/posts/how-to-update-dependencies/)
- Git Hooks 设置日期 - [markdown](src/data/blog/zh/setting-dates-via-git-hooks.md) | [博客文章](https://demo-astromin.souloss.cn/zh/posts/setting-dates-via-git-hooks/)

## 💻 技术栈

**主框架** - [Astro](https://astro.build/)  
**类型检查** - [TypeScript](https://www.typescriptlang.org/)  
**样式** - [TailwindCSS](https://tailwindcss.com/)  
**UI/UX** - [Figma 设计文件](https://www.figma.com/community/file/1356898632249991861)  
**静态搜索** - [Pagefind](https://pagefind.app/)  
**图标** - [Tablers](https://tabler-icons.io/)  
**代码格式化** - [Prettier](https://prettier.io/)  
**部署** - [Vercel](https://vercel.com/) / [Cloudflare Pages](https://pages.cloudflare.com/)  
**评论系统** - [Waline](https://waline.js.org/)  
**图表** - [Mermaid](https://mermaid.js.org/)  
**代码检查** - [ESLint](https://eslint.org)

## 👨🏻‍💻 本地运行

在目标目录中运行以下命令即可开始使用：

```bash
# pnpm
pnpm create astro@latest --template souloss/astro-minblog

# npm
npm create astro@latest -- --template souloss/astro-minblog

# yarn
yarn create astro --template souloss/astro-minblog

# bun
bun create astro@latest -- --template souloss/astro-minblog
```

然后运行以下命令启动项目：

```bash
# 安装依赖（如果上一步未自动安装）
pnpm install

# 启动开发服务器
pnpm run dev
```

如果你安装了 Docker，也可以使用 Docker 在本地运行：

```bash
# 构建 Docker 镜像
docker build -t astro-minblog .

# 运行 Docker 容器
docker run -p 4321:80 astro-minblog
```

## Google 站点验证（可选）

你可以通过环境变量轻松添加 [Google 站点验证 HTML 标签](https://support.google.com/webmasters/answer/9008080#meta_tag_verification&zippy=%2Chtml-tag)。此步骤可选，如不添加，HTML `<head>` 中将不会出现 google-site-verification 标签。

```bash
# 在环境变量文件 (.env) 中
PUBLIC_GOOGLE_SITE_VERIFICATION=your-google-site-verification-value
```

## 🧞 命令

所有命令均从项目根目录在终端中运行：

> **_注意！_** 运行 `Docker` 命令需要先[安装](https://docs.docker.com/engine/install/) Docker。

| 命令                                  | 操作                                                                                                               |
| :------------------------------------ | :----------------------------------------------------------------------------------------------------------------- |
| `pnpm install`                        | 安装依赖                                                                                                           |
| `pnpm run dev`                        | 启动本地开发服务器 `localhost:4321`                                                                                |
| `pnpm run build`                      | 构建生产站点到 `./dist/`                                                                                           |
| `pnpm run preview`                    | 本地预览构建结果，部署前检查                                                                                       |
| `pnpm run format:check`               | 使用 Prettier 检查代码格式                                                                                         |
| `pnpm run format`                     | 使用 Prettier 格式化代码                                                                                           |
| `pnpm run sync`                       | 为所有 Astro 模块生成 TypeScript 类型。[了解更多](https://docs.astro.build/en/reference/cli-reference/#astro-sync) |
| `pnpm run lint`                       | 使用 ESLint 进行代码检查                                                                                           |
| `docker compose up -d`                | 在 Docker 上运行 astro-minblog                                                                                     |
| `docker compose run app npm install`  | 在 Docker 容器中运行任意命令                                                                                       |
| `docker build -t astro-minblog .`     | 构建 astro-minblog 的 Docker 镜像                                                                                  |
| `docker run -p 4321:80 astro-minblog` | 在 Docker 上运行，访问地址 `http://localhost:4321`                                                                 |

> **_警告！_** Windows PowerShell 用户如需在开发时[运行诊断](https://docs.astro.build/en/reference/cli-reference/#astro-check)（`astro check --watch & astro dev`），可能需要安装 [concurrently 包](https://www.npmjs.org/package/concurrently)。详见[此 issue](https://github.com/souloss/astro-minblog/issues/113)。

## ✨ 反馈与建议

如有任何建议或反馈，欢迎提交 issue 报告问题或请求新功能。

## 🙏 致谢

本项目基于 [AstroPaper](https://github.com/satnaing/astro-paper) 二次开发，感谢 [Sat Naing](https://github.com/satnaing) 创造了如此优秀的主题。

**技术支持**：

- 评论系统 - [Waline](https://waline.js.org/)
- 部署平台 - [Vercel](https://vercel.com/) / [Cloudflare Pages](https://pages.cloudflare.com/)
- 网站监控 - [Google Analytics](https://analytics.google.com/)

## 📜 许可证

基于 MIT 许可证发布，Copyright © 2025

---

由 [Souloss](https://souloss.cn) 👨🏻‍💻 与[贡献者](https://github.com/souloss/astro-minblog/graphs/contributors)用心打造。

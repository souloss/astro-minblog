# astro-minblog 📄

English | [**简体中文**](./README.md)

![astro-minblog](public/astro-minblog-og.jpg)
[![Figma](https://img.shields.io/badge/Figma-F24E1E?style=for-the-badge&logo=figma&logoColor=white)](https://www.figma.com/community/file/1356898632249991861)
![Typescript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![GitHub](https://img.shields.io/github/license/souloss/astro-minblog?color=%232F3741&style=for-the-badge)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-%23FE5196?logo=conventionalcommits&logoColor=white&style=for-the-badge)](https://conventionalcommits.org)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg?style=for-the-badge)](http://commitizen.github.io/cz-cli/)

astro-minblog is a minimal, responsive, accessible and SEO-friendly Astro blog theme. It features multi-language support, AI chat widget, Mermaid diagrams, Bilibili embeds, and more.

Read [the blog posts](https://demo-astromin.souloss.cn/en/posts/) or check [the README Documentation Section](#-documentation) for more info.

## 🔥 Features

### Core Features

- [x] type-safe markdown
- [x] super fast performance
- [x] accessible (Keyboard/VoiceOver)
- [x] responsive (mobile ~ desktops)
- [x] SEO-friendly
- [x] light & dark mode
- [x] fuzzy search
- [x] draft posts & pagination
- [x] sitemap & rss feed
- [x] followed best practices
- [x] highly customizable
- [x] dynamic OG image generation for blog posts

### Unique Features

- [x] 🤖 **AI Chat Widget** - Built-in AI assistant with streaming responses
- [x] 📊 **Mermaid Diagrams** - Native support for flowcharts, sequence diagrams, etc.
- [x] 🎬 **Bilibili Embeds** - Video embedding component for Bilibili
- [x] 💬 **Waline Comments** - Full-featured comment system with reactions
- [x] 🌐 **Multi-language** - Built-in i18n support (Chinese/English)
- [x] 🔗 **Friends Page** - Friend links management
- [x] 📑 **Dual TOC** - Inline and floating table of contents
- [x] 🏷️ **Categories & Series** - Hierarchical content organization
- [x] 📖 **Related Posts** - Smart recommendation algorithm
- [x] ⏰ **Scheduled Posts** - Time-based publication control
- [x] 🌍 **Timezone Support** - Global and per-post timezone settings
- [x] 📍 **Reading Position** - Persistent scroll position memory

_Note: I've tested screen-reader accessibility of astro-minblog using **VoiceOver** on Mac and **TalkBack** on Android. I couldn't test all other screen-readers out there. However, accessibility enhancements in astro-minblog should be working fine on others as well._

## ✅ Lighthouse Score

<p align="center">
  <a href="https://pagespeed.web.dev/report?url=https%3A%2F%2Fdemo-astromin.souloss.cn%2F&form_factor=desktop">
    <img width="710" alt="astro-minblog Lighthouse Score" src="astro-minblog-lighthouse-score.svg">
  </a>
</p>

## 🚀 Project Structure

Inside of astro-minblog, you'll see the following folders and files:

```bash
/
├── public/
│   ├── pagefind/ # auto-generated when build
│   ├── favicon.svg
│   └── astro-minblog-og.jpg
├── src/
│   ├── assets/
│   │   ├── icons/
│   │   └── images/
│   ├── components/
│   │   ├── ai/          # AI Chat Widget
│   │   ├── blog/        # Post components, TOC, Comments
│   │   ├── media/       # Mermaid, Bilibili, MusicPlayer
│   │   ├── nav/         # Header, Footer, Pagination
│   │   └── ui/          # Cards, Tags, Alerts
│   ├── data/
│   │   ├── blog/        # Blog posts (en/, zh/)
│   │   └── friends.ts   # Friend links
│   ├── layouts/
│   ├── pages/
│   │   └── [lang]/      # Multi-language routes
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

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

Any static assets, like images, can be placed in the `public/` directory.

All blog posts are stored in `src/data/blog` directory, organized by language (`en/`, `zh/`).

## 📖 Documentation

Documentation can be read in two formats — _markdown_ & _blog post_.

### Configuration & Setup

- Configuration - [markdown](src/data/blog/en/how-to-configure-astro-minblog-theme.md) | [blog post](https://demo-astromin.souloss.cn/en/posts/how-to-configure-astro-minblog-theme/)
- Add Posts - [markdown](src/data/blog/en/adding-new-post.md) | [blog post](https://demo-astromin.souloss.cn/en/posts/adding-new-post/)
- Customize Color Schemes - [markdown](src/data/blog/en/customizing-astro-minblog-theme-color-schemes.md) | [blog post](https://demo-astromin.souloss.cn/en/posts/customizing-astro-minblog-theme-color-schemes/)
- Predefined Color Schemes - [markdown](src/data/blog/en/predefined-color-schemes.md) | [blog post](https://demo-astromin.souloss.cn/en/posts/predefined-color-schemes/)

### Advanced Features

- Dynamic OG Images - [markdown](src/data/blog/en/dynamic-og-images.md) | [blog post](https://demo-astromin.souloss.cn/en/posts/dynamic-og-images/)
- LaTeX Equations - [markdown](src/data/blog/en/how-to-add-latex-equations-in-blog-posts.md) | [blog post](https://demo-astromin.souloss.cn/en/posts/how-to-add-latex-equations-in-blog-posts/)
- Update Dependencies - [markdown](src/data/blog/en/how-to-update-dependencies.md) | [blog post](https://demo-astromin.souloss.cn/en/posts/how-to-update-dependencies/)
- Git Hooks for Dates - [markdown](src/data/blog/en/setting-dates-via-git-hooks.md) | [blog post](https://demo-astromin.souloss.cn/en/posts/setting-dates-via-git-hooks/)

## 💻 Tech Stack

**Main Framework** - [Astro](https://astro.build/)  
**Type Checking** - [TypeScript](https://www.typescriptlang.org/)  
**Styling** - [TailwindCSS](https://tailwindcss.com/)  
**UI/UX** - [Figma Design File](https://www.figma.com/community/file/1356898632249991861)  
**Static Search** - [Pagefind](https://pagefind.app/)  
**Icons** - [Tablers](https://tabler-icons.io/)  
**Code Formatting** - [Prettier](https://prettier.io/)  
**Deployment** - [Vercel](https://vercel.com/) / [Cloudflare Pages](https://pages.cloudflare.com/)  
**Comment System** - [Waline](https://waline.js.org/)  
**Diagrams** - [Mermaid](https://mermaid.js.org/)  
**Linting** - [ESLint](https://eslint.org)

## 👨🏻‍💻 Running Locally

You can start using this project locally by running the following command in your desired directory:

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

Then start the project by running the following commands:

```bash
# install dependencies if you haven't done so in the previous step.
pnpm install

# start running the project
pnpm run dev
```

As an alternative approach, if you have Docker installed, you can use Docker to run this project locally. Here's how:

```bash
# Build the Docker image
docker build -t astro-minblog .

# Run the Docker container
docker run -p 4321:80 astro-minblog
```

## Google Site Verification (optional)

You can easily add your [Google Site Verification HTML tag](https://support.google.com/webmasters/answer/9008080#meta_tag_verification&zippy=%2Chtml-tag) in astro-minblog using an environment variable. This step is optional. If you don't add the following environment variable, the google-site-verification tag won't appear in the HTML `<head>` section.

```bash
# in your environment variable file (.env)
PUBLIC_GOOGLE_SITE_VERIFICATION=your-google-site-verification-value
```

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

> **_Note!_** For `Docker` commands we must have it [installed](https://docs.docker.com/engine/install/) in your machine.

| Command                               | Action                                                                                                                           |
| :------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install`                        | Installs dependencies                                                                                                            |
| `pnpm run dev`                        | Starts local dev server at `localhost:4321`                                                                                      |
| `pnpm run build`                      | Build your production site to `./dist/`                                                                                          |
| `pnpm run preview`                    | Preview your build locally, before deploying                                                                                     |
| `pnpm run format:check`               | Check code format with Prettier                                                                                                  |
| `pnpm run format`                     | Format codes with Prettier                                                                                                       |
| `pnpm run sync`                       | Generates TypeScript types for all Astro modules. [Learn more](https://docs.astro.build/en/reference/cli-reference/#astro-sync). |
| `pnpm run lint`                       | Lint with ESLint                                                                                                                 |
| `docker compose up -d`                | Run astro-minblog on docker, You can access with the same hostname and port informed on `dev` command.                           |
| `docker compose run app npm install`  | You can run any command above into the docker container.                                                                         |
| `docker build -t astro-minblog .`     | Build Docker image for astro-minblog.                                                                                            |
| `docker run -p 4321:80 astro-minblog` | Run astro-minblog on Docker. The website will be accessible at `http://localhost:4321`.                                          |

> **_Warning!_** Windows PowerShell users may need to install the [concurrently package](https://www.npmjs.org/package/concurrently) if they want to [run diagnostics](https://docs.astro.build/en/reference/cli-reference/#astro-check) during development (`astro check --watch & astro dev`). For more info, see [this issue](https://github.com/souloss/astro-minblog/issues/113).

## ✨ Feedback & Suggestions

If you have any suggestions/feedback, feel free to open an issue if you find bugs or want to request new features.

## 🙏 Acknowledgements

This project is built on top of [AstroPaper](https://github.com/satnaing/astro-paper). Special thanks to [Sat Naing](https://github.com/satnaing) for creating such an excellent theme.

**Inspiration**: [My Personal Blog](https://souloss.cn)

**Technical Support**:
- Comment System - [Waline](https://waline.js.org/)
- Deployment Platform - [Vercel](https://vercel.com/) / [Cloudflare Pages](https://pages.cloudflare.com/)
- Website Analytics - [Google Analytics](https://analytics.google.com/)

## 📜 License

Licensed under the MIT License, Copyright © 2025

---

Made with 🤍 by [Souloss](https://souloss.cn) 👨🏻‍💻 and [contributors](https://github.com/souloss/astro-minblog/graphs/contributors).
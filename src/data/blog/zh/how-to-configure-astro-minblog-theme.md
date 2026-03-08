---
author: Souloss
pubDatetime: 2022-09-23T04:58:53Z
modDatetime: 2026-01-10T13:04:53.851Z
title: 如何配置 astro-minblog 主题
featured: true
draft: false
category: 教程/配置
tags:
  - configuration
  - docs
description: 如何让 astro-minblog 主题完全符合你的需求。
---

astro-minblog 是一个高度可定制的 Astro 博客主题。使用 astro-minblog，你可以根据个人喜好定制一切。本文将解释如何通过配置文件轻松进行一些自定义设置。

## Table of contents

## 配置 SITE

重要的配置位于 `src/config.ts` 文件中。在该文件中，你会看到 `SITE` 对象，可以在其中指定网站的主要配置。

在开发模式下，`SITE.website` 可以留空。但在生产模式下，你应该在 `SITE.website` 选项中指定你部署的 URL，因为这会用于规范 URL、社交卡片 URL 等，这些对 SEO 很重要。

```js file=src/config.ts
export const SITE = {
  website: "https://demo-astromin.souloss.cn/", // replace this with your deployed domain
  author: "Sat Naing",
  profile: "https://souloss.cn/",
  desc: "A minimal, responsive and SEO-friendly Astro blog theme.",
  title: "astro-minblog",
  ogImage: "astro-minblog-og.jpg",
  lightAndDarkMode: true,
  postPerIndex: 4,
  postPerPage: 4,
  scheduledPostMargin: 15 * 60 * 1000, // 15 minutes
  showArchives: true,
  showBackButton: true, // show back button in post detail
  editPost: {
    enabled: true,
    text: "Suggest Changes",
    url: "https://github.com/souloss/astro-minblog/edit/main/",
  },
  dynamicOgImage: true, // enable automatic dynamic og-image generation
  dir: "ltr", // "rtl" | "auto"
  lang: "en", // html lang code. Set this empty and default will be "en"
  timezone: "Asia/Bangkok", // Default global timezone (IANA format) https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
} as const;
```

以下是 SITE 配置选项说明

| Options               | Description                                                                                                                                                                                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `website`             | 你部署的网站 URL                                                                                                                                                                                                                                                                |
| `author`              | 你的名字                                                                                                                                                                                                                                                                        |
| `profile`             | 你的个人/作品集网站 URL，用于更好的 SEO。如果没有可以设置为 `null` 或空字符串 `""`。                                                                                                                                                                                            |
| `desc`                | 网站描述。对 SEO 和社交媒体分享很有用。                                                                                                                                                                                                                                         |
| `title`               | 网站名称                                                                                                                                                                                                                                                                        |
| `ogImage`             | 网站的默认 OG 图片。用于社交媒体分享。OG 图片可以是外部图片 URL，也可以放在 `/public` 目录下。                                                                                                                                                                                  |
| `lightAndDarkMode`    | 启用或禁用网站的 `明暗模式`。如果禁用，将使用主配色方案。此选项默认启用。                                                                                                                                                                                                       |
| `postPerIndex`        | 首页 `最近文章` 部分显示的文章数量。                                                                                                                                                                                                                                            |
| `postPerPage`         | 指定每个文章页面显示的文章数量。（例如：如果将 `SITE.postPerPage` 设为 3，每页将只显示 3 篇文章）                                                                                                                                                                               |
| `scheduledPostMargin` | 在生产模式下，`pubDatetime` 为未来的文章将不可见。但如果文章的 `pubDatetime` 在未来 15 分钟内，它将可见。如果你不喜欢默认的 15 分钟边距，可以设置 `scheduledPostMargin`。                                                                                                       |
| `showArchives`        | 决定是否显示 `归档` 菜单（位于 `关于` 和 `搜索` 菜单之间）及其对应页面。此选项默认为 `true`。                                                                                                                                                                                   |
| `showBackButton`      | 决定是否在每篇博客文章中显示 `返回` 按钮。                                                                                                                                                                                                                                      |
| `editPost`            | 此选项允许用户通过在博客文章标题下提供编辑链接来建议更改博客文章。可以通过将 `SITE.editPost.enabled` 设为 `false` 来禁用此功能。                                                                                                                                                |
| `dynamicOgImage`      | 此选项控制当博客文章 frontmatter 中未指定 `ogImage` 时是否[生成动态 og-image](https://demo-astromin.souloss.cn/en/posts/dynamic-og-images/)。如果你有很多博客文章，可能想要禁用此功能。详见[权衡说明](https://demo-astromin.souloss.cn/en/posts/dynamic-og-images/#trade-off)。 |
| `dir`                 | 指定整个博客的文本方向。用作 `<html dir="ltr">` 中的 [HTML dir 属性](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/dir)。支持的值：`ltr` \| `rtl` \| `auto`                                                                                     |
| `lang`                | 用作 `<html lang"en">` 中的 HTML ISO 语言代码。默认为 `en`。                                                                                                                                                                                                                    |
| `timezone`            | 此选项允许你使用 [IANA 格式](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)指定时区。设置此选项可确保本地主机和部署站点的时间戳一致，消除时间差异。                                                                                                              |

## 更新布局宽度

整个博客的默认 `max-width` 是 `768px`（`max-w-3xl`）。如果你想更改它，可以轻松更新 `global.css` 中的 `max-w-app` 工具类。例如：

```css file=src/styles/global.css
@utility max-w-app {
  /* [!code --:1] */
  @apply max-w-3xl;
  /* [!code ++:1] */
  @apply max-w-4xl xl:max-w-5xl;
}
```

你可以在 [Tailwind CSS 文档](https://tailwindcss.com/docs/max-width)中探索更多 `max-width` 值。

## 配置 Logo 或标题

在 astro-minblog v5 之前，你可以在 `src/config.ts` 文件的 `LOGO_IMAGE` 对象中更新网站名称/logo。但在 astro-minblog v5 中，此选项已被移除，改用 Astro 内置的 SVG 和 Image 组件。

![An arrow pointing at the website logo](https://res.cloudinary.com/noezectz/v1663911318/astro-minblog/astro-minblog-logo-config_goff5l.png)

你有 3 种选择：

### 选项 1：SITE 标题文本

这是最简单的选项。只需在 `src/config.ts` 文件中更新 `SITE.title`。

### 选项 2：Astro 的 SVG 组件

如果你想使用 SVG logo，可以使用此选项。

- 首先在 `src/assets` 目录中添加 SVG。（例如：`src/assets/dummy-logo.svg`）
- 然后在 `Header.astro` 中导入该 SVG

  ```astro file=src/components/nav/Header.astro
  ---
  // ...
  import DummyLogo from "@/assets/dummy-logo.svg";
  ---
  ```

- 最后，用导入的 logo 替换 `{SITE.title}`。

  ```html
  <a
    href="/"
    class="absolute py-1 text-left text-2xl leading-7 font-semibold whitespace-nowrap sm:static"
  >
    <DummyLogo class="scale-75 dark:invert" />
    <!-- {SITE.title} -->
  </a>
  ```

这种方法的最大优点是可以根据需要自定义 SVG 样式。在上面的示例中，你可以看到 SVG logo 颜色如何在深色模式下反转。

### 选项 3：Astro 的 Image 组件

如果你的 logo 是图片但不是 SVG，可以使用 Astro 的 Image 组件。

- 在 `src/assets` 目录中添加 logo。（例如：`src/assets/dummy-logo.png`）
- 在 `Header.astro` 中导入 `Image` 和你的 logo

  ```astro file=src/components/nav/Header.astro
  ---
  // ...
  import { Image } from "astro:assets";
  import dummyLogo from "@/assets/dummy-logo.png";
  ---
  ```

- 然后，用导入的 logo 替换 `{SITE.title}`。

  <!-- prettier-ignore -->
  ```html
  <a
    href="/"
    class="absolute py-1 text-left text-2xl leading-7 font-semibold whitespace-nowrap sm:static"
  >
    <Image src="{dummyLogo}" alt="Dummy Blog" class="dark:invert" />
    <!-- {SITE.title} -->
  </a>
  ```

使用这种方法，你仍然可以使用 CSS 类调整图片外观。但这可能并不总是符合你的需求。如果需要根据明暗模式显示不同的 logo 图片，请查看 `Header.astro` 组件中明暗图标是如何处理的。

## 配置社交链接

![An arrow pointing at social link icons](https://github.com/user-attachments/assets/8b895400-d088-442f-881b-02d2443e00cf)

你可以在 `constants.ts` 的 `SOCIALS` 对象中配置社交链接。

```ts file=src/constants.ts
export const SOCIALS = [
  {
    name: "GitHub",
    href: "https://github.com/souloss/astro-minblog",
    linkTitle: ` ${SITE.title} on GitHub`,
    icon: IconGitHub,
  },
  {
    name: "X",
    href: "https://x.com/username",
    linkTitle: `${SITE.title} on X`,
    icon: IconBrandX,
  },
  {
    name: "LinkedIn",
    href: "https://www.linkedin.com/in/username/",
    linkTitle: `${SITE.title} on LinkedIn`,
    icon: IconLinkedin,
  },
  {
    name: "Mail",
    href: "mailto:yourmail@gmail.com",
    linkTitle: `Send an email to ${SITE.title}`,
    icon: IconMail,
  },
] as const;
```

## 配置分享链接

你可以在 `src/constants.ts` 的 `SHARE_LINKS` 对象中配置分享链接。

![An arrow pointing at share link icons](https://github.com/user-attachments/assets/4f930b68-b625-45df-8c41-e076dd2b838e)

## 配置字体

astro-minblog 使用 Astro 的[实验性字体 API](https://docs.astro.build/en/reference/experimental-flags/fonts/)，默认字体为 [Google Sans Code](https://fonts.google.com/specimen/Google+Sans+Code)。这提供了跨所有平台的一致排版，并自动进行字体优化，包括预加载和缓存。

### 使用默认字体

字体在 `astro.config.ts` 中自动配置，并在 `Layout.astro` 中加载。使用默认的 Google Sans Code 字体无需额外配置。

### 自定义字体

要使用不同的字体，需要更新三个地方：

1. **更新 `astro.config.ts` 中的字体配置：**

```ts file=astro.config.ts
import { defineConfig, fontProviders } from "astro/config";

export default defineConfig({
  // ...
  experimental: {
    fonts: [
      {
        name: "Your Font Name", // [!code highlight]
        cssVariable: "--font-your-font", // [!code highlight]
        provider: fontProviders.google(),
        fallbacks: ["monospace"],
        weights: [300, 400, 500, 600, 700],
        styles: ["normal", "italic"],
      },
    ],
  },
});
```

1. **更新 `Layout.astro` 中的 Font 组件：**

```astro file=src/layouts/Layout.astro
---
import { Font } from "astro:assets";
// ...
---

<head>
  <!-- ... -->
  // [!code highlight:4]
  <Font
    cssVariable="--font-your-font"
    preload={[{ subset: "latin", weight: 400, style: "normal" }]}
  />
  <!-- ... -->
</head>
```

1. **更新 `global.css` 中的 CSS 变量映射：**

```css file=src/styles/global.css
@theme inline {
  --font-app: var(--font-your-font); /* [!code highlight] */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-accent: var(--accent);
  --color-muted: var(--muted);
  --color-border: var(--border);
}
```

`--font-app` 变量通过 `font-app` Tailwind 工具类在整个主题中使用，因此更新此单个变量将在所有地方应用你的自定义字体。

> **注意**：确保字体名称与 [Google Fonts](https://fonts.google.com) 上显示的完全一致。对于其他字体提供商或本地字体，请参阅 [Astro 实验性字体 API 文档](https://docs.astro.build/en/reference/experimental-flags/fonts/)。

## 结语

这是关于如何自定义此主题的简要说明。如果你懂一些代码，可以进行更多自定义。关于自定义样式，请阅读[这篇文章](https://demo-astromin.souloss.cn/en/posts/customizing-astro-minblog-theme-color-schemes/)。感谢阅读。✌🏻

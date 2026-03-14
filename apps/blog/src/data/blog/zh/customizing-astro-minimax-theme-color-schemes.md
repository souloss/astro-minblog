---
author: Souloss
pubDatetime: 2022-09-25T15:20:35Z
modDatetime: 2026-01-09T15:00:15.170Z
title: 自定义 astro-minimax 主题配色方案
featured: false
draft: false
category: 教程/配置
tags:
  - color-schemes
  - docs
description: 如何启用/禁用明暗模式，以及自定义 astro-minimax 主题的配色方案。
---

本文将解释如何为网站启用/禁用明暗模式。此外，你将学习如何自定义整个网站的配色方案。

## Table of contents

## 启用/禁用明暗模式

astro-minimax 主题默认包含明暗模式。换句话说，将有两种配色方案，一种用于亮色模式，另一种用于暗色模式。可以在 `SITE` 配置对象中禁用此默认行为。

```js file="src/config.ts"
export const SITE = {
  website: "https://demo-astro-minimax.souloss.cn/", // replace this with your deployed domain
  author: "Souloss",
  profile: "https://souloss.cn/",
  desc: "A minimal, responsive and SEO-friendly Astro blog theme.",
  title: "astro-minimax",
  ogImage: "astro-minimax-og.jpg",
  lightAndDarkMode: true, // [!code highlight]
  postPerIndex: 4,
  postPerPage: 4,
  scheduledPostMargin: 15 * 60 * 1000, // 15 minutes
  showArchives: true,
  showBackButton: true, // show back button in post detail
  editPost: {
    enabled: true,
    text: "Suggest Changes",
    url: "https://github.com/souloss/astro-minimax/edit/main/",
  },
  dynamicOgImage: true,
  lang: "en", // html lang code. Set this empty and default will be "en"
  timezone: "Asia/Bangkok", // Default global timezone (IANA format) https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
} as const;
```

要禁用 `明暗模式`，请将 `SITE.lightAndDarkMode` 设置为 `false`。

## 选择初始配色方案

默认情况下，如果我们禁用 `SITE.lightAndDarkMode`，我们将只获得系统的 prefers-color-scheme。

因此，要选择初始配色方案而不是 prefers-color-scheme，我们需要在 `theme.ts` 的 `initialColorScheme` 变量中设置配色方案。

```ts file="src/scripts/theme.ts"
// Initial color scheme
// Can be "light", "dark", or empty string for system's prefers-color-scheme
const initialColorScheme = ""; // "light" | "dark" // [!code hl]

function getPreferTheme(): string {
  // get theme data from local storage (user's explicit choice)
  const currentTheme = localStorage.getItem("theme");
  if (currentTheme) return currentTheme;

  // return initial color scheme if it is set (site default)
  if (initialColorScheme) return initialColorScheme;

  // return user device's prefer color scheme (system fallback)
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

// ...
```

**initialColorScheme** 变量可以有两个值，`"light"` 或 `"dark"`。如果你不想指定初始配色方案，可以保留空字符串（默认）。

- `""` - 系统的 prefers-color-scheme。（默认）
- `"light"` - 使用亮色模式作为初始配色方案。
- `"dark"` - 使用暗色模式作为初始配色方案。

<details>
<summary>为什么 initialColorScheme 不在 config.ts 中？</summary>
为了避免页面重新加载时的颜色闪烁，我们必须在页面加载时尽早放置主题初始化 JavaScript 代码。主题脚本分为两部分：`<head>` 中设置主题的最小内联脚本，以及异步加载的完整脚本。这种方法可以防止 FOUC（无样式内容闪烁），同时保持最佳性能。
</details>

## 自定义配色方案

astro-minimax 主题的明暗配色方案都可以在 `global.css` 文件中自定义。

```css file="src/styles/global.css"
@import "tailwindcss";
@import "./typography.css";

@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));

:root,
html[data-theme="light"] {
  --background: #fdfdfd;
  --foreground: #282728;
  --accent: #006cac;
  --muted: #e6e6e6;
  --border: #ece9e9;
}

html[data-theme="dark"] {
  --background: #212737;
  --foreground: #eaedf3;
  --accent: #ff6b01;
  --muted: #343f60bf;
  --border: #ab4b08;
}
/* ... */
```

在 astro-minimax 主题中，`:root` 和 `html[data-theme="light"]` 选择器定义亮色配色方案，而 `html[data-theme="dark"]` 定义暗色配色方案。

要自定义你自己的配色方案，请在 `:root, html[data-theme="light"]` 中指定你的亮色颜色，在 `html[data-theme="dark"]` 中指定你的暗色颜色。

以下是颜色属性的详细说明。

| Color Property | 定义与用法                           |
| -------------- | ------------------------------------ |
| `--background` | 网站的主颜色。通常是主要背景。       |
| `--foreground` | 网站的次要颜色。通常是文字颜色。     |
| `--accent`     | 网站的强调色。链接颜色、悬停颜色等。 |
| `--muted`      | 卡片和滚动条的悬停状态背景颜色等。   |
| `--border`     | 边框颜色。用于边框工具类和视觉分隔   |

以下是更改亮色配色方案的示例。

```css file="src/styles/global.css"
/* ... */
:root,
html[data-theme="light"] {
  --background: #f6eee1;
  --foreground: #012c56;
  --accent: #e14a39;
  --muted: #efd8b0;
  --border: #dc9891;
}
/* ... */
```

> 查看 astro-minimax 为你准备的一些[预定义配色方案](/posts/predefined-color-schemes/)。

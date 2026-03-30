---
author: Souloss
pubDatetime: 2022-12-28T04:59:04.866Z
modDatetime: 2026-03-17T20:44:00Z
title: 在 astro-minimax 中动态生成 OG 图片

featured: false
draft: false
category: 教程/博客
tags:
  - docs
  - release
description: astro-minimax 内置动态 OG 图片生成功能，使用 Satori 在构建时自动创建社交分享图。
---

astro-minimax 内置动态 OG 图片生成功能，未指定 `ogImage` 的文章会在构建时自动生成社交分享图。

## 封面图与 OG 图片的区别

astro-minimax 区分两种博客文章图片：

| 字段 | 用途 | 使用场景 |
|-------|---------|-------|
| **`cover`** | 封面图片 | 用于首页卡片、文章列表页以及文章详情页的横幅展示 |
| **`ogImage`** | 社交分享图片 | 在社交媒体（Twitter、Facebook、Discord 等）分享链接时显示 |

### 如何选择？

- **`cover`**：当你希望为文章指定一个视觉代表图时使用
- **`ogImage`**：当你希望为社交媒体分享指定特定图片时使用

### 回退行为

1. 如果未设置 `cover` 但设置了 `ogImage` → `ogImage` 将作为封面图使用
2. 如果两者都未设置 → 自动生成动态 OG 图片，同时用于两个场景

这种设计让你可以：
- 只设置 `cover` → 博客展示封面图，社交分享使用动态生成的 OG 图片
- 只设置 `ogImage` → 同时用于博客展示和社交分享
- 分别设置 → 完全控制每个场景

## 简介

OG 图片（又称社交图片）在社交媒体互动中扮演着重要角色。如果你不知道 OG 图片是什么，它是指我们在 Facebook、Discord 等社交媒体上分享网站 URL 时显示的图片。

> Twitter 使用的社交图片在技术上不叫 OG 图片。不过，在这篇文章中，我将用 OG 图片来指代所有类型的社交图片。

## 默认/静态 OG 图片（旧方式）

astro-minimax 已经提供了为博客文章添加 OG 图片的方式。作者可以在 frontmatter 的 `ogImage` 字段中指定 OG 图片。即使作者没有在 frontmatter 中定义 OG 图片，也会使用默认 OG 图片作为后备（在本例中是 `public/astro-minimax-og.jpg`）。但问题是默认 OG 图片是静态的，这意味着每篇没有在 frontmatter 中包含 OG 图片的博客文章都会使用相同的默认 OG 图片，尽管每篇文章的标题/内容各不相同。

## 动态 OG 图片

为每篇文章生成动态 OG 图片可以让作者避免为每篇博客文章指定 OG 图片。此外，这还可以防止后备 OG 图片在所有博客文章中重复。

astro-minimax 当前通过 OG 模板生成 SVG，再在构建阶段结合 `@resvg/resvg-js` 渲染为 PNG 输出。

动态 OG 图片将在构建时为以下博客文章生成：

- frontmatter 中不包含 OG 图片
- 未标记为草稿

## astro-minimax 动态 OG 图片的组成

astro-minimax 的动态 OG 图片会基于文章元数据生成，核心信息包括 _博客文章标题_、_作者名称_ 和 _网站标题_。作者名称和网站标题通过 **`src/config.ts`** 文件中的 `SITE.author` 和 `SITE.title` 获取，标题则来自文章 frontmatter 的 `title` 字段。

![示例动态 OG 图片](/images/og-image-demo.png)

### 非拉丁字符问题

包含非拉丁字符的标题无法开箱即用地正确显示。要解决这个问题，我们需要将 `loadGoogleFont.ts` 中的 `fontsConfig` 替换为你偏好的字体。

```ts file=src/utils/loadGoogleFont.ts
async function loadGoogleFonts(
  text: string
): Promise<
  Array<{ name: string; data: ArrayBuffer; weight: number; style: string }>
> {
  const fontsConfig = [
    {
      name: "Noto Sans JP",
      font: "Noto+Sans+JP",
      weight: 400,
      style: "normal",
    },
    {
      name: "Noto Sans JP",
      font: "Noto+Sans+JP:wght@700",
      weight: 700,
      style: "normal",
    },
    { name: "Noto Sans", font: "Noto+Sans", weight: 400, style: "normal" },
    {
      name: "Noto Sans",
      font: "Noto+Sans:wght@700",
      weight: 700,
      style: "normal",
    },
  ];
  // ...
}
```

## 权衡

虽然这是一个不错的功能，但也存在权衡。每张 OG 图片大约需要一秒钟生成。起初这可能不太明显，但随着博客文章数量的增长，你可能想要禁用此功能。由于每张 OG 图片都需要时间生成，拥有大量图片会线性增加构建时间。

例如：如果一张 OG 图片需要一秒钟生成，那么 60 张图片大约需要一分钟，600 张图片大约需要 10 分钟。随着内容规模的扩大，这可能会显著影响构建时间。

## 限制

当前这套构建期 OG 方案依然有一些实际限制：

- 构建时间会随着需要生成的文章数量线性增加
- 字体与特殊字符支持仍取决于模板与字体资源配置
- 如果构建环境缺少 `@resvg/resvg-js`，则无法在构建期产出 PNG

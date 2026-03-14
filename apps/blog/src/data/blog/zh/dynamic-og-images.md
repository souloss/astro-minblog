---
author: Souloss
pubDatetime: 2022-12-28T04:59:04.866Z
modDatetime: 2025-03-12T13:39:20.763Z
title: 在 astro-minimax 中动态生成 OG 图片

featured: false
draft: false
category: 教程/博客
tags:
  - docs
  - release
description: astro-minimax v1.4.0 新功能，为博客文章引入动态 OG 图片生成。
---

astro-minimax v1.4.0 新功能，为博客文章引入动态 OG 图片生成。

## Table of contents

## 简介

OG 图片（又称社交图片）在社交媒体互动中扮演着重要角色。如果你不知道 OG 图片是什么，它是指我们在 Facebook、Discord 等社交媒体上分享网站 URL 时显示的图片。

> Twitter 使用的社交图片在技术上不叫 OG 图片。不过，在这篇文章中，我将用 OG 图片来指代所有类型的社交图片。

## 默认/静态 OG 图片（旧方式）

astro-minimax 已经提供了为博客文章添加 OG 图片的方式。作者可以在 frontmatter 的 `ogImage` 字段中指定 OG 图片。即使作者没有在 frontmatter 中定义 OG 图片，也会使用默认 OG 图片作为后备（在本例中是 `public/astro-minimax-og.jpg`）。但问题是默认 OG 图片是静态的，这意味着每篇没有在 frontmatter 中包含 OG 图片的博客文章都会使用相同的默认 OG 图片，尽管每篇文章的标题/内容各不相同。

## 动态 OG 图片

为每篇文章生成动态 OG 图片可以让作者避免为每篇博客文章指定 OG 图片。此外，这还可以防止后备 OG 图片在所有博客文章中重复。

在 astro-minimax v1.4.0 中，使用 Vercel 的 [Satori](https://github.com/vercel/satori) 包进行动态 OG 图片生成。

动态 OG 图片将在构建时为以下博客文章生成：

- frontmatter 中不包含 OG 图片
- 未标记为草稿

## astro-minimax 动态 OG 图片的组成

astro-minimax 的动态 OG 图片包含 _博客文章标题_、_作者名称_ 和 _网站标题_。作者名称和网站标题将通过 **"src/config.ts"** 文件中的 `SITE.author` 和 `SITE.title` 获取。标题从博客文章 frontmatter 的 `title` 字段生成。

![示例动态 OG 图片](https://user-images.githubusercontent.com/53733092/209704501-e9c2236a-3f4d-4c67-bab3-025aebd63382.png)

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

> 查看 [这个 PR](https://github.com/souloss/astro-minimax/pull/318) 了解更多信息。

## 权衡

虽然这是一个不错的功能，但也存在权衡。每张 OG 图片大约需要一秒钟生成。起初这可能不太明显，但随着博客文章数量的增长，你可能想要禁用此功能。由于每张 OG 图片都需要时间生成，拥有大量图片会线性增加构建时间。

例如：如果一张 OG 图片需要一秒钟生成，那么 60 张图片大约需要一分钟，600 张图片大约需要 10 分钟。随着内容规模的扩大，这可能会显著影响构建时间。

相关 issue：[#428](https://github.com/souloss/astro-minimax/issues/428)

## 限制

在撰写本文时，[Satori](https://github.com/vercel/satori) 还比较新，尚未发布主要版本。因此，这个动态 OG 图片功能仍有一些限制。

- 此外，尚不支持 RTL（从右到左）语言。
- 在标题中[使用 emoji](https://github.com/vercel/satori#emojis) 可能会有一些问题。

---
author: Souloss
pubDatetime: 2022-09-23T15:22:00Z
modDatetime: 2025-06-13T16:52:45.934Z
title: 在 astro-minblog 主题中添加新文章
featured: true
draft: false
category: 教程/博客
tags:
  - docs
description: 使用 astro-minblog 主题创建或添加新文章的一些规则和建议。
---

以下是在 astro-minblog 博客主题中创建新文章的一些规则/建议、技巧和提示。

<figure>
  <img
    src="https://images.pexels.com/photos/159618/still-life-school-retro-ink-159618.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
    alt="Free Classic wooden desk with writing materials, vintage clock, and a leather bag. Stock Photo"
  />
    <figcaption class="text-center">
    Photo by <a href="https://www.pexels.com/photo/brown-wooden-desk-159618/">Pixabay</a>
  </figcaption>
</figure>

## Table of contents

## 创建博客文章

要撰写新的博客文章，请在 `src/data/blog/` 目录中创建一个 markdown 文件。

> 在 astro-minblog v5.1.0 之前，所有博客文章都必须放在 `src/data/blog/` 中，这意味着你无法将它们组织到子目录中。

从 astro-minblog v5.1.0 开始，你现在可以将博客文章组织到子目录中，使内容管理更加方便。

例如，如果你想将文章分组在 `2025` 下，可以将它们放在 `src/data/blog/2025/` 中。这也会影响文章 URL，因此 `src/data/blog/2025/example-post.md` 将在 `/posts/2025/example-post` 上可用。

如果你不想让子目录影响文章 URL，只需在文件夹名称前加上下划线 `_`。

```bash
# Example: blog post structure and URLs
src/data/blog/very-first-post.md          -> mysite.com/posts/very-first-post
src/data/blog/2025/example-post.md        -> mysite.com/posts/2025/example-post
src/data/blog/_2026/another-post.md       -> mysite.com/posts/another-post
src/data/blog/docs/_legacy/how-to.md      -> mysite.com/posts/docs/how-to
src/data/blog/Example Dir/Dummy Post.md   -> mysite.com/posts/example-dir/dummy-post
```

> 💡 提示：你也可以在 frontmatter 中覆盖博客文章的 slug。详见下一节。

如果子目录 URL 没有出现在构建输出中，请删除 node_modules，重新安装包，然后重新构建。

## Frontmatter

Frontmatter 是存储博客文章（文章）重要信息的主要位置。Frontmatter 位于文章顶部，以 YAML 格式编写。在 [astro 文档](https://docs.astro.build/en/guides/markdown-content/)中阅读更多关于 frontmatter 及其用法的信息。

以下是每篇文章的 frontmatter 属性列表。

| Property           | Description                                                                           | Remark                                        |
| ------------------ | ------------------------------------------------------------------------------------- | --------------------------------------------- |
| **_title_**        | 文章标题。(h1)                                                                        | required<sup>\*</sup>                         |
| **_description_**  | 文章描述。用于文章摘录和网站描述。                                                    | required<sup>\*</sup>                         |
| **_pubDatetime_**  | 发布时间，ISO 8601 格式。                                                             | required<sup>\*</sup>                         |
| **_modDatetime_**  | 修改时间，ISO 8601 格式。（仅在博客文章被修改时添加此属性）                           | optional                                      |
| **_author_**       | 文章作者。                                                                            | default = SITE.author                         |
| **_slug_**         | 文章的 slug。此字段可选。                                                             | default = slugified file name                 |
| **_featured_**     | 是否在首页特色区域显示此文章                                                          | default = false                               |
| **_draft_**        | 将此文章标记为"未发布"。                                                              | default = false                               |
| **_tags_**         | 此文章的相关关键词。以 yaml 数组格式编写。                                            | default = others                              |
| **_ogImage_**      | 文章的 OG 图片。用于社交媒体分享和 SEO。可以是远程 URL 或相对于当前文件夹的图片路径。 | default = `SITE.ogImage` 或生成的 OG image    |
| **_canonicalURL_** | 规范 URL（绝对路径），如果文章已存在于其他来源。                                      | default = `Astro.site` + `Astro.url.pathname` |
| **_hideEditPost_** | 隐藏博客标题下的 editPost 按钮。仅适用于当前博客文章。                                | default = false                               |
| **_timezone_**     | 以 IANA 格式指定当前博客文章的时区。这将覆盖当前博客文章的 `SITE.timezone` 配置。     | default = `SITE.timezone`                     |

> 提示！你可以在控制台中运行 `new Date().toISOString()` 获取 ISO 8601 日期时间。记得删除引号。

只有 frontmatter 中的 `title`、`description` 和 `pubDatetime` 字段必须指定。

标题和描述（摘录）对搜索引擎优化（SEO）很重要，因此 astro-minblog 鼓励在博客文章中包含这些内容。

`slug` 是 URL 的唯一标识符。因此，`slug` 必须唯一且与其他文章不同。`slug` 的空格应用 `-` 或 `_` 分隔，但推荐使用 `-`。Slug 使用博客文章文件名自动生成。但是，你可以在博客文章的 frontmatter 中定义你的 `slug`。

例如，如果博客文件名是 `adding-new-post.md` 且你没有在 frontmatter 中指定 slug，Astro 将使用文件名自动为博客文章创建 slug。因此，slug 将是 `adding-new-post`。但如果你在 frontmatter 中指定了 `slug`，这将覆盖默认 slug。你可以在 [Astro 文档](https://docs.astro.build/en/guides/content-collections/#defining-custom-slugs)中阅读更多相关内容。

如果你在博客文章中省略 `tags`（换句话说，如果没有指定任何标签），默认标签 `others` 将用作该文章的标签。你可以在 `content.config.ts` 文件中设置默认标签。

```ts file="src/content.config.ts"
export const blogSchema = z.object({
  // ...
  draft: z.boolean().optional(),
  // [!code highlight:1]
  tags: z.array(z.string()).default(["others"]), // replace "others" with whatever you want
  // ...
});
```

### Frontmatter 示例

以下是文章的 frontmatter 示例。

```yaml file="src/data/blog/sample-post.md"
---
title: The title of the post
author: your name
pubDatetime: 2022-09-21T05:17:19Z
slug: the-title-of-the-post
featured: true
draft: false
tags:
  - some
  - example
  - tags
ogImage: ../../../assets/images/example.png # src/assets/images/example.png
# ogImage: "https://example.org/remote-image.png" # remote URL
description: This is the example description of the example post.
canonicalURL: https://example.org/my-article-was-already-posted-here
---
```

## 添加目录

默认情况下，文章不包含任何目录（toc）。要包含 toc，你需要以特定方式指定它。

以 h2 格式（markdown 中的 ##）编写 `Table of contents`，并将其放置在你希望它出现在文章中的位置。

例如，如果你想把目录放在介绍段落下面（像我通常做的那样），可以按以下方式操作。

<!-- prettier-ignore-start -->
```md
---
# frontmatter
---

Here are some recommendations, tips & ticks for creating new posts in astro-minblog blog theme.

<!-- [!code ++] -->
## Table of contents

<!-- the rest of the post -->
```
<!-- prettier-ignore-end -->

## 标题

关于标题有一点需要注意。astro-minblog 博客文章使用标题（frontmatter 中的 title）作为文章的主标题。因此，文章中的其余标题应使用 h2 ~ h6。

这条规则不是强制性的，但为了视觉效果、可访问性和 SEO，强烈建议这样做。

## 语法高亮

astro-minblog 使用 [Shiki](https://shiki.style/) 作为默认语法高亮。从 astro-minblog v5.4 开始，使用 [@shikijs/transformers](https://shiki.style/packages/transformers) 来增强代码块。如果你不想使用它，可以简单地像这样移除它

```bash
pnpm remove @shikijs/transformers
```

```js file="astro.config.ts"
// ...
// [!code --:5]
import {
  transformerNotationDiff,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from "@shikijs/transformers";

export default defineConfig({
  // ...
  markdown: {
    remarkPlugins: [remarkToc, [remarkCollapse, { test: "Table of contents" }]],
    shikiConfig: {
      // For more themes, visit https://shiki.style/themes
      themes: { light: "min-light", dark: "night-owl" },
      defaultColor: false,
      wrap: false,
      transformers: [
        transformerFileName(),
      // [!code --:3]
        transformerNotationHighlight(),
        transformerNotationWordHighlight(),
        transformerNotationDiff({ matchAlgorithm: "v3" }),
      ],
    },
  },
  // ...
}
```

## 存储博客内容的图片

以下是在 markdown 文件中存储和显示图片的两种方法。

> 注意！如果需要在 markdown 中设置优化图片的样式，你应该[使用 MDX](https://docs.astro.build/en/guides/images/#images-in-mdx-files)。

### 在 `src/assets/` 目录中（推荐）

你可以在 `src/assets/` 目录中存储图片。这些图片将通过 [Image Service API](https://docs.astro.build/en/reference/image-service-reference/) 被 Astro 自动优化。

你可以使用相对路径或别名路径（`@/assets/`）来提供这些图片。

示例：假设你想显示路径为 `/src/assets/images/example.jpg` 的 `example.jpg`。

```md
![something](@/assets/images/example.jpg)

<!-- OR -->

![something](../../assets/images/example.jpg)

<!-- Using img tag or Image component won't work ❌ -->
<img src="@/assets/images/example.jpg" alt="something">
<!-- ^^ This is wrong -->
```

> 从技术上讲，你可以在 `src` 下的任何目录中存储图片。在这里，`src/assets` 只是一个建议。

### 在 `public` 目录中

你可以在 `public` 目录中存储图片。请记住，存储在 `public` 目录中的图片不会被 Astro 处理，这意味着它们不会被优化，你需要自己处理图片优化。

对于这些图片，你应该使用绝对路径；这些图片可以通过 [markdown 注解](https://www.markdownguide.org/basic-syntax/#images-1)或 [HTML img 标签](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img)显示。

示例：假设 `example.jpg` 位于 `/public/assets/images/example.jpg`。

```md
![something](/assets/images/example.jpg)

<!-- OR -->

<img src="/assets/images/example.jpg" alt="something">
```

## 额外内容

### 图片压缩

当你在博客文章中放置图片时（尤其是 `public` 目录下的图片），建议对图片进行压缩。这会影响网站的整体性能。

我推荐的图片压缩网站。

- [TinyPng](https://tinypng.com/)
- [TinyJPG](https://tinyjpg.com/)

### OG 图片

如果文章未指定 OG 图片，将使用默认 OG 图片。虽然不是必须的，但应在 frontmatter 中指定与文章相关的 OG 图片。OG 图片的推荐尺寸为 **_1200 X 640_** px。

> 从 astro-minblog v1.4.0 开始，如果未指定，OG 图片将自动生成。查看[公告](https://demo-astromin.souloss.cn/en/posts/dynamic-og-images/)。

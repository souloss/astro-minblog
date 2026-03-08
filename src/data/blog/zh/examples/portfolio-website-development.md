---
title: 我是如何开发我的作品集网站和博客的
author: Souloss
pubDatetime: 2022-03-25T16:55:12.000+00:00
featured: false
draft: false
category: 示例/前端
tags:
  - NextJS
  - TailwindCSS
  - HeadlessCMS
  - Blog
description: "示例文章：我使用 NextJS 和无头 CMS 开发我的第一个作品集网站和博客的经验。"
timezone: "Asia/Yangon"
---

> 本文最初来自我的[博客文章](https://souloss.cn/blog/posts/how-do-i-develop-my-portfolio-and-blog)。我放置这篇文章是为了演示如何使用 astro-minblog 主题撰写博客文章。

我使用 NextJS 和无头 CMS 开发我的第一个作品集网站和博客的经验。

![Building portfolio](https://souloss.cn/_ipx/w_2048,q_75/https%3A%2F%2Fres.cloudinary.com%2Fnoezectz%2Fimage%2Fupload%2Fv1653050141%2FSatNaing%2Fblog_at_cafe_ei1wf4.jpg?url=https%3A%2F%2Fres.cloudinary.com%2Fnoezectz%2Fimage%2Fupload%2Fv1653050141%2FSatNaing%2Fblog_at_cafe_ei1wf4.jpg&w=2048&q=75)

## 动机

从大学时代起，我就一直想用我自己的域名 (**souloss.cn**) 发布我自己的网站。但直到这个项目才真正实现。我做过几个关于 Web 应用开发的项目和工作，但我没有花精力去做这个。

所以，你可能会问，"那博客呢？" 是的，博客也在我的项目列表中有一段时间了。我一直想用一些最新技术来做一个博客项目。然而，我一直忙于我的工作和其他项目，所以博客项目一直没有开始。

最近，我倾向于以质量而非数量为重点来开发我自己的项目。项目完成后，我通常会在 GitHub 仓库中放一个适当的自述文件。但 GitHub 仓库自述只适合技术方面（这只是我的想法）。我想写下我的经验和挑战。因此，我决定建立自己的博客。而且，在这一点上，我有足够的经验和信心来开发这个项目。

## 技术栈

对于前端，我想使用 [React](https://reactjs.org/ "React Official Website")。但仅靠 React 对 SEO 来说不够好，而且我确实需要考虑很多因素，比如路由、图片优化等。所以，我选择 [NextJS](https://nextjs.org/ "NextJS Official Website") 作为我的主要前端技术栈。当然还有 TypeScript 用于类型检查。（据说当你习惯了 TypeScript 后，你会爱上它 😉

对于样式，我使用 [TailwindCSS](https://tailwindcss.com/ "Tailwind CSS Official Website")。这是因为我喜欢 Tailwind 提供的开发者体验，而且与 MUI 或 React Bootstrap 等其他组件 UI 库相比，它有很大的灵活性。

这个项目的所有内容都存放在 GitHub 仓库中。我所有的博客文章（包括这篇）都是以 Markdown 文件格式编写的，因为我很习惯使用这种格式。但为了轻松地编写 Markdown 及其前置数据，我使用 [Forestry](https://forestry.io/ "Forestry Official Website") 无头 CMS。它是一个基于 git 的 CMS，可以提供 Markdown 和其他内容。因此，我可以使用 Markdown 或所见即所得编辑器来编写我的内容。此外，用它来写前置数据非常轻松。

图片和资源上传并存储在 [Cloudinary](https://cloudinary.com/ "Cloudinary Official Website") 中。我通过 Forestry 连接 Cloudinary 并直接在仪表板中管理它们。

总之，这些是我用于这个项目的技术栈。

- Front-end: NextJS (TypeScript)
- Styling: TailwindCSS
- Animations: GSAP
- CMS: Forestry Headless CMS
- Deployment: Vercel

## 功能特点

以下是我的作品集和博客的某些功能特点

### SEO 友好

整个项目都是以 SEO 为重点开发的。我使用了适当的 meta 标签、描述和标题对齐。这个网站现在已被 Google 收录。

> 你可以使用"sat naing dev"等关键词在 Google 上搜索这个网站

![searching souloss.cn on google](https://res.cloudinary.com/noezectz/image/upload/v1648231400/SatNaing/satnaing-on-google_asflq6.png "souloss.cn is indexed")

此外，由于正确使用了 meta 标签，分享到社交媒体时这个网站会显示得很好。

![souloss.cn card layout when shared to Facebook](https://res.cloudinary.com/noezectz/image/upload/v1653106955/SatNaing/souloss.cn-share-on-facebook_1_zjoehx.png "Card layout when shared to Facebook")

### 动态站点地图

站点地图在 SEO 中扮演着重要的角色。因此，网站的每个页面都应该包含在 sitemap.xml 中。每当我创建新内容、标签或分类时，我都会在网站中自动生成站点地图。

### 明暗主题

由于近年来深色主题的流行，许多网站现在都开箱即用地支持深色主题。当然，我的网站也支持明暗主题。

### 完全可访问

这个网站是完全可访问的。你可以仅使用键盘在网站中导航。我应用了所有无障碍增强最佳实践，包括为所有图片添加 alt 文本、不跳过标题、使用语义 HTML 标签、正确使用 aria 属性。

### 搜索框、分类和标签

所有博客内容都可以通过搜索框搜索。此外，内容可以按分类和标签筛选。通过这种方式，博客读者可以搜索和阅读他们真正想要的内容。

### 性能和 Lighthouse 分数

得益于正确的开发和最佳实践，这个网站获得了非常好的性能和 Lighthouse 分数。这是这个网站的 Lighthouse 分数。

![souloss.cn Lighthouse score](https://user-images.githubusercontent.com/53733092/159957822-7082e459-11e9-4616-8f1e-49d0881f7cbb.png "souloss.cn Lighthouse score")

### 动画

最初我使用 [Framer Motion](https://www.framer.com/motion/ "Framer Motion") 为这个网站添加动画和微交互。然而，当我尝试使用一些复杂的动画和视差效果时，我发现与 Framer Motion 集成不太方便（可能我不太擅长也不太习惯使用它）。因此，我决定使用 [GSAP](https://greensock.com/ "GSAP Animation Library") 来处理我所有的动画。它是最流行的动画库之一，能够做复杂和高级的动画。你可以在网站的几乎每个页面上看到动画和微交互。

![animations at souloss.cn](https://res.cloudinary.com/noezectz/image/upload/v1653108324/SatNaing/ezgif.com-gif-maker_2_hehtlm.gif "souloss.cn website")

## 结语

总之，这个项目给了我很多关于开发博客网站（SSG）的经验和信心。现在，我已经了解了基于 git 的 CMS 以及它如何与 NextJS 交互。我还学习了 SEO、动态站点地图生成和 Google 收录程序。我将来会做出更好的项目。所以，敬请期待！✌🏻

最后但同样重要的是，我想感谢我的朋友 [Swann Fevian Kyaw](https://www.facebook.com/bon.zai.3910 "Swann Fevian Kyaw's Facebook Account") (@[ToonHa](https://www.facebook.com/ToonHa-102639465752883 "ToonHa Facebook Page"))，他为我的网站英雄区域画了一幅漂亮的插图。

## 项目链接

- Website: [https://souloss.cn/](https://souloss.cn/ "https://souloss.cn/")
- Blog: [https://souloss.cn/blog](https://souloss.cn/blog "https://souloss.cn/blog")
- Repo: [https://github.com/satnaing/my-portfolio](https://github.com/satnaing/my-portfolio "https://github.com/satnaing/my-portfolio")

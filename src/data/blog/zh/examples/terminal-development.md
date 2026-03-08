---
title: 我是如何用 React 开发终端风格作品集网站的
author: Souloss
pubDatetime: 2022-06-09T03:42:51Z
featured: false
draft: false
category: 示例/前端
tags:
  - JavaScript
  - ReactJS
  - ContextAPI
  - Styled-Components
  - TypeScript
description: "示例文章：使用 ReactJS、TypeScript 和 Styled-Components 开发终端风格的网站。包括自动补全、多主题、命令提示等功能。"
timezone: "Asia/Yangon"
---

> 本文最初来自我的[博客文章](https://souloss.cn/blog/posts/how-do-i-develop-my-terminal-portfolio-website-with-react)。我放置这篇文章是为了演示如何使用 astro-minblog 主题撰写博客文章。

使用 ReactJS、TypeScript 和 Styled-Components 开发终端风格的网站。包括自动补全、多主题、命令提示等功能。

![Sat Naing's Terminal Portfolio](https://souloss.cn/_ipx/w_2048,q_75/https%3A%2F%2Fres.cloudinary.com%2Fnoezectz%2Fimage%2Fupload%2Fv1654754125%2FSatNaing%2Fterminal-screenshot_gu3kkc.png?url=https%3A%2F%2Fres.cloudinary.com%2Fnoezectz%2Fimage%2Fupload%2Fv1654754125%2FSatNaing%2Fterminal-screenshot_gu3kkc.png&w=2048&q=75)

## 目录

## 简介

最近，我开发并发布了我作品集和博客。我很高兴收到了一些好的反馈。今天，我想介绍我的新终端风格作品集网站。它是使用 ReactJS、TypeScript 开发的。我从 CodePen 和 YouTube 获得了这个想法。

## 技术栈

这个项目是一个前端项目，没有任何后端代码。UI/UX 部分是在 Figma 中设计的。对于前端用户界面，我选择了 React 而不是原生 JavaScript 和 NextJS。为什么？

- 首先，我想写声明式代码。使用 JavaScript 命令式地管理 HTML DOM 真的很繁琐。
- 其次，因为它是 React！！！它快速且可靠。
- 最后，我不太需要 NextJS 提供的 SEO 功能、路由和图片优化。

当然还有 TypeScript 用于类型检查。

对于样式，我采取了与我通常做的不同的方法。我没有选择纯 CSS、Sass 或 TailwindCSS 这样的实用 CSS 框架，而是选择了 CSS-in-JS 方式（Styled-Components）。虽然我早就知道 Styled-Components，但我从未尝试过。所以，这个项目中 Styled-Components 的编写风格和结构可能不是很有组织或很好。

这个项目不需要非常复杂的状态管理。在这个项目中，我只使用 ContextAPI 来实现多主题和避免 prop 透传。

这是技术栈的快速回顾。

- Frontend: [ReactJS](https://reactjs.org/ "React Website"), [TypeScript](https://www.typescriptlang.org/ "TypeScript Website")
- Styling: [Styled-Components](https://styled-components.com/ "Styled-Components Website")
- UI/UX: [Figma](https://figma.com/ "Figma Website")
- State Management: [ContextAPI](https://reactjs.org/docs/context.html "React ContextAPI")
- Deployment: [Netlify](https://www.netlify.com/ "Netlify Website")

## 功能特点

以下是这个项目的一些功能。

### 多主题

用户可以切换多种主题。在撰写本文时，有 5 种主题，将来可能会添加更多主题。选定的主题保存在本地存储中，这样刷新页面时主题不会改变。

![Setting different theme](https://i.ibb.co/fSTCnWB/terminal-portfolio-multiple-themes.gif)

### 命令行补全

为了尽可能接近实际终端的外观和感觉，我添加了命令行补全功能，只需按"Tab"或"Ctrl + i"即可自动填充部分输入的命令。

![Demonstrating command-line completion](https://i.ibb.co/CQTGGLF/terminal-autocomplete.gif)

### 历史命令

用户可以通过按上下箭头键返回到之前的命令或导航之前输入的命令。

![Going back to previous commands with UP Arrow](https://i.ibb.co/vD1pSRv/terminal-up-down.gif)

### 查看/清除命令历史

可以通过在命令行中输入"history"来查看之前输入的命令。可以通过输入"clear"或按"Ctrl + l"来清除所有命令历史和终端屏幕。

![Clearing the terminal with 'clear' or 'Ctrl + L' command](https://i.ibb.co/SJBy8Rr/terminal-clear.gif)

## 结语

这是一个非常有趣的项目，这个项目的一个特别之处是我必须专注于逻辑而不是用户界面（虽然这算是前端项目）。

## 项目链接

- Website: [https://terminal.souloss.cn/](https://terminal.souloss.cn/ "https://terminal.souloss.cn/")
- Repo: [https://github.com/satnaing/terminal-portfolio](https://github.com/satnaing/terminal-portfolio "https://github.com/satnaing/terminal-portfolio")

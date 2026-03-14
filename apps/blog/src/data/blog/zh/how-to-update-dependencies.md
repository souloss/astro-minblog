---
title: 如何更新 astro-minimax 的依赖
author: Souloss
pubDatetime: 2023-07-20T15:33:05.569Z
featured: false
draft: false
category: 教程/工程化
ogImage: ../../../assets/images/forrest-gump-quote.png
tags:
  - FAQ
description: 如何更新项目依赖和 astro-minimax 模板。
---

更新项目依赖可能是一件繁琐的事情。然而，忽视更新项目依赖也不是一个好主意 😬。在这篇文章中，我将分享我通常如何更新项目，以 astro-minimax 为例。不过，这些步骤同样适用于其他 js/node 项目。

![Forrest Gump Fake Quote](@/assets/images/forrest-gump-quote.png)

## Table of contents

## 更新包依赖

有几种更新依赖的方法，我尝试过各种方法来找到最简单的途径。一种方法是使用 `npm install package-name@latest` 手动更新每个包。这是最直接的更新方式，但可能不是最高效的选择。

我推荐的更新依赖的方式是使用 [npm-check-updates 包](https://www.npmjs.com/package/npm-check-updates)。freeCodeCamp 有一篇关于它的[好文章](https://www.freecodecamp.org/news/how-to-update-npm-dependencies/)，所以我不会详细解释它是什么以及如何使用那个包。相反，我将展示我通常的做法。

首先，全局安装 `npm-check-updates` 包。

```bash
npm install -g npm-check-updates
```

在进行任何更新之前，最好先检查所有可以更新的新依赖。

```bash
ncu
```

大多数情况下，补丁依赖的更新完全不会影响项目。因此，我通常通过运行 `ncu -i --target patch` 或 `ncu -u --target patch` 来更新补丁依赖。区别在于 `ncu -u --target patch` 会更新所有补丁，而 `ncu -i --target patch` 会提供一个选项来切换要更新哪些包。由你决定采用哪种方式。

下一部分涉及更新次版本依赖。次版本包更新通常不会破坏项目，但最好检查各个包的发布说明。这些次版本更新通常包含一些可以应用到我们项目中的新功能。

```bash
ncu -i --target minor
```

最后，依赖中可能还有一些主版本更新。因此，通过运行以下命令检查其余的依赖更新：

```bash
ncu -i
```

如果有任何主版本更新（或还有一些你必须进行的更新），上述命令将输出那些剩余的包。如果是主版本更新，你必须非常小心，因为这很可能会破坏整个项目。因此，请仔细阅读相应的发布说明（或）文档，并相应地进行更改。

如果你运行 `ncu -i` 后发现没有更多包需要更新，_**恭喜！！！**_ 你已经成功更新了项目中的所有依赖。

## 更新 astro-minimax 模板

与其他开源项目一样，astro-minimax 也在不断演进，修复错误、更新功能等。因此，如果你正在使用 astro-minimax 作为模板，你可能也想在有新版本发布时更新模板。

问题是，你可能已经根据自己的喜好更新了模板。因此，我无法确切地展示**"一刀切的完美方法"**来将模板更新到最新版本。但是，这里有一些在不破坏你的仓库的情况下更新模板的技巧。请记住，大多数情况下，更新包依赖可能就足够了。

### 需要留意的文件和目录

在大多数情况下，你可能不想覆盖的文件和目录（因为你可能已经更新了这些文件）是 `src/content/blog/`、`src/config.ts`、`src/pages/about.md`，以及其他资源和样式文件，如 `public/` 和 `src/styles/base.css`。

如果你只是对模板做了最少的修改，除了上述文件和目录外，用最新的 astro-minimax 替换所有内容应该没问题。这就像纯 Android OS 和其他厂商特定的操作系统（如 OneUI）一样。你对基础修改得越少，需要更新的就越少。

你可以手动逐个替换每个文件，也可以使用 git 的魔法来更新所有内容。我不会展示手动替换过程，因为它非常直接。如果你对那种直接但低效的方法不感兴趣，请继续往下看 🐻。

### 使用 Git 更新 astro-minimax

**重要！！！**

> 只有在你知道如何解决合并冲突时才执行以下操作。否则，你最好手动替换文件或仅更新依赖。

首先，在你的项目中将 astro-minimax 添加为远程仓库。

```bash
git remote add astro-minimax https://github.com/souloss/astro-minimax.git
```

切换到一个新分支以便更新模板。如果你知道自己在做什么并且对自己的 git 技能有信心，可以省略这一步。

```bash
git checkout -b build/update-astro-minimax
```

然后，通过运行以下命令从 astro-minimax 拉取更改：

```bash
git pull astro-minimax main
```

如果你遇到 `fatal: refusing to merge unrelated histories` 错误，可以通过运行以下命令解决：

```bash
git pull astro-minimax main --allow-unrelated-histories
```

运行上述命令后，你的项目很可能会遇到冲突。你需要手动解决这些冲突，并根据需要进行必要的调整。

解决冲突后，彻底测试你的博客以确保一切按预期工作。检查你的文章、组件和你做的任何自定义。

一旦你对结果满意，就可以将更新分支合并到你的主分支（仅当你在另一个分支中更新模板时）。恭喜！你已成功将模板更新到最新版本。你的博客现在是最新的，准备好闪耀了！🎉

## 结语

在这篇文章中，我分享了一些关于更新依赖和 astro-minimax 模板的见解和流程。我真心希望这篇文章有价值，能帮助你更高效地管理项目。

如果你有其他或更好的更新依赖/astro-minimax 的方法，我很想听听。因此，不要犹豫，在仓库中发起讨论、给我发邮件或提交 issue。你的意见和建议非常感谢！

请理解我最近日程很忙，可能无法快速回复。但是，我承诺会尽快回复你。😬

感谢你花时间阅读这篇文章，祝你的项目一切顺利！

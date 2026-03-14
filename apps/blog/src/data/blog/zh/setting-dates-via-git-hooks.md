---
author: Souloss
pubDatetime: 2024-01-03T20:40:08Z
modDatetime: 2024-01-08T18:59:05Z
title: 如何使用 Git 钩子设置创建和修改日期
featured: false
draft: false
category: 教程/工程化
tags:
  - docs
  - FAQ
canonicalURL: https://smale.codes/posts/setting-dates-via-git-hooks/
description: 如何使用 Git 钩子在 astro-minimax 中自动设置创建和修改日期
---

在这篇文章中，我将解释如何使用 pre-commit Git 钩子来自动填充 astro-minimax 博客主题 frontmatter 中的创建日期（`pubDatetime`）和修改日期（`modDatetime`）。

## Table of contents

## 到处都有它们

[Git 钩子](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks)非常适合自动化任务，比如[添加](https://gist.github.com/SSmale/3b380e5bbed3233159fb7031451726ea)或[检查](https://itnext.io/using-git-hooks-to-enforce-branch-naming-policy-ffd81fa01e5e)分支名称到提交消息，或者[阻止你提交明文密码](https://gist.github.com/SSmale/367deee757a9b2e119d241e120249000)。它们最大的缺点是客户端钩子是每台机器单独配置的。

你可以通过创建一个 `hooks` 目录并手动将它们复制到 `.git/hooks` 目录或设置符号链接来解决这个问题，但这都需要你记得去设置，而这不是我擅长做的事情。

由于这个项目使用 npm，我们可以利用一个名为 [Husky](https://typicode.github.io/husky/) 的包（astro-minimax 中已经安装）来自动为我们安装钩子。

> 更新！在 astro-minimax [v4.3.0](https://github.com/souloss/astro-minimax/releases/tag/v4.3.0) 中，pre-commit 钩子已被移除，改用 GitHub Actions。但是，你可以轻松地[自己安装 Husky](https://typicode.github.io/husky/get-started.html)。

## 钩子

由于我们希望在提交代码时运行此钩子来更新日期，然后将其作为我们更改的一部分，我们将使用 `pre-commit` 钩子。这个 astro-minimax 项目已经设置好了，但如果没有，你需要运行 `npx husky add .husky/pre-commit 'echo "This is our new pre-commit hook"'`。

导航到 `hooks/pre-commit` 文件，我们将添加以下一个或两个代码片段。

### 编辑文件时更新修改日期

---

更新：

本节已更新为新版本的钩子，它更智能。现在它不会增加 `modDatetime` 直到文章发布。首次发布时，将 draft 状态设置为 `first`，然后看奇迹发生。

---

```shell
# Modified files, update the modDatetime
git diff --cached --name-status |
grep -i '^M.*\.md$' |
while read _ file; do
  filecontent=$(cat "$file")
  frontmatter=$(echo "$filecontent" | awk -v RS='---' 'NR==2{print}')
  draft=$(echo "$frontmatter" | awk '/^draft: /{print $2}')
  if [ "$draft" = "false" ]; then
    echo "$file modDateTime updated"
    cat $file | sed "/---.*/,/---.*/s/^modDatetime:.*$/modDatetime: $(date -u "+%Y-%m-%dT%H:%M:%SZ")/" > tmp
    mv tmp $file
    git add $file
  fi
  if [ "$draft" = "first" ]; then
    echo "First release of $file, draft set to false and modDateTime removed"
    cat $file | sed "/---.*/,/---.*/s/^modDatetime:.*$/modDatetime:/" | sed "/---.*/,/---.*/s/^draft:.*$/draft: false/" > tmp
    mv tmp $file
    git add $file
  fi
done
```

`git diff --cached --name-status` 从 git 获取已暂存待提交的文件。输出如下：

```shell
A       src/content/blog/setting-dates-via-git-hooks.md
```

开头的字母表示已采取的操作，在上面的示例中文件已被添加。修改的文件有 `M`。

我们将该输出通过管道传递给 grep 命令，查找每行中已修改的文件。该行需要以 `M` 开头（`^(M)`），后面可以有任意数量的字符（`.*`），并以 `.md` 文件扩展名结尾（`.(md)$`）。这将过滤掉不是已修改 markdown 文件的行 `egrep -i "^(M).*\.(md)$"`。

---

#### 改进 - 更明确

这可以添加为仅查找 `blog` 目录中的 markdown 文件，因为只有这些文件才有正确的 frontmatter。

---

正则表达式将捕获两个部分，字母和文件路径。我们将把此列表通过管道传递给 while 循环来遍历匹配的行，并将字母分配给 `a`，路径分配给 `b`。我们暂时忽略 `a`。

要知道文件的草稿状态，我们需要它的 frontmatter。在以下代码中，我们使用 `cat` 获取文件内容，然后使用 `awk` 以 frontmatter 分隔符（`---`）分割文件并取第二个块（frontmatter，即 `---` 之间的部分）。从这里我们再次使用 `awk` 查找 draft 键并打印其值。

```shell
  filecontent=$(cat "$file")
  frontmatter=$(echo "$filecontent" | awk -v RS='---' 'NR==2{print}')
  draft=$(echo "$frontmatter" | awk '/^draft: /{print $2}')
```

现在我们有了 `draft` 的值，我们将做以下 3 件事之一：将 modDatetime 设置为现在（当 draft 为 false 时 `if [ "$draft" = "false" ]; then`），清除 modDatetime 并将 draft 设置为 false（当 draft 设置为 first 时 `if [ "$draft" = "first" ]; then`），或者什么也不做（在任何其他情况下）。

接下来带有 sed 命令的部分对我来说有点神奇，因为我不经常使用它，它是从[另一篇关于类似操作的博客文章](https://mademistakes.com/notes/adding-last-modified-timestamps-with-git/)中复制的。本质上，它在文件的 frontmatter 标签（`---`）内查找 `pubDatetime:` 键，获取整行并用 `pubDatetime: $(date -u "+%Y-%m-%dT%H:%M:%SZ")/"` 替换它，即相同的键和格式正确的当前日期时间。

这个替换是在整个文件的上下文中进行的，所以我们将其放入临时文件（`> tmp`），然后将新文件移动到旧文件的位置，覆盖它。然后将其添加到 git 中，准备像我们自己做了更改一样提交。

---

#### 注意

要使 `sed` 工作，frontmatter 需要已经有 `modDatetime` 键。要让应用以空日期构建，你还需要进行一些其他更改，请参阅[下面](#空-moddatetime-更改)

---

### 为新文件添加日期

为新文件添加日期与上述过程相同，但这次我们要查找已添加（`A`）的行，并且我们将替换 `pubDatetime` 值。

```shell
# New files, add/update the pubDatetime
git diff --cached --name-status | egrep -i "^(A).*\.(md)$" | while read a b; do
  cat $b | sed "/---.*/,/---.*/s/^pubDatetime:.*$/pubDatetime: $(date -u "+%Y-%m-%dT%H:%M:%SZ")/" > tmp
  mv tmp $b
  git add $b
done
```

---

#### 改进 - 只循环一次

我们可以使用 `a` 变量在循环内切换，要么更新 `modDatetime` 要么添加 `pubDatetime`，在一个循环中完成。

---

## 填充 frontmatter

如果你的 IDE 支持代码片段，则可以选择创建自定义代码片段来填充 frontmatter。[astro-minimax v4 将默认为 VSCode 提供一个代码片段。](https://github.com/souloss/astro-minimax/pull/206)

<video autoplay muted="muted" controls plays-inline="true" class="border border-skin-line">
  <source src="https://github.com/souloss/astro-minimax/assets/17761689/e13babbc-2d78-405d-8758-ca31915e41b0" type="video/mp4">
</video>

## 空 `modDatetime` 更改

要让 Astro 编译 markdown 并执行其操作，它需要知道 frontmatter 中期望什么。它通过 `src/content/config.ts` 中的配置来完成此操作。

要允许键存在但没有值，我们需要编辑第 10 行以添加 `.nullable()` 函数。

```ts
const blog = defineCollection({
  type: "content",
  schema: ({ image }) =>
    z.object({
      author: z.string().default(SITE.author),
      pubDatetime: z.date(),
      modDatetime: z.date().optional(), // [!code --]
      modDatetime: z.date().optional().nullable(), // [!code ++]
      title: z.string(),
      featured: z.boolean().optional(),
      draft: z.boolean().optional(),
      tags: z.array(z.string()).default(["others"]),
      ogImage: image().or(z.string()).optional(),
      description: z.string(),
      canonicalURL: z.string().optional(),
      readingTime: z.string().optional(),
    }),
});
```

为了阻止 IDE 在博客引擎文件中抱怨，我还做了以下操作：

1. 在 `src/layouts/Layout.astro` 的第 15 行添加 `| null`，使其看起来像：

   ```typescript
   export interface Props {
     title?: string;
     author?: string;
     description?: string;
     ogImage?: string;
     canonicalURL?: string;
     pubDatetime?: Date;
     modDatetime?: Date | null;
   }
   ```

2. 在 `src/components/ui/Datetime.astro` 的第 5 行添加 `| null`，使其看起来像：

   ```typescript
   interface DatetimesProps {
     pubDatetime: string | Date;
     modDatetime: string | Date | undefined | null;
   }
   ```

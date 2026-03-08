---
title: Tailwind 排版插件
author: Souloss
pubDatetime: 2022-07-05T02:05:51Z
featured: false
draft: false
category: 示例/前端
tags:
  - TypeScript
  - Astro
description: "示例文章：关于 Tailwind 排版插件以及如何有效使用它。"
---

> 本文来自 [TailwindLabs](https://tailwindcss-typography.vercel.app/)。我放置这篇文章是为了演示如何使用 astro-minblog 主题撰写博客文章。

默认情况下，Tailwind 会移除浏览器对段落、标题、列表等元素的默认样式。这对于构建应用 UI 来说非常有用，因为你不需要花时间去重置用户代理的样式。但当你真的只是想为 CMS 中的富文本编辑器或 Markdown 文件中的内容添加样式时，这可能会让人感到意外和不直观。

我们确实收到了很多关于这方面的反馈，人们经常会问：

> 为什么 Tailwind 会移除我的 `h1` 元素的默认样式？如何禁用这个功能？你说我也会失去其他所有基础样式是什么意思？
> 我们听到了你的声音，但我们不认为简单地禁用我们的基础样式就是你真正想要的。你不会希望每次在仪表板 UI 中使用 `p` 元素时都要移除那些烦人的外边距。而且我怀疑你也不希望你的博客文章使用用户代理的样式——你希望它们看起来很棒，而不是很糟糕。

`@tailwindcss/typography` 插件是我们尝试给你真正想要的东西，而不会有像禁用基础样式那样愚蠢的副作用。

它添加了一个新的 `prose` 类，你可以把它应用在任何一块原始 HTML 内容上，将其变成一个美观、格式良好的文档：

```html
<article class="prose">
  <h1>Garlic bread with cheese: What the science tells us</h1>
  <p>
    For years parents have espoused the health benefits of eating garlic bread
    with cheese to their children, with the food earning such an iconic status
    in our culture that kids will often dress up as warm, cheesy loaf for
    Halloween.
  </p>
  <p>
    But a recent study shows that the celebrated appetizer may be linked to a
    series of rabies cases springing up around the country.
  </p>
  <!-- ... -->
</article>
```

有关如何使用该插件及其功能的更多信息，请[阅读文档](https://github.com/tailwindcss/typography/blob/master/README.md)。

---

## 接下来的内容

接下来的是我写的一堆废话，用来测试这个插件本身。它包含了我能想到的所有合理的排版元素，比如**粗体文本**、无序列表、有序列表、代码块、引用块，甚至还有*斜体*。

涵盖所有这些用例很重要，原因有几点：

1. 我们希望一切开箱即用就能看起来不错。
2. 其实就是第一个原因，这也是这个插件的全部意义。
3. 这里是第三个假装的理由，虽然三项的列表看起来比两项的列表更真实。

现在让我们试试另一种标题样式。

### 排版应该很简单

所以这就是一个标题给你——如果我们工作做得正确的话，它应该看起来很合理。

一位智者曾经告诉过我关于排版的事情：

> 排版非常重要，如果你不想让你的东西看起来像垃圾的话。把它做好，它就不会糟糕。
> 默认情况下图片在这里看起来也应该没问题：

<figure>
  <img
    src="https://images.unsplash.com/photo-1556740758-90de374c12ad?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1000&q=80"
    alt=""
  />
  <figcaption>
    Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of
    classical Latin literature from 45 BC, making it over 2000 years old.
  </figcaption>
</figure>

现在我要展示一个无序列表的例子，确保它看起来也不错：

- 这是这个列表中的第一项。
- 在这个例子中，我们保持项目简短。
- 稍后，我们会使用更长、更复杂的列表项。

这一节到此结束。

## 如果我们堆叠标题会怎样？

### 我们应该确保那看起来也不错。

有时你会遇到标题直接相邻的情况。在这种情况下，你通常需要取消第二个标题的上边距，因为标题之间的距离比段落后面的标题距离更近通常会更好看。

### 当标题跟在段落后……

当标题跟在段落后，我们需要更多的空间，就像我上面已经提到的。现在让我们看看更复杂的列表会是什么样子。

- **我经常这样做，让列表项有标题。**

  出于某种原因，我认为这看起来很酷，但不幸的是，让样式正确是很烦人的。

  这些列表项中我也经常有两三个段落，所以困难的部分是让段落之间、列表项标题和单独的列表项之间的间距都有意义。说实话挺难的，你可以有力地争辩说就不应该这样写。

- **既然是列表，我至少需要两项。**

  我已经在之前的列表项中解释了我在做什么，但列表只有一项就不叫列表了，而且我们真的希望这看起来逼真。这就是为什么我添加了这第二个列表项，这样我在写样式时就有东西可以看了。

- **添加第三项也不是坏主意。**

  我认为只使用两项可能就可以了，但三项绝对不会更差，而且既然我似乎毫不费力就能编出任意的东西来打字，我不妨把它包括进去。

在这种列表之后，我通常会有一个结束语或段落，因为直接跳到标题看起来有点奇怪。

## 代码默认应该看起来不错。

我认为大多数人如果想美化代码块的话，会使用 [highlight.js](https://highlightjs.org/) 或 [Prism](https://prismjs.com/) 或类似的东西，但即使没有语法高亮，让它们开箱即用看起来还不错也不会有什么坏处。

这是在撰写本文时默认的 `tailwind.config.js` 文件的样子：

```js
module.exports = {
  purge: [],
  theme: {
    extend: {},
  },
  variants: {},
  plugins: [],
};
```

希望这对你来说看起来足够好了。

### 嵌套列表呢？

嵌套列表几乎总是看起来很糟糕，这就是为什么像 Medium 这样的编辑器甚至不让你这样做，但我想既然你们中的一些傻瓜会这样做，我们就得承担至少让它正常工作的负担。

1. **嵌套列表很少是个好主意。**
   - 你可能会觉得自己很"有条理"，但你只是在屏幕上制造了一个难以阅读的糟糕形状。
   - UI 中的嵌套导航也是个坏主意，保持尽可能扁平。
   - 在源代码中嵌套大量文件夹也没什么帮助。
2. **既然我们需要更多项目，这里有另一个。**
   - 我不确定我们是否会费心去美化超过两层深度的样式。
   - 两层已经太多了，三层肯定是个坏主意。
   - 如果你嵌套四层，你应该进监狱。
3. **两项不算真正的列表，三项就不错了。**
   - 再次请别嵌套列表，如果你希望人们真正阅读你的内容的话。
   - 没人想看这个。
   - 我很沮丧我们甚至还要费心去美化这个。

Markdown 中列表最烦人的事情是，除非列表项中有多个段落，否则 `<li>` 元素不会获得子 `<p>` 标签。这意味着我还得担心美化那种烦人的情况。

- **例如，这里有另一个嵌套列表。**

  但这次有第二个段落。
  - 这些列表项不会有 `<p>` 标签
  - 因为它们每项只有一行

- **但在这个第二级列表项中，它们会有。**

  这特别烦人，因为这个段落上的间距。
  - 如你所见，因为我添加了第二行，这个列表项现在有了 `<p>` 标签。

    这是我正在说的第二行。

  - 最后是另一个列表项，这样更像一个列表。

- 一个结束的列表项，但没有嵌套列表，为什么不呢？

最后用一句话结束这一节。

## 还有其他我们需要美化样式的元素

我差点忘了提到链接，比如[这个链接到 Tailwind CSS 网站](https://tailwindcss.com)。我们差点让它们变成蓝色，但那太老土了，所以我们选了深灰色，感觉更前卫。

我们甚至还包括了表格样式，看看：

| Wrestler                | Origin       | Finisher           |
| ----------------------- | ------------ | ------------------ |
| Bret "The Hitman" Hart  | Calgary, AB  | Sharpshooter       |
| Stone Cold Steve Austin | Austin, TX   | Stone Cold Stunner |
| Randy Savage            | Sarasota, FL | Elbow Drop         |
| Vader                   | Boulder, CO  | Vader Bomb         |
| Razor Ramon             | Chuluota, FL | Razor's Edge       |

我们还需要确保行内代码看起来不错，比如如果我想谈论 `<span>` 元素或告诉你关于 `@tailwindcss/typography` 的好消息。

### 有时我甚至在标题中使用 `code`

虽然这可能是个坏主意，而且历史上我一直很难让它看起来好看。这个"用反引号包裹代码块"的技巧效果还不错。

我过去做的另一件事是在链接中放一个 `code` 标签，比如如果我想告诉你关于 [`tailwindcss/docs`](https://github.com/tailwindcss/docs) 仓库。我不喜欢反引号下面有下划线，但要避免它所需的疯狂努力绝对不值得。

#### 我们还没用过 `h4`

但现在我们用了。请不要在你的内容中使用 `h5` 或 `h6`，Medium 只支持两个标题级别是有原因的，你们这些动物。我真心考虑使用 `before` 伪元素来对你尖叫，如果你使用 `h5` 或 `h6` 的话。

我们根本不美化它们，因为 `h4` 元素已经很小了，和正文一样大。我们该拿 `h5` 怎么办？让它比正文还小吗？不了谢谢。

### 我们仍然需要考虑堆叠标题。

#### 让我们确保我们也不会搞砸 `h4` 元素。

呼，如果我们把这段文字上面的标题样式好了，它们应该看起来很不错。

让我们在这里添加一个结束段落，这样事情就以一个相当大的文本块结束了。我没法解释为什么我希望事情以这种方式结束，但我只能假设这是因为我认为如果标题离文档末尾太近，会看起来奇怪或不平衡。

我这里写的可能已经够长了，但添加这最后一句话不会有坏处。

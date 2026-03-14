---
title: "Markdown 扩展：高级语法功能"
pubDatetime: 2026-03-12T00:00:00.000Z
author: Souloss
description: "探索 Markdown 高级功能，包括数学公式、KaTeX、语法高亮代码块、GitHub 告警、缩略语、定义列表和键盘快捷键。"
tags:
  - tutorial
  - examples
  - markdown
category: Examples
draft: false
---

在基础语法之外，Markdown 还支持丰富的扩展功能。本文展示数学排版、高级代码高亮、GitHub 风格告警等特性。

---

## 目录

- [数学公式](#数学公式)
- [KaTeX 示例](#katex-示例)
- [带语法高亮的代码块](#带语法高亮的代码块)
- [代码块高级功能](#代码块高级功能)
- [GitHub 告警](#github-告警)
- [缩略语](#缩略语)
- [定义列表](#定义列表)
- [键盘快捷键](#键盘快捷键)

---

## 数学公式

### 行内公式

使用单美元符号输入行内公式。例如，爱因斯坦的著名方程 $E = mc^2$ 改变了物理学。求根公式 $x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$ 可以求解任何一元二次方程。欧拉恒等式 $e^{i\pi} + 1 = 0$ 常被称为数学中最优美的公式。

### 块级公式

使用双美元符号输入块级（展示模式）公式：

高斯积分：

$$
\int_{-\infty}^{\infty} e^{-x^2} \, dx = \sqrt{\pi}
$$

麦克斯韦方程组（微分形式）：

$$
\begin{aligned}
\nabla \cdot \mathbf{E} &= \frac{\rho}{\varepsilon_0} \\
\nabla \cdot \mathbf{B} &= 0 \\
\nabla \times \mathbf{E} &= -\frac{\partial \mathbf{B}}{\partial t} \\
\nabla \times \mathbf{B} &= \mu_0 \mathbf{J} + \mu_0 \varepsilon_0 \frac{\partial \mathbf{E}}{\partial t}
\end{aligned}
$$

薛定谔方程：

$$
i\hbar \frac{\partial}{\partial t} \Psi(\mathbf{r}, t) = \hat{H} \Psi(\mathbf{r}, t)
$$

---

## KaTeX 示例

### 矩阵

3×3 单位矩阵：

$$
I_3 = \begin{pmatrix}
1 & 0 & 0 \\
0 & 1 & 0 \\
0 & 0 & 1
\end{pmatrix}
$$

矩阵乘法：

$$
\begin{bmatrix}
a & b \\
c & d
\end{bmatrix}
\begin{bmatrix}
e & f \\
g & h
\end{bmatrix}
=
\begin{bmatrix}
ae + bg & af + bh \\
ce + dg & cf + dh
\end{bmatrix}
$$

### 积分

定积分：

$$
\int_0^1 x^2 \, dx = \frac{1}{3}
$$

二重积分：

$$
\iint_D f(x, y) \, dA = \int_a^b \int_{g_1(x)}^{g_2(x)} f(x, y) \, dy \, dx
$$

环路积分（斯托克斯定理）：

$$
\oint_C \mathbf{F} \cdot d\mathbf{r} = \iint_S (\nabla \times \mathbf{F}) \cdot d\mathbf{S}
$$

### 求和

有限求和：

$$
\sum_{k=1}^{n} k = \frac{n(n+1)}{2}
$$

无穷级数（巴塞尔问题）：

$$
\sum_{n=1}^{\infty} \frac{1}{n^2} = \frac{\pi^2}{6}
$$

$e^x$ 的泰勒展开：

$$
e^x = \sum_{n=0}^{\infty} \frac{x^n}{n!} = 1 + x + \frac{x^2}{2!} + \frac{x^3}{3!} + \cdots
$$

### 分数与二项式

连分数：

$$
\phi = 1 + \cfrac{1}{1 + \cfrac{1}{1 + \cfrac{1}{1 + \cdots}}}
$$

二项式系数：

$$
\binom{n}{k} = \frac{n!}{k!(n-k)!}
$$

二项式定理：

$$
(x + y)^n = \sum_{k=0}^{n} \binom{n}{k} x^{n-k} y^k
$$

### 极限与连乘

$e$ 的极限定义：

$$
e = \lim_{n \to \infty} \left(1 + \frac{1}{n}\right)^n
$$

沃利斯乘积：

$$
\frac{\pi}{2} = \prod_{n=1}^{\infty} \frac{4n^2}{4n^2 - 1}
$$

---

## 带语法高亮的代码块

### JavaScript / TypeScript

```javascript
async function fetchPosts(tag) {
  const response = await fetch(`/api/posts?tag=${encodeURIComponent(tag)}`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const posts = await response.json();
  return posts.filter(post => !post.draft).sort((a, b) =>
    new Date(b.pubDatetime) - new Date(a.pubDatetime)
  );
}
```

```typescript
interface BlogPost {
  title: string;
  slug: string;
  pubDatetime: Date;
  modDatetime?: Date;
  author: string;
  description: string;
  tags: string[];
  category: string;
  draft: boolean;
  featured?: boolean;
}

function getPostsByTag(posts: BlogPost[], tag: string): BlogPost[] {
  return posts
    .filter(post => post.tags.includes(tag) && !post.draft)
    .sort((a, b) => b.pubDatetime.getTime() - a.pubDatetime.getTime());
}
```

### Python

```python
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

@dataclass
class BlogPost:
    title: str
    slug: str
    pub_datetime: datetime
    author: str
    description: str
    tags: list[str]
    category: str
    draft: bool = False
    featured: bool = False
    mod_datetime: Optional[datetime] = None

    @property
    def reading_time(self) -> int:
        word_count = len(self.content.split())
        return max(1, word_count // 200)

    def matches_tag(self, tag: str) -> bool:
        return tag.lower() in [t.lower() for t in self.tags]
```

### Rust

```rust
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

#[derive(Debug, Serialize, Deserialize)]
struct BlogPost {
    title: String,
    slug: String,
    pub_datetime: DateTime<Utc>,
    author: String,
    description: String,
    tags: Vec<String>,
    category: String,
    #[serde(default)]
    draft: bool,
}

impl BlogPost {
    fn reading_time(&self, content: &str) -> usize {
        let word_count = content.split_whitespace().count();
        std::cmp::max(1, word_count / 200)
    }

    fn has_tag(&self, tag: &str) -> bool {
        self.tags.iter().any(|t| t.eq_ignore_ascii_case(tag))
    }
}
```

### CSS

```css
.prose {
  --tw-prose-body: theme('colors.gray.700');
  --tw-prose-headings: theme('colors.gray.900');
  --tw-prose-links: theme('colors.blue.600');

  max-width: 65ch;
  font-size: 1.125rem;
  line-height: 1.75;
}

@media (prefers-color-scheme: dark) {
  .prose {
    --tw-prose-body: theme('colors.gray.300');
    --tw-prose-headings: theme('colors.gray.100');
    --tw-prose-links: theme('colors.blue.400');
  }
}

.prose code::before,
.prose code::after {
  content: none;
}

.prose pre {
  border-radius: 0.5rem;
  padding: 1.25rem;
  overflow-x: auto;
  tab-size: 2;
}
```

---

## 代码块高级功能

### 行高亮

高亮特定行以突出重点（使用 `{1,3-5}` 语法——具体支持取决于你的 Markdown 处理器）：

```javascript {1,4-6}
const config = {
  site: 'https://example.com',
  base: '/',
  integrations: [
    tailwind(),
    sitemap(),
  ],
};
```

### Diff 差异标记

使用 diff 语法展示代码变更：

```diff
- const greeting = "Hello, World!";
+ const greeting = "Hello, Astro!";

  function main() {
-   console.log(greeting);
+   console.log(`${greeting} 🚀`);
+   console.log("Welcome to the blog!");
  }
```

### Shell / 终端命令

```bash
# 创建新的 Astro 项目
npm create astro@latest my-blog

# 进入项目目录
cd my-blog

# 安装依赖
pnpm install

# 启动开发服务器
pnpm run dev

# 构建生产版本
pnpm run build
```

### JSON 配置

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "react-jsx",
    "jsxImportSource": "astro",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"]
    }
  }
}
```

---

## GitHub 告警

GitHub 风格的告警提供了视觉上醒目的提示框，用于不同类型的信息：

> [!NOTE]
> 这是一个注释告警。用于展示读者在浏览内容时也应注意到的有用信息。

> [!TIP]
> 这是一个提示告警。用于帮助用户取得更好效果的可选建议。

> [!IMPORTANT]
> 这是一个重要告警。用于展示用户成功所需的关键信息。

> [!WARNING]
> 这是一个警告告警。用于需要用户立即关注以避免问题的紧急信息。

> [!CAUTION]
> 这是一个危险告警。用于提醒某些操作的风险或负面后果。

### 包含丰富内容的告警

> [!TIP]
> **性能提示：** 构建 Astro 站点时，使用 `--remote` 标志来获取远程内容：
>
> ```bash
> pnpm run build --remote
> ```
>
> 对于大型站点，这可以减少高达 60% 的构建时间。

> [!WARNING]
> **v5.0 破坏性变更：** `content` 目录已重命名为 `data`。请更新你的导入：
>
> ```diff
> - import { getCollection } from 'astro:content';
> + import { getCollection } from 'astro:content';  // 相同 API，新的 data/ 目录
> ```
>
> 运行 `npx astro migrate` 自动更新你的项目。

---

## 缩略语

HTML 规范由 W3C 维护。

*[HTML]: 超文本标记语言（HyperText Markup Language）
*[W3C]: 万维网联盟（World Wide Web Consortium）

Web 开发中其他常见缩略语：

- CSS 用于网页样式设计
- JS 是 Web 的脚本语言
- API 端点负责服务器通信
- SSR 在服务器端渲染页面
- SSG 在构建时生成静态页面

*[CSS]: 层叠样式表（Cascading Style Sheets）
*[JS]: JavaScript
*[API]: 应用程序编程接口（Application Programming Interface）
*[SSR]: 服务端渲染（Server-Side Rendering）
*[SSG]: 静态站点生成（Static Site Generation）

---

## 定义列表

<dl>
  <dt>Astro</dt>
  <dd>一个现代静态站点生成器，让你用更少的客户端 JavaScript 构建更快的网站。它支持多种 UI 框架，采用岛屿架构。</dd>

  <dt>Tailwind CSS</dt>
  <dd>一个实用优先的 CSS 框架，提供低级别的工具类来构建自定义设计，无需编写自定义 CSS。</dd>

  <dt>MDX</dt>
  <dd>一种创作格式，允许在 Markdown 文档中使用 JSX 组件，将 Markdown 的简洁性与基于组件的 UI 的强大功能相结合。</dd>

  <dt>TypeScript</dt>
  <dd>JavaScript 的类型化超集，编译为纯 JavaScript。它添加了可选的静态类型和基于类的面向对象编程。</dd>
</dl>

---

## 键盘快捷键

使用 `<kbd>` 元素展示键盘快捷键：

### 常用编辑器快捷键

| 操作 | Windows / Linux | macOS |
|------|----------------|-------|
| 保存 | <kbd>Ctrl</kbd> + <kbd>S</kbd> | <kbd>⌘</kbd> + <kbd>S</kbd> |
| 撤销 | <kbd>Ctrl</kbd> + <kbd>Z</kbd> | <kbd>⌘</kbd> + <kbd>Z</kbd> |
| 重做 | <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd> | <kbd>⌘</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd> |
| 查找 | <kbd>Ctrl</kbd> + <kbd>F</kbd> | <kbd>⌘</kbd> + <kbd>F</kbd> |
| 替换 | <kbd>Ctrl</kbd> + <kbd>H</kbd> | <kbd>⌘</kbd> + <kbd>H</kbd> |
| 注释 | <kbd>Ctrl</kbd> + <kbd>/</kbd> | <kbd>⌘</kbd> + <kbd>/</kbd> |
| 格式化 | <kbd>Shift</kbd> + <kbd>Alt</kbd> + <kbd>F</kbd> | <kbd>Shift</kbd> + <kbd>⌥</kbd> + <kbd>F</kbd> |

### VS Code 进阶快捷键

| 操作 | 快捷键 |
|------|--------|
| 命令面板 | <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd> |
| 快速打开 | <kbd>Ctrl</kbd> + <kbd>P</kbd> |
| 切换终端 | <kbd>Ctrl</kbd> + <kbd>`</kbd> |
| 转到定义 | <kbd>F12</kbd> |
| 查看定义 | <kbd>Alt</kbd> + <kbd>F12</kbd> |
| 多光标 | <kbd>Ctrl</kbd> + <kbd>D</kbd> |
| 移动行 | <kbd>Alt</kbd> + <kbd>↑</kbd> / <kbd>↓</kbd> |

### 终端快捷键

像高手一样使用终端：

- <kbd>Ctrl</kbd> + <kbd>C</kbd> — 取消当前命令
- <kbd>Ctrl</kbd> + <kbd>L</kbd> — 清屏
- <kbd>Ctrl</kbd> + <kbd>R</kbd> — 反向搜索命令历史
- <kbd>Ctrl</kbd> + <kbd>A</kbd> — 光标移至行首
- <kbd>Ctrl</kbd> + <kbd>E</kbd> — 光标移至行尾
- <kbd>Tab</kbd> — 自动补全文件名和命令

---

## 总结

这些扩展 Markdown 功能为你的写作增添了强大的表现力。数学公式带来技术精确性，语法高亮的代码块提升可读性，GitHub 告警创建清晰的视觉层次。将这些与[基础 Markdown 语法](/zh/blog/_examples/markdown-basics)结合使用，即可创建精致、专业的技术内容。

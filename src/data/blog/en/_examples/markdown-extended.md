---
title: "Markdown Extended: Advanced Syntax Features"
pubDatetime: 2026-03-12T00:00:00.000Z
author: Souloss
description: "Explore advanced Markdown features including math formulas, KaTeX, syntax-highlighted code blocks, GitHub Alerts, abbreviations, definition lists, and keyboard shortcuts."
tags:
  - tutorial
  - examples
  - markdown
category: Examples
draft: false
---

Beyond the basics, Markdown supports a rich set of extended features. This article demonstrates math typesetting, code blocks with advanced highlighting, GitHub-style alerts, and more.

---

## Table of Contents

- [Math Formulas](#math-formulas)
- [KaTeX Examples](#katex-examples)
- [Code Blocks with Syntax Highlighting](#code-blocks-with-syntax-highlighting)
- [Code Block Advanced Features](#code-block-advanced-features)
- [GitHub Alerts](#github-alerts)
- [Abbreviations](#abbreviations)
- [Definition Lists](#definition-lists)
- [Keyboard Shortcuts](#keyboard-shortcuts)

---

## Math Formulas

### Inline Math

Use single dollar signs for inline math. For example, Einstein's famous equation $E = mc^2$ changed physics forever. The quadratic formula $x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$ solves any quadratic equation. Euler's identity $e^{i\pi} + 1 = 0$ is often called the most beautiful equation in mathematics.

### Block Math

Use double dollar signs for display-mode math:

The Gaussian integral:

$$
\int_{-\infty}^{\infty} e^{-x^2} \, dx = \sqrt{\pi}
$$

Maxwell's equations in differential form:

$$
\begin{aligned}
\nabla \cdot \mathbf{E} &= \frac{\rho}{\varepsilon_0} \\
\nabla \cdot \mathbf{B} &= 0 \\
\nabla \times \mathbf{E} &= -\frac{\partial \mathbf{B}}{\partial t} \\
\nabla \times \mathbf{B} &= \mu_0 \mathbf{J} + \mu_0 \varepsilon_0 \frac{\partial \mathbf{E}}{\partial t}
\end{aligned}
$$

The Schrödinger equation:

$$
i\hbar \frac{\partial}{\partial t} \Psi(\mathbf{r}, t) = \hat{H} \Psi(\mathbf{r}, t)
$$

---

## KaTeX Examples

### Matrices

A 3×3 identity matrix:

$$
I_3 = \begin{pmatrix}
1 & 0 & 0 \\
0 & 1 & 0 \\
0 & 0 & 1
\end{pmatrix}
$$

Matrix multiplication:

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

### Integrals

Definite integral:

$$
\int_0^1 x^2 \, dx = \frac{1}{3}
$$

Double integral:

$$
\iint_D f(x, y) \, dA = \int_a^b \int_{g_1(x)}^{g_2(x)} f(x, y) \, dy \, dx
$$

Contour integral:

$$
\oint_C \mathbf{F} \cdot d\mathbf{r} = \iint_S (\nabla \times \mathbf{F}) \cdot d\mathbf{S}
$$

### Summations

Finite sum:

$$
\sum_{k=1}^{n} k = \frac{n(n+1)}{2}
$$

Infinite series (Basel problem):

$$
\sum_{n=1}^{\infty} \frac{1}{n^2} = \frac{\pi^2}{6}
$$

Taylor series expansion of $e^x$:

$$
e^x = \sum_{n=0}^{\infty} \frac{x^n}{n!} = 1 + x + \frac{x^2}{2!} + \frac{x^3}{3!} + \cdots
$$

### Fractions and Binomials

Continued fraction:

$$
\phi = 1 + \cfrac{1}{1 + \cfrac{1}{1 + \cfrac{1}{1 + \cdots}}}
$$

Binomial coefficient:

$$
\binom{n}{k} = \frac{n!}{k!(n-k)!}
$$

Binomial theorem:

$$
(x + y)^n = \sum_{k=0}^{n} \binom{n}{k} x^{n-k} y^k
$$

### Limits and Products

Limit definition of $e$:

$$
e = \lim_{n \to \infty} \left(1 + \frac{1}{n}\right)^n
$$

Wallis product:

$$
\frac{\pi}{2} = \prod_{n=1}^{\infty} \frac{4n^2}{4n^2 - 1}
$$

---

## Code Blocks with Syntax Highlighting

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

## Code Block Advanced Features

### Line Highlighting

Highlight specific lines to draw attention (using `{1,3-5}` syntax — support depends on your Markdown processor):

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

### Diff Notation

Show code changes with diff syntax:

```diff
- const greeting = "Hello, World!";
+ const greeting = "Hello, Astro!";

  function main() {
-   console.log(greeting);
+   console.log(`${greeting} 🚀`);
+   console.log("Welcome to the blog!");
  }
```

### Shell / Terminal Commands

```bash
# Create a new Astro project
npm create astro@latest my-blog

# Navigate to project directory
cd my-blog

# Install dependencies
pnpm install

# Start the development server
pnpm run dev

# Build for production
pnpm run build
```

### JSON Configuration

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

## GitHub Alerts

GitHub-style alerts provide visually distinct callouts for different types of information:

> [!NOTE]
> This is a note alert. Use it for helpful information that users should be aware of, even when skimming content.

> [!TIP]
> This is a tip alert. Use it for optional suggestions that help users be more successful.

> [!IMPORTANT]
> This is an important alert. Use it for crucial information needed for users to succeed.

> [!WARNING]
> This is a warning alert. Use it for urgent information that requires the user's immediate attention to avoid problems.

> [!CAUTION]
> This is a caution alert. Use it to advise about risks or negative outcomes of certain actions.

### Alerts with Rich Content

> [!TIP]
> **Performance Tip:** When building your Astro site, use the `--remote` flag to fetch content from remote sources:
>
> ```bash
> pnpm run build --remote
> ```
>
> This can reduce build times by up to 60% on large sites.

> [!WARNING]
> **Breaking Change in v5.0:** The `content` directory has been renamed to `data`. Update your imports:
>
> ```diff
> - import { getCollection } from 'astro:content';
> + import { getCollection } from 'astro:content';  // same API, new data/ directory
> ```
>
> Run `npx astro migrate` to automatically update your project.

---

## Abbreviations

The HTML specification is maintained by the W3C.

*[HTML]: HyperText Markup Language
*[W3C]: World Wide Web Consortium

Other common abbreviations in web development:

- CSS is used for styling web pages
- JS is the scripting language of the web
- API endpoints handle server communication
- SSR renders pages on the server
- SSG generates static pages at build time

*[CSS]: Cascading Style Sheets
*[JS]: JavaScript
*[API]: Application Programming Interface
*[SSR]: Server-Side Rendering
*[SSG]: Static Site Generation

---

## Definition Lists

<dl>
  <dt>Astro</dt>
  <dd>A modern static site generator that allows you to build faster websites with less client-side JavaScript. It supports multiple UI frameworks and uses an island architecture.</dd>

  <dt>Tailwind CSS</dt>
  <dd>A utility-first CSS framework that provides low-level utility classes for building custom designs without writing custom CSS.</dd>

  <dt>MDX</dt>
  <dd>An authoring format that lets you use JSX components within Markdown documents, combining the simplicity of Markdown with the power of component-based UI.</dd>

  <dt>TypeScript</dt>
  <dd>A typed superset of JavaScript that compiles to plain JavaScript. It adds optional static typing and class-based object-oriented programming.</dd>
</dl>

---

## Keyboard Shortcuts

Display keyboard shortcuts with the `<kbd>` element:

### Common Editor Shortcuts

| Action | Windows / Linux | macOS |
|--------|----------------|-------|
| Save | <kbd>Ctrl</kbd> + <kbd>S</kbd> | <kbd>⌘</kbd> + <kbd>S</kbd> |
| Undo | <kbd>Ctrl</kbd> + <kbd>Z</kbd> | <kbd>⌘</kbd> + <kbd>Z</kbd> |
| Redo | <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd> | <kbd>⌘</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd> |
| Find | <kbd>Ctrl</kbd> + <kbd>F</kbd> | <kbd>⌘</kbd> + <kbd>F</kbd> |
| Replace | <kbd>Ctrl</kbd> + <kbd>H</kbd> | <kbd>⌘</kbd> + <kbd>H</kbd> |
| Comment | <kbd>Ctrl</kbd> + <kbd>/</kbd> | <kbd>⌘</kbd> + <kbd>/</kbd> |
| Format | <kbd>Shift</kbd> + <kbd>Alt</kbd> + <kbd>F</kbd> | <kbd>Shift</kbd> + <kbd>⌥</kbd> + <kbd>F</kbd> |

### VS Code Power Shortcuts

| Action | Shortcut |
|--------|----------|
| Command Palette | <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd> |
| Quick Open | <kbd>Ctrl</kbd> + <kbd>P</kbd> |
| Toggle Terminal | <kbd>Ctrl</kbd> + <kbd>`</kbd> |
| Go to Definition | <kbd>F12</kbd> |
| Peek Definition | <kbd>Alt</kbd> + <kbd>F12</kbd> |
| Multi-cursor | <kbd>Ctrl</kbd> + <kbd>D</kbd> |
| Move Line | <kbd>Alt</kbd> + <kbd>↑</kbd> / <kbd>↓</kbd> |

### Terminal Shortcuts

Navigate your terminal like a pro:

- <kbd>Ctrl</kbd> + <kbd>C</kbd> — Cancel current command
- <kbd>Ctrl</kbd> + <kbd>L</kbd> — Clear terminal
- <kbd>Ctrl</kbd> + <kbd>R</kbd> — Reverse search command history
- <kbd>Ctrl</kbd> + <kbd>A</kbd> — Move cursor to beginning of line
- <kbd>Ctrl</kbd> + <kbd>E</kbd> — Move cursor to end of line
- <kbd>Tab</kbd> — Auto-complete file names and commands

---

## Wrapping Up

These extended Markdown features add significant expressive power to your writing. Math formulas bring technical precision, syntax-highlighted code blocks improve readability, and GitHub alerts create clear visual hierarchies. Combine these with the [basic Markdown syntax](/en/blog/_examples/markdown-basics) to create polished, professional technical content.

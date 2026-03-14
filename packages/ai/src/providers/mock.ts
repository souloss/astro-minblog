/**
 * Mock provider for development and testing.
 * Returns predefined responses with article/link recommendations.
 * Responses use Markdown links which the ChatPanel renders as clickable elements.
 */

const MOCK_RESPONSES: Array<{ patterns: RegExp[]; zh: string; en: string }> = [
  {
    patterns: [/astro/i, /框架/],
    zh: `Astro 是一个现代化的静态站点生成器，核心优势是"岛屿架构"——默认零 JS，只在交互组件上加载脚本。本博客基于 Astro 构建。

推荐阅读：
- [快速上手：两种集成方式](/zh/getting-started) — 了解如何搭建 astro-minimax 博客
- [如何配置主题](/zh/how-to-configure-astro-minimax-theme) — 自定义你的博客外观

外部资源：
- [Astro 官方文档](https://docs.astro.build) — 深入学习 Astro 框架
- [Astro 主题市场](https://astro.build/themes/) — 发现更多 Astro 主题`,
    en: `Astro is a modern static site generator with an "Islands Architecture" — zero JS by default, loading scripts only for interactive components. This blog is built with Astro.

Recommended reading:
- [Getting Started: Two Integration Methods](/en/getting-started) — Learn how to set up an astro-minimax blog
- [How to Configure the Theme](/en/how-to-configure-astro-minimax-theme) — Customize your blog

External resources:
- [Astro Documentation](https://docs.astro.build) — Learn Astro in depth
- [Astro Themes](https://astro.build/themes/) — Discover more themes`,
  },
  {
    patterns: [/推荐|文章|看什么|读什么|recommend/i],
    zh: `以下是一些热门文章推荐：

**入门系列：**
- [快速上手：两种集成方式](/zh/getting-started) — 搭建你的第一个博客
- [如何添加新文章](/zh/adding-new-post) — 内容创作指南
- [预定义配色方案](/zh/predefined-color-schemes) — 选一个你喜欢的主题色

**技术深度：**
- [如何在博客中使用 LaTeX 公式](/zh/how-to-add-latex-equations-in-blog-posts) — 数学公式支持
- [动态 OG 图片生成](/zh/dynamic-og-images) — 自动生成社交分享图

你对哪个方向的内容更感兴趣？我可以做更精准的推荐。`,
    en: `Here are some recommended articles:

**Getting Started:**
- [Getting Started: Two Integration Methods](/en/getting-started) — Build your first blog
- [Adding New Posts](/en/adding-new-post) — Content creation guide
- [Predefined Color Schemes](/en/predefined-color-schemes) — Pick your favorite theme color

**Technical Deep Dives:**
- [LaTeX Equations in Blog Posts](/en/how-to-add-latex-equations-in-blog-posts) — Math formula support
- [Dynamic OG Images](/en/dynamic-og-images) — Auto-generate social share images

What direction interests you more? I can provide more specific recommendations.`,
  },
  {
    patterns: [/博客|blog|功能|feature/i],
    zh: `这个博客基于 **astro-minimax** 主题，功能丰富：

核心功能：Markdown/MDX、代码高亮、[数学公式(KaTeX)](/zh/how-to-add-latex-equations-in-blog-posts)、[Mermaid 图表](/zh/mermaid-diagrams)、标签分类、全文搜索(Pagefind)、[Waline 评论](https://waline.js.org)、深色模式。

了解更多：
- [配置指南](/zh/how-to-configure-astro-minimax-theme) — 完整配置选项
- [Markdown 扩展语法](/zh/markdown-extended) — 所有支持的语法特性

开源地址：[souloss/astro-minimax](https://github.com/souloss/astro-minimax)`,
    en: `This blog uses the **astro-minimax** theme with rich features:

Core features: Markdown/MDX, syntax highlighting, [math equations (KaTeX)](/en/how-to-add-latex-equations-in-blog-posts), [Mermaid diagrams](/en/mermaid-diagrams), tags & categories, full-text search (Pagefind), [Waline comments](https://waline.js.org), dark mode.

Learn more:
- [Configuration Guide](/en/how-to-configure-astro-minimax-theme) — Full config options
- [Extended Markdown](/en/markdown-extended) — All supported syntax features

Open source: [souloss/astro-minimax](https://github.com/souloss/astro-minimax)`,
  },
  {
    patterns: [/主题|theme|暗色|dark|颜色|color|配色/i],
    zh: `博客支持亮色和暗色主题，右下角按钮即可切换，也会自动检测系统偏好。

配色方案可以在配置中自定义，目前提供多种预设：
- [预定义配色方案](/zh/predefined-color-schemes) — 查看所有可用配色
- [自定义主题色](/zh/customizing-astro-minimax-theme-color-schemes) — 创建你自己的配色

参考 [Tailwind CSS 调色板](https://tailwindcss.com/docs/customizing-colors) 获取灵感。`,
    en: `The blog supports light and dark themes — toggle with the bottom-right button or auto-detect system preference.

Color schemes are customizable:
- [Predefined Color Schemes](/en/predefined-color-schemes) — See all available schemes
- [Custom Theme Colors](/en/customizing-astro-minimax-theme-color-schemes) — Create your own

Check [Tailwind CSS Color Palette](https://tailwindcss.com/docs/customizing-colors) for inspiration.`,
  },
  {
    patterns: [/搭建|部署|deploy|build|install|安装|搭/i],
    zh: `搭建类似的博客非常简单！有两种方式：

1. **GitHub 模板**（推荐新手）— 一键 Fork，开箱即用
2. **NPM 包集成** — 适合内容与系统分离的进阶用法

详细步骤请看 [快速上手](/zh/getting-started)。

部署推荐 [Cloudflare Pages](https://pages.cloudflare.com)（免费、全球 CDN），也支持 [Vercel](https://vercel.com) 和 [Netlify](https://netlify.com)。`,
    en: `Setting up a similar blog is easy! Two methods:

1. **GitHub Template** (recommended for beginners) — One-click fork, ready to use
2. **NPM Package Integration** — For advanced content/system separation

See [Getting Started](/en/getting-started) for detailed steps.

Deploy with [Cloudflare Pages](https://pages.cloudflare.com) (free, global CDN), or [Vercel](https://vercel.com) / [Netlify](https://netlify.com).`,
  },
  {
    patterns: [/rust/i],
    zh: `博客中有一系列 Rust 文章：
- [Rust 入门介绍](/zh/rust-series-01-introduction) — 语言基础
- [所有权系统](/zh/rust-series-02-ownership) — Rust 核心概念
- [错误处理](/zh/rust-series-03-error-handling) — Result 和 Option
- [并发编程](/zh/rust-series-04-concurrency) — 安全的多线程

外部学习资源：
- [The Rust Book](https://doc.rust-lang.org/book/) — 官方教程
- [Rust by Example](https://doc.rust-lang.org/rust-by-example/) — 实例学习`,
    en: `The blog has a Rust series:
- [Rust Introduction](/en/rust-series-01-introduction) — Language basics
- [Ownership System](/en/rust-series-02-ownership) — Core Rust concept
- [Error Handling](/en/rust-series-03-error-handling) — Result and Option
- [Concurrency](/en/rust-series-04-concurrency) — Safe multithreading

External resources:
- [The Rust Book](https://doc.rust-lang.org/book/) — Official tutorial
- [Rust by Example](https://doc.rust-lang.org/rust-by-example/) — Learn by examples`,
  },
  {
    patterns: [/ai|人工智能|助手|assistant|chat/i],
    zh: `我是这个博客的 AI 助手！当前运行在 Demo 模式，可以：
- 根据你的问题推荐相关博客文章
- 推荐有用的外部学习资源
- 解答关于博客技术栈的问题

启用完整 AI 功能（RAG 搜索增强）需要配置 \`AI_BASE_URL\` 和 \`AI_API_KEY\` 环境变量。

试试问我："有哪些文章推荐？" 或 "怎么搭建类似的博客？"`,
    en: `I'm the blog AI assistant! Currently in Demo mode, I can:
- Recommend relevant blog articles based on your questions
- Suggest useful external learning resources
- Answer questions about the blog's tech stack

For full AI features (RAG search enhancement), configure \`AI_BASE_URL\` and \`AI_API_KEY\` environment variables.

Try asking: "Recommend some articles?" or "How to build a similar blog?"`,
  },
  {
    patterns: [/搜索|search|pagefind/i],
    zh: `博客集成了 [Pagefind](https://pagefind.app) 全文搜索引擎，构建时自动索引。点击页面顶部搜索图标即可使用。

了解更多搜索功能：
- [Pagefind 官方文档](https://pagefind.app/docs/) — 完整配置指南
- 搜索支持中文和英文内容`,
    en: `The blog integrates [Pagefind](https://pagefind.app) for full-text search, auto-indexed at build time. Click the search icon at the top to use it.

Learn more:
- [Pagefind Documentation](https://pagefind.app/docs/) — Complete configuration guide
- Search supports both Chinese and English content`,
  },
  {
    patterns: [/markdown|mdx|语法|syntax|公式|latex|mermaid|图表/i],
    zh: `博客支持丰富的内容语法：

- [Markdown 基础语法](/zh/markdown-basics) — 标题、列表、表格等
- [Markdown 扩展语法](/zh/markdown-extended) — 脚注、高亮、折叠等
- [LaTeX 数学公式](/zh/how-to-add-latex-equations-in-blog-posts) — KaTeX 渲染
- [Mermaid 图表](/zh/mermaid-diagrams) — 流程图、时序图
- [Markmap 思维导图](/zh/markmap-mindmaps) — 交互式思维导图

外部参考：[GitHub Flavored Markdown](https://github.github.com/gfm/)`,
    en: `The blog supports rich content syntax:

- [Markdown Basics](/en/markdown-basics) — Headings, lists, tables
- [Extended Markdown](/en/markdown-extended) — Footnotes, highlights, collapsible
- [LaTeX Equations](/en/how-to-add-latex-equations-in-blog-posts) — KaTeX rendering
- [Mermaid Diagrams](/en/mermaid-diagrams) — Flowcharts, sequence diagrams
- [Markmap Mind Maps](/en/markmap-mindmaps) — Interactive mind maps

Reference: [GitHub Flavored Markdown](https://github.github.com/gfm/)`,
  },
];

const FALLBACK = {
  zh: `感谢提问！我目前在 Demo 模式下，可以推荐博客文章和外部资源。

试试这些话题：
- "有哪些文章推荐？"
- "Astro 框架是什么？"
- "怎么搭建类似的博客？"
- "支持哪些 Markdown 语法？"`,
  en: `Thanks for asking! I'm in Demo mode and can recommend blog articles and external resources.

Try these topics:
- "Recommend some articles?"
- "What is Astro?"
- "How to build a similar blog?"
- "What Markdown syntax is supported?"`,
};

/**
 * Returns a mock response with Markdown links for article/external link recommendations.
 */
export function getMockResponse(question: string, lang = 'zh'): string {
  const q = question.toLowerCase();
  const isZh = lang !== 'en';

  for (const { patterns, zh, en } of MOCK_RESPONSES) {
    if (patterns.some(p => p.test(q))) {
      return isZh ? zh : en;
    }
  }

  return isZh ? FALLBACK.zh : FALLBACK.en;
}

/**
 * Creates a ReadableStream that simulates character-by-character streaming.
 */
export function createMockStream(text: string): ReadableStream<string> {
  let index = 0;
  return new ReadableStream<string>({
    async pull(controller) {
      if (index >= text.length) {
        controller.close();
        return;
      }
      const chunkSize = Math.random() < 0.3 ? 2 : 1;
      const chunk = text.slice(index, index + chunkSize);
      index += chunkSize;
      controller.enqueue(chunk);
      await new Promise(resolve => setTimeout(resolve, 12 + Math.random() * 23));
    },
  });
}

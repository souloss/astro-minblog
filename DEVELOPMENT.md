# Development Guide

## Prerequisites

- Node.js >= 22.12.0
- pnpm >= 9

## Quick Start

```bash
git clone https://github.com/souloss/astro-minimax.git
cd astro-minimax
pnpm install
pnpm run dev
```

## Project Structure

```
astro-minimax/
├── apps/blog/          # Example blog (user-facing)
│   ├── src/config.ts   # Site configuration
│   ├── src/data/blog/  # Blog content (Markdown)
│   ├── datas/          # AI-generated metadata (do not edit manually)
│   └── functions/      # Cloudflare Pages Functions (thin adapters)
├── packages/
│   ├── core/           # Theme: layouts, components, pages, styles, visualizations
│   ├── ai/             # AI: RAG pipeline, providers, chat UI
│   ├── notify/         # Multi-channel notifications (Telegram, Webhook, Email)
│   └── cli/            # CLI tools + scaffolding (AI processing, profile, eval)
└── docs/               # Architecture documentation
```

## Local AI Development

### 1. Configure Environment

Copy `.env` in `apps/blog/` and set your API credentials:

```bash
# OpenAI-compatible API (works with DeepSeek, Moonshot, Qwen, etc.)
AI_BASE_URL=https://api.example.com/v1
AI_API_KEY=your-key
AI_MODEL=your-model

SITE_AUTHOR=YourName
SITE_URL=http://localhost:4321
```

### 2. Start Development Server

```bash
pnpm run dev
```

This runs `wrangler pages dev -- astro dev`, which:

- Starts the Astro dev server
- Proxies `/api/*` to Cloudflare Pages Functions in `functions/`
- Loads `.env` variables into the function environment
- Workers AI binding is not available locally; the ProviderManager automatically falls back to OpenAI-compatible API

### 3. Test AI Chat

Open the blog and click the AI chat button (floating action button).

- With valid `AI_BASE_URL` + `AI_API_KEY`: Live AI responses
- Without credentials: Mock mode with predefined responses

### Alternative: Astro-only dev (no AI)

```bash
pnpm run dev:astro
```

## Package Development

### packages/ai

```bash
cd packages/ai
pnpm run build          # Compile TypeScript
pnpm run build:watch    # Watch mode
```

Changes in `src/components/` are picked up directly by Astro's Vite (no build needed).
Changes in other `src/` files require `pnpm run build` or watch mode.

### packages/core

No build step — exports source files directly. Changes take effect immediately.

## Build-Time Tools (CLI)

All tools are in `packages/cli` and accessible via the `astro-minimax` CLI or `pnpm run` shortcuts:

```bash
# AI content processing
pnpm run ai:process         # Generate summaries + SEO metadata
pnpm run ai:seo             # Generate SEO metadata only
pnpm run ai:summary         # Generate summaries only
pnpm run ai:eval            # Evaluate AI chat quality

# Author profile
pnpm run profile:build      # Build complete profile (context + voice + report)
pnpm run profile:context    # Build author context
pnpm run profile:voice      # Build voice profile
pnpm run profile:report     # Generate author profile report

# Post management
pnpm run post:new           # Create a new post
pnpm run post:list          # List all posts
pnpm run post:stats         # Show post statistics

# Data management
pnpm run data:status        # Show data files status
pnpm run data:clear         # Clear generated data caches
```

These scripts read from `src/data/blog/` and write to `datas/`. The generated JSON files are loaded by the AI server at runtime.

**URL strategy**: Tool scripts generate relative paths (`/zh/my-post`). The server prepends `SITE_URL` at runtime, making the data deployment-agnostic.

## Build & Deploy

```bash
pnpm run build    # Type check + Astro build + Pagefind index
pnpm run preview  # Preview with wrangler (including Functions)
```

### Cloudflare Pages Deployment

```bash
npx wrangler pages deploy dist --project-name=astro-minimax
```

Set environment variables in the Cloudflare Dashboard:

- `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`
- `SITE_AUTHOR`, `SITE_URL`

Workers AI binding is configured in `wrangler.toml`.

---

## Development Standards

### UI/UX Design Standards

#### Glass Morphism Design System

The project uses a glass morphism design system. All card-like components should use unified styles:

```html
<!-- Recommended card template -->
<article class="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md
                transition-all duration-300 ease-out
                hover:border-accent/25 hover:bg-card-hover hover:shadow-xl
                hover:-translate-y-1">
  ...
</article>
```

**Key style parameters:**
| Property | Value | Description |
|----------|-------|-------------|
| `border-radius` | `rounded-2xl` | Cards use 1rem radius uniformly |
| `background` | `bg-card/60` | 60% opacity |
| `backdrop-blur` | `backdrop-blur-md` | Medium blur |
| `hover transform` | `hover:-translate-y-1` | Float up 4px |

#### Unified Hover Effects

```css
/* Recommended hover effects */
transition-all duration-300 ease-out
hover:border-accent/25
hover:bg-card-hover
hover:shadow-xl
hover:-translate-y-1

/* Avoid */
hover:scale-105  /* Breaks layout stability */
```

#### Icon Container Standard

```html
<!-- Unified icon container style -->
<div class="flex size-10 items-center justify-center rounded-xl
            bg-accent/10 text-accent transition-colors
            group-hover:bg-accent/15">
  <svg class="size-5" viewBox="0 0 24 24">...</svg>
</div>
```

#### Responsive Design

**Progressive Navigation Simplification:**

For multi-language navigation with varying text lengths, use progressive simplification:

```html
<!-- Nav item: icon on tablet, icon+text on desktop -->
<a class="flex items-center rounded-xl py-2
          px-2.5 lg:px-3.5 lg:gap-2">
  <Icon class="size-4 shrink-0" />
  <span class="hidden lg:inline">{label}</span>
</a>
```

| Screen Size | Breakpoint     | Display                      |
| ----------- | -------------- | ---------------------------- |
| Mobile      | < 640px        | Hamburger menu               |
| Tablet      | 640px ~ 1024px | Icons only + title attribute |
| Desktop     | ≥ 1024px       | Icons + text                 |

#### CSS Variables Usage

Use theme variables instead of hardcoded values:

```css
/* Recommended */
color: var(--accent);
background: var(--card);
border-color: var(--border);

/* Avoid */
color: #0a9396;
background: rgba(255, 255, 255, 0.6);
```

---

### Internationalization (i18n) Standards

#### Translation Key Naming Convention

Use `module.key` format for clarity:

```typescript
// Recommended
"settings.title": "偏好设置"
"categories.count": "个分类"
"series.articles": "{count} 篇文章"
"unit.minutes": "分钟"

// Avoid
"偏好设置": "Preferences"  // No namespace
"catCount": "个分类"       // Unclear abbreviation
```

#### Translation File Structure

All translations are centralized in `packages/core/src/utils/i18n.ts`:

```typescript
export type TranslationKey =
  | "nav.home"
  | "nav.posts"
  | "settings.title"
  // ... grouped by module

const translations: Record<string, Record<TranslationKey, string>> = {
  en: {
    "nav.home": "Home",
    "settings.title": "Preferences",
  },
  zh: {
    "nav.home": "首页",
    "settings.title": "偏好设置",
  },
};
```

#### Using Translation Function

```astro
---
import { t } from "../../utils/i18n";
const lang = "zh";
---

<!-- Recommended -->
<span>{t("unit.categories", lang)}</span>
<span>{t("series.articles", lang).replace("{count}", String(total))}</span>

<!-- Avoid -->
<span>{lang === "zh" ? "个分类" : "categories"}</span>
```

#### When Inline Language Checks Are Acceptable

1. **Date formatting** (localization, not translation):

   ```typescript
   const dateStr = lang === "zh"
     ? datetime.format("YYYY 年 M 月 D 日")
     : datetime.format("MMM D, YYYY");
   ```

2. **Language switcher button** (displays target language name):
   ```typescript
   label.textContent = isZh ? "EN" : "中";
   ```

#### Steps to Add New Translations

1. Add key to `TranslationKey` type
2. Add translations to both `en` and `zh` objects
3. Use `t("key", lang)` in components

---

### Component Development Standards

#### Prefer Server-Side Rendering

For list components, prefer SSR to avoid client-side JavaScript issues:

```astro
<!-- Recommended: SSR -->
<ul class="space-y-1">
  {posts.map(post => (
    <li><a href={post.href}>{post.title}</a></li>
  ))}
</ul>

<!-- Avoid: Client-side may lose data -->
<div data-posts-grid></div>
<script>
  document.querySelector('[data-posts-grid]') // Only selects first match!
</script>
```

#### Entrance Animations

Use staggered delays for elegant entrance animations:

```astro
{items.map((item, index) => {
  const delay = Math.min(index * 80, 400);  // Max 400ms delay
  return (
    <article
      class="card-animate"
      style={`animation-delay: ${delay}ms`}
    >...</article>
  );
})}
```

---

### Code Quality Standards

#### Prohibited Practices

```typescript
// ❌ Type error suppression
const value = data as any;
// @ts-ignore
// @ts-expect-error

// ❌ Empty catch blocks
try { doSomething(); } catch (e) {}

// ❌ Deleting tests to pass
// test.skip('...', () => {})

// ❌ Unused variables
const unused = getData();
```

#### Required Practices

```typescript
// ✅ Proper type definitions
interface Post {
  title: string;
  href: string;
  description?: string;
}

// ✅ Meaningful error handling
try {
  await saveSettings(settings);
} catch (error) {
  console.error('Failed to save settings:', error);
  showToast('保存失败，请重试');
}

// ✅ Optional chaining and nullish coalescing
const title = post?.title ?? 'Untitled';
```

#### Build Verification

Always run build after code changes:

```bash
pnpm run build
```

Ensure:

- 0 build errors
- All pages generated correctly
- Search index built properly

---

### Common Issues & Solutions

#### Issue 1: Archive Page Posts Not Displaying

**Symptoms:** Archive page shows post count but list is empty

**Cause:** `PostsContainer` uses client-side JS, `querySelector` only selects first match

**Solution:** Use server-side rendering

```astro
<!-- Before: Client-side -->
<PostsContainer posts={posts} lang={lang} />

<!-- After: SSR -->
<ul>
  {posts.map(post => (
    <li><a href={post.href}>{post.title}</a></li>
  ))}
</ul>
```

#### Issue 2: English Navigation Space Issues

**Symptoms:** English nav items are longer, squeezing the site title

**Solution:** Progressive simplification - icons on tablet, text on desktop

```html
<span class="hidden lg:inline">{label}</span>
```

#### Issue 3: Inconsistent Design

**Symptoms:** Different pages have different card styles

**Solution:** Use unified design system variables and styles

```html
<article class="rounded-2xl border border-border/50 bg-card/60
                backdrop-blur-md transition-all duration-300
                hover:border-accent/25 hover:-translate-y-1 hover:shadow-xl">
</article>
```

#### Issue 4: i18n Hard to Maintain

**Symptoms:** Translation strings scattered everywhere, `isZh ? '中文' : 'English'` pattern repeated

**Solution:** Centralize translation resources

1. All keys defined in `i18n.ts`
2. Use `t()` function for translations
3. New UI text must add translation key first

---

## Release Process

### Version Bump Checklist

When releasing a new version, update the following files:

#### 1. Package Versions

| File                                 | Field        | Example    |
| ------------------------------------ | ------------ | ---------- |
| `packages/core/package.json`         | `version`    | `"0.8.3"`  |
| `packages/ai/package.json`           | `version`    | `"0.8.3"`  |
| `packages/cli/package.json`          | `version`    | `"0.8.3"`  |
| `packages/notify/package.json`       | `version`    | `"0.8.3"`  |
| `apps/blog/package.json`             | `version`    | `"0.8.3"`  |
| `packages/cli/template/package.json` | dependencies | `"^0.8.3"` |

**Quick command:**

```bash
# Update package versions
sed -i 's/"version": "0.8.2"/"version": "0.8.3"/g' \
  packages/core/package.json \
  packages/ai/package.json \
  packages/cli/package.json \
  packages/notify/package.json \
  apps/blog/package.json

# Update template dependencies
sed -i 's/"\^0\.8\.2"/"^0.8.3"/g' packages/cli/template/package.json
```

#### 2. Documentation Updates

| File                                                              | Action                                             |
| ----------------------------------------------------------------- | -------------------------------------------------- |
| `CHANGELOG.md`                                                    | Add new version section with changes               |
| `apps/blog/src/data/blog/zh/_releases/astro-minimax-{VERSION}.md` | Create Chinese release article                     |
| `apps/blog/src/data/blog/en/_releases/astro-minimax-{VERSION}.md` | Create English release article                     |
| `apps/blog/src/data/blog/zh/`                                     | Add/update feature documentation (if new features) |
| `apps/blog/src/data/blog/en/`                                     | Add/update feature documentation (if new features) |

#### 3. Pre-Release Verification

```bash
# 1. Type check
pnpm exec tsc --noEmit -p packages/core/tsconfig.json
pnpm exec tsc --noEmit -p packages/ai/tsconfig.json
pnpm exec tsc --noEmit -p packages/cli/tsconfig.json

# 2. Build
pnpm run build

# 3. Verify no version references to old version
grep -r "0.8.2" --include="package.json" . --exclude-dir=node_modules
```

### Release Notes Template

```markdown
---
author: Souloss
pubDatetime: 2026-XX-XXT00:00:00.000Z
title: astro-minimax X.X.X
featured: false
category: 发布说明
tags:
  - release
cover: "https://images.unsplash.com/photo-XXX?w=1200&h=630&fit=crop"
description: "astro-minimax X.X.X: 简短描述主要变更"
---

astro-minimax X.X.X 是一个 [功能更新/维护/修复] 版本。

## 新功能

### 功能名称

功能描述...

## 改进

- 改进内容...

## 修复

- 修复内容...

## 升级指南

如果你使用的是 X.X.X，只需更新依赖：

\`\`\`bash
pnpm update @astro-minimax/core @astro-minimax/ai @astro-minimax/cli @astro-minimax/notify
\`\`\`

## 致谢

感谢所有贡献者和反馈问题的用户！
```

---

## Lessons Learned & Common Pitfalls

### 1. TypeScript Implicit `any` Errors

**Problem:** `astro:content` module is only available at runtime, causing TypeScript to show implicit `any` errors in IDE but build succeeds.

**Files affected:**

- `packages/core/src/pages/[lang]/posts/[...slug]/index.png.ts`
- `packages/core/src/utils/*.ts`

**Solution:** Add explicit types to callback parameters:

```typescript
// ❌ Before: implicit any
const posts = await getCollection("blog").then(p =>
  p.filter(({ data }) => !data.draft)
);

// ✅ After: explicit types
const posts = await getCollection("blog").then((p: CollectionEntry<"blog">[]) =>
  p.filter(({ data }: CollectionEntry<"blog">) => !data.draft)
);
```

**Note:** The `astro:content` import error is expected in standalone TypeScript checks. These types are provided by Astro at runtime.

### 2. Cloudflare Pages Top-Level Await

**Problem:** Top-level `await` in `functions/api/chat.ts` causes Cloudflare Pages build to fail.

**Error:**

```
Top-level await requires ESM output format
```

**Solution:** Use lazy loading instead:

```typescript
// ❌ Before: Top-level await
const vectorIndex = await initializeVectorIndex(env);

export async function onRequest(ctx) {
  // ...
}

// ✅ After: Lazy loading
let vectorIndex: VectorIndex | null = null;

export async function onRequest(ctx) {
  if (!vectorIndex) {
    vectorIndex = await initializeVectorIndex(ctx.env);
  }
  // ...
}
```

### 3. OG Image Path Issues

**Problem:** Dynamic OG images generated with incorrect paths.

**Issues found:**

1. Path used `/posts/SLUG/index.png` instead of `/posts/SLUG.png`
2. QR code URL used file path instead of post URL

**Solution:**

- OG image path: `/posts/{slug}.png`
- QR code URL: `/{lang}/posts/{slug}`

### 4. Mermaid Theme Adaptation

**Problem:** Mermaid diagrams don't update colors when switching between light/dark themes.

**Solution:** Re-render Mermaid on theme change:

```typescript
// Listen for theme changes
document.addEventListener('theme-change', () => {
  mermaid.run(); // Re-render all diagrams
});
```

### 5. Integration Plugin Type Safety

**Problem:** `remarkPlugins` and `rehypePlugins` typed as `unknown[]` causes TypeScript errors.

**Solution:** Import and use proper types from `@astrojs/markdown-remark`:

```typescript
import type { RemarkPlugin, RehypePlugin } from "@astrojs/markdown-remark";

const remarkPlugins: (string | RemarkPlugin | [string, unknown] | [RemarkPlugin, unknown])[] = [];
const rehypePlugins: (string | RehypePlugin | [string, unknown] | [RehypePlugin, unknown])[] = [];
```

### 6. Cover Image vs OG Image

**Problem:** Confusion between `cover` and `ogImage` fields.

**Solution:** Clear documentation and distinct purposes:

| Field     | Purpose        | Display Location           |
| --------- | -------------- | -------------------------- |
| `cover`   | Cover image    | Post cards, article banner |
| `ogImage` | Social sharing | Twitter, Facebook, etc.    |

**Fallback behavior:**

1. No `cover`, has `ogImage` → `ogImage` used as cover
2. Neither set → Auto-generate dynamic OG image for both

### 7. Reading Mode Theme Priority

**Problem:** Selecting "night" or "OLED" reading theme in light mode doesn't apply correct dark colors.

**Root Cause:** JavaScript `style.setProperty()` creates inline styles that override CSS selectors. When switching system theme, inline styles remain and don't update.

**Solution:** Remove inline style application, let CSS selectors fully control theme colors:

```javascript
// ❌ Before: Inline styles override CSS
function applyReadingTheme(themeId) {
  const isDark = root.getAttribute('data-theme') === 'dark';
  const colors = isDark ? theme.dark : theme.light;
  root.style.setProperty('--reading-bg', colors.background);
}

// ✅ After: Only set data attribute, CSS handles colors
function applyReadingTheme(themeId) {
  // Clear any existing inline styles
  root.style.removeProperty('--reading-bg');
  root.style.removeProperty('--reading-surface');
  // ... remove other properties

  // Only set data attribute
  root.setAttribute('data-reading-theme', themeId);
}
```

**CSS Priority Hierarchy:**

```css
/* Lower priority */
:root { --reading-bg: ...; }

/* Medium priority */
html[data-reading-theme="night"] { --reading-bg: #e8e8ec; }

/* Higher priority - dark mode override */
html[data-theme="dark"][data-reading-theme="night"] { --reading-bg: #121214; }
```

### 8. Reading Theme & System Theme Linkage

**Problem:** Selecting "night"/"OLED" reading theme while system is in light mode creates visual inconsistency - reading area is dark but navigation/UI remains light.

**Solution:** Auto-switch system theme when selecting dark reading themes:

```javascript
function applyReadingTheme(themeId) {
  const darkReadingThemes = ['night', 'oled'];

  if (darkReadingThemes.includes(themeId)) {
    // Auto-switch to dark mode for visual consistency
    window.theme?.setTheme('dark');
  }

  root.setAttribute('data-reading-theme', themeId);
}
```

**Design Decision:** "Night" and "OLED" are **dark reading themes** - selecting them means user wants dark mode overall.

### 9. Tailwind CSS v4 Font Variable Chain

**Problem:** Font selection in settings doesn't apply. `--font-app` defined in `@theme inline` overrides `--reading-font-family`.

**Root Cause:**

```css
/* Tailwind's font-app class uses fixed --font-app */
@theme inline {
  --font-app: "JetBrains Mono", ...;
}
body { @apply font-app; }  /* Uses --font-app, ignores --reading-font-family */
```

**Solution:** Chain the variables:

```css
@layer base {
  /* Link --font-app to --reading-font-family */
  :root {
    --font-app: var(--reading-font-family, "JetBrains Mono", ui-monospace, ...);
  }
}
```

### 10. Hardcoded Color Values

**Problem:** Some components use hardcoded hex colors instead of CSS variables, causing theme inconsistency.

**Files affected:**

- `BackToTopButton.astro` (Stylus: `#394E6A`, `#ffffff`, `#2B2D38`)
- `Mermaid.astro` / `MermaidInit.astro` (25+ hardcoded colors)
- `MusicPlayer.astro` (10+ hardcoded colors)
- `Sponsorship.astro` (`text-gray-600` instead of `text-foreground-soft`)

**Solution:** Always use CSS variables:

```css
/* ❌ Avoid */
color: #394E6A;
background: #ffffff;

/* ✅ Use */
color: var(--foreground-soft);
background: var(--card);
```

### 11. Dark Mode Selector Consistency

**Problem:** Some components use `.dark` class while project uses `html[data-theme="dark"]`.

**Files affected:**

- `BackToTopButton.astro` uses `:global(.dark)`

**Solution:** Use consistent selector:

```css
/* ❌ Wrong - project doesn't use .dark class */
:global(.dark) .my-component { }

/* ✅ Correct - matches project's theme system */
:global(html[data-theme="dark"]) .my-component { }
```

### 12. Preact SSR with @ai-sdk/react Hooks

**Problem:** Build fails with `TypeError: Cannot read properties of null (reading 'useRef')` when SSR-prerendering components that use `@ai-sdk/react`'s `useChat` hook.

**Root Cause:** `useChat` imports from `react`, which is aliased to `preact/compat` at build time. During SSR via `preact-render-to-string`, the React compat layer's hooks are null because the preact-render-to-string context doesn't initialize them the same way.

**Solution:** Use `client:only="preact"` instead of `client:idle` for components that depend on `@ai-sdk/react`:

```astro
<!-- ❌ SSR will fail -->
<AIChatContainer client:idle config={config} />

<!-- ✅ Skip SSR entirely -->
<AIChatContainer client:only="preact" config={config} />
```

Also ensure Vite deduplication includes both `@ai-sdk/react` and `ai`:

```typescript
// astro.config.ts
vite: {
  resolve: {
    dedupe: [
      "preact", "preact/hooks", "preact/compat",
      "react", "react-dom",
      "@ai-sdk/react", "ai"  // Required for hook consistency
    ],
  },
}
```

### 13. AI SDK v6 Tool Calling Integration

**Pattern:** Define tools in `packages/ai/src/tools/action-tools.ts`, pass to `streamText` in chat-handler, handle client-side via `onToolCall` in ChatPanel.

**Key types:**
```typescript
import type { ToolSet } from 'ai';  // Not Record<string, unknown>

streamText({
  tools: allTools,           // ToolSet type
  toolChoice: 'auto',
  stopWhen: stepCountIs(5),  // Prevent infinite tool loops
});
```

**Client-side handling:**
```typescript
useChat({
  sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  onToolCall({ toolCall }) {
    // Execute via ActionExecutor, return result via addToolOutput
  },
});
```

**Anti-pattern:** Do NOT implement parallel text-based action mechanisms (e.g., `<ai-action>` XML tags in response text). Tool Calling provides type safety, feedback loops, and multi-step capabilities that text-embedded commands cannot.

### 14. CSS Selector Injection in DOM Queries

**Problem:** User-controlled IDs (from URL parameters or AI tool calls) used directly in `querySelector` can break or manipulate selection.

**Solution:** Always sanitize IDs before CSS selector interpolation:

```typescript
const sanitizedId = CSS.escape
  ? CSS.escape(sectionId)
  : sectionId.replace(/[^\w\u4e00-\u9fff-]/g, '');

document.querySelector(`[data-section-id="${sanitizedId}"]`);
```

For URL parameters, also apply a whitelist regex:

```typescript
const section = params.get('section');
if (section && /^[\w\u4e00-\u9fff-]+$/.test(section)) {
  // Safe to use
}
```

### 15. PromiseLike vs Promise

**Problem:** `PromiseLike<T>` (used in AI SDK result types) doesn't have `.catch()` method — only `.then()`.

**Solution:** Use try/catch instead of optional chaining with `.catch()`:

```typescript
// ❌ PromiseLike has no .catch()
const result = await somePromiseLike?.catch(() => undefined);

// ✅ Use try/catch
let result: T | undefined;
try {
  result = await somePromiseLike;
} catch { /* ignore */ }
```

### 16. WCAG Contrast Requirements

**Problem:** Some text colors don't meet WCAG AA contrast requirements (4.5:1 for body text, 3:1 for large text).

**Original values with contrast issues:**
| Color | Value | Contrast | Issue |
|-------|-------|----------|-------|
| Light muted | #86868b | 3.33:1 | ❌ Below 4.5:1 |
| Light accent | #0a9396 | 3.43:1 | ⚠️ Borderline |

**Adjusted values:**
| Color | New Value | Contrast | Status |
|-------|-----------|----------|--------|
| Light muted | #6b7280 | 4.44:1 | ✅ Pass |
| Light accent | #0f766e | 5.03:1 | ✅ Pass |

**Validation:**

```bash
# Use WebAIM Contrast Checker or calculate programmatically
node -e "
const contrast = (fg, bg) => {
  const lum = (c) => { /* luminance calculation */ };
  const l1 = lum(fg), l2 = lum(bg);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};
console.log(contrast('#6b7280', '#f5f5f7'));
"
```

### 13. Design Token Systems

**Border Radius Tokens:**

```css
--radius-sm: 0.25rem;    /* 4px  - badge, chip */
--radius-md: 0.375rem;   /* 6px  - button internal elements */
--radius-lg: 0.5rem;     /* 8px  - inputs, small cards */
--radius-xl: 0.75rem;    /* 12px - buttons, tags */
--radius-2xl: 1rem;      /* 16px - cards, modals */
--radius-3xl: 1.25rem;   /* 20px - main cards, containers */
--radius-full: 9999px;   /* circular - avatars */
```

**Transition Duration Tokens:**

```css
--transition-fast: 150ms;    /* Micro-interactions */
--transition-base: 200ms;    /* Hover effects */
--transition-normal: 300ms;  /* Card animations */
--transition-slow: 500ms;    /* Long animations */
```

**z-index Hierarchy:**
| Value | Usage |
|-------|-------|
| 9999 | Lightbox overlay, view transitions |
| 1000 | Back to top button |
| 50-60 | Settings panel, floating actions, toasts |
| 40 | Header |
| 20 | Floating TOC, series nav |
| 10 | Code copy buttons |

### 14. Theme Preset System

**Problem:** Confusion between "color scheme" (only accent color) and "theme preset" (complete color system).

**Solution:** Unified `ThemePreset` interface:

```typescript
interface ThemePreset {
  id: string;
  name: string;
  nameZh: string;
  light: ThemeColors;  // All colors for light mode
  dark: ThemeColors;   // All colors for dark mode
}

interface ThemeColors {
  background: string;
  surface: string;
  foreground: string;
  foregroundSoft: string;
  muted: string;
  accent: string;
  accentSoft: string;
  border: string;
  borderStrong: string;
  card: string;
  cardHover: string;
}
```

**Available presets:** teal, ocean, rose, forest, midnight, sunset, mono, github

### 15. Settings Panel Restructure

**Problem:** Too many tabs with unclear separation.

**Solution:** Consolidated to 4 tabs:
| Tab | Contents |
|-----|----------|
| 外观 (Appearance) | Color theme, radius, font style, font size |
| 阅读 (Reading) | Reading theme, line height, content width, focus mode |
| 布局 (Layout) | Post list layout, widget toggles |
| 通用 (General) | Animations, card hover, smooth scroll |

**Configuration Sharing:** URL hash encoding for sharing preferences:

```javascript
// Export settings to URL
const encoded = btoa(JSON.stringify(settings));
url.hash = `#prefs=${encoded}`;

// Import from URL
const settings = JSON.parse(atob(hash.match(/#prefs=(.+)/)[1]));
```

---

## Browser Verification

### When to Verify

After significant UI changes, always verify in browser:

1. **Theme Switching** - Light/dark mode toggle works correctly
2. **Reading Mode** - All reading themes apply correctly in both light and dark system modes
3. **Responsive Design** - Test at mobile (375px), tablet (768px), desktop (1024px+)
4. **Component Interactions** - Buttons, modals, settings panel work as expected
5. **Cross-theme Consistency** - All 8 theme presets render correctly

### Verification Commands

```bash
# Start dev server
pnpm run dev

# Then use Playwright MCP or manual browser testing
```

### Key Test Scenarios

| Scenario                    | Steps                                         | Expected Result                                 |
| --------------------------- | --------------------------------------------- | ----------------------------------------------- |
| Reading theme in light mode | 1. Light mode 2. Select "night" reading theme | System auto-switches to dark, reading area dark |
| Theme preset switching      | 1. Select "rose" theme 2. Check colors        | All colors (bg, card, text, accent) update      |
| Font selection              | 1. Select "LXGW WenKai" font 2. Check text    | Font changes, network request for font          |
| Responsive nav              | 1. Resize to tablet 2. Check nav              | Icons only, no text overflow                    |
| Settings persistence        | 1. Change settings 2. Reload page             | Settings persist from localStorage              |

---

## UI/UX Best Practices

### Color System Philosophy

1. **One primary color** - Used for logo, main buttons, key links
2. **1-2 secondary colors** - For success/error/warning states only
3. **Neutral color scale** - 5-7 levels for backgrounds, borders, text hierarchy
4. **Dark mode palette** - Independent color system, not just inverted colors

### Typography Rules

1. **Font families ≤ 2** - One for body, optionally one for headings
2. **Line height 1.6-1.75** - Optimal for long-form reading
3. **Modular scale** - Consistent font size progression (e.g., 16 → 18 → 24 → 32)

### Component Consistency

1. **Border radius uniform** - Use token system, don't mix arbitrary values
2. **Hover effects** - Float + shadow (`translateY(-4px)` + `shadow-xl`), avoid scale
3. **Transition duration** - 150-300ms, consistent across components
4. **Icon containers** - Unified size and style (`size-10`, `rounded-xl`, `bg-accent/10`)

### Design System Health Metrics

| Metric               | Target                   | Status |
| -------------------- | ------------------------ | ------ |
| CSS Variables        | All colors via variables | ✅     |
| Border Radius Tokens | 5+ levels defined        | ✅     |
| Transition Tokens    | 4 levels defined         | ✅     |
| Theme Presets        | 8 presets × 2 modes      | ✅     |
| WCAG AA Contrast     | 4.5:1 for body text      | ✅     |
| `!important` Usage   | Minimal, documented      | ✅     |

---

## Pre-Commit Checklist

### Build & Type Safety

- [ ] Run `pnpm run build` to verify build succeeds
- [ ] No `as any` or `@ts-ignore` type suppressions
- [ ] TypeScript implicit `any` warnings addressed
- [ ] LSP diagnostics clean on changed files

### Styling

- [ ] No hardcoded color values (use CSS variables)
- [ ] Card styles follow glass morphism design system
- [ ] Hover effects unified (float + shadow, no scale)
- [ ] Border radius uses token system (`--radius-*`)
- [ ] Transition duration uses token system (`--transition-*`)
- [ ] Dark mode selector uses `html[data-theme="dark"]` (not `.dark`)
- [ ] WCAG contrast requirements met (4.5:1 for body text)

### i18n

- [ ] New UI text added to `i18n.ts`
- [ ] No inline translations (`isZh ? '中文' : 'English'`)
- [ ] Translation keys follow `module.key` naming

### Components

- [ ] Client-side script handles multiple instances correctly
- [ ] No `querySelector` that only selects first match
- [ ] Prefer SSR over client-side rendering for lists
- [ ] Component follows existing naming conventions

### Accessibility

- [ ] `aria-label` on icon-only buttons
- [ ] Focus visible styles present
- [ ] `prefers-reduced-motion` respected
- [ ] Color not the only indicator

### AI Integration

- [ ] Components using `@ai-sdk/react` use `client:only="preact"` (not `client:idle`)
- [ ] Tool definitions use `ToolSet` type from `ai` (not `Record<string, unknown>`)
- [ ] No duplicate action mechanisms (only Tool Calling, no text-embedded commands)
- [ ] User-controlled IDs sanitized before CSS selector usage (`CSS.escape`)
- [ ] `PromiseLike` handled with try/catch (not `.catch()`)
- [ ] `@ai-sdk/react` and `ai` in Vite `dedupe` config

### Release (if applicable)

- [ ] All package versions updated
- [ ] CLI template dependencies updated
- [ ] CHANGELOG.md updated
- [ ] Release articles created (zh + en)
- [ ] New feature documentation added
- [ ] Blog documentation updated to reflect code changes (see `.husky/precommit.md` stage 4.3)
- [ ] zh/en documentation parity verified

### Code Review Points

- [ ] Are there hardcoded color values that should use CSS variables?
- [ ] Are there inline translations that should be in `i18n.ts`?
- [ ] Does client-side script handle multiple component instances?
- [ ] Are TypeScript types explicit for callbacks and parameters?
- [ ] Does new code follow existing patterns and conventions?
- [ ] Are z-index values within established hierarchy?

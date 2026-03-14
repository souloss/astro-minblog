# @astro-minimax/core

Core theme package for astro-minimax — layouts, components, styles, utilities, remark/rehype plugins, and route injection.

## Installation

```bash
pnpm add @astro-minimax/core
```

Peer dependencies: `astro`, `tailwindcss`, `@tailwindcss/typography`, `dayjs`, `slugify`, `lodash.kebabcase`, `@astrojs/rss`.

Optional peers: `satori`, `@resvg/resvg-js` (OG images), `@pagefind/default-ui` (search), `@fontsource/ibm-plex-mono`.

## Usage

```ts
// astro.config.ts
import minimax from "@astro-minimax/core";

export default defineConfig({
  integrations: [
    minimax({
      site: SITE,          // SiteConfig object
      socials: SOCIALS,    // SocialLink[]
      shareLinks: SHARE_LINKS,
      friends: FRIENDS,    // FriendLink[]
      blogPath: "src/data/blog",
    }),
  ],
});
```

## Integration API

### `MinimaxUserConfig`

| Parameter | Type | Description |
|-----------|------|-------------|
| `site` | `SiteConfig` | Site configuration (title, description, features, etc.) |
| `socials` | `SocialLink[]` | Social media links |
| `shareLinks` | `SocialLink[]` | Share button links |
| `friends` | `FriendLink[]` | Friend links page data |
| `blogPath` | `string` | Path to blog content directory (default: `src/data/blog`) |

### Features Toggle

Control which routes are injected via `site.features`:

```ts
features: {
  tags: true,       // /[lang]/tags, /[lang]/tags/[tag]/[...page]
  categories: true, // /[lang]/categories, /[lang]/categories/[...path]
  series: true,     // /[lang]/series, /[lang]/series/[series]
  archives: true,   // /[lang]/archives
  search: true,     // /[lang]/search
  friends: true,    // /[lang]/friends
  projects: true,   // /[lang]/projects
}
```

All features default to `true`. Set to `false` to disable.

## Virtual Modules

The integration provides these virtual modules (auto-typed via `injectTypes`):

| Module | Exports | Description |
|--------|---------|-------------|
| `virtual:astro-minimax/config` | `SITE`, `BLOG_PATH` | Serialized site config |
| `virtual:astro-minimax/constants` | `SOCIALS`, `SHARE_LINKS` | Social/share link arrays |
| `virtual:astro-minimax/user-data` | `FRIENDS` | Friend links |
| `virtual:astro-minimax/styles` | (CSS side-effect) | Entry CSS with Tailwind + theme |
| `virtual:astro-minimax/ai-widget` | `AIChatWidget` | AI chat component (empty stub if ai package not installed) |

## CSS Architecture

### How It Works

1. **Each package declares its own `source.css`** — contains `@source "../"` to tell Tailwind which files to scan.

2. **The integration generates `.astro/minimax-styles.css`** at build time:
   ```css
   @import "tailwindcss";
   @source "../src";
   @import "@astro-minimax/core/styles/source.css";
   @import "@astro-minimax/viz/styles/source.css";  /* if installed */
   @import "@astro-minimax/ai/styles/source.css";   /* if installed */
   @import "@astro-minimax/core/styles/theme.css";
   ```

3. **`Layout.astro` imports via virtual module**: `import "virtual:astro-minimax/styles"` resolves to the generated CSS file.

This architecture works for both monorepo (`workspace:*`) and npm-installed packages.

### Theme CSS

`theme.css` contains all design tokens, base styles, utilities, and component styles:
- CSS custom properties (light/dark themes)
- `@theme inline` declarations for Tailwind token mapping
- `@layer base` rules
- Custom utilities (`max-w-app`, `app-layout`)
- View transition styles, theme toggle, reading mode, print styles

## Routes Injected

Always injected: `/`, `/404`, `/robots.txt`, `/og.png`, `/rss.xml`, `/[lang]`, `/[lang]/about`, `/[lang]/rss.xml`, `/[lang]/posts/[...page]`, `/[lang]/posts/[...slug]`, `/[lang]/posts/[...slug].png`.

Conditional (controlled by `features`): tags, categories, series, archives, search, friends, projects.

## Package Structure

```
src/
├── integration.ts      # Astro integration entry
├── types.ts            # TypeScript type definitions
├── layouts/            # Layout components (Layout.astro, PostLayout.astro, etc.)
├── components/         # UI components (nav, blog, social, ui)
├── pages/              # Injected page routes
├── styles/             # CSS (theme.css, source.css, typography.css, etc.)
├── utils/              # Utility functions (blog helpers, date formatting, etc.)
├── plugins/            # Remark/Rehype plugins + Shiki transformers
├── scripts/            # Client-side scripts (theme, lightbox, web-vitals)
└── assets/             # SVG icons
```

## Exports

```json
{
  ".": "./src/integration.ts",
  "./pages/*": "./src/pages/*",
  "./layouts/*.astro": "./src/layouts/*.astro",
  "./components/*": "./src/components/*",
  "./styles/source.css": "./src/styles/source.css",
  "./styles/theme.css": "./src/styles/theme.css",
  "./styles/*.css": "./src/styles/*.css",
  "./utils/*": "./src/utils/*.ts",
  "./plugins/*": "./src/plugins/*.ts",
  "./scripts/*": "./src/scripts/*.ts",
  "./types": "./src/types.ts"
}
```

## Development

```bash
# From monorepo root
pnpm dev          # Start apps/blog dev server
pnpm run build    # Build apps/blog (includes astro check)
```

Changes to core components are hot-reloaded in the dev server.

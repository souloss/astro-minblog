# create-astro-minimax

Scaffold a new blog project using the astro-minimax theme.

## Usage

```bash
# npm
npm create astro-minimax my-blog

# pnpm
pnpm create astro-minimax my-blog

# yarn
yarn create astro-minimax my-blog
```

## Generated Structure

```
my-blog/
├── astro.config.ts      # Astro + minimax integration config
├── package.json         # Dependencies (core, viz, tailwind, etc.)
├── tsconfig.json        # TypeScript configuration
├── public/
│   └── favicon.svg
└── src/
    ├── config.ts        # SITE configuration object
    ├── constants.ts     # Social links and share links
    ├── content.config.ts # Astro content collection schema
    ├── env.d.ts
    └── data/
        ├── blog/zh/hello-world.md   # Sample blog post
        └── friends.ts               # Friend links data
```

No `src/pages/` directory — all routes are injected by `@astro-minimax/core`.

## After Scaffolding

1. **Install dependencies:**
   ```bash
   cd my-blog && pnpm install
   ```

2. **Configure your site** in `src/config.ts`:
   - Set `website`, `author`, `title`, `desc`
   - Configure features (tags, categories, series, etc.)

3. **Start development:**
   ```bash
   pnpm dev
   ```

4. **Add blog posts** in `src/data/blog/zh/` (Chinese) or `src/data/blog/en/` (English).

## Customization

- **Colors**: Override CSS custom properties in your own CSS file
- **Features**: Toggle features in `SITE.features` (tags, categories, series, archives, search, friends, projects)
- **AI Chat**: Install `@astro-minimax/ai` and set `SITE.ai.enabled = true`
- **Visualizations**: Already included via `@astro-minimax/viz` — use mermaid/markmap code blocks in Markdown

## Optional Packages

| Package | Purpose |
|---------|---------|
| `@astro-minimax/ai` | AI chat assistant widget |

Install and configure in `src/config.ts` to enable.

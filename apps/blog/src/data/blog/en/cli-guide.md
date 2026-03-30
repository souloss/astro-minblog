---
title: "CLI Tools Guide"
pubDatetime: 2026-03-17T00:00:00.000Z
author: Souloss
description: "Complete guide to @astro-minimax/cli: create blogs, manage posts, AI content processing, author profiles, and data management."
tags:
  - docs
  - cli
  - tools
category: Tutorial/Tools
featured: false
draft: false
---

`@astro-minimax/cli` provides a comprehensive command-line toolkit for blog project management and AI content processing. This guide covers all available commands.

## Installation

In the monorepo / example blog, the CLI is already wired in via a workspace dev dependency. If you're using it in your own project separately, you can install it manually:

```bash
pnpm add -D @astro-minimax/cli
```

Use via `astro-minimax` command or `pnpm run` shortcuts.

## Create a New Blog

```bash
npx @astro-minimax/cli init my-blog
```

Generates a complete blog project with config files, sample content, and AI toolchain.

## Post Management

### Create Posts

```bash
pnpm run post:new -- "Post Title"
pnpm run post:new -- "Chinese Title" --lang=zh
pnpm run post:new -- "Tutorial" --category="Tutorial/Frontend"
```

Automatically creates Markdown files with frontmatter in the appropriate language directory.

### List Posts

```bash
pnpm run post:list
```

Shows all posts sorted by date (including subdirectories), distinguishing published posts and drafts.

### Post Statistics

```bash
pnpm run post:stats
```

Displays Chinese/English post count statistics.

## AI Content Processing

Requires environment variables:

```bash
# .env
AI_API_KEY=your-api-key
AI_BASE_URL=https://api.openai.com  # optional
AI_MODEL=gpt-4o-mini                 # optional
```

### Process Articles

```bash
pnpm run ai:process                          # Process all articles (summaries + SEO)
pnpm run ai:process -- --force               # Force reprocess
pnpm run ai:process -- --slug=en/my-post     # Process specific article
pnpm run ai:process -- --lang=en             # English articles only
pnpm run ai:process -- --recent=5            # Process recent 5 articles
pnpm run ai:process -- --dry-run             # Preview mode
```

### Generate Summaries

```bash
pnpm run ai:summary
```

### Generate SEO Metadata

```bash
pnpm run ai:seo
```

### AI Quality Evaluation

```bash
pnpm run ai:eval                                    # Evaluate local server
pnpm run ai:eval -- --url=https://your-blog.com     # Evaluate production
pnpm run ai:eval -- --category=no_answer             # Evaluate specific category
pnpm run ai:eval -- --verbose                        # Detailed output
```

Evaluation is based on `datas/eval/gold-set.json` golden test set, automatically checking:
- Non-empty response
- Topic coverage
- Forbidden claims not present
- Markdown link existence
- Answer pattern matching

Evaluation report is saved to `datas/eval/report.json`.

## Author Profile

### Complete Build

```bash
pnpm run ai:profile:build
```

This is the retained canonical entrypoint for the author profile pipeline. Its output is then used by the runtime knowledge bundle and AI chat flow.

### Canonical Build Entry

```bash
pnpm run ai:profile:build   # Run the retained author profile pipeline
```

If you also need the fact registry or extension system, continue with:

```bash
pnpm run ai:facts:build
pnpm run ai:facts:validate
pnpm run ai:extensions:status
```

## AI Fact Registry

AI extracts verified facts from blog content and injects them into prompts to reduce hallucinations:

```bash
# Build fact registry
pnpm run ai:facts:build

# Validate facts
pnpm run ai:facts:validate

# Check status
pnpm run ai:facts:status
```

## AI Extension System

The extension system provides custom context sections, semantic fallback rules, and other AI enhancements:

```bash
# Build extensions
pnpm run ai:extensions:build

# Validate extensions
pnpm run ai:extensions:validate

# Check extension status
pnpm run ai:extensions:status

# Load extensions
pnpm run ai:extensions:load
```

## Git Hooks
### Install Hooks
```bash
pnpm run hooks:install
```
Installs Husky Git hooks with auto `pubDatetime`/`modDatetime` fill on pre-commit.

### Uninstall Hooks
```bash
pnpm run hooks:uninstall
```
### Check Hook Status
```bash
pnpm run hooks:status
```

## Data Management

### View Status

```bash
pnpm run data:status
```

Shows status of all data files, processing counts, and last update time.

### Clear Cache

```bash
pnpm run data:clear
```

Clears AI-generated summaries, SEO data, author profiles, and other cache files. Does not delete evaluation reports.

## Command Reference

| Shortcut | Equivalent Command |
|----------|-------------------|
| `pnpm run post:new -- "Title"` | `astro-minimax post new "Title"` |
| `pnpm run post:list` | `astro-minimax post list` |
| `pnpm run post:stats` | `astro-minimax post stats` |
| `pnpm run ai:process` | `astro-minimax ai process` |
| `pnpm run ai:eval` | `astro-minimax ai eval` |
| `pnpm run ai:profile:build` | `astro-minimax ai profile build` |
| `pnpm run ai:facts:build` | `astro-minimax ai facts build` |
| `pnpm run ai:extensions:status` | `astro-minimax ai extensions status` |
| `pnpm run data:status` | `astro-minimax data status` |
| `pnpm run data:clear` | `astro-minimax data clear` |

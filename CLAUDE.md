# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AstroPaper is a minimal, responsive, accessible and SEO-friendly Astro blog theme. It includes features like light/dark mode, fuzzy search, draft posts, pagination, sitemap, RSS feed, and dynamic OG image generation.

## Architecture & Structure

The project follows the standard Astro framework structure:

- `src/data/blog/` - Contains all blog posts in Markdown/MDX format
- `src/components/` - Reusable UI components (Alert, BackButton, Comments, Header, Footer, etc.)
- `src/layouts/` - Layout templates (Layout.astro, PostDetails.astro, etc.)
- `src/pages/` - Route definitions (index.astro, 404.astro, about.md, posts/, tags/, etc.)
- `src/utils/` - Utility functions and transformers
- `src/styles/` - Global styles and Tailwind configuration
- `public/` - Static assets like images and favicons

The site uses content collections for managing blog posts, with a defined schema in `src/content.config.ts`.

## Key Technologies & Dependencies

- Astro v5+ with TypeScript
- Tailwind CSS for styling with typography plugin
- MDX support for enhanced Markdown
- Pagefind for static search functionality
- Shiki for code highlighting with various transformers
- RSS and sitemap generation via official Astro integrations
- Mermaid for diagram rendering
- Waline for comment system

## Configuration Files

- `astro.config.ts` - Main Astro configuration with integrations, markdown processing, and shiki setup
- `src/config.ts` - Site-wide configuration (title, author, timezone, comment settings, etc.)
- `src/content.config.ts` - Content collection schema for blog posts
- `tsconfig.json` - TypeScript configuration
- `package.json` - Scripts and dependencies

## Commands

Common development commands:

```bash
# Install dependencies
pnpm install

# Start development server
pnpm run dev

# Build for production
pnpm run build

# Preview production build locally
pnpm run preview

# Check code format with Prettier
pnpm run format:check

# Format code with Prettier
pnpm run format

# Sync TypeScript types for Astro modules
pnpm run sync

# Lint code with ESLint
pnpm run lint

# Generate RSS feed and sitemap
# (runs as part of build process)
```

## Blog Post Schema

Blog posts in `src/data/blog/` follow this schema:
- `title` (string) - Post title
- `description` (string) - Post description
- `pubDatetime` (date) - Publish date
- `modDatetime` (date, optional) - Last modified date
- `author` (string) - Author name (defaults to SITE.author)
- `featured` (boolean, optional) - Whether post is featured
- `draft` (boolean, optional) - Whether post is a draft
- `tags` (string array) - Tags for categorization
- `ogImage` (image or string, optional) - Open Graph image
- `canonicalURL` (string, optional) - Canonical URL
- `hideEditPost` (boolean, optional) - Whether to hide edit link
- `timezone` (string, optional) - Timezone for the post

## Special Features

- Dynamic OG image generation for blog posts
- Table of Contents (FloatingTOC and InlineTOC components)
- Syntax highlighting with file names and diff indicators
- Math rendering support (KaTeX)
- Emoji support in Markdown
- GitHub-style alerts in Markdown
- Waline comment system integration
- Mermaid diagram support in posts
- Fuzzy search with Pagefind
- Light/dark mode with system preference detection
- Responsive design with mobile-first approach

## Development Guidelines

- Use TypeScript strict mode for all new code
- Follow Tailwind CSS utility-first approach for styling
- Leverage Astro's island architecture for interactive components
- Maintain accessibility standards (semantic HTML, keyboard navigation, etc.)
- Use consistent color schemes from the design system
- Optimize images with Astro's built-in Image component
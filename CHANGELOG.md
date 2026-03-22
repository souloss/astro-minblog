# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.9.0] - 2026-03-22

### Added

- **Mermaid Interactive Toolbar**: Enhanced MermaidInit component with interactive toolbar featuring zoom controls (in/out/reset), export options (SVG/PNG), fullscreen mode, theme switching, and improved rendering performance.
- **Enhanced Comments Component**: Added loading timeout mechanism, comprehensive error handling with friendly error messages, retry mechanism for failed loads, and clear status feedback with progress indicators.
- **UI Component Improvements**: Enhanced styling and accessibility across multiple UI components with improved button styles, better keyboard navigation and screen reader support, optimized animations, and unified design language with consistent colors and spacing.

### Changed

- **User Preferences**: Enhanced user preferences system with sensible default configurations, better integration with settings panel, and optimized storage and retrieval of preferences.
- **Documentation**: Updated AI functionality guide with new features and configuration details, improved CLI tool documentation with usage examples.
- **OG Image Generation**: Updated OG image generation tool with enhanced screenshot-related configuration options.

### Fixed

- **Clipboard Copy Feedback**: Fixed button innerHTML update issue for clearer copy success feedback.
- **Website URL**: Fixed incorrect website URL in configuration.

## [0.8.3] - 2026-03-21

### Added

- **Cover Image Support**: New `cover` field in blog post frontmatter for post cards and article banners. Distinguished from `ogImage` (social sharing), with automatic fallback behavior.
- **Settings Panel**: Comprehensive preferences management UI with tabs for appearance, reading, layout, and general settings. Supports color schemes, border radius, font size, reading mode, and more.
- **Floating Series Navigation**: New `FloatingSeriesNav` component that displays series progress and navigation for posts within a series. Shows progress bar and quick links to other posts in the same series.
- **PostMeta Component**: Unified post metadata display component for consistent presentation across card layouts, list views, and article pages.
- **Preferences Module**: Centralized user preferences management system inspired by Vben Admin. Includes theme presets, storage persistence, and share URL functionality.
- **Enhanced i18n**: Improved internationalization with centralized translation handling via the `i18n.ts` utility. Settings panel now supports dynamic language switching.
- **Statistics Overview**: Added stats sections to archives, categories, series, tags, and friends pages showing total counts.
- **JetBrains Mono Font**: Added JetBrains Mono font files for improved code display.

### Changed

- **UI Enhancements**: Improved layouts for archives, categories, series, tags, and friends pages with better visual hierarchy and animations.
- **Header Component**: Enhanced navigation menu styles for better responsiveness and accessibility. Added title attributes to navigation links.
- **TypeScript Improvements**: Fixed type safety issues in `integration.ts` for remark/rehype plugins.

### Fixed

- **TypeScript Types**: Fixed `unknown[]` type assignment errors in `integration.ts` for markdown plugins.

## [0.8.1] - 2026-03-20

### Fixed

- **Mermaid theme adaptation**: Fixed Mermaid diagrams not updating colors when switching between light/dark themes. Diagrams now properly re-render with correct color schemes on theme change.
- **Cloudflare Pages deployment**: Resolved top-level await issue in `functions/api/chat.ts` that caused build failures. Vector index loading is now lazy-loaded on first request.
- **OG image URL path**: Fixed incorrect OG image URL path (`/posts/SLUG/index.png` → `/posts/SLUG.png`) that caused 404 errors when copying share images.
- **OG image QR code URL**: Fixed QR code URLs in dynamically generated OG images to use correct post paths (`/zh/posts/SLUG` instead of file path).
- **Documentation links**: Fixed broken links to color customization documentation throughout the codebase.

### Changed

- Removed misleading "dual version support" phrasing from documentation. Project now consistently uses "Astro v6" terminology.
- Removed `ogImage` fields from several blog posts to enable dynamic OG image generation with QR codes.

## [0.8.0] - 2026-03-17

### Added

- **AI Chat Integration**: Multi-provider support with automatic failover, RAG enhancement, streaming responses, and citation-layered hallucination prevention
- **Article-Aware AI Chat**: Context-aware AI assistant that understands the current article content
- **AI Privacy Protection**: Automatic rejection of sensitive personal information queries
- **AI Quality Evaluation**: Golden test set for automated quality assessment
- **Full i18n Support**: Complete Chinese and English localization
- **Modern Search**: Pagefind integration with optional Algolia DocSearch
- **Dynamic OG Images**: Automatic generation with QR codes using Satori
- **Visualization Components**:
  - Mermaid diagrams with theme support
  - Markmap mind maps
  - Rough.js hand-drawn graphics
  - Excalidraw whiteboard embeds
  - Asciinema terminal playback
- **Notification System**: Telegram Bot, Email (Resend), and Webhook support
- **Waline Comments**: Interactive comment system

### Changed

- Upgraded to Astro v6
- Upgraded to Tailwind v4
- Migrated to TypeScript strict mode
- Migrated to AI SDK v6

### Architecture

- Modular monorepo structure with four independent packages:
  - `@astro-minimax/core`: Core theme, layouts, components, styles
  - `@astro-minimax/ai`: AI integration with multi-provider support
  - `@astro-minimax/notify`: Notification system
  - `@astro-minimax/cli`: Command-line tools

## [0.7.0] - 2025-12-15

### Added

- Initial modular architecture
- Basic blog functionality
- Theme customization options
- Multi-language support foundation

---

For detailed release notes, see:

- [Chinese Release Notes](apps/blog/src/data/blog/zh/_releases/)
- [English Release Notes](apps/blog/src/data/blog/en/_releases/)

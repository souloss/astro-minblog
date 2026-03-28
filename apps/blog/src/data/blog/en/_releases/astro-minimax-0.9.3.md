---
author: Souloss
pubDatetime: 2026-03-29T12:00:00.000Z
title: "astro-minimax v0.9.3: Runtime Alignment, Accessibility & Data Refresh"
featured: false
draft: false
category: Release
tags:
  - release
  - changelog
  - accessibility
  - testing
  - docs
cover: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&h=630&fit=crop"
description: "astro-minimax v0.9.3: Workspace runtime alignment, refreshed AI knowledge/profile assets, a rewritten browser smoke harness, accessibility improvements for chat and settings, and synced release documentation."
---

astro-minimax v0.9.3 is not just a version bump. The recent commit history shows a release centered on **runtime alignment**, **generated AI asset refreshes**, **stronger browser smoke coverage**, and **accessibility polish** across chat and settings surfaces — with the package version sync and release-document updates landing as the final layer.

## Runtime & Data Alignment

### Blog App Runtime Alignment

The example blog was adjusted to match the shared workspace runtime contract more closely. Recent changes aligned the app configuration, trimmed package wiring, refreshed the workspace lockfile, and updated package metadata so the app, template, and workspace packages all point at the same runtime assumptions.

### Generated Knowledge & Profile Refresh

The generated AI-facing assets were refreshed in bulk, including:

- `author-context.json`
- `author-profile-context.json`
- `author-profile-report.json`
- `blog-digest.json`
- `voice-profile.json`
- the blog OG image under `apps/blog/public/astro-minimax-og.jpg`

This keeps the AI runtime inputs and public-generated assets aligned with the current content and bundle contract.

### CLI Processing & Template Runtime Docs

Two related maintenance tracks also landed in this cycle:

- `packages/cli/src/tools/ai-process.ts` now handles cache reuse and skip logic more cleanly.
- `packages/cli/template/functions/README.md` and the template runtime bundle were updated so scaffolded projects document and ship the expected `datas/knowledge/runtime/knowledge-bundle.json` structure from the start.

## Accessibility & UI Polish

### AI Chat Accessibility Improvements

Recent commits improved the accessibility semantics of the AI chat surface:

- clearer `aria-label` coverage in `ChatInput.tsx`
- stronger roles and status semantics in `ChatPanel.tsx`
- better keyboard/screen-reader friendliness for message input and controls

### Settings Panel & Reading Theme Refinement

`SettingsPanel.astro` received a substantial semantics pass, especially around dialog, tab, and switch behavior. In parallel, reading-theme styles in `theme.css` were refined for better preset consistency, and supporting UI pieces such as cards and post list metadata were cleaned up alongside that work.

## Testing & Documentation

### Browser Smoke Harness Rewrite

`tests/e2e-test.py` was rewritten into a broader Playwright smoke harness. The new script checks more than a homepage render: it now covers article detail pages, taxonomy routes, search, theme toggling, AI widget behavior, and API health endpoints, which makes regressions in the integrated demo app easier to catch.

### AI Guide & Release Documentation Sync

The generated English AI guide was refreshed to better reflect the current AI feature set, tool-calling flow, and runtime terminology. On top of that, the root READMEs and version tables were synchronized to `0.9.3`, and this bilingual release-note entry was added so the public docs line up with the actual release contents.

## Upgrade Notes

This release is primarily an **alignment and quality** update rather than a breaking feature release. If you are already on the `0.9.x` line, the important follow-up is to pick up the refreshed template/runtime conventions and keep generated AI assets in sync with the current build pipeline.

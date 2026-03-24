---
author: Souloss
pubDatetime: 2026-03-24T12:00:00.000Z
title: "astro-minimax v0.9.2: Security Hardening & Architecture Split"
featured: false
draft: false
category: Release
tags:
  - release
  - changelog
  - security
  - refactoring
cover: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&h=630&fit=crop"
description: "astro-minimax v0.9.2: Full-package security audit fixes, component and module splitting, single-source configuration, notification timeouts, and code quality improvements."
---

astro-minimax v0.9.2 focuses on security hardening and architectural improvements. Following a parallel deep audit of all four packages, we fixed XSS/path traversal vulnerabilities, completed two rounds of component splitting, and consolidated configuration constants to a single source of truth.

## Security Fixes

### URL Protocol Validation (Critical)

Model-generated Markdown links in AI chat and URLs in notification templates now pass through a protocol allowlist (only `http/https/mailto`), preventing `javascript:` XSS attack vectors.

### Mermaid Security Hardening

`MermaidBlock` `securityLevel` changed from `'loose'` to `'strict'`, preventing malicious Mermaid syntax from executing scripts via SVG injection.

### PostsContainer HTML Escaping

Client-side rendered post cards now escape title, description, category, and tag values, eliminating stored XSS risk.

### CLI Path Traversal Protection

The `extensions validate` command now validates that file paths don't escape the extensions directory, preventing `../` path traversal.

### Notification Log Redaction

Webhook logs no longer output full URLs (which may contain `?token=` credentials), showing only `origin + pathname`.

## Architecture Improvements

### Component Splitting — AI Package

| File | Lines | Extracted Modules |
|------|-------|-------------------|
| `ChatPanel.tsx` | 1020→580 | `RichText.tsx`, `MessageBubble.tsx`, `ChatInput.tsx`, `ReasoningBlock.tsx` |
| `CodeBlock.tsx` | 785→256 | `MermaidBlock.tsx`, `MarkmapBlock.tsx`, `VizShared.tsx` |

### Module Splitting — CLI Package

`ai.ts` (1167 lines) split into 6 focused modules: `index` (122 lines), `types`, `run-tool`, `profile`, `facts`, `extensions`.

### Single-Source Configuration

Eliminated 8 duplicated configuration constants, all consolidated into `constants.ts`: timeouts, search parameters, cache TTL, and CLI version.

## Reliability Improvements

- **Notification Timeouts**: Telegram/Email/Webhook providers now use `AbortSignal.timeout(10s)`
- **Stream Success Semantics**: `stream-helpers` correctly returns `success: false` on errors
- **Configurable CORS**: New `setCorsOrigin()` API and `env.CORS_ORIGIN` support
- **AIChatContainer Side Effect Fix**: `window.__aiChatToggle` moved into `useEffect`
- **CLI Exit Code Fix**: `vectorize.ts` properly calls `process.exit(1)` on failure
- **Post Frontmatter Alignment**: `post new` generates `pubDatetime/modDatetime/category`

## Architecture Progress

| Phase | Completion |
|-------|-----------|
| Phase 1 (Initial Audit) | 19/21 (90%) |
| Phase 2 (Deep Audit) | 18/25 (72%) |
| **Total** | **37/46 (80%)** |

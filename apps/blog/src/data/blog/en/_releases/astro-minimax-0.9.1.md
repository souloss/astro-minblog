---
author: Souloss
pubDatetime: 2026-03-24T00:00:00.000Z
title: "astro-minimax v0.9.1: AI Tool Calling & Action System"
featured: false
draft: false
category: Release
tags:
  - release
  - changelog
  - ai
  - tool-calling
  - actions
cover: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&h=630&fit=crop"
description: "astro-minimax v0.9.1: AI tool calling and a client-side action runtime, paragraph-level RAG with RRF hybrid retrieval, ChatPanel and CodeBlock improvements, plus build and typing fixes."
---

astro-minimax v0.9.1 focuses on what the AI can *do*: standard tool calls drive page behavior, backed by a type-safe action pipeline in the theme. It also improves retrieval granularity and polishes chat and code-block experiences.

## New Features

### AI Tool Calling

The assistant can now control the page through tool calls. Seven built-in tools are available:

- **`toggleTheme`**: Switch theme (light / dark / system)
- **`navigateToArticle`**: Navigate to a specific post
- **`scrollToSection`**: Scroll to a heading or section
- **`toggleReadingMode`**: Toggle reading mode
- **`highlightText`**: Highlight text in the article
- **`setPreference`**: Update user preferences
- **`searchArticles`**: Search blog posts (server-side)

### Client Action Runtime

`packages/core/src/actions/` provides a full action execution system:

- **Type-safe action definitions**: Six action kinds
- **ActionQueue**: Cross-navigation action queue
- **URL persistence**: `ai_actions` query parameter encodes pending actions
- **CSS-driven UX**: Section highlight pulse, theme transition effects, and more

### Paragraph-Level RAG & RRF Hybrid Retrieval

Retrieval moves from **article-level** to **paragraph-level**, combined with RRF hybrid ranking for finer-grained evidence and citations.

### ChatPanel Improvements

- **Size presets**: S / M / L with localStorage persistence
- **`APICallError`**: Clearer error handling and UI feedback
- **Tool call-driven actions**: AI SDK Tool Calling directly triggers client-side ActionExecutor for page interactions

### CodeBlock Improvements

- **Mermaid toolbar**: Zoom, reset, fullscreen, view source
- **Standalone copy control**: Clipboard fallback when APIs are unavailable
- **Skeleton loading**: Better perceived performance for async renders
- **Unique Mermaid IDs**: Avoids clashes when multiple diagrams share a page

## Fixes

- **SSR `useRef` null during build**: Switched affected islands from `client:idle` to `client:only="preact"`
- **`ToolSet` type mismatch**: Uses AI SDK–exported types correctly
- **`PromiseLike.catch` missing**: Replaced with `try/catch` for async flows
- **`chat-handler` imports**: Direct module paths instead of a barrel export to avoid cycles and ambiguous bundling

## Technical Notes

- **AI SDK v6**: `streamText` with `tools`, `toolChoice: 'auto'`, and `stepCountIs(5)` to cap multi-step tool loops
- **Automatic tool results**: `sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls`
- **System prompt**: Bilingual (EN/ZH) guidance for safe, effective tool use
- **Vite**: `dedupe` for `@ai-sdk/react` and `ai` to reduce duplicate packages and Preact hook issues

## Upgrade Guide

This release is **backward compatible**. Update packages with:

```bash
pnpm update @astro-minimax/core @astro-minimax/ai
```

## Acknowledgments

Thanks to everyone who contributed and shared feedback!

---
title: "AI Chat Configuration Guide"
pubDatetime: 2026-03-17T00:00:00.000Z
modDatetime: 2026-03-24T00:00:00.000Z
author: Souloss
description: "Complete guide to configuring astro-minimax AI chat: providers, RAG search, Mock mode, author profiles, and quality evaluation."
tags:
  - docs
  - ai
  - configuration
category: Tutorial/AI
featured: false
draft: false
---

astro-minimax includes a built-in AI chat assistant with multi-provider failover, RAG retrieval, streaming responses, and Mock fallback. This guide covers the complete setup.

## Overview

The AI chat system consists of the following modules:

| Module | Description |
|--------|-------------|
| `@astro-minimax/ai` | AI core package: RAG pipeline, provider management, chat UI |
| `@astro-minimax/cli` | CLI tools: AI content processing, author profile building, quality evaluation |
| `@astro-minimax/notify` | Notification system: Real-time AI chat notifications to Telegram/Email/Webhook |

## Quick Setup

### 1. Enable AI Feature

In `src/config.ts`:

```typescript
features: {
  ai: true,
},
ai: {
  enabled: true,
  mockMode: false,
  apiEndpoint: "/api/chat",
},
```

### 2. Configure Provider

In `.env`:

```bash
# OpenAI-compatible API (supports DeepSeek, Moonshot, Qwen, etc.)
AI_BASE_URL=https://api.openai.com/v1
AI_API_KEY=your-api-key
AI_MODEL=gpt-4o-mini

# Site information
SITE_AUTHOR=YourName
SITE_URL=https://your-blog.com
```

### 3. Build AI Data

```bash
astro-minimax ai process       # Generate article summaries and SEO data
astro-minimax profile build     # Build author profile
```

### 4. Start Development Server

```bash
pnpm run dev
```

The AI chat button will appear in the bottom-right corner of the page.

## Provider Configuration Details

### Cloudflare Workers AI

When deploying on Cloudflare Pages, you can use free Workers AI:

```toml
# wrangler.toml
[ai]
binding = "AI"
```

Workers AI is the highest-priority provider and doesn't require an API key.

### OpenAI-Compatible API

Supports any OpenAI-compatible API service:

```bash
AI_BASE_URL=https://api.openai.com/v1
AI_API_KEY=sk-xxx
AI_MODEL=gpt-4o-mini
```

You can also configure different models for different tasks:

```bash
AI_KEYWORD_MODEL=gpt-4o-mini    # Keyword extraction model
AI_EVIDENCE_MODEL=gpt-4o-mini   # Evidence analysis model
```

### Failover Mechanism

```mermaid
flowchart LR
    Request[User Request] --> W{Workers AI}
    W -->|Success| Response[Streaming Response]
    W -->|3 failures| O{OpenAI API}
    O -->|Success| Response
    O -->|Fail| M[Mock Fallback]
    M --> Response

    style W fill:#f97316,color:#fff
    style O fill:#3b82f6,color:#fff
    style M fill:#6b7280,color:#fff
    style Response fill:#22c55e,color:#fff
```

- 3 consecutive failures marks a provider as unhealthy
- Automatic recovery attempt after 60 seconds
- When all providers fail, Mock ensures users always receive a response

## AI Tool Calling and Actions

When users ask things like “switch to dark mode” or “open article X,” the model can **invoke tools** to perform those actions directly, instead of only describing the steps.

### Available tools

The chat pipeline registers seven tools (names match the implementation):

| Tool | Purpose |
|------|---------|
| `toggleTheme` | Switch among light, dark, and system theme |
| `navigateToArticle` | Go to a post by slug (optional language and section) |
| `scrollToSection` | Scroll to a heading/section on the current page |
| `toggleReadingMode` | Turn reading mode on/off and adjust font options |
| `highlightText` | Highlight text or a target element |
| `setPreference` | Set a user preference key/value |
| `searchArticles` | Search posts and projects; returns titles, URLs, summaries |

### How it works

- **Client-side tools**: `toggleTheme`, `navigateToArticle`, `scrollToSection`, `toggleReadingMode`, `highlightText`, and `setPreference` are defined with schemas on the server; the model emits tool calls, and the **browser** runs them via the theme’s **ActionExecutor** (`@astro-minimax/core`), mapping calls to DOM, routing, and preferences.
- **Server-side tool**: `searchArticles` includes an `execute` handler that runs **on the server during the chat/RAG request**, calling the same `searchArticles` / `searchProjects` retrieval used by the pipeline so the model can search before answering or suggest links.

### Action system and cross-page chaining

Execution is centralized under `packages/core/src/actions/`: **ActionExecutor** performs each action; **URLHandler** (and related helpers) can carry work across navigations using query parameters (`theme`, `section`, `ai_actions` plus a queued token) so a **chain of actions** can finish after the next page load. The chat UI turns client tool calls into these actions.

## Mock Mode

No real API needed during development:

```typescript
ai: {
  enabled: true,
  mockMode: true,  // Development environment
},
```

Mock mode returns pre-defined article recommendations and external resource links, simulating real AI responses.

## AI Security Features

### Source Priority Protocol

AI responses follow L1-L5 source priority:

- **L1**: Blog original content (highest priority)
- **L2**: Author bio, project list
- **L3**: Structured factual data
- **L5**: Writing style (affects expression only)

### Privacy Protection

Automatically refuses to answer sensitive personal information:

- Address, income, family members, phone, identity info, age

### Intent Classification

7 intent categories for improved search relevance:

- setup, config, content, feature, deployment, troubleshooting, general

## Quality Evaluation

### Configure Test Set

Edit `datas/eval/gold-set.json` to define test cases:

```json
{
  "cases": [
    {
      "id": "about-001",
      "category": "about",
      "question": "Tell me about yourself",
      "answerMode": "fact",
      "expectedTopics": ["blog", "AI"],
      "forbiddenClaims": [],
      "lang": "en"
    }
  ]
}
```

### Run Evaluation

```bash
pnpm run ai:eval                             # Test local server
pnpm run ai:eval -- --url=https://your-blog.com     # Test production
pnpm run ai:eval -- --category=no_answer     # Evaluate specific category
pnpm run ai:eval -- --verbose                # Detailed output
```

Evaluation is based on the `datas/eval/gold-set.json` golden test set, automatically checking:
- Non-empty response
- Topic coverage
- Forbidden claims not present
- Markdown links exist
- Answer pattern matching

Evaluation report is saved to `datas/eval/report.json`.

## Extensions System

The extensions system allows you to inject custom data into the AI chat pipeline, enhancing AI response capabilities.

### Extension Types

| Type | Description | Use Case |
|------|-------------|----------|
| `searchable` | Searchable documents | Add extra knowledge base content |
| `facts` | Structured facts | Add verified factual data |
| `context` | Context injection | Add custom prompt sections |
| `voice-style` | Voice style | Define AI response style modes |
| `semantic-fallback` | Semantic fallback | Query rewriting rules |

### Extension File Structure

Extension files are placed in the `datas/extensions/` directory:

```
datas/extensions/
├── travel.json        # Travel-related extensions
├── social.json        # Social network extensions
└── custom-*.json      # Custom extensions
```

### Extension File Format

```json
{
  "$schema": "extension-v1",
  "version": 1,
  "extensions": [
    {
      "id": "blog-travel",
      "type": "voice-style",
      "name": "Travel Voice",
      "description": "Voice style for travel topics",
      "enabled": true,
      "priority": 80,
      "data": {
        "modes": [
          {
            "id": "travel",
            "name": "Travel Mode",
            "description": "Travel response style",
            "matchKeywords": ["travel", "trip", "journey"],
            "traits": [
              "Narrate by timeline",
              "Mention specific places and experiences",
              "Occasionally add personal insights"
            ]
          }
        ],
        "defaultMode": "travel",
        "overallTone": "Casual sharing"
      }
    },
    {
      "id": "travel-fallback",
      "type": "semantic-fallback",
      "name": "Travel Fallback",
      "enabled": true,
      "priority": 70,
      "data": {
        "rules": [
          {
            "id": "travel-countries",
            "patterns": ["visited.{0,6}(countries|cities)", "been to"],
            "fallbackQuery": "travel journey destinations",
            "primaryQuery": "travel",
            "complexity": "complex"
          }
        ]
      }
    }
  ]
}
```

### CLI Commands

```bash
# View extension status
astro-minimax extensions status

# Validate extension files
astro-minimax extensions validate

# Build extensions (validate and organize)
astro-minimax extensions build --verbose

# Test loading extensions
astro-minimax extensions load
```

### Extension Priority

Extensions use the `priority` field (0-100) to control precedence. Higher values mean higher priority. When multiple extensions provide the same type of data, higher-priority extensions are preferred.

### Data Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│ BUILD TIME                                                  │
│  datas/extensions/*.json ──→ CLI validate ──→ Registry      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ REQUEST TIME                                                │
│  loadExtensions() ──→ resolveVoiceStyleMode()               │
│     ├─ getSemanticFallback(query)                           │
│     └─ mergeSearchDocuments() / mergeFacts()                │
└─────────────────────────────────────────────────────────────┘
```

## Notification Integration

AI chat completion automatically sends notifications (fire-and-forget):

```bash
# .env
NOTIFY_TELEGRAM_BOT_TOKEN=your-bot-token
NOTIFY_TELEGRAM_CHAT_ID=your-chat-id
```

Notification content includes: user question, AI response summary, referenced articles, token usage, and phase timing.

See [Notification System Configuration Guide](/en/posts/notification-guide) for details.

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `AI_BASE_URL` | OpenAI-compatible API URL | Required when using OpenAI |
| `AI_API_KEY` | API key | Required when using OpenAI |
| `AI_MODEL` | Main chat model | No (default `gpt-4o-mini`) |
| `AI_KEYWORD_MODEL` | Keyword extraction model | No (same as main model) |
| `AI_EVIDENCE_MODEL` | Evidence analysis model | No (same as keyword model) |
| `SITE_AUTHOR` | Author name | No |
| `SITE_URL` | Site URL | No |

## Next Steps

- [Feature Overview](/en/posts/feature-overview) — Learn about all AI features
- [CLI Tool Guide](/en/posts/cli-guide) — AI processing commands in detail
- [Notification System](/en/posts/notification-guide) — Configure AI chat notifications
- [Deployment Guide](/en/posts/deployment-guide) — Cloudflare Workers AI deployment
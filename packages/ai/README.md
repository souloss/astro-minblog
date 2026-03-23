# @astro-minimax/ai

Vendor-agnostic AI integration package with full RAG pipeline for astro-minimax blogs. Supports OpenAI-compatible APIs, Cloudflare Workers AI, and mock fallback.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Components (ChatPanel / AIChatWidget / AIChatContainer) │
│  → useChat + DefaultChatTransport                        │
└──────────────────────────┬──────────────────────────────┘
                           │ POST /api/chat
┌──────────────────────────▼──────────────────────────────┐
│  Server (chat-handler.ts)                                │
│  Rate Limit → Validate → Search → Evidence → Prompt →   │
│  Provider Manager → streamText → SSE Response            │
└──────────────────────────┬──────────────────────────────┘
                           │
     ┌─────────────────────┼──────────────────────┐
     │                     │                      │
 ┌───▼───┐          ┌─────▼─────┐          ┌─────▼────┐
 │OpenAI │          │Workers AI │          │   Mock   │
 │Compat │          │ Binding   │          │ Fallback │
 └───────┘          └───────────┘          └──────────┘
```

### Modules

| Module              | Purpose                                                                |
| ------------------- | ---------------------------------------------------------------------- |
| `server/`           | Reusable API handlers (`handleChatRequest`, `initializeMetadata`)      |
| `provider-manager/` | Multi-provider management with priority, failover, health tracking     |
| `search/`           | In-memory article/project search with session caching                  |
| `intelligence/`     | Keyword extraction, evidence analysis, citation guard, answer mode, dynamic evidence budget |
| `prompt/`           | Three-layer system prompt builder (static → semi-static → dynamic)     |
| `data/`             | Build-time metadata loading (summaries, author context, voice profile) |
| `stream/`           | Stream helpers and response utilities                                  |
| `components/`       | Preact UI components (ChatPanel, AIChatWidget, AIChatContainer)        |

## Features

### Dynamic Evidence Budget

The system dynamically adjusts retrieval and analysis resources based on query complexity:

| Complexity | Max Articles | Summary Length | Key Points | Deep Content |
|------------|--------------|----------------|------------|--------------|
| `simple`   | 4            | 48 chars       | 2          | No           |
| `moderate` | 6            | 56 chars       | 3          | Yes          |
| `complex`  | 8            | 64 chars       | 4          | Yes          |

Budget is further adjusted by **answer mode** (count, list, opinion, recommendation):

```typescript
import { getEvidenceBudget, applyBudgetToArticles } from '@astro-minimax/ai/intelligence';

const budget = getEvidenceBudget('moderate', 'list');
// → { maxArticles: 8, summaryMaxLength: 80, ... }

const trimmedArticles = applyBudgetToArticles(articles, budget);
```

### Answer Mode Detection

Automatically detects the expected response format from user queries:

| Mode            | Trigger Patterns              | Response Style                    |
|-----------------|-------------------------------|-----------------------------------|
| `fact`          | "是什么", "what is"           | Conclusion first, then evidence   |
| `count`         | "多少", "how many"            | Number in first sentence          |
| `list`          | "哪些", "what are"            | 2-6 items directly                |
| `opinion`       | "怎么看", "what do you think" | "I think..." + 2-3 points         |
| `recommendation`| "推荐", "suggest"             | 2-4 recommendations + reasons     |

Answer mode hints are injected into the dynamic prompt layer, guiding the LLM toward the appropriate format.

### Reading Time Display

Article reading time is now displayed in the dynamic prompt layer:

```
**[Article Title](/posts/article)**
阅读时间：约 5 分钟
摘要：Article summary...
```

### Enhanced Citation Guard

Improved URL validation prevents hallucinated links:

- **Scheme whitelist**: Only `http://` and `https://` allowed
- **Domain validation**: Blocks localhost, private IPs, internal networks
- **XSS prevention**: Sanitizes dangerous URL patterns

```typescript
import { createCitationGuardTransform } from '@astro-minimax/ai/intelligence';

const guard = createCitationGuardTransform({
  articles,
  projects,
  siteUrl: 'https://example.com',
  onApplied: ({ actions }) => console.log('Rewrote:', actions),
});
```

## Installation

```bash
pnpm add @astro-minimax/ai
```

The `@astro-minimax/core` integration auto-detects this package and renders the AI chat widget.

## Configuration

In `src/config.ts`:

```typescript
export const SITE = {
  ai: {
    enabled: true,
    mockMode: false,
    apiEndpoint: "/api/chat",
    welcomeMessage: undefined, // auto-generated
    placeholder: undefined,
  },
};
```

### Environment Variables

| Variable            | Required    | Description                                                 |
| ------------------- | ----------- | ----------------------------------------------------------- |
| `AI_BASE_URL`       | For OpenAI  | Base URL of OpenAI-compatible API                           |
| `AI_API_KEY`        | For OpenAI  | API key                                                     |
| `AI_MODEL`          | Recommended | Model name for OpenAI provider (default: `gpt-4o-mini`)     |
| `AI_KEYWORD_MODEL`  | Optional    | Model for keyword extraction (defaults to `AI_MODEL`)       |
| `AI_EVIDENCE_MODEL` | Optional    | Model for evidence analysis (defaults to keyword model)     |
| `AI_BINDING_NAME`   | For Workers | Cloudflare AI binding name (default: `minimaxAI`)           |
| `AI_WORKERS_MODEL`  | For Workers | Model for Workers AI (default: `@cf/zai-org/glm-4.7-flash`) |
| `SITE_AUTHOR`       | Recommended | Author name for prompts                                     |
| `SITE_URL`          | Recommended | Site URL for article links                                  |

### Response Cache Configuration

| Variable                           | Default | Description                               |
| ---------------------------------- | ------- | ----------------------------------------- |
| `AI_RESPONSE_CACHE_ENABLED`        | `false` | Enable AI response caching                |
| `AI_RESPONSE_CACHE_TTL`            | `3600`  | Cache TTL in seconds (1 hour)             |
| `AI_RESPONSE_CACHE_PLAYBACK_DELAY` | `20`    | Delay between chunks during playback (ms) |
| `AI_RESPONSE_CACHE_CHUNK_SIZE`     | `15`    | Characters per chunk during playback      |
| `AI_RESPONSE_CACHE_THINKING_DELAY` | `5`     | Delay for thinking content playback (ms)  |

When enabled, the system caches complete AI responses (including thinking/reasoning content) for public questions like "What tech stack does this blog use?". Subsequent identical queries are served from cache with simulated streaming playback, reducing API costs and response time.

## Server Module

The server module provides reusable request handlers, decoupled from any specific runtime (Cloudflare, Node.js, etc.).

### Usage in Cloudflare Pages Functions

```typescript
// functions/api/chat.ts
import { handleChatRequest, initializeMetadata } from '@astro-minimax/ai/server';
import summaries from '../../datas/ai-summaries.json';
import authorContext from '../../datas/author-context.json';
import voiceProfile from '../../datas/voice-profile.json';

export const onRequest: PagesFunction = async (context) => {
  initializeMetadata({ summaries, authorContext, voiceProfile }, context.env);
  return handleChatRequest({ env: context.env, request: context.request });
};
```

### Chat API Contract

**Request:** `POST /api/chat`

```json
{
  "context": {
    "scope": "article",
    "article": {
      "slug": "my-post",
      "title": "My Post Title",
      "summary": "Brief summary...",
      "keyPoints": ["Point 1", "Point 2"],
      "categories": ["tech"]
    }
  },
  "id": "article:my-post",
  "messages": [...]
}
```

`context.scope` values:

- `"global"` — General blog chat (default)
- `"article"` — Reading companion mode, focused on a specific article

**Response:** UI Message Stream Protocol (SSE)

- `text-start` / `text-delta` / `text-end` — Streaming text content
- `source` — RAG article references
- `message-metadata` — Processing status updates
- `finish` — Stream completion

**Error Response:**

```json
{
  "error": "请求太频繁，请稍后再试",
  "code": "RATE_LIMITED",
  "retryable": true,
  "retryAfter": 10
}
```

| Code                   | Status | Retryable | Description           |
| ---------------------- | ------ | --------- | --------------------- |
| `RATE_LIMITED`         | 429    | Yes       | Too many requests     |
| `PROVIDER_UNAVAILABLE` | 503    | Yes       | All providers failed  |
| `TIMEOUT`              | 504    | Yes       | Request timeout       |
| `INPUT_TOO_LONG`       | 400    | No        | Message exceeds limit |
| `INVALID_REQUEST`      | 400    | No        | Malformed request     |
| `INTERNAL_ERROR`       | 500    | Yes       | Server error          |

## Provider System

### Priority & Failover

```
Workers AI (weight: 100) → OpenAI Compatible (weight: 90) → Mock (weight: 0)
```

When a provider fails, the next one is tried automatically. Mock fallback ensures users always get a response.

### Timeout Budget (per request: 45s total)

| Stage              | Timeout | Behavior on timeout              |
| ------------------ | ------- | -------------------------------- |
| Keyword extraction | 5s      | Falls back to local search query |
| Evidence analysis  | 8s      | Skipped                          |
| LLM streaming      | 30s     | Tries next provider, then mock   |

## "Read & Chat" (边读边聊)

When a user opens the AI chat on an article page, the system enters **reading companion mode**:

1. **Article context** flows from `PostDetails.astro` → `Layout.astro` → `AIChatWidget` → `ChatPanel`
2. **Welcome message** references the current article title
3. **Quick prompts** are article-specific (summarize, explain, related topics)
4. **API request** includes `context: { scope: "article", article: {...} }`
5. **Server** enhances the prompt with article summary, key points, and reading companion instructions

## Components

### AIChatWidget.astro

Astro entry point. Accepts `lang` and optional `articleContext` props. Renders `AIChatContainer` with `client:idle`.

### AIChatContainer.tsx

Manages open/close state. Exposes `window.__aiChatToggle` for the floating action button.

### ChatPanel.tsx

Core chat UI built on `useChat` from `@ai-sdk/react`:

- `DefaultChatTransport` with `prepareSendMessagesRequest` for context injection
- Parts-based message rendering (`text`, `source`, custom data parts)
- Error display with retry button (`regenerate()`)
- Status indicators from message metadata
- Mock mode with character-by-character streaming simulation

## Exports

| Path             | Contents                                                        |
| ---------------- | --------------------------------------------------------------- |
| `.`              | All modules                                                     |
| `./server`       | `handleChatRequest`, `initializeMetadata`, error helpers, types |
| `./providers`    | Mock response/stream utilities                                  |
| `./middleware`   | Rate limiting                                                   |
| `./search`       | Article/project search, session cache                           |
| `./intelligence` | Keyword extraction, evidence analysis, citation guard, answer mode, evidence budget |
| `./prompt`       | System prompt builder                                           |
| `./data`         | Metadata loading                                                |
| `./stream`       | Stream utilities                                                |
| `./components/*` | Astro/Preact components                                         |

## Testing

The package includes comprehensive unit tests with Vitest:

```bash
cd packages/ai
pnpm test
```

Test coverage includes:
- Citation guard (10 tests)
- Intent detection (7 tests)
- Keyword extraction (7 tests)
- Evidence analysis (7 tests)
- Evidence budget (5 tests)

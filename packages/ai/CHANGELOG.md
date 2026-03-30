# Changelog

All notable changes to `@astro-minimax/ai` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.9.3] - 2026-03-29

### Changed

- **Workspace Runtime Alignment**: Reworked blog app configuration and workspace wiring so the example app, template, and shared runtime contract stay aligned.
- **AI Process Pipeline**: Improved cache reuse and skip handling in `packages/cli/src/tools/ai-process.ts` for more predictable generated-content runs.

### Accessibility

- **ChatInput.tsx**: Stronger labels, roles, and interaction semantics for screen readers and keyboard use.
- **ChatPanel.tsx**: Enhanced role, state, and interaction accessibility for screen readers and keyboard use.

## [0.9.2] - 2026-03-24

### Security

- **URL Protocol Validation**: Added `sanitizeUrl()` across AI chat (RichText) to prevent `javascript:`/`data:` XSS via model-generated links.
- **CORS Configurable**: Added `setCorsOrigin()` API and `env.CORS_ORIGIN` support, replacing hardcoded `Access-Control-Allow-Origin: *`.

### Changed

- **Component Splitting**: Extracted `RichText.tsx`, `ReasoningBlock.tsx`, `MessageBubble.tsx`, `ChatInput.tsx` from ChatPanel (1020→580 lines).
- **Single Source Constants**: Eliminated duplicated configuration constants across `keyword-extract`, `evidence-analysis`, `search-api`, `session-cache`, `cache`, `provider-manager`, and `structured-output` — all now import from `constants.ts`.
- **Stream Success Semantics**: `stream-helpers` now returns `success: false` when stream errors occur, preventing incorrect cache writes.

### Fixed

- **Domain Errors**: Added `ProviderError`/`SearchError`/`PipelineStageError`/`ConfigurationError` to root barrel export.
- **chat-handler.ts**: Fixed extra `}` at end of file causing compilation error.

## [0.9.1] - 2026-03-24

### Added

- **AI Tool Calling**: 7 built-in tools (toggleTheme, navigateToArticle, scrollToSection, toggleReadingMode, highlightText, setPreference, searchArticles) with table-driven mapping.
- **Paragraph-level RAG**: Hybrid search with chunk-level TF-IDF + RRF fusion and injection cache.
- **Tool Registry**: `registerTool()`/`unregisterTool()` API for custom tool injection.
- **Domain Error Types**: `ProviderError`, `SearchError`, `PipelineStageError`, `ConfigurationError`.
- **Logger Abstraction**: `createLogger(namespace)` + `setLogLevel()` replacing raw `console.*`.
- **Search Strategy Interface**: Extensible `SearchStrategy` for custom search implementations.

### Changed

- **ChatPanel Tool Handling**: Refactored 80-line switch statement to 40-line table-driven mapping.
- **Prompt Layer Decoupling**: `dynamic-layer.ts` no longer imports from `search/` or `cache/`, chunk selection moved to orchestration layer.
- **Provider Type Flexibility**: `ProviderAdapter.type` changed from literal union to `string` for third-party providers.
- **Constants Centralization**: Consolidated ~30% of scattered config values into `constants.ts`.

### Fixed

- **Circular Dependencies**: Eliminated `server/` → `../index.js` circular imports.
- **Session Cache Cleanup**: Removed ~50 lines of deprecated synchronous functions.

## [0.9.0] - 2026-03-22

### Changed

- **Documentation**: Updated AI functionality guide with new features and configuration details.
- **OG Image Generation**: Updated OG image generation tool with enhanced screenshot-related configuration options.

## [0.8.0] - 2026-03-17

### Added

- **AI Chat Integration**: Multi-provider support with automatic failover, RAG enhancement, streaming responses, and citation-layered hallucination prevention.
- **Article-Aware AI Chat**: Context-aware AI assistant that understands the current article content ("reading companion" mode).
- **AI Privacy Protection**: Automatic rejection of sensitive personal information queries.
- **Multi-provider Support**: Cloudflare Workers AI + OpenAI Compatible + Mock fallback with priority-based failover.
- **RAG Pipeline**: Keyword extraction and evidence analysis with timeout budgets.
- **Streaming Responses**: SSE-based real-time chat streaming.

## [0.1.0] - 2025-03-14

### Added

- Initial release of `@astro-minimax/ai`
- Multi-provider support for Cloudflare Workers AI and OpenAI-compatible APIs
- Automatic failover when primary provider fails
- Priority-based provider selection
- Streaming support via Server-Sent Events (SSE)
- `AIManager` class for centralized AI operations
- `AIManager.fromEnv()` for auto-detection of providers from environment
- TypeScript-first design with full type definitions
- Custom error types: `AIError`, `ProviderError`, `ConfigurationError`, `RateLimitError`, `QuotaExceededError`, `TimeoutError`
- Request statistics tracking
- Configurable retry with exponential backoff

### Providers

- **Cloudflare Workers AI** - Native binding integration with edge-optimized inference
- **OpenAI-Compatible** - Support for any OpenAI-compatible API (OpenAI, Moonshot, DeepSeek, etc.)

### Configuration

- Environment variable support (`AI_BINDING_NAME`, `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`)
- Dynamic binding name configuration for Cloudflare Workers AI
- Flexible provider configuration with priority and enabled flags

[0.9.3]: https://github.com/souloss/astro-minimax/releases/tag/%40astro-minimax%2Fai%400.9.3
[0.9.2]: https://github.com/souloss/astro-minimax/releases/tag/%40astro-minimax%2Fai%400.9.2
[0.9.1]: https://github.com/souloss/astro-minimax/releases/tag/%40astro-minimax%2Fai%400.9.1
[0.9.0]: https://github.com/souloss/astro-minimax/releases/tag/%40astro-minimax%2Fai%400.9.0
[0.8.0]: https://github.com/souloss/astro-minimax/releases/tag/%40astro-minimax%2Fai%400.8.0
[0.1.0]: https://github.com/souloss/astro-minimax/releases/tag/%40astro-minimax%2Fai%400.1.0

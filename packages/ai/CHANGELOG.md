# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[0.1.0]: https://github.com/souloss/astro-minimax/releases/tag/%40astro-minimax%2Fai%400.1.0
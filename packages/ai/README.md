# @astro-minimax/ai

[![npm version](https://img.shields.io/npm/v/@astro-minimax/ai)](https://www.npmjs.com/package/@astro-minimax/ai)
[![npm downloads](https://img.shields.io/npm/dm/@astro-minimax/ai)](https://www.npmjs.com/package/@astro-minimax/ai)
[![license](https://img.shields.io/npm/l/@astro-minimax/ai)](https://github.com/souloss/astro-minimax/blob/main/packages/ai/LICENSE)

> Multi-provider AI integration package with automatic failover support for Cloudflare Workers AI and OpenAI-compatible APIs.

## Features

- 🔄 **Multi-Provider Support** - Cloudflare Workers AI + OpenAI-compatible APIs
- ⚡ **Automatic Failover** - Seamlessly switch providers on failure
- 🎯 **Priority-Based Selection** - Choose providers by priority
- 📊 **Streaming Support** - Server-Sent Events (SSE) streaming
- 🔧 **TypeScript First** - Full type safety and IntelliSense
- 🪶 **Zero Runtime Dependencies** - Minimal footprint

## Installation

```bash
npm install @astro-minimax/ai
# or
pnpm add @astro-minimax/ai
# or
yarn add @astro-minimax/ai
```

### Peer Dependencies

```bash
npm install @cloudflare/workers-types
```

## Quick Start

### Cloudflare Workers AI

```typescript
import { AIManager } from '@astro-minimax/ai';

// Auto-detect from environment
const ai = AIManager.fromEnv(context.env);

// Chat
const response = await ai.chat([
  { role: 'user', content: 'Hello, how are you?' }
]);

console.log(response.text);
```

### Streaming Response

```typescript
const ai = AIManager.fromEnv(context.env);

for await (const chunk of ai.chatStream([
  { role: 'user', content: 'Write a short poem about coding' }
])) {
  if (chunk.type === 'text-delta') {
    process.stdout.write(chunk.text);
  } else if (chunk.type === 'done') {
    console.log('\n--- End of stream ---');
  } else if (chunk.type === 'error') {
    console.error('Error:', chunk.error);
  }
}
```

### Multi-Provider with Failover

```typescript
import { AIManager, CloudflareProvider, OpenAICompatibleProvider } from '@astro-minimax/ai';

const ai = new AIManager({
  providers: [
    {
      type: 'cloudflare',
      name: 'cloudflare-primary',
      bindingName: 'AI',
      model: '@cf/zai-org/glm-4.7-flash',
      priority: 1,  // Primary provider
    },
    {
      type: 'openai-compatible',
      name: 'openai-backup',
      baseUrl: 'https://api.openai.com',
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4o-mini',
      priority: 2,  // Fallback provider
    },
  ],
  enableFailover: true,
  maxRetries: 3,
});

// Initialize with Cloudflare environment
ai.initialize(context.env);
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `AI_BINDING_NAME` | Cloudflare AI binding name | `AI` |
| `AI_BASE_URL` | OpenAI-compatible API base URL | - |
| `AI_API_KEY` | OpenAI-compatible API key | - |
| `AI_MODEL` | Default model to use | `@cf/zai-org/glm-4.7-flash` |

### wrangler.toml (Cloudflare)

```toml
[ai]
binding = "AI"  # or your custom binding name
```

## API Reference

### `AIManager`

Central orchestrator for multi-provider AI with automatic failover.

#### Constructor

```typescript
new AIManager(config: AIManagerConfig)
```

#### Static Methods

| Method | Description |
|--------|-------------|
| `fromEnv(env)` | Create manager from environment (auto-detect providers) |

#### Instance Methods

| Method | Description |
|--------|-------------|
| `initialize(env)` | Initialize with runtime environment |
| `chat(messages, options?)` | Generate chat completion |
| `chatStream(messages, options?)` | Stream chat completion |
| `getProvider(name?)` | Get provider by name or default |
| `listProviders()` | List available providers |
| `getStats()` | Get request statistics |
| `isReady()` | Check if manager is ready |

### `ChatOptions`

```typescript
interface ChatOptions {
  systemPrompt?: string;      // System prompt
  maxTokens?: number;         // Max tokens (default: 1024)
  temperature?: number;       // Temperature 0-2 (default: 0.3)
  topP?: number;             // Top-p sampling
  stopSequences?: string[];   // Stop sequences
  providerOptions?: Record<string, unknown>;  // Provider-specific options
}
```

### `ChatResponse`

```typescript
interface ChatResponse {
  text: string;              // Generated text
  model: string;             // Model used
  provider: string;          // Provider name
  usage?: TokenUsage;        // Token usage stats
  finishReason?: string;     // Completion reason
  raw?: unknown;             // Raw provider response
}
```

### Error Classes

| Error Class | Type | Description |
|-------------|------|-------------|
| `AIError` | Base | Base error for AI operations |
| `ConfigurationError` | `CONFIGURATION_ERROR` | Invalid configuration |
| `ProviderError` | `PROVIDER_UNAVAILABLE` | Provider failure |
| `RateLimitError` | `RATE_LIMIT_EXCEEDED` | Rate limit hit |
| `QuotaExceededError` | `QUOTA_EXCEEDED` | Quota exhausted |
| `TimeoutError` | `TIMEOUT_ERROR` | Request timeout |

## Supported Models

### Cloudflare Workers AI

| Model ID | Description |
|----------|-------------|
| `@cf/zai-org/glm-4.7-flash` | GLM-4.7 Flash (recommended, 131K context) |
| `@cf/qwen/qwen2.5-coder-32b-instruct` | Qwen Coder |
| `@cf/meta/llama-3.1-8b-instruct` | Llama 3.1 8B |

[Full model list →](https://developers.cloudflare.com/workers-ai/models/)

### OpenAI-Compatible APIs

Any API compatible with OpenAI's chat completion endpoint:
- OpenAI (GPT-4, GPT-3.5)
- Moonshot (Kimi)
- DeepSeek
- Zhipu (GLM)
- And more...

## Examples

### Custom System Prompt

```typescript
const response = await ai.chat(
  [{ role: 'user', content: 'Explain quantum computing' }],
  {
    systemPrompt: 'You are a physics teacher. Explain concepts simply.',
    maxTokens: 500,
    temperature: 0.7,
  }
);
```

### Error Handling

```typescript
import { AIManager, AIError, ProviderError } from '@astro-minimax/ai';

try {
  const response = await ai.chat(messages);
} catch (error) {
  if (error instanceof ProviderError) {
    console.error(`Provider ${error.provider} failed:`, error.message);
  } else if (error instanceof AIError) {
    console.error('AI Error:', error.type, error.message);
  }
}
```

### Request Statistics

```typescript
const ai = AIManager.fromEnv(context.env);

// After some requests...
const stats = ai.getStats();
console.log('Total requests:', stats.totalRequests);
console.log('Success rate:', stats.successfulRequests / stats.totalRequests);
console.log('Provider stats:', stats.providers);
```

## TypeScript

This package is written in TypeScript and provides full type definitions.

```typescript
import type {
  AIProvider,
  ChatMessage,
  ChatOptions,
  ChatResponse,
  StreamChunk,
  AIManagerConfig,
  ProviderConfig,
} from '@astro-minimax/ai';
```

## License

MIT © [Souloss](https://github.com/souloss)

## Contributing

Contributions are welcome! Please read the [contributing guide](https://github.com/souloss/astro-minimax/blob/main/CONTRIBUTING.md) first.

## Links

- [Documentation](https://github.com/souloss/astro-minimax/tree/main/packages/ai)
- [GitHub Repository](https://github.com/souloss/astro-minimax)
- [npm Package](https://www.npmjs.com/package/@astro-minimax/ai)
- [Issue Tracker](https://github.com/souloss/astro-minimax/issues)
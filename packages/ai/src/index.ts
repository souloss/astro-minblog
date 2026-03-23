/**
 * @astro-minimax/ai
 *
 * Vendor-agnostic AI integration package with full RAG pipeline.
 * Supports OpenAI-compatible APIs and Cloudflare Workers AI.
 *
 * @packageDocumentation
 */

// Provider abstractions
export * from './providers/index.js';

// Provider Manager (unified multi-provider management)
export * from './provider-manager/index.js';

// Middleware (rate limiting)
export * from './middleware/index.js';

// Cache abstraction layer
export * from './cache/index.js';

// Search API + session cache
export * from './search/index.js';

// Intelligence: intent detection, keyword extraction, evidence analysis, citation guard
export * from './intelligence/index.js';

// System prompt builder (three layers)
export * from './prompt/index.js';

// Build-time metadata loading
export * from './data/index.js';

// Fact Registry: verified facts for hallucination reduction
export * from './fact-registry/index.js';

// Stream utilities
export * from './stream/index.js';

// Server-side API handlers (chat handler, metadata init)
export * from './server/index.js';

export * from './structured-output/index.js';

export * from './extensions/index.js';

#!/usr/bin/env node
/**
 * Standalone local AI dev server using Node.js built-in HTTP.
 * Runs alongside `astro dev` to provide /api/chat and /api/ai-info endpoints
 * when wrangler pages dev is unavailable.
 *
 * Usage:
 *   pnpm exec astro-ai-dev           # Start dev server
 *   pnpm exec astro-ai-dev --init    # Initialize datas/ directory
 *
 * Environment variables:
 *   AI_DEV_PORT - Port to listen on (default: 8787)
 *   AI_BASE_URL - AI provider base URL
 *   AI_API_KEY  - AI provider API key
 *   AI_MODEL    - AI model name
 */

import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { setLogLevel } from "../utils/logger.js";
import type { ChatHandlerEnv } from "./types.js";
import type { KnowledgeBundleFile } from "../data/knowledge-types.js";

interface NotifyCommentRuntimeModule {
  handleCommentWebhook(
    request: Request,
    env: Record<string, unknown>
  ): Promise<Response>;
}

const DEFAULT_SUMMARIES = {
  meta: {
    lastUpdated: new Date().toISOString(),
    model: "none",
    totalProcessed: 0,
  },
  articles: {},
};
const DEFAULT_AUTHOR_CONTEXT = { author: {}, posts: [] };
const DEFAULT_VOICE_PROFILE = { style: {}, examples: [] };
const DEFAULT_FACT_REGISTRY = {
  $schema: "fact-registry-v1",
  generatedAt: new Date().toISOString(),
  version: 1,
  facts: [],
  stats: {
    total: 0,
    byCategory: {
      author: 0,
      blog: 0,
      content: 0,
      project: 0,
      tech: 0,
    },
    avgConfidence: 0,
  },
};

const DEFAULT_KNOWLEDGE_BUNDLE = {
  $schema: "knowledge-bundle-v1",
  version: 1,
  generatedAt: new Date().toISOString(),
  corpusHash: "dev-server-default",
  runtime: {
    summaries: DEFAULT_SUMMARIES,
    authorContext: DEFAULT_AUTHOR_CONTEXT,
    voiceProfile: DEFAULT_VOICE_PROFILE,
    factRegistry: DEFAULT_FACT_REGISTRY,
    vectorIndex: null,
  },
  corpus: {
    $schema: "knowledge-corpus-v1",
    version: 1,
    generatedAt: new Date().toISOString(),
    documents: [],
  },
  passages: {
    $schema: "knowledge-passages-v1",
    version: 1,
    generatedAt: new Date().toISOString(),
    passages: [],
  },
};

function findBlogRoot(): { root: string; datasDir: string; hasDatas: boolean } {
  let dir = process.cwd();

  for (let i = 0; i < 10; i++) {
    if (existsSync(resolve(dir, "datas"))) {
      return { root: dir, datasDir: resolve(dir, "datas"), hasDatas: true };
    }
    if (existsSync(resolve(dir, "apps", "blog", "datas"))) {
      return {
        root: resolve(dir, "apps", "blog"),
        datasDir: resolve(dir, "apps", "blog", "datas"),
        hasDatas: true,
      };
    }
    const parent = resolve(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }

  return {
    root: process.cwd(),
    datasDir: resolve(process.cwd(), "datas"),
    hasDatas: false,
  };
}

function loadEnv(envPath: string): void {
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function initDatasDirectory(datasDir: string): void {
  if (!existsSync(datasDir)) {
    mkdirSync(datasDir, { recursive: true });
  }

  const runtimeDir = resolve(datasDir, "knowledge", "runtime");
  mkdirSync(runtimeDir, { recursive: true });

  const files = [
    {
      name: resolve(runtimeDir, "knowledge-bundle.json"),
      label: "knowledge/runtime/knowledge-bundle.json",
      content: DEFAULT_KNOWLEDGE_BUNDLE,
    },
  ];

  for (const file of files) {
    if (!existsSync(file.name)) {
      writeFileSync(file.name, JSON.stringify(file.content, null, 2) + "\n");
      console.log(`   Created ${file.label}`);
    } else {
      console.log(`   Skipped ${file.label} (already exists)`);
    }
  }
}

function loadJson(
  datasDir: string,
  file: string,
  defaultValue: unknown
): unknown {
  const path = resolve(datasDir, file);
  if (existsSync(path)) {
    try {
      return JSON.parse(readFileSync(path, "utf-8"));
    } catch (e) {
      console.warn(`   Warning: Failed to parse ${file}, using defaults`);
      return defaultValue;
    }
  }
  return defaultValue;
}

async function setupHandler(datasDir: string, hasDatas: boolean) {
  const { handleChatRequest, initializeMetadata } = await import("./index.js");
  const {
    getProviderManager,
    hasAnyProviderConfigured,
    getResponseCacheConfig,
  } = await import("../index.js");

  // Show warnings for missing metadata
  if (!hasDatas) {
    console.log(
      "\n   ⚠️  No datas/ directory found. AI chat will work with empty context."
    );
    console.log(
      '   Run "pnpm exec astro-ai-dev --init" to create placeholder files.\n'
    );
  } else {
    const hasKnowledgeBundle = existsSync(
      resolve(datasDir, "knowledge", "runtime", "knowledge-bundle.json")
    );
    if (!hasKnowledgeBundle) {
      console.log(
        "\n   ⚠️  knowledge/runtime/knowledge-bundle.json is missing. AI chat may have limited context.\n"
      );
    }
  }

  const knowledgeBundle = loadJson(
    datasDir,
    "knowledge/runtime/knowledge-bundle.json",
    DEFAULT_KNOWLEDGE_BUNDLE
  ) as KnowledgeBundleFile;
  const env: ChatHandlerEnv = { ...process.env };

  initializeMetadata(
    {
      knowledgeBundle: knowledgeBundle as Parameters<
        typeof initializeMetadata
      >[0]["knowledgeBundle"],
      siteUrl: process.env.SITE_URL || "http://localhost:4321",
    },
    env
  );

  return {
    handleChatRequest,
    initializeMetadata,
    getProviderManager,
    hasAnyProviderConfigured,
    getResponseCacheConfig,
    env,
    knowledgeBundle,
    vectorIndex: knowledgeBundle.runtime.vectorIndex ?? null,
  };
}

function toWebRequest(req: IncomingMessage): Promise<Request> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const body = Buffer.concat(chunks);
      const url = `http://localhost${req.url || "/"}`;
      resolve(
        new Request(url, {
          method: req.method || "GET",
          headers: req.headers as Record<string, string>,
          body:
            req.method !== "GET" && req.method !== "HEAD" ? body : undefined,
        })
      );
    });
    req.on("error", reject);
  });
}

async function sendWebResponse(
  webRes: Response,
  res: ServerResponse
): Promise<void> {
  const headerEntries: Array<[string, string]> = [];
  webRes.headers.forEach((value, key) => {
    headerEntries.push([key, value]);
  });
  res.writeHead(webRes.status, Object.fromEntries(headerEntries));
  if (!webRes.body) {
    res.end();
    return;
  }
  const reader = webRes.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
  } finally {
    res.end();
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--init") || args.includes("-i")) {
    const { datasDir } = findBlogRoot();
    console.log("\n📦 Initializing datas/ directory...\n");
    console.log(`   Location: ${datasDir}\n`);
    initDatasDirectory(datasDir);
    console.log("\n✅ Done! You can now configure your AI metadata files.\n");
    process.exit(0);
  }

  if (process.env.AI_DEBUG) setLogLevel("debug");
  else if (process.env.AI_LOG_LEVEL)
    setLogLevel(
      process.env.AI_LOG_LEVEL as "debug" | "info" | "warn" | "error"
    );

  const port = parseInt(process.env.AI_DEV_PORT || "8787", 10);
  const { root: blogRoot, datasDir, hasDatas } = findBlogRoot();

  loadEnv(resolve(blogRoot, ".env"));

  console.log("\n🤖 AI Dev Server starting...\n");
  console.log(`   Working directory: ${blogRoot}`);
  console.log(
    `   Datas directory: ${datasDir} ${hasDatas ? "✓" : "(not found)"}`
  );
  console.log(`   Port: ${port}`);
  console.log(
    `   AI_BASE_URL: ${process.env.AI_BASE_URL ? "✓ configured" : "✗ not set"}`
  );
  console.log(
    `   AI_API_KEY: ${process.env.AI_API_KEY ? "✓ configured" : "✗ not set"}`
  );
  console.log(`   AI_MODEL: ${process.env.AI_MODEL || "(default)"}`);

  const {
    handleChatRequest,
    getProviderManager,
    hasAnyProviderConfigured,
    getResponseCacheConfig,
    env,
    knowledgeBundle,
    vectorIndex,
  } = await setupHandler(datasDir, hasDatas);

  const server = createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-session-id");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = req.url || "/";

    try {
      if (url.startsWith("/api/chat")) {
        const webReq = await toWebRequest(req);
        const webRes = await handleChatRequest({ env, request: webReq });
        await sendWebResponse(webRes, res);
        return;
      }

      if (url.startsWith("/api/notify/comment")) {
        const { handleCommentWebhook } =
          (await import("@astro-minimax/notify")) as unknown as NotifyCommentRuntimeModule;
        const webReq = await toWebRequest(req);
        const webRes = await handleCommentWebhook(webReq, process.env);
        await sendWebResponse(webRes, res);
        return;
      }

      if (url.startsWith("/api/ai-info")) {
        const manager = getProviderManager(env, { enableMockFallback: true });
        const providerStatus = manager.getProviderStatus();
        const mockMode = !!env.AI_MOCK_MODE;
        const configured = hasAnyProviderConfigured(env) || mockMode;
        const providers =
          providerStatus.length > 0
            ? providerStatus
            : mockMode
              ? [
                  {
                    id: "mock",
                    type: "mock",
                    weight: 0,
                    healthy: true,
                    model: "mock",
                    health: {
                      consecutiveFailures: 0,
                      totalRequests: 0,
                      successfulRequests: 0,
                      lastError: null,
                      lastErrorTime: null,
                      lastSuccessTime: null,
                    },
                  },
                ]
              : [];
        const responseCacheConfig = getResponseCacheConfig(env);

        const timeoutConfig = {
          request: Number(env.AI_TIMEOUT_REQUEST) || 45000,
          keywordExtraction: Number(env.AI_TIMEOUT_KEYWORD) || 5000,
          evidenceAnalysis: Number(env.AI_TIMEOUT_EVIDENCE) || 8000,
          llmStreaming: Number(env.AI_TIMEOUT_LLM) || 30000,
        };

        const healthConfig = {
          unhealthyThreshold: Number(env.AI_HEALTH_THRESHOLD) || 3,
          recoveryTtl: Number(env.AI_HEALTH_RECOVERY_TTL) || 60000,
        };

        const dataStatus = {
          knowledgeBundle: {
            loaded: true,
            count: Array.isArray(
              (knowledgeBundle as { corpus?: { documents?: unknown[] } })
                ?.corpus?.documents
            )
              ? (knowledgeBundle as { corpus: { documents: unknown[] } }).corpus
                  .documents.length
              : undefined,
            lastUpdated: (knowledgeBundle as { generatedAt?: string })
              ?.generatedAt,
          },
          vectorIndex: {
            loaded: Boolean(vectorIndex),
            lastUpdated: (knowledgeBundle as { generatedAt?: string })
              ?.generatedAt,
          },
        };

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify(
            {
              status: "ok",
              mode: "dev-server",
              timestamp: new Date().toISOString(),
              ai: {
                enabled: true,
                mockMode,
                configured,
                cache: {
                  enabled: responseCacheConfig.enabled,
                  ttl: responseCacheConfig.defaultTtl,
                  playbackDelay: responseCacheConfig.playbackDelayMs,
                  chunkSize: responseCacheConfig.chunkSize,
                  thinkingDelay: responseCacheConfig.thinkingPlaybackDelayMs,
                },
                timeouts: timeoutConfig,
                health: healthConfig,
                providers: providers.map(p => ({
                  id: p.id,
                  type: p.type,
                  weight: p.weight,
                  healthy: "healthy" in p ? p.healthy : p.health.healthy,
                  model: p.model,
                  healthDetails: {
                    consecutiveFailures: p.health.consecutiveFailures,
                    totalRequests: p.health.totalRequests,
                    successfulRequests: p.health.successfulRequests,
                    lastError: p.health.lastError,
                    lastErrorTime: p.health.lastErrorTime,
                    lastSuccessTime: p.health.lastSuccessTime,
                  },
                })),
                dataStatus,
              },
              hints:
                manager.hasProviders() || mockMode
                  ? [
                      `Providers available: ${providers.length}`,
                      "Mock fallback: enabled",
                      responseCacheConfig.enabled
                        ? "Response cache: enabled"
                        : "Response cache: disabled",
                    ]
                  : [
                      "No AI providers configured. Set AI_BASE_URL + AI_API_KEY environment variables.",
                    ],
            },
            null,
            2
          )
        );
        return;
      }

      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
    } catch (err) {
      console.error("[AI Dev Server] Error:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: "Internal server error",
          detail: err instanceof Error ? err.message : String(err),
        })
      );
    }
  });

  const host = process.env.AI_DEV_HOST || '127.0.0.1';
  server.listen(port, host, () => {
    console.log(`\n✅ AI Dev Server running at http://${host}:${port}`);
    console.log(`   POST http://localhost:${port}/api/chat`);
    console.log(`   GET  http://localhost:${port}/api/ai-info`);
    console.log(
      `\n   Tip: Run "pnpm exec astro-ai-dev --init" to create datas/ directory.\n`
    );
  });

  // Graceful shutdown on SIGINT (Ctrl+C) and SIGTERM
  const shutdown = (signal: string) => {
    console.log(`\n🛑 AI Dev Server received ${signal}, shutting down...`);
    server.close(() => {
      console.log("✅ AI Dev Server closed");
      process.exit(0);
    });
    // Force exit after 3 seconds if connections are pending
    setTimeout(() => {
      console.log("⚠️  Force closing after timeout");
      process.exit(1);
    }, 3000);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch(err => {
  console.error("\n❌ Failed to start AI Dev Server:", err);
  process.exit(1);
});

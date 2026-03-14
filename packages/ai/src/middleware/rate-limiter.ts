/**
 * Three-tier IP-based rate limiter for chat API.
 * Tiers: burst (short), sustained (medium), daily (long).
 */

interface RateLimitWindow {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitConfig {
  burst: RateLimitWindow;
  sustained: RateLimitWindow;
  daily: RateLimitWindow;
  enabled: boolean;
}

interface ClientRecord {
  timestamps: number[];
  lastCleanup: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs: number;
  limit: number;
  remaining: number;
  triggeredBy: 'burst' | 'sustained' | 'daily' | null;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (!value) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

function buildConfig(env: Record<string, string | undefined>): RateLimitConfig {
  return {
    enabled: parseBool(env.CHAT_RATE_LIMIT_ENABLED, true),
    burst: {
      maxRequests: parsePositiveInt(env.CHAT_RATE_LIMIT_BURST_MAX, 3),
      windowMs: parsePositiveInt(env.CHAT_RATE_LIMIT_BURST_WINDOW_MS, 10_000),
    },
    sustained: {
      maxRequests: parsePositiveInt(env.CHAT_RATE_LIMIT_SUSTAINED_MAX, 20),
      windowMs: parsePositiveInt(env.CHAT_RATE_LIMIT_SUSTAINED_WINDOW_MS, 60_000),
    },
    daily: {
      maxRequests: parsePositiveInt(env.CHAT_RATE_LIMIT_DAILY_MAX, 100),
      windowMs: parsePositiveInt(env.CHAT_RATE_LIMIT_DAILY_WINDOW_MS, 86_400_000),
    },
  };
}

// In-memory store — shared within the same Worker isolate
const clients = new Map<string, ClientRecord>();
let lastGlobalCleanup = Date.now();
const GLOBAL_CLEANUP_INTERVAL_MS = 300_000;

function pruneStaleClients(now: number, dailyWindowMs: number): void {
  if (now - lastGlobalCleanup < GLOBAL_CLEANUP_INTERVAL_MS) return;
  lastGlobalCleanup = now;
  const cutoff = now - dailyWindowMs;
  for (const [ip, record] of clients) {
    if (!record.timestamps.length || record.timestamps[record.timestamps.length - 1] < cutoff) {
      clients.delete(ip);
    }
  }
}

/**
 * Extracts the real client IP from the request headers.
 * Priority: cf-connecting-ip > x-forwarded-for > x-real-ip > 'unknown'
 */
export function getClientIP(req: Request): string {
  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * Checks the rate limit for the given IP and env configuration.
 * Records the request if allowed.
 */
export function checkRateLimit(
  ip: string,
  env: Record<string, string | undefined> = {},
): RateLimitResult {
  const config = buildConfig(env);

  if (!config.enabled) {
    return { allowed: true, retryAfterMs: 0, limit: config.sustained.maxRequests, remaining: config.sustained.maxRequests, triggeredBy: null };
  }

  const now = Date.now();
  pruneStaleClients(now, config.daily.windowMs);

  let record = clients.get(ip);
  if (!record) {
    record = { timestamps: [], lastCleanup: now };
    clients.set(ip, record);
  }

  // Lazy cleanup of per-client record
  if (now - record.lastCleanup > 60_000) {
    const cutoff = now - config.daily.windowMs;
    record.timestamps = record.timestamps.filter(t => t > cutoff);
    record.lastCleanup = now;
  }

  // Check each tier from strictest to most lenient
  const tiers: Array<{ name: 'burst' | 'sustained' | 'daily'; cfg: RateLimitWindow }> = [
    { name: 'burst', cfg: config.burst },
    { name: 'sustained', cfg: config.sustained },
    { name: 'daily', cfg: config.daily },
  ];

  for (const { name, cfg } of tiers) {
    const windowStart = now - cfg.windowMs;
    const count = record.timestamps.filter(t => t > windowStart).length;

    if (count >= cfg.maxRequests) {
      const oldest = record.timestamps.find(t => t > windowStart) ?? now;
      const retryAfterMs = Math.max(oldest + cfg.windowMs - now, 1000);
      return { allowed: false, retryAfterMs, limit: cfg.maxRequests, remaining: 0, triggeredBy: name };
    }
  }

  // Request is allowed — record timestamp
  record.timestamps.push(now);

  const sustainedStart = now - config.sustained.windowMs;
  const sustainedCount = record.timestamps.filter(t => t > sustainedStart).length;

  return {
    allowed: true,
    retryAfterMs: 0,
    limit: config.sustained.maxRequests,
    remaining: Math.max(config.sustained.maxRequests - sustainedCount, 0),
    triggeredBy: null,
  };
}

const RATE_LIMIT_MESSAGES: Record<string, string> = {
  burst: '请求太频繁，请稍后再试',
  sustained: '请求次数过多，请一分钟后再试',
  daily: '今日对话次数已达上限，请明天再来',
};

/**
 * Builds a 429 response for a rejected rate limit check.
 */
export function rateLimitResponse(result: RateLimitResult): Response {
  const message = RATE_LIMIT_MESSAGES[result.triggeredBy ?? 'burst'];
  const retryAfterSeconds = Math.ceil(result.retryAfterMs / 1000);

  return new Response(JSON.stringify({ error: message }), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': String(retryAfterSeconds),
      'X-RateLimit-Limit': String(result.limit),
      'X-RateLimit-Remaining': String(result.remaining),
    },
  });
}

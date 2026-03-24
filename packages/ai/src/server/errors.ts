import type { ChatErrorResponse } from './types.js';
import { t, type AITranslationKey } from '../utils/i18n.js';

let _allowedOrigin = '*';

export function setCorsOrigin(origin: string): void {
  _allowedOrigin = origin;
}

function corsHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': _allowedOrigin,
  };
}

export function chatError(
  code: string,
  error: string,
  status: number,
  options?: { retryable?: boolean; retryAfter?: number },
): Response {
  const body: ChatErrorResponse = {
    error,
    code,
    retryable: options?.retryable ?? false,
    retryAfter: options?.retryAfter,
  };
  const headers: HeadersInit = { ...corsHeaders() };
  if (options?.retryAfter) {
    (headers as Record<string, string>)['Retry-After'] = String(options.retryAfter);
  }
  return new Response(JSON.stringify(body), { status, headers });
}

function te(key: AITranslationKey, lang?: string, vars?: Record<string, string | number>): string {
  return t(key, lang ?? 'zh', vars);
}

export const errors = {
  methodNotAllowed: (lang?: string) =>
    chatError('METHOD_NOT_ALLOWED', lang === 'en' ? 'Method not allowed' : '方法不允许', 405),
  invalidRequest: (detail?: string, lang?: string) =>
    chatError('INVALID_REQUEST', detail ?? te('ai.error.format', lang), 400),
  emptyMessage: (lang?: string) =>
    chatError('INVALID_REQUEST', te('ai.error.emptyMessage', lang), 400),
  emptyContent: (lang?: string) =>
    chatError('INVALID_REQUEST', te('ai.error.emptyContent', lang), 400),
  inputTooLong: (max: number, lang?: string) =>
    chatError('INPUT_TOO_LONG', te('ai.error.inputTooLong', lang, { max }), 400),
  rateLimited: (retryAfter?: number, lang?: string) =>
    chatError('RATE_LIMITED', te('ai.error.rateLimit', lang), 429, { retryable: true, retryAfter: retryAfter ?? 10 }),
  timeout: (lang?: string) =>
    chatError('TIMEOUT', te('ai.error.timeout', lang), 504, { retryable: true }),
  providerUnavailable: (lang?: string) =>
    chatError('PROVIDER_UNAVAILABLE', te('ai.error.unavailable', lang), 503, { retryable: true, retryAfter: 30 }),
  internal: (detail?: string, lang?: string) =>
    chatError('INTERNAL_ERROR', detail ?? te('ai.error.generic', lang), 500, { retryable: true, retryAfter: 5 }),
};

export function corsPreflightResponse(): Response {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': _allowedOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-session-id',
    },
  });
}

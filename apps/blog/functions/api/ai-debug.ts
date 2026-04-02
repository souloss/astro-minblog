/// <reference types="@cloudflare/workers-types" />
import { getSessionTrace } from "@astro-minimax/ai/search";
import {
  createAiFunctionEnv,
  type FunctionEnv,
} from "./shared-ai-env";
import { errors } from "@astro-minimax/ai/server";

const SESSION_ID_PATTERN = /^[a-z0-9][a-z0-9_:-]{7,63}$/i;

export const onRequest: PagesFunction<FunctionEnv> = async context => {
  const env = createAiFunctionEnv(context.env);
  const url = new URL(context.request.url);
  const sessionId = url.searchParams.get('session_id');

  if (!sessionId) {
    return errors.invalidRequest('session_id query parameter is required');
  }

  if (!SESSION_ID_PATTERN.test(sessionId)) {
    return errors.invalidRequest('Invalid session_id format');
  }

  const trace = await getSessionTrace(sessionId);

  if (!trace) {
    return new Response(
      JSON.stringify({
        error: 'Trace not found',
        message: 'No trace found for this session_id. It may have expired (1h TTL).',
        sessionId,
      }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  return new Response(JSON.stringify(trace, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  });
};
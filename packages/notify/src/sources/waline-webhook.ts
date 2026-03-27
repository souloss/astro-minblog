import {
  createNotifyConfigFromEnv,
  hasNotifyProviderConfig,
} from "../config.js";
import { createNotifier } from "../core/notifier.js";
import { silentLogger } from "../core/logger.js";
import type { NotifyEnv } from "../types.js";
import { adaptWalineComment } from "./waline.js";

export async function handleCommentWebhook(
  request: Request,
  env: NotifyEnv
): Promise<Response> {
  try {
    if (!hasNotifyProviderConfig(env)) {
      return jsonError("No notification providers configured", 400);
    }

    let rawData: unknown;
    try {
      rawData = await request.json();
    } catch {
      return jsonError("Invalid JSON payload", 400);
    }

    const adapted = adaptWalineComment(rawData, env.SITE_URL || "");
    if (!adapted.input) {
      return jsonError("Invalid payload structure", 400);
    }

    const result = await createNotifier({
      ...createNotifyConfigFromEnv(env),
      logger: silentLogger,
    }).comment(adapted.input);

    return jsonResponse(
      {
        success: result.success,
        event: adapted.eventType,
        channels: result.results.map(item => ({
          channel: item.channel,
          success: item.success,
        })),
      },
      200
    );
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unknown error",
      500
    );
  }
}

function jsonResponse(body: object, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function jsonError(message: string, status: number): Response {
  return jsonResponse({ error: message }, status);
}

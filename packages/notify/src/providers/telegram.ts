import type {
  TelegramConfig,
  TelegramTemplate,
  SendResult,
  Logger,
} from "../types.js";
import {
  createFailureResult,
  getDuration,
  getErrorMessage,
} from "../provider-helpers.js";

export interface TelegramProvider {
  send(template: TelegramTemplate): Promise<SendResult>;
}

export function createTelegramProvider(
  config: TelegramConfig,
  logger?: Logger
): TelegramProvider {
  const { botToken, chatId } = config;

  return {
    async send(template: TelegramTemplate): Promise<SendResult> {
      const start = Date.now();

      try {
        // Note: Proxy configuration is not supported in Cloudflare Edge Runtime.
        // If you need proxy support, consider using a dedicated proxy service
        // or running the notification service in a Node.js environment.

        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: template.text,
            parse_mode: template.parse_mode ?? "HTML",
            disable_web_page_preview: false,
          }),
          signal: AbortSignal.timeout(10_000),
        });

        const duration = getDuration(start);

        if (!response.ok) {
          const errorText = await response.text();
          const errorMsg = `Telegram API error: ${response.status} - ${errorText}`;

          logger?.error("Telegram send failed", new Error(errorMsg), {
            chatId,
            status: response.status,
          });

          return {
            channel: "telegram",
            success: false,
            error: errorMsg,
            duration,
          };
        }

        logger?.info("Telegram notification sent", { chatId, duration });

        return {
          channel: "telegram",
          success: true,
          duration,
        };
      } catch (error) {
        const duration = getDuration(start);
        const errorMsg = getErrorMessage(error);

        logger?.error(
          "Telegram send failed",
          error instanceof Error ? error : undefined,
          {
            chatId,
            error: errorMsg,
          }
        );

        return createFailureResult("telegram", errorMsg, duration);
      }
    },
  };
}

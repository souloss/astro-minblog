import type { NotifyConfig, NotifyEnv } from "./types.js";

export function createNotifyConfigFromEnv(env: NotifyEnv): NotifyConfig {
  return {
    telegram:
      env.NOTIFY_TELEGRAM_BOT_TOKEN && env.NOTIFY_TELEGRAM_CHAT_ID
        ? {
            botToken: env.NOTIFY_TELEGRAM_BOT_TOKEN,
            chatId: env.NOTIFY_TELEGRAM_CHAT_ID,
          }
        : undefined,
    webhook: env.NOTIFY_WEBHOOK_URL
      ? {
          url: env.NOTIFY_WEBHOOK_URL,
        }
      : undefined,
    email:
      env.NOTIFY_RESEND_API_KEY &&
      env.NOTIFY_RESEND_FROM &&
      env.NOTIFY_RESEND_TO
        ? {
            provider: "resend",
            apiKey: env.NOTIFY_RESEND_API_KEY,
            from: env.NOTIFY_RESEND_FROM,
            to: env.NOTIFY_RESEND_TO,
          }
        : undefined,
  };
}

export function hasNotifyProviderConfig(env: NotifyEnv): boolean {
  const config = createNotifyConfigFromEnv(env);
  return Boolean(config.telegram || config.webhook || config.email);
}

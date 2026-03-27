import {
  createTelegramProvider,
  createWebhookProvider,
  createEmailProvider,
  type TelegramProvider,
  type WebhookProvider,
  type EmailProvider,
} from "../providers/index.js";
import type { Logger, NotifyConfig } from "../types.js";

export interface Providers {
  telegram?: TelegramProvider;
  webhook?: WebhookProvider;
  email?: EmailProvider;
}

export function createProviders(
  config: NotifyConfig,
  logger: Logger
): Providers {
  const providers: Providers = {};

  if (config.telegram) {
    providers.telegram = createTelegramProvider(config.telegram, logger);
  }

  if (config.webhook) {
    providers.webhook = createWebhookProvider(config.webhook, logger);
  }

  if (config.email) {
    providers.email = createEmailProvider(config.email, logger);
  }

  return providers;
}

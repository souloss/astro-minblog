/// <reference types="@cloudflare/workers-types" />
import {
  createNotifyConfigFromEnv,
  type NotifyEnv,
} from "@astro-minimax/notify";

interface ProviderStatus {
  configured: boolean;
  missingFields?: string[];
}

interface NotifyStatusResponse {
  timestamp: string;
  environment: "production" | "preview" | "unknown";
  providers: {
    telegram: ProviderStatus;
    email: ProviderStatus;
    webhook: ProviderStatus;
  };
  siteUrl: {
    configured: boolean;
    value?: string;
  };
  summary: {
    totalProviders: number;
    configuredProviders: number;
    hasAnyProvider: boolean;
  };
}

function isRuntimeEnvironment(
  value: string | null
): value is NotifyStatusResponse["environment"] {
  return value === "production" || value === "preview" || value === "unknown";
}

function collectMissingFields(fields: Array<string | false>): string[] {
  return fields.filter((field): field is string => Boolean(field));
}

export const onRequest: PagesFunction<NotifyEnv> = async context => {
  const env = context.env;
  const config = createNotifyConfigFromEnv(env);

  const telegramMissing = collectMissingFields([
    !env.NOTIFY_TELEGRAM_BOT_TOKEN && "NOTIFY_TELEGRAM_BOT_TOKEN",
    !env.NOTIFY_TELEGRAM_CHAT_ID && "NOTIFY_TELEGRAM_CHAT_ID",
  ]);

  const emailMissing = collectMissingFields([
    !env.NOTIFY_RESEND_API_KEY && "NOTIFY_RESEND_API_KEY",
    !env.NOTIFY_RESEND_FROM && "NOTIFY_RESEND_FROM",
    !env.NOTIFY_RESEND_TO && "NOTIFY_RESEND_TO",
  ]);

  const webhookMissing = collectMissingFields([
    !env.NOTIFY_WEBHOOK_URL && "NOTIFY_WEBHOOK_URL",
  ]);

  const requestedEnvironment = context.request.headers.get("x-cf-env");
  const environment = isRuntimeEnvironment(requestedEnvironment)
    ? requestedEnvironment
    : "unknown";

  const providers = {
    telegram: {
      configured: Boolean(config.telegram),
      missingFields: telegramMissing.length > 0 ? telegramMissing : undefined,
    },
    email: {
      configured: Boolean(config.email),
      missingFields: emailMissing.length > 0 ? emailMissing : undefined,
    },
    webhook: {
      configured: Boolean(config.webhook),
      missingFields: webhookMissing.length > 0 ? webhookMissing : undefined,
    },
  };

  const configuredProviders = Object.values(providers).filter(
    p => p.configured
  ).length;

  const response: NotifyStatusResponse = {
    timestamp: new Date().toISOString(),
    environment,
    providers,
    siteUrl: {
      configured: !!env.SITE_URL,
      value: env.SITE_URL ? "[CONFIGURED]" : undefined,
    },
    summary: {
      totalProviders: 3,
      configuredProviders,
      hasAnyProvider: configuredProviders > 0,
    },
  };

  return new Response(JSON.stringify(response, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
};

import type {
  AiChatEvent,
  Channel,
  CommentEvent,
  EmailTemplate,
  EventTemplates,
  Logger,
  NotifyEvent,
  NotifyResult,
  SendResult,
  TelegramTemplate,
  WebhookPayload,
} from "../types.js";
import { getErrorMessage } from "../provider-helpers.js";
import type { Providers } from "./provider-registry.js";

interface ChannelResult {
  channel: Channel;
  result: SendResult;
}

interface TemplateSet<T extends NotifyEvent> {
  telegram: (event: T) => TelegramTemplate;
  webhook: (event: T) => WebhookPayload;
  email: (event: T) => EmailTemplate;
}

function sendThroughProvider(
  channel: Channel,
  send: () => Promise<SendResult>,
  logger: Logger,
  label: string
): Promise<ChannelResult> {
  return send()
    .then(result => {
      logger.info(label, {
        success: result.success,
        duration: result.duration,
      });
      return { channel, result };
    })
    .catch(error => {
      logger.error(
        `${label} rejected`,
        error instanceof Error ? error : undefined,
        {
          error: getErrorMessage(error),
        }
      );

      return {
        channel,
        result: {
          channel,
          success: false,
          error: getErrorMessage(error),
        },
      };
    });
}

function createSendTasks<T extends NotifyEvent>(
  event: T,
  providers: Providers,
  logger: Logger,
  templates: TemplateSet<T>
): Promise<ChannelResult>[] {
  const tasks: Promise<ChannelResult>[] = [];

  if (providers.telegram) {
    tasks.push(
      sendThroughProvider(
        "telegram",
        () => providers.telegram!.send(templates.telegram(event)),
        logger,
        "Telegram notification result"
      )
    );
  }

  if (providers.webhook) {
    tasks.push(
      sendThroughProvider(
        "webhook",
        () => providers.webhook!.send(templates.webhook(event)),
        logger,
        "Webhook notification result"
      )
    );
  }

  if (providers.email) {
    tasks.push(
      sendThroughProvider(
        "email",
        () => providers.email!.send(templates.email(event)),
        logger,
        "Email notification result"
      )
    );
  }

  return tasks;
}

function dispatchTypedEvent<T extends NotifyEvent>(
  event: T,
  providers: Providers,
  logger: Logger,
  templates: TemplateSet<T>
): Promise<NotifyResult> {
  const tasks = createSendTasks(event, providers, logger, templates);

  return Promise.allSettled(tasks).then(settled => {
    const results: SendResult[] = [];

    for (const item of settled) {
      if (item.status === "fulfilled") {
        results.push(item.value.result);
      }
    }

    return {
      event: event.type,
      results,
      success: results.some(result => result.success),
    };
  });
}

export function dispatchEvent(
  event: NotifyEvent,
  providers: Providers,
  logger: Logger,
  templates: EventTemplates,
  hasProviders: boolean
): Promise<NotifyResult> {
  if (!hasProviders) {
    return Promise.resolve({
      event: event.type,
      results: [],
      success: false,
    });
  }

  if (event.type === "comment") {
    return dispatchTypedEvent<CommentEvent>(
      event,
      providers,
      logger,
      templates.comment
    );
  }

  return dispatchTypedEvent<AiChatEvent>(
    event,
    providers,
    logger,
    templates["ai-chat"]
  );
}

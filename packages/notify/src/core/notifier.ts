import { dispatchEvent } from "./dispatch.js";
import {
  createAiChatEvent,
  createCommentEvent,
  withTimestamp,
} from "./event-factory.js";
import { DefaultLogger } from "./logger.js";
import { createProviders } from "./provider-registry.js";
import { mergeTemplates } from "./template-registry.js";
import { createAiRuntimeEventInput } from "../sources/ai-runtime.js";
import type {
  AiChatEvent,
  CommentEvent,
  Notifier,
  NotifyConfig,
  NotifyEvent,
  NotifyResult,
} from "../types.js";

export function createNotifier(config: NotifyConfig): Notifier {
  const logger = config.logger ?? new DefaultLogger();
  const templates = mergeTemplates(config.templates);
  const providers = createProviders(config, logger);
  const hasProviders = Object.keys(providers).length > 0;

  if (!hasProviders) {
    logger.warn("No notification providers configured");
  }

  return {
    async comment(event: Omit<CommentEvent, "type">): Promise<NotifyResult> {
      return dispatchEvent(
        createCommentEvent(event),
        providers,
        logger,
        templates,
        hasProviders
      );
    },

    async aiChat(event: Omit<AiChatEvent, "type">): Promise<NotifyResult> {
      return dispatchEvent(
        createAiChatEvent(createAiRuntimeEventInput(event)),
        providers,
        logger,
        templates,
        hasProviders
      );
    },

    async send(event: NotifyEvent): Promise<NotifyResult> {
      return dispatchEvent(
        withTimestamp(event),
        providers,
        logger,
        templates,
        hasProviders
      );
    },
  };
}

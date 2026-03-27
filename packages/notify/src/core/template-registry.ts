import { defaultTemplates } from "../templates/index.js";
import type { EventTemplates } from "../types.js";

export function mergeTemplates(
  custom?: Partial<EventTemplates>
): EventTemplates {
  if (!custom) return defaultTemplates;

  return {
    comment: {
      telegram: custom.comment?.telegram ?? defaultTemplates.comment.telegram,
      webhook: custom.comment?.webhook ?? defaultTemplates.comment.webhook,
      email: custom.comment?.email ?? defaultTemplates.comment.email,
    },
    "ai-chat": {
      telegram:
        custom["ai-chat"]?.telegram ?? defaultTemplates["ai-chat"].telegram,
      webhook:
        custom["ai-chat"]?.webhook ?? defaultTemplates["ai-chat"].webhook,
      email: custom["ai-chat"]?.email ?? defaultTemplates["ai-chat"].email,
    },
  };
}

/// <reference types="@cloudflare/workers-types" />
import { handleCommentWebhook } from "@astro-minimax/notify";
import type { NotifyEnv } from "@astro-minimax/notify";

export const onRequest: PagesFunction<NotifyEnv> = async context => {
  return handleCommentWebhook(context.request, context.env);
};

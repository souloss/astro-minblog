/// <reference types="@cloudflare/workers-types" />
import {
  handleChatRequest,
  initializeMetadata,
} from "@astro-minimax/ai/server";
import knowledgeBundle from "../../datas/rag-bundle.json";
import {
  createAiFunctionEnv,
  type FunctionEnv,
} from "./shared-ai-env";

export const onRequest: PagesFunction<FunctionEnv> = async context => {
  const env = createAiFunctionEnv(context.env);

  initializeMetadata({ knowledgeBundle }, env);
  return handleChatRequest({
    env,
    request: context.request,
    waitUntil: context.waitUntil,
  });
};

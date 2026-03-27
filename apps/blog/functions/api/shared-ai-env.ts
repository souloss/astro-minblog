import {
  applyAiConfigDefaults,
  type ChatHandlerEnv,
} from "@astro-minimax/ai/server";
import { SITE } from "../../src/config.ts";

export interface FunctionEnv extends ChatHandlerEnv {
  CACHE_KV?: KVNamespace;
  minimaxAI?: Ai;
  [key: string]: unknown;
}

export function createAiFunctionEnv(env: FunctionEnv): ChatHandlerEnv {
  return applyAiConfigDefaults({ ...env }, SITE.ai);
}

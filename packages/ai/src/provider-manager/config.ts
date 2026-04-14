import type {
  ProviderConfig,
  ProviderManagerEnv,
  OpenAIProviderConfig,
  WorkersAIProviderConfig,
} from "./types.js";

export const DEFAULT_WORKERS_BINDING_NAME = "minimaxAI";

import { PROVIDER, TIMEOUTS } from "../constants.js";
import { createLogger } from "../utils/logger.js";

const log = createLogger("provider-config");

function envString(env: Record<string, unknown>, key: string): string | undefined {
  const val = env[key];
  return typeof val === "string" && val.length > 0 ? val : undefined;
}

const DEFAULT_WEIGHT = PROVIDER.DEFAULT_WEIGHT;
const DEFAULT_TIMEOUT = TIMEOUTS.PROVIDER_DEFAULT;
const DEFAULT_MODEL = "gpt-4o-mini";

function hasOpenAIConfig(env: ProviderManagerEnv): boolean {
  return !!(env.AI_BASE_URL && env.AI_API_KEY);
}

function hasWorkersAIBinding(env: ProviderManagerEnv): boolean {
  const bindingName =
    envString(env, "AI_BINDING_NAME") || DEFAULT_WORKERS_BINDING_NAME;
  return !!env[bindingName];
}

function createOpenAIConfigFromEnv(
  env: ProviderManagerEnv
): OpenAIProviderConfig | null {
  if (!hasOpenAIConfig(env)) return null;

  return {
    id: "openai-default",
    type: "openai",
    weight: DEFAULT_WEIGHT - 10, // Lower priority than Workers AI (fallback)
    baseURL: envString(env, "AI_BASE_URL")!,
    apiKey: envString(env, "AI_API_KEY")!,
    model: envString(env, "AI_MODEL") || DEFAULT_MODEL,
    keywordModel: envString(env, "AI_KEYWORD_MODEL"),
    evidenceModel: envString(env, "AI_EVIDENCE_MODEL"),
    timeout: DEFAULT_TIMEOUT,
    enabled: true,
  };
}

function createWorkersAIConfigFromEnv(
  env: ProviderManagerEnv
): WorkersAIProviderConfig | null {
  const bindingName =
    envString(env, "AI_BINDING_NAME") || DEFAULT_WORKERS_BINDING_NAME;
  if (!env[bindingName]) return null;

  return {
    id: "workers-ai-default",
    type: "workers",
    weight: DEFAULT_WEIGHT,
    bindingName,
    model: envString(env, "AI_WORKERS_MODEL") || "@cf/zai-org/glm-4.7-flash",
    keywordModel: (env.AI_WORKERS_MODEL as string) || undefined,
    evidenceModel: (env.AI_WORKERS_MODEL as string) || undefined,
    timeout: DEFAULT_TIMEOUT,
    enabled: true,
  };
}

function parseAIProvidersJSON(jsonString: string): ProviderConfig[] | null {
  try {
    const configs = JSON.parse(jsonString);
    // Sanitize parsed JSON to prevent prototype pollution
    for (const cfg of configs) {
      delete cfg.__proto__;
      delete cfg.constructor;
      delete cfg.prototype;
    }
    if (!Array.isArray(configs)) return null;

    return configs
      .map((config, index) => {
        const weight = config.weight ?? DEFAULT_WEIGHT;
        const timeout = config.timeout ?? DEFAULT_TIMEOUT;
        const enabled = config.enabled ?? true;

        if (config.type === "openai") {
          return {
            ...config,
            weight,
            timeout,
            enabled,
            id: config.id || `openai-${index}`,
          } as OpenAIProviderConfig;
        }

        if (config.type === "workers") {
          return {
            ...config,
            weight,
            timeout,
            enabled,
            id: config.id || `workers-${index}`,
            bindingName: config.bindingName || DEFAULT_WORKERS_BINDING_NAME,
          } as WorkersAIProviderConfig;
        }

        return null;
      })
      .filter((c): c is ProviderConfig => c !== null);
  } catch (e) {
    log.warn(
      "AI_PROVIDERS JSON parse failed:",
      e instanceof Error ? e.message : String(e)
    );
    return null;
  }
}

export function parseProviderConfigs(
  env: ProviderManagerEnv
): ProviderConfig[] {
  // Priority 1: AI_PROVIDERS JSON string
  if (env.AI_PROVIDERS) {
    const configs = parseAIProvidersJSON(env.AI_PROVIDERS);
    if (configs && configs.length > 0) {
      return configs;
    }
  }

  // Priority 2: Legacy environment variables
  const configs: ProviderConfig[] = [];

  const openaiConfig = createOpenAIConfigFromEnv(env);
  if (openaiConfig) {
    configs.push(openaiConfig);
  }

  const workersConfig = createWorkersAIConfigFromEnv(env);
  if (workersConfig) {
    configs.push(workersConfig);
  }

  return configs;
}

export function validateProviderConfig(config: ProviderConfig): string | null {
  if (!config.id) {
    return "Provider config missing id";
  }

  if (!config.model) {
    return `Provider ${config.id} missing model`;
  }

  if (config.type === "openai") {
    const openaiConfig = config as OpenAIProviderConfig;
    if (!openaiConfig.baseURL) {
      return `OpenAI provider ${config.id} missing baseURL`;
    }
    if (!openaiConfig.apiKey) {
      return `OpenAI provider ${config.id} missing apiKey`;
    }
  }

  if (config.type === "workers") {
    const workersConfig = config as WorkersAIProviderConfig;
    if (!workersConfig.bindingName) {
      return `Workers AI provider ${config.id} missing bindingName`;
    }
  }

  return null;
}

export function hasAnyProviderConfigured(env: ProviderManagerEnv): boolean {
  if (env.AI_PROVIDERS) {
    const configs = parseAIProvidersJSON(env.AI_PROVIDERS);
    if (configs && configs.length > 0) return true;
  }
  return hasOpenAIConfig(env) || hasWorkersAIBinding(env);
}

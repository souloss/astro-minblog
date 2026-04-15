import type { ChatHandlerEnv } from "./types.js";

export function applyAiConfigDefaults(
  baseEnv: ChatHandlerEnv,
  aiConfig:
    | {
        cache?: {
          enabled?: boolean;
          ttl?: number;
          playbackDelay?: number;
          chunkSize?: number;
          thinkingDelay?: number;
        };
        timeouts?: {
          request?: number;
          keywordExtraction?: number;
          evidenceAnalysis?: number;
          llmStreaming?: number;
        };
        health?: {
          unhealthyThreshold?: number;
          recoveryTtl?: number;
        };
        mockMode?: boolean;
        voiceStyle?: "friendly" | "professional" | "casual" | "technical";
      }
    | null
    | undefined
): ChatHandlerEnv {
  if (!aiConfig) return { ...baseEnv };

  const envWithConfig: ChatHandlerEnv = { ...baseEnv };

  const setIfMissing = (envKey: string, configValue: unknown) => {
    if (envWithConfig[envKey] === undefined && configValue !== undefined) {
      envWithConfig[envKey] = configValue;
    }
  };

  setIfMissing("AI_CACHE_ENABLED", aiConfig.cache?.enabled);
  setIfMissing("AI_CACHE_TTL", aiConfig.cache?.ttl);
  setIfMissing("AI_CACHE_PLAYBACK_DELAY", aiConfig.cache?.playbackDelay);
  setIfMissing("AI_CACHE_CHUNK_SIZE", aiConfig.cache?.chunkSize);
  setIfMissing("AI_CACHE_THINKING_DELAY", aiConfig.cache?.thinkingDelay);

  setIfMissing("AI_TIMEOUT_REQUEST", aiConfig.timeouts?.request);
  setIfMissing("AI_TIMEOUT_KEYWORD", aiConfig.timeouts?.keywordExtraction);
  setIfMissing("AI_TIMEOUT_EVIDENCE", aiConfig.timeouts?.evidenceAnalysis);
  setIfMissing("AI_TIMEOUT_LLM", aiConfig.timeouts?.llmStreaming);

  setIfMissing("AI_HEALTH_THRESHOLD", aiConfig.health?.unhealthyThreshold);
  setIfMissing("AI_HEALTH_RECOVERY_TTL", aiConfig.health?.recoveryTtl);

  setIfMissing("AI_MOCK_MODE", aiConfig.mockMode);
  setIfMissing("AI_VOICE_STYLE", aiConfig.voiceStyle);

  return envWithConfig;
}

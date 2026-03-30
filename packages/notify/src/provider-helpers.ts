import type { Channel, SendResult } from "./types.js";

export function getDuration(start: number): number {
  return Date.now() - start;
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function createFailureResult(
  channel: Channel,
  error: string,
  duration: number
): SendResult {
  return {
    channel,
    success: false,
    error,
    duration,
  };
}

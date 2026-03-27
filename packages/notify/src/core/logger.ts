import type { Logger } from "../types.js";

export class DefaultLogger implements Logger {
  info(): void {}

  error(message: string, error?: Error, data?: Record<string, unknown>): void {
    console.error(`[notify] ${message}`, error?.message ?? "", data ?? "");
  }

  warn(message: string, data?: Record<string, unknown>): void {
    console.warn(`[notify] ${message}`, data ?? "");
  }
}

export class SilentLogger implements Logger {
  info(): void {}

  warn(): void {}

  error(): void {}
}

export const silentLogger = new SilentLogger();

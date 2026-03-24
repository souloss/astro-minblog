export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

let globalLevel: LogLevel = 'warn';

export function setLogLevel(level: LogLevel): void {
  globalLevel = level;
}

export function getLogLevel(): LogLevel {
  return globalLevel;
}

export function createLogger(namespace: string): Logger {
  const prefix = `[${namespace}]`;

  return {
    debug(message, ...args) {
      if (LOG_LEVELS[globalLevel] <= LOG_LEVELS.debug) console.debug(prefix, message, ...args);
    },
    info(message, ...args) {
      if (LOG_LEVELS[globalLevel] <= LOG_LEVELS.info) console.log(prefix, message, ...args);
    },
    warn(message, ...args) {
      if (LOG_LEVELS[globalLevel] <= LOG_LEVELS.warn) console.warn(prefix, message, ...args);
    },
    error(message, ...args) {
      if (LOG_LEVELS[globalLevel] <= LOG_LEVELS.error) console.error(prefix, message, ...args);
    },
  };
}

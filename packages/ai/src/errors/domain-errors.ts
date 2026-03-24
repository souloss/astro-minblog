export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly providerId: string,
    public readonly recoverable: boolean = true,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

export class SearchError extends Error {
  constructor(
    message: string,
    public readonly query: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = 'SearchError';
  }
}

export class PipelineStageError extends Error {
  constructor(
    message: string,
    public readonly stage: 'cache' | 'search' | 'analysis' | 'prompt' | 'generation',
    public readonly timingMs?: number,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = 'PipelineStageError';
  }
}

export class ConfigurationError extends Error {
  constructor(
    message: string,
    public readonly key: string,
    public readonly expected?: string,
  ) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

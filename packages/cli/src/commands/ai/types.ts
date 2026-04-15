export type FactCategory = "author" | "blog" | "content" | "project" | "tech";
export type FactSource = "explicit" | "derived" | "aggregated";
export type ExtensionType = "searchable" | "facts" | "context" | "voice-style";

export interface Fact {
  id: string;
  category: FactCategory;
  statement: string;
  evidence: string;
  source: FactSource;
  confidence: number;
  tags: string[];
  lang: string;
}

export interface FactRegistryFile {
  $schema: string;
  generatedAt: string;
  version: number;
  facts: Fact[];
  stats: {
    total: number;
    byCategory: Record<FactCategory, number>;
    avgConfidence: number;
  };
}

export interface Extension {
  id: string;
  type: ExtensionType;
  name: string;
  description?: string;
  enabled?: boolean;
  priority: number;
  data: unknown;
}

export interface ExtensionFile {
  $schema: string;
  version: number;
  extensions: Extension[];
}

export const VALID_EXTENSION_TYPES: ExtensionType[] = [
  "searchable",
  "facts",
  "context",
  "voice-style",
];

export const EMOJI = {
  success: "\u2705",
  error: "\u274c",
  warning: "\u26a0\ufe0f",
  info: "\u2139\ufe0f",
  folder: "\ud83d\udcc2",
  package: "\ud83d\udce6",
  build: "\ud83d\udd27",
  validate: "\ud83d\udccb",
  chart: "\ud83d\udcca",
};

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    totalFacts: number;
    byCategory: Record<FactCategory, number>;
    avgConfidence: number;
    coverage: {
      hasAuthorFacts: boolean;
      hasBlogFacts: boolean;
      hasContentFacts: boolean;
      hasTechFacts: boolean;
    };
  };
}

export interface ExtensionValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    totalExtensions: number;
    byType: Record<string, number>;
    enabled: number;
    disabled: number;
  };
}

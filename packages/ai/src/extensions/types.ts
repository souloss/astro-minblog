import type { ArticleContext, ProjectContext } from "../search/types.js";

export type ExtensionType =
  | "searchable"
  | "facts"
  | "context"
  | "voice-style"
  | "semantic-fallback";

export interface ExtensionSearchDocument {
  id: string;
  title: string;
  url: string;
  excerpt: string;
  content: string;
  categories: string[];
  dateTime: number;
  keyPoints?: string[];
}

export interface SearchableData {
  documents: ExtensionSearchDocument[];
  reranking?: {
    positiveTerms?: string[];
    negativeTerms?: string[];
    categoryBoost?: Record<string, number>;
  };
}

export interface FactEntry {
  id: string;
  category: string;
  statement: string;
  evidence?: string;
  confidence: number;
  tags: string[];
  lang: string;
  attributes?: Record<string, unknown>;
}

export interface FactsData {
  facts: FactEntry[];
  categories?: CategoryDefinition[];
}

export interface CategoryDefinition {
  id: string;
  name: string;
  keywords: string[];
}

export interface PromptContext {
  userQuery: string;
  lang: string;
  articles: ArticleContext[];
  projects: ProjectContext[];
}

export interface ContextData {
  sectionTitle: string;
  content: string | ((context: PromptContext) => string);
  position:
    | "before-articles"
    | "after-articles"
    | "before-facts"
    | "after-facts";
  matchCondition?: {
    queryPatterns?: RegExp[];
    categories?: string[];
    tags?: string[];
  };
}

export interface VoiceStyleMode {
  id: string;
  name: string;
  description: string;
  matchKeywords?: string[];
  matchCategories?: string[];
  traits: string[];
}

export interface VoiceStyleData {
  modes: VoiceStyleMode[];
  defaultMode?: string;
  overallTone?: string;
  frequentExpressions?: string[];
  _highestPriority?: number;
}

export interface SemanticFallbackRule {
  id: string;
  patterns: RegExp[];
  fallbackQuery: string;
  primaryQuery?: string;
  complexity?: "simple" | "moderate" | "complex";
}

export interface SemanticFallbackData {
  rules: SemanticFallbackRule[];
}

export type ExtensionData =
  | SearchableData
  | FactsData
  | ContextData
  | VoiceStyleData
  | SemanticFallbackData;

export interface Extension<T extends ExtensionData = ExtensionData> {
  id: string;
  type: ExtensionType;
  name: string;
  description?: string;
  enabled?: boolean;
  priority: number;
  data: T;
}

export interface ExtensionFile {
  $schema: string;
  version: number;
  extensions: Extension[];
}

export interface LoadedExtensions {
  searchable: Map<string, SearchableData>;
  facts: Map<string, FactsData>;
  context: ContextData[];
  voiceStyle: VoiceStyleData | null;
  semanticFallback: SemanticFallbackRule[];
}

export interface ExtensionContext {
  userQuery: string;
  lang: string;
  articles: ArticleContext[];
  projects: ProjectContext[];
  abortSignal?: AbortSignal;
}

export interface ExtensionResult<T = unknown> {
  extensionId: string;
  timestamp: number;
  data: T | null;
  error?: string;
  cacheHit: boolean;
}

export interface ExtensionRegistryInterface {
  register<T extends ExtensionData>(extension: Extension<T>): void;
  unregister(id: string): void;
  get<T extends ExtensionData>(id: string): Extension<T> | undefined;
  getAll(): Extension[];
  getByType(type: ExtensionType): Extension[];
  getLoadedExtensions(): LoadedExtensions;
  clear(): void;
}

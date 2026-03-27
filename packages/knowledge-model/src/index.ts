export const KNOWLEDGE_BUNDLE_SCHEMA = "knowledge-bundle-v1";
export const KNOWLEDGE_CORPUS_SCHEMA = "knowledge-corpus-v1";
export const KNOWLEDGE_PASSAGES_SCHEMA = "knowledge-passages-v1";
export const KNOWLEDGE_SUMMARIES_SCHEMA = "knowledge-summaries-v1";
export const KNOWLEDGE_VECTORS_SCHEMA = "knowledge-vectors-v1";

export interface KnowledgeDocument {
  id: string;
  type: string;
  lang: string;
  title: string;
  slug: string;
  url: string;
  category: string;
  tags: string[];
  summary: string;
  keyPoints: string[];
  publishedAt: string;
  description?: string;
  readingTime?: number;
  sourcePath?: string;
  contentHash?: string;
}

export interface KnowledgePassage {
  id: string;
  documentId: string;
  sectionPath: string[];
  heading: string;
  contentType:
    | "paragraph"
    | "heading"
    | "bullet"
    | "list"
    | "table"
    | "code"
    | "unknown";
  text: string;
  position: number;
  tokenCount: number;
  headers: Record<string, string>;
  prevId?: string;
  nextId?: string;
  anchorTerms?: string[];
}

export interface KnowledgeCorpusFile {
  $schema: typeof KNOWLEDGE_CORPUS_SCHEMA;
  version: number;
  generatedAt: string;
  documents: KnowledgeDocument[];
}

export interface KnowledgePassagesFile {
  $schema: typeof KNOWLEDGE_PASSAGES_SCHEMA;
  version: number;
  generatedAt: string;
  passages: KnowledgePassage[];
}

export interface KnowledgeSummariesFile {
  $schema: typeof KNOWLEDGE_SUMMARIES_SCHEMA;
  version: number;
  generatedAt: string;
  summaries: Record<
    string,
    {
      summary: string;
      abstract?: string;
      keyPoints: string[];
      tags: string[];
      readingTime?: number;
      contentHash?: string;
      processedAt?: string;
    }
  >;
}

export interface KnowledgeBundleRuntime<
  TSummaries,
  TAuthorContext,
  TVoiceProfile,
  TFactRegistry,
  TVectorIndex,
> {
  summaries: TSummaries;
  authorContext: TAuthorContext;
  voiceProfile: TVoiceProfile | null;
  factRegistry: TFactRegistry | null;
  vectorIndex: TVectorIndex | null;
}

export interface KnowledgeBundleFile<
  TSummaries,
  TAuthorContext,
  TVoiceProfile,
  TFactRegistry,
  TVectorIndex,
> {
  $schema: typeof KNOWLEDGE_BUNDLE_SCHEMA;
  version: number;
  generatedAt: string;
  corpusHash: string;
  runtime: KnowledgeBundleRuntime<
    TSummaries,
    TAuthorContext,
    TVoiceProfile,
    TFactRegistry,
    TVectorIndex
  >;
  corpus: KnowledgeCorpusFile;
  passages: KnowledgePassagesFile;
}

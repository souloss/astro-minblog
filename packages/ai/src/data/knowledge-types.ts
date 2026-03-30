import type { FactRegistryFile } from "../fact-registry/types.js";
import type { VectorIndex } from "../search/vector-reranker.js";
import type {
  KnowledgeBundleFile as SharedKnowledgeBundleFile,
  KnowledgeBundleRuntime,
  KnowledgeCorpusFile,
  KnowledgeDocument,
  KnowledgePassage,
  KnowledgePassagesFile,
  KnowledgeSummariesFile,
} from "@astro-minimax/knowledge-model";

export {
  KNOWLEDGE_BUNDLE_SCHEMA,
  KNOWLEDGE_CORPUS_SCHEMA,
  KNOWLEDGE_PASSAGES_SCHEMA,
  KNOWLEDGE_SUMMARIES_SCHEMA,
  KNOWLEDGE_VECTORS_SCHEMA,
} from "@astro-minimax/knowledge-model";

export type {
  KnowledgeBundleRuntime,
  KnowledgeCorpusFile,
  KnowledgeDocument,
  KnowledgePassage,
  KnowledgePassagesFile,
  KnowledgeSummariesFile,
};

export type KnowledgeBundleFile<
  TSummaries = import("./types.js").AISummariesFile,
  TAuthorContext = import("./types.js").AuthorContextFile,
  TVoiceProfile = import("./types.js").VoiceProfile,
  TFactRegistry = FactRegistryFile,
  TVectorIndex = VectorIndex,
> = SharedKnowledgeBundleFile<
  TSummaries,
  TAuthorContext,
  TVoiceProfile,
  TFactRegistry,
  TVectorIndex
>;

export type AIKnowledgeBundleFile = KnowledgeBundleFile<
  import("./types.js").AISummariesFile,
  import("./types.js").AuthorContextFile,
  import("./types.js").VoiceProfile,
  FactRegistryFile,
  VectorIndex
>;

import { createHash } from "node:crypto";
import { join } from "node:path";
import type { ArticleChunk } from "./markdown-chunker.js";
import type { FactRegistryFile } from "../../commands/ai/types.js";
import type { VectorIndex } from "./vectors.js";
import {
  KNOWLEDGE_BUNDLE_SCHEMA,
  KNOWLEDGE_CORPUS_SCHEMA,
  KNOWLEDGE_PASSAGES_SCHEMA,
  type KnowledgeBundleFile as SharedKnowledgeBundleFile,
  type KnowledgeCorpusFile,
  type KnowledgeDocument,
  type KnowledgePassage,
  type KnowledgePassagesFile,
} from "@astro-minimax/knowledge-model";

export interface AISummariesFile {
  meta: {
    lastUpdated: string;
    model: string;
    totalProcessed: number;
  };
  articles: Record<
    string,
    {
      data: {
        summary: string;
        abstract?: string;
        keyPoints: string[];
        tags: string[];
        readingTime?: number;
      };
      contentHash?: string;
      processedAt?: string;
    }
  >;
}

export interface AuthorPost {
  id: string;
  title: string;
  date: string;
  lang: string;
  category: string;
  tags: string[];
  summary: string;
  keyPoints: string[];
  url: string;
  chunks?: ArticleChunk[];
}

export interface AuthorContextFile {
  $schema?: string;
  generatedAt?: string;
  contextHash?: string;
  profile: {
    name: string;
    siteUrl: string;
    description: string;
  };
  posts: AuthorPost[];
  stableFacts?: Record<string, unknown>;
  timelineFacts?: Record<string, unknown>;
  aiConfig?: Record<string, unknown> | null;
}

export interface VoiceProfile {
  tone?: string;
  style?: string;
  [key: string]: unknown;
}

export type {
  KnowledgeCorpusFile,
  KnowledgeDocument,
  KnowledgePassage,
  KnowledgePassagesFile,
};

export type KnowledgeBundleFile = SharedKnowledgeBundleFile<
  AISummariesFile,
  AuthorContextFile,
  VoiceProfile,
  FactRegistryFile,
  VectorIndex
>;

export const DATA_DIR = join(process.cwd(), "datas");
export const CACHE_DIR = join(DATA_DIR, ".cache");

export interface BuildKnowledgeBundleInput {
  generatedAt: string;
  summaries: AISummariesFile;
  authorContext: AuthorContextFile;
  voiceProfile: VoiceProfile | null;
  factRegistry: FactRegistryFile | null;
  vectorIndex: VectorIndex | null;
}

function inferDocumentType(id: string): string {
  if (id.includes("/_releases/")) return "release-note";
  if (id.includes("/_examples/")) return "example";
  return "article";
}

function toSectionPath(headers: Record<string, string>): string[] {
  return Object.keys(headers)
    .sort()
    .map(key => headers[key])
    .filter(Boolean);
}

function inferContentType(
  chunk: ArticleChunk
): KnowledgePassage["contentType"] {
  const trimmed = chunk.content.trim();
  if (!trimmed) return "unknown";
  if (trimmed.startsWith("#")) return "heading";
  if (/^[-*]\s/m.test(trimmed)) return "bullet";
  if (/^\d+\.\s/m.test(trimmed)) return "list";
  if (trimmed.includes("|") && trimmed.includes("---")) return "table";
  if (trimmed.includes("```")) return "code";
  return "paragraph";
}

export function buildKnowledgeBundle(
  input: BuildKnowledgeBundleInput
): KnowledgeBundleFile {
  const documents: KnowledgeDocument[] = input.authorContext.posts.map(
    post => ({
      id: post.id,
      type: inferDocumentType(post.id),
      lang: post.lang,
      title: post.title,
      slug: post.id.split("/").slice(1).join("/"),
      url: post.url,
      category: post.category,
      tags: post.tags,
      summary: post.summary,
      keyPoints: post.keyPoints,
      publishedAt: post.date,
    })
  );

  const passages: KnowledgePassage[] = [];
  for (const post of input.authorContext.posts) {
    const chunks = post.chunks ?? [];
    for (let index = 0; index < chunks.length; index++) {
      const chunk = chunks[index];
      passages.push({
        id: chunk.id,
        documentId: post.id,
        sectionPath: toSectionPath(chunk.headers),
        heading: chunk.heading,
        contentType: inferContentType(chunk),
        text: chunk.content,
        position: chunk.position,
        tokenCount: chunk.tokenCount,
        headers: chunk.headers,
        prevId: index > 0 ? chunks[index - 1]?.id : undefined,
        nextId: index < chunks.length - 1 ? chunks[index + 1]?.id : undefined,
        anchorTerms: [chunk.heading, ...Object.values(chunk.headers)].filter(
          Boolean
        ),
      });
    }
  }

  const corpus: KnowledgeCorpusFile = {
    $schema: KNOWLEDGE_CORPUS_SCHEMA,
    version: 1,
    generatedAt: input.generatedAt,
    documents,
  };

  const passageFile: KnowledgePassagesFile = {
    $schema: KNOWLEDGE_PASSAGES_SCHEMA,
    version: 1,
    generatedAt: input.generatedAt,
    passages,
  };

  const corpusHash = createHash("sha256")
    .update(JSON.stringify({ corpus, passages: passageFile }))
    .digest("hex")
    .slice(0, 16);

  return {
    $schema: KNOWLEDGE_BUNDLE_SCHEMA,
    version: 1,
    generatedAt: input.generatedAt,
    corpusHash,
    runtime: {
      summaries: input.summaries,
      authorContext: input.authorContext,
      voiceProfile: input.voiceProfile,
      factRegistry: input.factRegistry,
      vectorIndex: input.vectorIndex,
    },
    corpus,
    passages: passageFile,
  };
}

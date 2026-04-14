import { getAuthorContext } from "../data/index.js";
import { envString } from "./chat-utils.js";
import { buildSystemPrompt } from "../prompt/index.js";
import type { ChatContext } from "./types.js";
import type { PhaseTiming } from "./types.js";
import type { ProviderAdapter } from "../provider-manager/types.js";
import type { LoadedExtensions } from "../extensions/types.js";
import type { ArticleContext } from "../search/types.js";
import type { SourceSelection } from "../search/types.js";
import {
  analyzeRetrievedEvidence,
  buildEvidenceSection,
  getCitationGuardPreflight,
  buildUnknownRefusal,
  interpretRequest,
} from "../intelligence/index.js";
import { matchFactsToQuery, buildFactSection } from "../fact-registry/index.js";
import {
  resolveVoiceStyleMode,
  buildVoiceStylePrompt,
  mergeFacts,
} from "../extensions/index.js";
import { buildArticleContextPrompt } from "./chat-utils.js";
import { searchArticles, searchProjects } from "../search/index.js";
import { createLogger } from "../utils/logger.js";
import { selectAndInjectChunks } from "./chunk-injector.js";

const log = createLogger("prompt-runtime");

interface BuildRuntimeSystemPromptArgs {
  env: Record<string, unknown>;
  lang: string;
  searchQuery: string;
  relatedArticles: ReturnType<typeof searchArticles>;
  relatedProjects: ReturnType<typeof searchProjects>;
  evidenceSection?: string;
  factSection?: string;
  answerMode?:
    | "fact"
    | "count"
    | "list"
    | "opinion"
    | "recommendation"
    | "unknown"
    | "general";
  extensions: LoadedExtensions;
  cacheKey: string | null;
  voiceStylePrompt?: string;
  chunksSection?: string;
  preferInjectedChunks?: boolean;
}

export interface PromptAssemblyArgs {
  env: Record<string, unknown>;
  latestText: string;
  context: ChatContext;
  lang: string;
  evidenceAnalysisTimeout: number;
  timing: PhaseTiming & Record<string, number | undefined>;
  adapter: ProviderAdapter | null;
  hasRealProvider: boolean;
  extensions: LoadedExtensions;
  cacheKey: string | null;
  searchQuery: string;
  relatedArticles: ReturnType<typeof searchArticles>;
  relatedProjects: ReturnType<typeof searchProjects>;
  budget: { analysisMaxTokens: number };
  answerMode:
    | "fact"
    | "count"
    | "list"
    | "opinion"
    | "recommendation"
    | "unknown"
    | "general";
}

export interface PromptAssemblyResult {
  systemPrompt: string;
  preflight: ReturnType<typeof getCitationGuardPreflight>;
  unknownRefusal: { text: string; isUnknown: boolean } | null;
  selectedSources: SourceSelection[];
}

export function resolvePromptGuards(args: {
  latestText: string;
  relatedArticles: ReturnType<typeof searchArticles>;
  relatedProjects: ReturnType<typeof searchProjects>;
  lang: string;
}): Pick<PromptAssemblyResult, "preflight" | "unknownRefusal"> {
  const { latestText, relatedArticles, relatedProjects, lang } = args;

  const preflight = getCitationGuardPreflight({
    userQuery: latestText,
    articles: relatedArticles,
    projects: relatedProjects,
    lang,
  });

  const interpretation = interpretRequest({
    latestText,
  });

  const unknownRefusal =
    interpretation.safety.decision === "refuse" &&
    interpretation.safety.reason === "privacy"
      ? { text: buildUnknownRefusal(latestText, lang), isUnknown: true }
      : null;

  return { preflight, unknownRefusal };
}

export function buildRuntimeSystemPrompt(
  args: BuildRuntimeSystemPromptArgs
): string {
  return buildSystemPrompt({
    static: {
      authorName: envString(args.env, "SITE_AUTHOR") || "博主",
      siteUrl: envString(args.env, "SITE_URL") || "",
      lang: args.lang,
      voiceStylePrompt: args.voiceStylePrompt,
    },
    semiStatic: {
      authorContext: getAuthorContext(),
    },
    dynamic: {
      userQuery: args.searchQuery,
      articles: args.relatedArticles,
      projects: args.relatedProjects,
      evidenceSection: args.evidenceSection,
      factSection: args.factSection,
      answerMode: args.answerMode,
      lang: args.lang,
      extensions: args.extensions,
      chunksSection: args.chunksSection,
      preferInjectedChunks: args.preferInjectedChunks,
    },
  });
}

export async function assemblePromptRuntime(
  args: PromptAssemblyArgs
): Promise<PromptAssemblyResult> {
  const {
    env,
    latestText,
    context,
    lang,
    evidenceAnalysisTimeout,
    timing,
    adapter,
    hasRealProvider,
    extensions,
    cacheKey,
    searchQuery,
    relatedArticles,
    relatedProjects,
    budget,
    answerMode,
  } = args;

  let evidenceSection = "";
  let selectedSources: SourceSelection[] = [];
  if (hasRealProvider && adapter) {
    const evidenceStart = Date.now();
    const abortCtrl = new AbortController();
    const timeoutId = setTimeout(
      () => abortCtrl.abort(),
      evidenceAnalysisTimeout
    );
    try {
      const provider = adapter.getProvider();
      const evidenceResult = await analyzeRetrievedEvidence({
        userQuery: latestText,
        articles: relatedArticles,
        projects: relatedProjects,
        provider,
        model: adapter.evidenceModel,
        maxOutputTokens: budget.analysisMaxTokens,
        abortSignal: abortCtrl.signal,
      });
      if (evidenceResult.analysis) {
        evidenceSection = buildEvidenceSection(evidenceResult.analysis);
      }
      log.debug(
        `evidenceAnalysis: status=${evidenceResult.parseStatus}, articles=${relatedArticles.length}, projects=${relatedProjects.length}, analysisLength=${typeof evidenceResult.analysis === "string" ? evidenceResult.analysis.length : 0}, usage=${JSON.stringify(evidenceResult.usage ?? null)}`
      );
      timing.evidenceAnalysis = Date.now() - evidenceStart;
    } catch (error) {
      log.warn(
        `evidenceAnalysis: error=${error instanceof Error ? error.message : String(error)}`
      );
      timing.evidenceAnalysis = Date.now() - evidenceStart;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  const { preflight, unknownRefusal } = resolvePromptGuards({
    latestText,
    relatedArticles,
    relatedProjects,
    lang,
  });

  let matchedFacts = matchFactsToQuery(latestText, lang);
  matchedFacts = mergeFacts(matchedFacts, extensions);
  const factPromptSection = buildFactSection(matchedFacts, lang);
  const articleCategories = relatedArticles.flatMap(
    (a: { categories?: string[] }) => a.categories ?? []
  );
  const voiceMode = resolveVoiceStyleMode(
    latestText,
    articleCategories,
    extensions
  );
  const voiceStylePrompt = buildVoiceStylePrompt(voiceMode, extensions);
  const articlePrompt = buildArticleContextPrompt(context);

  const {
    chunksSection,
    selectedSources: chunkSources,
    preferInjectedChunks,
  } = await selectAndInjectChunks({
    latestText,
    context,
    lang,
    env,
    cacheKey,
    relatedArticles,
  });
  selectedSources = chunkSources;

  const systemPrompt = buildRuntimeSystemPrompt({
    env,
    lang,
    searchQuery,
    relatedArticles,
    relatedProjects,
    evidenceSection: articlePrompt
      ? `${evidenceSection}\n${articlePrompt}`
      : evidenceSection,
    factSection: factPromptSection,
    answerMode,
    extensions,
    cacheKey,
    voiceStylePrompt,
    chunksSection,
    preferInjectedChunks,
  });

  return { systemPrompt, preflight, unknownRefusal, selectedSources };
}

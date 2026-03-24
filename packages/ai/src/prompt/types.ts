import type { ArticleContext, ProjectContext } from '../search/types.js';
import type { AuthorContextFile, VoiceProfile } from '../data/types.js';
import type { LoadedExtensions } from '../extensions/types.js';

export interface StaticLayerConfig {
  authorName: string;
  siteUrl: string;
  description?: string;
  systemPromptOverride?: string;
  voiceStylePrompt?: string;
  lang?: string;
}

export interface SemiStaticLayerConfig {
  authorContext: AuthorContextFile | null;
  voiceProfile: VoiceProfile | null;
  lang?: string;
}

export interface DynamicLayerConfig {
  userQuery: string;
  articles: ArticleContext[];
  projects: ProjectContext[];
  evidenceSection?: string;
  factSection?: string;
  answerMode?: 'fact' | 'count' | 'list' | 'opinion' | 'recommendation' | 'unknown' | 'general';
  lang?: string;
  extensions?: LoadedExtensions;
  sessionId?: string;
  chunksSection?: string;
}

export interface PromptBuildConfig {
  static: StaticLayerConfig;
  semiStatic: SemiStaticLayerConfig;
  dynamic: DynamicLayerConfig;
}

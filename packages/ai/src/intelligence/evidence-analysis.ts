import { generateText, type LanguageModel } from 'ai';
import type { ArticleContext, ProjectContext } from '../search/types.js';
import type { EvidenceAnalysisResult, TokenUsageStats, QueryComplexity } from './types.js';
import {
  EvidenceAnalysisSchema,
  EvidenceAnalysis,
  EVIDENCE_ANALYSIS_SYSTEM_PROMPT,
} from '../structured-output/index.js';

export const EVIDENCE_ANALYSIS_TIMEOUT_MS = 8000;
export const EVIDENCE_ANALYSIS_MAX_TOKENS = 360;

export function shouldSkipAnalysis(
  latestText: string,
  articleCount: number,
  complexity: QueryComplexity,
): boolean {
  if (articleCount < 2) return true;
  if (complexity === 'simple') return true;
  if (latestText.length < 15) return true;
  return false;
}

function buildEvidenceSummary(articles: ArticleContext[], projects: ProjectContext[]): string {
  const lines: string[] = [];

  for (const article of articles.slice(0, 6)) {
    lines.push(`文章: ${article.title}`);
    if (article.summary) lines.push(`  摘要: ${article.summary}`);
    if (article.keyPoints.length) lines.push(`  要点: ${article.keyPoints.slice(0, 3).join(', ')}`);
    if (article.url) lines.push(`  URL: ${article.url}`);
  }

  for (const project of projects.slice(0, 3)) {
    lines.push(`项目: ${project.name} - ${project.description.slice(0, 100)}`);
    if (project.url) lines.push(`  URL: ${project.url}`);
  }

  return lines.join('\n');
}

async function extractUsage(result: unknown): Promise<TokenUsageStats | undefined> {
  const usagePromise = (result as unknown as {
    usage?: PromiseLike<{ inputTokens?: number; outputTokens?: number; totalTokens?: number }>
  }).usage;
  
  if (!usagePromise) return undefined;
  
  try {
    const u = await Promise.resolve(usagePromise);
    return {
      inputTokens: u.inputTokens ?? 0,
      outputTokens: u.outputTokens ?? 0,
      totalTokens: u.totalTokens ?? 0,
    };
  } catch {
    return undefined;
  }
}

export interface StructuredEvidenceResult {
  analysis: EvidenceAnalysis | null;
  parseStatus: string;
  usage?: TokenUsageStats;
  error?: string;
  rawText?: string;
}

export async function analyzeRetrievedEvidenceStructured(params: {
  userQuery: string;
  articles: ArticleContext[];
  projects: ProjectContext[];
  provider: { chatModel: (model: string) => unknown };
  model: string;
  maxOutputTokens?: number;
  abortSignal?: AbortSignal;
}): Promise<StructuredEvidenceResult> {
  const { userQuery, articles, projects, provider, model, abortSignal } = params;

  if (articles.length === 0 && projects.length === 0) {
    return { analysis: null, parseStatus: 'no_content' };
  }

  const evidenceSummary = buildEvidenceSummary(articles, projects);
  const userPrompt = `用户问题：${userQuery}

检索到的相关内容：
${evidenceSummary}`;

  try {
    const { generateObject } = await import('ai');
    
    const result = await generateObject({
      model: provider.chatModel(model) as LanguageModel,
      schema: EvidenceAnalysisSchema,
      schemaName: 'evidence_analysis',
      schemaDescription: 'Structured evidence analysis for answer planning',
      system: EVIDENCE_ANALYSIS_SYSTEM_PROMPT,
      prompt: userPrompt,
      temperature: 0,
      maxRetries: 0,
      abortSignal,
    });

    const usage = await extractUsage(result);

    return {
      analysis: result.object,
      parseStatus: 'ok',
      usage,
      rawText: JSON.stringify(result.object),
    };
  } catch (error) {
    return {
      analysis: null,
      parseStatus: 'error',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function analyzeRetrievedEvidence(params: {
  userQuery: string;
  articles: ArticleContext[];
  projects: ProjectContext[];
  provider: { chatModel: (model: string) => unknown };
  model: string;
  maxOutputTokens?: number;
  abortSignal?: AbortSignal;
}): Promise<EvidenceAnalysisResult> {
  const { userQuery, articles, projects, provider, model, maxOutputTokens = EVIDENCE_ANALYSIS_MAX_TOKENS, abortSignal } = params;

  const evidenceSummary = buildEvidenceSummary(articles, projects);

  const prompt = `用户问题：${userQuery}

检索到的相关内容：
${evidenceSummary}

请分析这些内容，提取与用户问题最相关的2-3个关键信息点。格式：
<evidence>
[关键信息点1]
[关键信息点2]
</evidence>

只返回evidence标签内的内容，简洁准确。`;

  try {
    const result = await generateText({
      model: provider.chatModel(model) as LanguageModel,
      prompt,
      maxOutputTokens,
      temperature: 0.1,
      abortSignal,
    });

    const rawText = result.text?.trim() ?? '';
    const match = rawText.match(/<evidence>([\s\S]*?)<\/evidence>/);
    const analysis = match?.[1]?.trim();
    const usage = await extractUsage(result);

    return {
      analysis,
      parseStatus: analysis ? 'ok' : 'no_match',
      rawText,
      usage,
    };
  } catch (error) {
    return {
      parseStatus: 'error',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function buildEvidenceSection(analysis: string | EvidenceAnalysis | null): string {
  if (!analysis) return '';
  
  if (typeof analysis === 'string') {
    if (!analysis.trim()) return '';
    return `\n## 关键证据分析\n${analysis}\n`;
  }
  
  const lines: string[] = ['## 关键证据分析'];
  
  if (analysis.directAnswer) {
    lines.push(`- 直接结论：${analysis.directAnswer}`);
  }
  
  if (analysis.entities.length > 0) {
    lines.push('');
    lines.push('### 相关实体');
    for (const entity of analysis.entities) {
      const parts = [entity.name];
      if (entity.count) {
        const countStr = entity.countMode === 'at_least' ? `至少 ${entity.count}` : `${entity.count}`;
        parts.push(`(${countStr})`);
      }
      lines.push(`- ${parts.join(' ')}`);
    }
  }
  
  if (analysis.keyFindings.length > 0) {
    lines.push('');
    lines.push('### 关键发现');
    for (const finding of analysis.keyFindings) {
      lines.push(`- ${finding.claim} (置信度: ${finding.confidence})`);
    }
  }
  
  if (analysis.uncertainties.length > 0) {
    lines.push('');
    lines.push('### 不确定项');
    for (const item of analysis.uncertainties) {
      lines.push(`- ${item}`);
    }
  }
  
  return lines.join('\n');
}
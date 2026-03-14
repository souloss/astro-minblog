import { generateText } from 'ai';
import type { ArticleContext, ProjectContext } from '../search/types.js';
import type { EvidenceAnalysisResult, QueryComplexity } from './types.js';

export const EVIDENCE_ANALYSIS_TIMEOUT_MS = 8000;
export const EVIDENCE_ANALYSIS_MAX_TOKENS = 360;

/**
 * Determines whether evidence analysis should be skipped.
 * Skips for simple queries or when there's insufficient content to analyze.
 */
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

/**
 * Uses an LLM to pre-analyze retrieved evidence and identify the most relevant pieces.
 * This improves the quality of the final system prompt by pre-filtering noise.
 */
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      model: (provider as any).chatModel(model),
      prompt,
      maxOutputTokens,
      temperature: 0.1,
      abortSignal,
    });

    const rawText = result.text?.trim() ?? '';
    const match = rawText.match(/<evidence>([\s\S]*?)<\/evidence>/);
    const analysis = match?.[1]?.trim();
    const u = result.usage;

    return {
      analysis,
      parseStatus: analysis ? 'ok' : 'no_match',
      rawText,
      usage: u ? {
        inputTokens: u.inputTokens ?? 0,
        outputTokens: u.outputTokens ?? 0,
        totalTokens: (u.inputTokens ?? 0) + (u.outputTokens ?? 0),
      } : undefined,
    };
  } catch (error) {
    return {
      parseStatus: 'error',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Formats the evidence analysis for injection into the system prompt.
 */
export function buildEvidenceSection(analysis: string): string {
  if (!analysis.trim()) return '';
  return `\n## 关键证据分析\n${analysis}\n`;
}

function buildEvidenceSummary(articles: ArticleContext[], projects: ProjectContext[]): string {
  const lines: string[] = [];

  for (const article of articles.slice(0, 6)) {
    lines.push(`文章: ${article.title}`);
    if (article.summary) lines.push(`  摘要: ${article.summary}`);
    if (article.keyPoints.length) lines.push(`  要点: ${article.keyPoints.slice(0, 3).join(', ')}`);
  }

  for (const project of projects.slice(0, 3)) {
    lines.push(`项目: ${project.name} - ${project.description.slice(0, 100)}`);
  }

  return lines.join('\n');
}

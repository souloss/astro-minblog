import type { DynamicLayerConfig } from './types.js';

/**
 * Dynamic layer: per-request search results and evidence analysis.
 * Built fresh on every chat request.
 */
export function buildDynamicLayer(config: DynamicLayerConfig): string {
  const { userQuery, articles, projects, evidenceSection } = config;

  if (!articles.length && !projects.length) return '';

  const lines: string[] = [];
  lines.push('## 与当前问题相关的内容');

  if (articles.length) {
    lines.push('');
    lines.push('### 相关文章');
    for (const article of articles.slice(0, 8)) {
      lines.push(`**[${article.title}](${article.url})**`);
      if (article.summary) lines.push(`摘要：${article.summary.slice(0, 120)}`);
      if (article.keyPoints.length) {
        lines.push(`要点：${article.keyPoints.slice(0, 3).join('；')}`);
      }
      if (article.fullContent) {
        lines.push(`内容节选：${article.fullContent.slice(0, 600)}`);
      }
      lines.push('');
    }
  }

  if (projects.length) {
    lines.push('### 相关项目');
    for (const project of projects.slice(0, 4)) {
      lines.push(`- **[${project.name}](${project.url})**：${project.description.slice(0, 100)}`);
    }
    lines.push('');
  }

  if (evidenceSection) {
    lines.push(evidenceSection);
  }

  lines.push(`---`);
  lines.push(`基于以上内容回答用户关于「${userQuery.slice(0, 50)}」的问题。如果以上内容与问题不相关，如实告知并提供力所能及的帮助。`);

  return lines.join('\n');
}

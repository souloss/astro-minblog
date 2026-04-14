import type { ArticleContext, ProjectContext } from "../search/types.js";
import { t } from "../utils/i18n.js";

export interface CitationAppenderConfig {
  articles: ArticleContext[];
  projects: ProjectContext[];
  lang: string;
  maxCitations: number;
  minScore: number;
}

interface CitationCandidate {
  title: string;
  url: string;
  score: number;
}

function hasExistingCitations(text: string, validUrls: Set<string>): boolean {
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  const matches = [...text.matchAll(linkPattern)];
  return matches.some(m => validUrls.has(m[2]));
}

export function selectCitations(
  articles: ArticleContext[],
  projects: ProjectContext[],
  maxCitations: number,
  minScore: number
): CitationCandidate[] {
  const candidates: CitationCandidate[] = [
    ...articles
      .filter(a => (a.score ?? 0) >= minScore)
      .map(a => ({ title: a.title, url: a.url, score: a.score ?? 0 })),
    ...projects
      .filter(p => (p.score ?? 0) >= minScore)
      .map(p => ({ title: p.name, url: p.url, score: p.score ?? 0 })),
  ];

  return candidates.sort((a, b) => b.score - a.score).slice(0, maxCitations);
}

export function formatCitationBlock(
  citations: CitationCandidate[],
  lang: string
): string {
  if (citations.length === 0) return "";

  const heading = lang === "zh" ? "延伸阅读" : "Further Reading";

  const lines = [
    "",
    `**${heading}:**`,
    ...citations.map(c => `- [${c.title}](${c.url})`),
  ];

  return lines.join("\n");
}

export function createCitationAppenderTransform(
  config: CitationAppenderConfig
): (stream: ReadableStream<string>) => ReadableStream<string> {
  const { articles, projects, lang, maxCitations = 3, minScore = 5 } = config;

  const validUrls = new Set([
    ...articles.map(a => a.url),
    ...projects.map(p => p.url),
  ]);

  return (stream: ReadableStream<string>) => {
    let fullText = "";

    const transform = new TransformStream<string, string>({
      transform(chunk, controller) {
        fullText += chunk;
        controller.enqueue(chunk);
      },
      flush(controller) {
        if (hasExistingCitations(fullText, validUrls)) {
          return;
        }

        const citations = selectCitations(
          articles,
          projects,
          maxCitations,
          minScore
        );

        if (citations.length === 0) {
          return;
        }

        const citationBlock = formatCitationBlock(citations, lang);
        controller.enqueue(citationBlock);
      },
    });

    return stream.pipeThrough(transform);
  };
}

export function shouldAppendCitations(
  response: string,
  articles: ArticleContext[],
  projects: ProjectContext[]
): boolean {
  const validUrls = new Set([
    ...articles.map(a => a.url),
    ...projects.map(p => p.url),
  ]);

  return (
    !hasExistingCitations(response, validUrls) &&
    [...articles, ...projects].some(item => (item.score ?? 0) >= 5)
  );
}

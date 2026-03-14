import type { ArticleContext, ProjectContext } from '../search/types.js';
import type { CitationGuardPreflight, CitationGuardAction } from './types.js';

/**
 * Pre-flight check: if the user is asking about something that can be
 * answered directly from the available context without an LLM, return it.
 * This prevents hallucination for specific factual queries.
 */
export function getCitationGuardPreflight(params: {
  userQuery: string;
  articles: ArticleContext[];
  projects: ProjectContext[];
}): CitationGuardPreflight | null {
  const { userQuery, articles, projects } = params;
  const q = userQuery.toLowerCase();

  // Detect queries asking for article counts or lists
  if (/有几篇|有多少篇|文章数量|总共.*文章/.test(q)) {
    const total = articles.length;
    if (total > 0) {
      return {
        text: `根据我检索到的信息，当前共找到 ${total} 篇相关文章。`,
        actions: ['preflight_reject'],
      };
    }
  }

  // Detect queries about specific article existence that we can verify
  if (/有没有|是否有|有.*文章|写过.*吗/.test(q)) {
    if (articles.length === 0 && projects.length === 0) {
      return {
        text: '根据博客内容搜索，目前没有找到与这个主题直接相关的文章。你可以尝试用其他关键词搜索，或者问我其他问题。',
        actions: ['preflight_reject'],
      };
    }
  }

  return null;
}

/**
 * Creates a transform stream that monitors the AI output for hallucinated references.
 * Rewrites or suppresses fabricated article/project links.
 */
export function createCitationGuardTransform(params: {
  articles: ArticleContext[];
  projects: ProjectContext[];
  onApplied?: (result: { actions: CitationGuardAction[] }) => void;
}): (stream: ReadableStream<string>) => ReadableStream<string> {
  const { articles, projects, onApplied } = params;
  const validUrls = new Set([
    ...articles.map(a => a.url),
    ...projects.map(p => p.url),
  ]);

  return (stream: ReadableStream<string>) => {
    const actions: CitationGuardAction[] = [];
    let buffer = '';

    const transform = new TransformStream<string, string>({
      transform(chunk, controller) {
        buffer += chunk;

        // Check for Markdown links: [text](url)
        const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
        let match: RegExpExecArray | null;
        let lastIndex = 0;
        let output = '';

        while ((match = linkPattern.exec(buffer)) !== null) {
          const [fullMatch, text, url] = match;
          output += buffer.slice(lastIndex, match.index);

          if (url.startsWith('http') && !validUrls.has(url)) {
            // Fabricated external URL — keep the text, remove the link
            output += text;
            actions.push('stream_rewrite');
          } else {
            output += fullMatch;
          }

          lastIndex = match.index + fullMatch.length;
        }

        // Keep unparsed remainder in buffer (may be mid-link)
        buffer = buffer.slice(lastIndex);
        if (output) {
          controller.enqueue(output);
        }
      },
      flush(controller) {
        if (buffer) {
          controller.enqueue(buffer);
          buffer = '';
        }
        if (actions.length > 0) {
          onApplied?.({ actions });
        }
      },
    });

    return stream.pipeThrough(transform);
  };
}

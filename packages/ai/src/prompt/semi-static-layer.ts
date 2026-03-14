import type { SemiStaticLayerConfig } from './types.js';

/**
 * Semi-static layer: blog metadata loaded at build/startup time.
 * This changes when the blog is rebuilt, not per-request.
 */
export function buildSemiStaticLayer(config: SemiStaticLayerConfig): string {
  const { authorContext } = config;
  if (!authorContext) return '';

  const lines: string[] = [];
  const { posts } = authorContext;

  if (!posts.length) return '';

  // Blog overview
  const totalPosts = posts.length;
  const categories = [...new Set(posts.map(p => p.category).filter(Boolean))];
  const recentPosts = posts
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  lines.push('## 博客概况');
  lines.push(`- 共有 ${totalPosts} 篇文章`);
  if (categories.length) {
    lines.push(`- 主要分类：${categories.slice(0, 8).join('、')}`);
  }

  lines.push('');
  lines.push('## 最新文章');
  for (const post of recentPosts) {
    const date = post.date ? new Date(post.date).toISOString().slice(0, 10) : '';
    const summary = post.summary ? ` — ${post.summary.slice(0, 60)}` : '';
    lines.push(`- [${post.title}](${post.url})${date ? ` (${date})` : ''}${summary}`);
  }

  return lines.join('\n');
}

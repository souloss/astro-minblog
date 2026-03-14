/**
 * Markdown 文本处理工具
 */

export function stripMarkdown(content: string): string {
  return content
    .replace(/^---[\s\S]*?---\n?/, "")
    .replace(/^import\s+.*$/gm, "")
    .replace(/<[^>]+\/>/g, "")
    .replace(/<[^>]+>[\s\S]*?<\/[^>]+>/g, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]*`/g, "")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[([^\]]*)\]\(.*?\)/g, "$1")
    .replace(/#{1,6}\s+/g, "")
    .replace(/[*_~]+/g, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function chunkText(
  text: string,
  size: number = 500,
  overlap: number = 50
): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];

  for (let i = 0; i < words.length; i += size - overlap) {
    const chunk = words.slice(i, i + size).join(" ");
    if (chunk.trim().length > 20) {
      chunks.push(chunk.trim());
    }
    if (i + size >= words.length) break;
  }

  return chunks.length > 0 ? chunks : [text.slice(0, 2000)];
}

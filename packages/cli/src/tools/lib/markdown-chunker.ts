/**
 * Markdown 按标题分段工具
 *
 * 基于 Markdown 标题层级（H1/H2/H3）进行语义分段，
 * 保持文档结构完整性，适用于 RAG 检索场景。
 *
 * 设计参考：
 * - LangChain MarkdownHeaderTextSplitter
 * - 最佳实践：512 tokens + 10-15% overlap
 */

/**
 * 文章段落结构
 */
export interface ArticleChunk {
  /** 段落唯一标识，格式: "postId#heading-slug" */
  id: string;
  /** 所属文章 ID */
  postId: string;
  /** 段落标题（H2/H3 文本，无标题时为空） */
  heading: string;
  /** 段落内容 */
  content: string;
  /** 段落在文章中的位置（0-indexed） */
  position: number;
  /** 估算的 token 数量 */
  tokenCount: number;
  /** 标题层级路径，如 { H1: "入门指南", H2: "快速开始" } */
  headers: Record<string, string>;
}

/**
 * 分段配置
 */
export interface ChunkerOptions {
  /** 最大 token 数，默认 512 */
  maxTokens?: number;
  /** 最小 token 数，默认 50 */
  minTokens?: number;
  /** 重叠 token 数，默认 64（约 12.5%） */
  overlapTokens?: number;
  /** 是否保留标题在内容中，默认 true */
  keepHeaders?: boolean;
}

/** 默认配置 */
const DEFAULT_OPTIONS: Required<ChunkerOptions> = {
  maxTokens: 512,
  minTokens: 50,
  overlapTokens: 64,
  keepHeaders: true,
};

/**
 * 估算文本的 token 数量
 *
 * 使用简单启发式：
 * - 英文：约 4 字符 = 1 token
 * - 中文：约 2 字符 = 1 token
 * - 混合内容取加权平均
 */
export function estimateTokenCount(text: string): number {
  if (!text) return 0;

  // 统计中英文字符
  const cjkChars = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length;
  const totalChars = text.length;
  const nonCjkChars = totalChars - cjkChars;

  // 中文：约 2 字符/token，英文：约 4 字符/token
  const cjkTokens = Math.ceil(cjkChars / 2);
  const nonCjkTokens = Math.ceil(nonCjkChars / 4);

  return cjkTokens + nonCjkTokens;
}

/**
 * 按标题分段 Markdown 文档
 *
 * 工作流程：
 * 1. 检测标题行（#、##、###）
 * 2. 按标题切分段落
 * 3. 保留标题层级信息
 * 4. 对超长段落进行细分
 *
 * @param text - Markdown 文本
 * @param postId - 文章 ID（用于生成 chunk.id）
 * @param options - 分段配置
 */
export function chunkMarkdownByHeaders(
  text: string,
  postId: string = "",
  options?: ChunkerOptions
): ArticleChunk[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { maxTokens, minTokens, overlapTokens, keepHeaders } = opts;

  // 保护代码块（不分割）
  const codeBlocks: string[] = [];
  const protectedText = text.replace(/```[\s\S]*?```/g, match => {
    codeBlocks.push(match);
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
  });

  const lines = protectedText.split("\n");
  const chunks: ArticleChunk[] = [];
  const chunkIdCounts = new Map<string, number>();

  // 标题栈，跟踪当前层级
  let headerStack: Array<{ level: number; text: string; slug: string }> = [];
  let currentHeaders: Record<string, string> = {};
  let currentContent = "";
  let currentPosition = 0;
  let inCodeBlock = false;

  // 辅助函数：生成 slug
  const makeSlug = (text: string): string => {
    return text
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fff-]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 30);
  };

  // 辅助函数：保存当前 chunk
  const saveChunk = (force = false) => {
    const content = currentContent.trim();
    if (!content) return;

    const tokenCount = estimateTokenCount(content);
    const isLeadingIntro = headerStack.length === 0 && currentPosition === 0;
    if (!force && tokenCount < minTokens && !isLeadingIntro) return;

    // 恢复代码块
    const restoredContent = restoreCodeBlocks(content, codeBlocks);

    // 生成 chunk ID
    const lastHeader = headerStack[headerStack.length - 1];
    const headingSlug = lastHeader ? lastHeader.slug : `p${currentPosition}`;
    const baseChunkId = postId
      ? `${postId}#${headingSlug}`
      : `chunk-${currentPosition}`;
    const duplicateCount = chunkIdCounts.get(baseChunkId) ?? 0;
    chunkIdCounts.set(baseChunkId, duplicateCount + 1);
    const chunkId =
      duplicateCount === 0 ? baseChunkId : `${baseChunkId}-${duplicateCount}`;

    chunks.push({
      id: chunkId,
      postId,
      heading: lastHeader?.text || "",
      content: restoredContent,
      position: currentPosition++,
      tokenCount,
      headers: { ...currentHeaders },
    });

    currentContent = "";
  };

  // 逐行处理
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 检测代码块边界
    if (line.trim().startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      currentContent += line + "\n";
      continue;
    }

    // 在代码块内，不处理标题
    if (inCodeBlock) {
      currentContent += line + "\n";
      continue;
    }

    // 检测标题
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      // 保存上一个段落
      saveChunk();

      const level = headerMatch[1].length;
      const headerText = headerMatch[2].trim();
      const slug = makeSlug(headerText);

      // 弹出同级别或更低级别的标题
      while (
        headerStack.length > 0 &&
        headerStack[headerStack.length - 1].level >= level
      ) {
        const popped = headerStack.pop()!;
        delete currentHeaders[`H${popped.level}`];
      }

      // 压入新标题
      headerStack.push({ level, text: headerText, slug });
      currentHeaders[`H${level}`] = headerText;

      // 如果保留标题，将标题行加入内容
      if (keepHeaders) {
        currentContent = line + "\n";
      } else {
        currentContent = "";
      }

      continue;
    }

    // 普通行
    currentContent += line + "\n";

    // 检查是否需要提前保存（超长段落）
    if (estimateTokenCount(currentContent) > maxTokens * 1.5) {
      saveChunk(true);
    }
  }

  // 保存最后一个段落
  saveChunk(true);

  // 处理超长 chunk（细分）
  return subdivideLargeChunks(chunks, maxTokens, overlapTokens);
}

/**
 * 恢复代码块占位符
 */
function restoreCodeBlocks(text: string, codeBlocks: string[]): string {
  return text.replace(/__CODE_BLOCK_(\d+)__/g, (_, index) => {
    return codeBlocks[parseInt(index, 10)] || "";
  });
}

/**
 * 细分超长的段落
 */
export function subdivideLargeChunks(
  chunks: ArticleChunk[],
  maxTokens: number,
  overlapTokens: number
): ArticleChunk[] {
  const result: ArticleChunk[] = [];

  for (const chunk of chunks) {
    if (chunk.tokenCount <= maxTokens) {
      result.push(chunk);
      continue;
    }

    const subChunks = splitLargeChunk(chunk, maxTokens, overlapTokens);

    // 递归检查分割后的 chunks，确保没有超过 maxTokens 的
    for (const subChunk of subChunks) {
      if (subChunk.tokenCount > maxTokens) {
        const furtherSplit = splitByLines(subChunk, maxTokens, overlapTokens);
        result.push(...furtherSplit);
      } else {
        result.push(subChunk);
      }
    }
  }

  return result.map((chunk, index) => ({
    ...chunk,
    position: index,
  }));
}

/**
 * 分割超长段落
 */
function splitLargeChunk(
  chunk: ArticleChunk,
  maxTokens: number,
  overlapTokens: number
): ArticleChunk[] {
  const { content, id, postId, heading, headers } = chunk;

  // 尝试按段落边界分割
  const paragraphs = content.split(/\n\n+/);
  const subChunks: ArticleChunk[] = [];

  let currentContent = "";
  let currentPosition = 0;
  let overlapContent = "";

  for (const para of paragraphs) {
    const paraWithNewline = para + "\n\n";
    const newContent = currentContent + overlapContent + paraWithNewline;
    const newTokens = estimateTokenCount(newContent);

    if (newTokens > maxTokens && currentContent.trim()) {
      // 保存当前内容
      subChunks.push({
        id: `${id}-${currentPosition}`,
        postId,
        heading,
        content: currentContent.trim(),
        position: currentPosition++,
        tokenCount: estimateTokenCount(currentContent),
        headers,
      });

      // 准备重叠内容
      overlapContent = getOverlapContent(currentContent, overlapTokens);
      currentContent = paraWithNewline;
    } else {
      currentContent = newContent;
    }
  }

  // 保存最后的内容
  if (currentContent.trim()) {
    subChunks.push({
      id: `${id}-${currentPosition}`,
      postId,
      heading,
      content: currentContent.trim(),
      position: currentPosition,
      tokenCount: estimateTokenCount(currentContent),
      headers,
    });
  }

  // 如果分割后只有一个 chunk 且仍然超过 maxTokens，强制按行分割
  if (subChunks.length === 1 && subChunks[0].tokenCount > maxTokens) {
    return splitByLines(chunk, maxTokens, overlapTokens);
  }

  return subChunks.length > 0 ? subChunks : [chunk];
}

/**
 * 按行分割（通用方法）
 */
function splitByLines(
  chunk: ArticleChunk,
  maxTokens: number,
  overlapTokens: number
): ArticleChunk[] {
  const { content, id, postId, heading, headers } = chunk;
  const lines = content.split("\n");
  const subChunks: ArticleChunk[] = [];

  let currentLines: string[] = [];
  let currentPosition = 0;

  for (const line of lines) {
    const testContent = [...currentLines, line].join("\n");

    if (
      estimateTokenCount(testContent) > maxTokens &&
      currentLines.length > 0
    ) {
      const saveContent = currentLines.join("\n");
      subChunks.push({
        id: `${id}-${currentPosition}`,
        postId,
        heading,
        content: saveContent,
        position: currentPosition++,
        tokenCount: estimateTokenCount(saveContent),
        headers,
      });
      currentLines = [line];
    } else {
      currentLines.push(line);
    }
  }

  if (currentLines.length > 0) {
    subChunks.push({
      id: `${id}-${currentPosition}`,
      postId,
      heading,
      content: currentLines.join("\n"),
      position: currentPosition,
      tokenCount: estimateTokenCount(currentLines.join("\n")),
      headers,
    });
  }

  return subChunks.length > 0 ? subChunks : [chunk];
}

/**
 * 获取重叠内容
 */
function getOverlapContent(text: string, overlapTokens: number): string {
  const lines = text.split("\n").reverse();
  let overlapText = "";
  let tokens = 0;

  for (const line of lines) {
    const lineTokens = estimateTokenCount(line);
    if (tokens + lineTokens > overlapTokens) break;
    overlapText = line + "\n" + overlapText;
    tokens += lineTokens;
  }

  return overlapText;
}

/**
 * 从 Markdown 文本中提取所有标题
 */
export function extractHeaders(
  text: string
): Array<{ level: number; text: string; line: number }> {
  const lines = text.split("\n");
  const headers: Array<{ level: number; text: string; line: number }> = [];

  let inCodeBlock = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      headers.push({
        level: match[1].length,
        text: match[2].trim(),
        line: i + 1,
      });
    }
  }

  return headers;
}

/**
 * 计算文章的段落统计
 */
export function getChunkStats(chunks: ArticleChunk[]): {
  totalChunks: number;
  totalTokens: number;
  avgTokens: number;
  maxTokens: number;
  minTokens: number;
} {
  if (chunks.length === 0) {
    return {
      totalChunks: 0,
      totalTokens: 0,
      avgTokens: 0,
      maxTokens: 0,
      minTokens: 0,
    };
  }

  const tokenCounts = chunks.map(c => c.tokenCount);
  const totalTokens = tokenCounts.reduce((sum, t) => sum + t, 0);

  return {
    totalChunks: chunks.length,
    totalTokens,
    avgTokens: Math.round(totalTokens / chunks.length),
    maxTokens: Math.max(...tokenCounts),
    minTokens: Math.min(...tokenCounts),
  };
}

/**
 * RRF 混合检索模块
 *
 * 实现 Reciprocal Rank Fusion 算法，融合关键词检索和向量检索结果。
 *
 * RRF 公式: score(d) = Σ 1/(k + rank(d))
 * 默认 k=60，源自 Cormack, Clarke, Buettcher 2009 论文。
 */

import type { ArticleContext } from './types.js';
import { tokenize, normalizeText } from './search-utils.js';

// ─── 类型定义 ─────────────────────────────────────────────────────

export interface ArticleChunk {
  id: string;
  postId: string;
  heading: string;
  content: string;
  position: number;
  tokenCount: number;
  headers: Record<string, string>;
}

export interface ArticleWithChunks extends ArticleContext {
  chunks?: ArticleChunk[];
}

export interface RRFConfig {
  /** RRF 常数 k，默认 60 */
  k?: number;
  /** BM25/TF-IDF 权重，默认 0.5 */
  bm25Weight?: number;
  /** 向量权重，默认 0.5 */
  vectorWeight?: number;
  /** 返回数量，默认 10 */
  topK?: number;
}

export interface HybridSearchResult extends ArticleContext {
  rrfScore: number;
  bm25Rank?: number;
  vectorRank?: number;
  matchedChunks?: ArticleChunk[];
}

export interface ChunkMatchResult {
  article: ArticleWithChunks;
  chunk: ArticleChunk;
  score: number;
}

// ─── 常量 ──────────────────────────────────────────────────────────

const DEFAULT_RRF_K = 60;
const DEFAULT_TOP_K = 10;

// ─── RRF 核心算法 ──────────────────────────────────────────────────

/**
 * Reciprocal Rank Fusion 算法
 *
 * 融合多个检索系统的排名结果，只依赖排名而非分数。
 *
 * @param rankings - 多个检索系统的排名结果
 * @param k - RRF 常数，默认 60
 */
export function reciprocalRankFusion(
  rankings: Array<Array<{ url: string }>>,
  k: number = DEFAULT_RRF_K
): Map<string, number> {
  const scores = new Map<string, number>();

  for (const ranking of rankings) {
    for (let rank = 1; rank <= ranking.length; rank++) {
      const doc = ranking[rank - 1];
      const prev = scores.get(doc.url) ?? 0;
      scores.set(doc.url, prev + 1 / (k + rank));
    }
  }

  return new Map([...scores.entries()].sort((a, b) => b[1] - a[1]));
}

// ─── 混合检索 ──────────────────────────────────────────────────────

/**
 * 执行 BM25 + 向量混合检索
 *
 * @param query - 查询文本
 * @param bm25Results - BM25/TF-IDF 检索结果
 * @param vectorResults - 向量检索结果（可选）
 * @param config - RRF 配置
 */
export function hybridSearch(
  query: string,
  bm25Results: ArticleContext[],
  vectorResults: ArticleContext[] | null,
  config?: RRFConfig
): HybridSearchResult[] {
  const { k = DEFAULT_RRF_K, topK = DEFAULT_TOP_K } = config || {};

  if (!bm25Results.length) return [];

  // 如果没有向量结果，直接返回 BM25 结果
  if (!vectorResults || !vectorResults.length) {
    return bm25Results.slice(0, topK).map((r, i) => ({
      ...r,
      rrfScore: 1 / (k + i + 1),
      bm25Rank: i + 1,
    }));
  }

  // 构建 URL → 排名映射
  const bm25Ranking = bm25Results.map(r => ({ url: r.url }));
  const vectorRanking = vectorResults.map(r => ({ url: r.url }));

  // RRF 融合
  const rrfScores = reciprocalRankFusion([bm25Ranking, vectorRanking], k);

  // 构建最终结果
  const bm25Map = new Map(bm25Results.map(r => [r.url, r]));
  const vectorMap = new Map(vectorResults.map((r, i) => [r.url, i + 1]));

  const results: HybridSearchResult[] = [];
  let rank = 1;

  for (const [url, rrfScore] of rrfScores) {
    const bm25Result = bm25Map.get(url);
    const vectorRank = vectorMap.get(url);

    if (bm25Result) {
      results.push({
        ...bm25Result,
        rrfScore,
        bm25Rank: bm25Results.findIndex(r => r.url === url) + 1,
        vectorRank,
      });
    }

    if (results.length >= topK) break;
    rank++;
  }

  return results;
}

// ─── 段落级检索 ────────────────────────────────────────────────────

/**
 * 在段落级别搜索相关内容
 *
 * @param query - 查询文本
 * @param articles - 包含段落的文章列表
 * @param topK - 返回数量，默认 10
 */
export function searchChunks(
  query: string,
  articles: ArticleWithChunks[],
  topK: number = 10
): ChunkMatchResult[] {
  const queryTokens = tokenize(query);
  if (!queryTokens.length || !articles.length) return [];

  const results: ChunkMatchResult[] = [];

  for (const article of articles) {
    if (!article.chunks?.length) continue;

    for (const chunk of article.chunks) {
      const score = computeChunkRelevance(queryTokens, chunk);
      if (score > 0) {
        results.push({ article, chunk, score });
      }
    }
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

/**
 * 计算段落相关性分数
 *
 * 考虑因素：
 * 1. 标题匹配（权重 2.0）
 * 2. 内容关键词匹配
 * 3. 标题层级匹配（H1/H2 权重更高）
 */
export function computeChunkRelevance(
  queryTokens: string[],
  chunk: ArticleChunk
): number {
  let score = 0;

  const headingTokens = tokenize(chunk.heading);
  const contentTokens = tokenize(chunk.content);

  // 标题匹配
  for (const token of queryTokens) {
    if (headingTokens.some(h => h.includes(token) || token.includes(h))) {
      score += 2.0;
    }
  }

  // 内容匹配
  let contentMatches = 0;
  for (const token of queryTokens) {
    if (contentTokens.some(c => c.includes(token) || token.includes(c))) {
      contentMatches++;
    }
  }
  score += (contentMatches / queryTokens.length) * 1.5;

  // 标题层级加成
  if (chunk.headers.H1 || chunk.headers.H2) {
    score *= 1.1;
  }

  return score;
}

/**
 * 从段落匹配结果中格式化注入内容
 *
 * @param matches - 段落匹配结果
 * @param maxTokens - 最大 token 数，默认 2000
 */
export function formatChunksForInjection(
  matches: ChunkMatchResult[],
  maxTokens: number = 2000
): string {
  if (!matches.length) return '';

  const lines: string[] = [];
  let totalTokens = 0;

  for (const match of matches) {
    const chunkText = formatChunkForInjection(match);
    const chunkTokens = estimateTokens(chunkText);

    if (totalTokens + chunkTokens > maxTokens) break;

    lines.push(chunkText);
    totalTokens += chunkTokens;
  }

  return lines.join('\n\n');
}

function formatChunkForInjection(match: ChunkMatchResult): string {
  const { article, chunk, score } = match;
  const heading = chunk.heading ? `【${chunk.heading}】` : '';
  const source = `来源: [${article.title}](${article.url})`;

  return `${heading}\n${chunk.content.slice(0, 500)}\n\n${source}`;
}

function estimateTokens(text: string): number {
  const cjkChars = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length;
  const nonCjkChars = text.length - cjkChars;
  return Math.ceil(cjkChars / 2) + Math.ceil(nonCjkChars / 4);
}

// ─── 选择性注入 ────────────────────────────────────────────────────

export interface ChunkInjectionConfig {
  /** 最大注入 token 数 */
  maxTokens: number;
  /** 最低相关性分数 */
  minChunkScore: number;
  /** 每篇文章最多注入段落数 */
  maxChunksPerArticle: number;
}

const DEFAULT_INJECTION_CONFIG: ChunkInjectionConfig = {
  maxTokens: 2000,
  minChunkScore: 0.3,
  maxChunksPerArticle: 3,
};

/**
 * 选择最相关的段落用于注入
 */
export function selectRelevantChunks(
  query: string,
  articles: ArticleWithChunks[],
  config?: Partial<ChunkInjectionConfig>
): ChunkMatchResult[] {
  const cfg = { ...DEFAULT_INJECTION_CONFIG, ...config };
  const queryTokens = tokenize(query);

  if (!queryTokens.length) return [];

  const allMatches: ChunkMatchResult[] = [];

  for (const article of articles) {
    if (!article.chunks?.length) continue;

    const articleMatches: ChunkMatchResult[] = [];

    for (const chunk of article.chunks) {
      const score = computeChunkRelevance(queryTokens, chunk);
      if (score >= cfg.minChunkScore) {
        articleMatches.push({ article, chunk, score });
      }
    }

    // 每篇文章只保留 top-N 个段落
    articleMatches.sort((a, b) => b.score - a.score);
    allMatches.push(...articleMatches.slice(0, cfg.maxChunksPerArticle));
  }

  // 全局排序并截断
  return allMatches
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);
}
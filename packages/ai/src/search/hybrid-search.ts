/**
 * RRF 混合检索模块
 *
 * 实现 Reciprocal Rank Fusion 算法，融合关键词检索和向量检索结果。
 *
 * RRF 公式: score(d) = Σ 1/(k + rank(d))
 * 默认 k=60，源自 Cormack, Clarke, Buettcher 2009 论文。
 */

import type { ArticleContext, ArticleChunk } from "./types.js";
import { tokenize, normalizeText, extractCodeAnchors } from "../utils/text.js";
import { createLogger } from "../utils/logger.js";

export type { ArticleChunk } from "./types.js";

const log = createLogger("hybrid-search");

// ─── 类型定义 ─────────────────────────────────────────────────────

export interface ArticleWithChunks extends ArticleContext {
  chunks?: ArticleChunk[];
}

export interface RRFConfig {
  /** RRF 常数 k，默认 60 */
  k?: number;
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

export interface ChunkRelevanceOptions {
  rawQuery?: string;
  rawAnchors?: string[];
}

export interface NeighborChunkConfig {
  includePrevious?: boolean;
  includeNext?: boolean;
  rawAnchors?: string[];
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
  _query: string,
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
  const bm25Map = new Map(bm25Results.map((r, i) => [r.url, { result: r, index: i + 1 }]));
  const vectorMap = new Map(vectorResults.map((r, i) => [r.url, i + 1]));

  const results: HybridSearchResult[] = [];
  let rank = 1;

  for (const [url, rrfScore] of rrfScores) {
    const bm25Entry = bm25Map.get(url);
    const vectorRank = vectorMap.get(url);

    if (bm25Entry) {
      results.push({
        ...bm25Entry.result,
        rrfScore,
        bm25Rank: bm25Entry.index,
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
      const score = computeChunkRelevance(queryTokens, chunk, article);
      if (score > 0) {
        results.push({ article, chunk, score });
      }
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, topK);
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
  chunk: ArticleChunk,
  article?: Pick<ArticleContext, "title" | "categories" | "keyPoints">,
  options: ChunkRelevanceOptions = {}
): number {
  let score = 0;
  const rawQuery = options.rawQuery?.trim() ?? "";
  const rawAnchors =
    options.rawAnchors && options.rawAnchors.length > 0
      ? options.rawAnchors
      : extractCodeAnchors(rawQuery);

  const headingTokens = tokenize(chunk.heading);
  const contentTokens = tokenize(chunk.content);
  const articleTitleTokens = article ? tokenize(article.title) : [];
  const articleMetaText = article
    ? normalizeText(
        [
          article.title,
          ...(article.categories ?? []),
          ...(article.keyPoints ?? []),
        ].join(" ")
      )
    : "";
  const anchorTokens = queryTokens
    .filter(token => token.length >= 2)
    .sort((a, b) => b.length - a.length)
    .slice(0, 3);
  const genericTopicTokens = new Set([
    "ai",
    "rag",
    "功能",
    "特性",
    "功能特性",
    "设计",
    "架构",
    "模块",
    "聊天",
    "配置",
  ]);
  const strongAnchorTokens = anchorTokens.filter(
    token => !genericTopicTokens.has(token)
  );
  const headingText = normalizeText(chunk.heading);
  const titleText = article ? normalizeText(article.title) : "";

  score += scoreExactQueryMatches(rawQuery, chunk);
  score += scoreExactCodeAnchorMatches(rawAnchors, chunk, article);

  // 标题匹配
  for (const token of queryTokens) {
    if (headingTokens.some(h => h.includes(token) || token.includes(h))) {
      score += 2.0;
    }
    if (
      articleTitleTokens.some(
        title => title.includes(token) || token.includes(title)
      )
    ) {
      score += 1.2;
    }
  }

  // 内容匹配 - 使用绝对匹配数替代比率，对长查询更公平
  const contentMatches = queryTokens.filter(token =>
    contentTokens.some(c => c.includes(token) || token.includes(c))
  ).length;
  const contentRatio = Math.min(contentMatches / queryTokens.length, 0.8);
  score += contentRatio * 2.0;

  // 标题层级加成
  if (chunk.headers.H1 || chunk.headers.H2) {
    score *= 1.1;
  }

  if (anchorTokens.length > 0) {
    const anchorHitCount = anchorTokens.filter(term =>
      articleMetaText.includes(term)
    ).length;
    if (anchorHitCount === 0) {
      score *= 0.72;
    } else {
      score *= 1 + Math.min(anchorHitCount, 2) * 0.08;
    }
  }

  if (strongAnchorTokens.length > 0) {
    const strongTitleHits = strongAnchorTokens.filter(token =>
      titleText.includes(token)
    ).length;
    const strongHeadingHits = strongAnchorTokens.filter(token =>
      headingText.includes(token)
    ).length;

    if (strongTitleHits === 0 && strongHeadingHits === 0) {
      score *= 0.58;
    } else {
      score *= 1 + Math.min(strongTitleHits + strongHeadingHits, 2) * 0.12;
    }
  }

  return score;
}

function scoreExactCodeAnchorMatches(
  rawAnchors: string[],
  chunk: ArticleChunk,
  article?: Pick<ArticleContext, "title">
): number {
  if (rawAnchors.length === 0) return 0;

  let bonus = 0;
  const normalizedContent = normalizeText(chunk.content);
  const normalizedHeading = normalizeText(chunk.heading);
  const normalizedTitle = article ? normalizeText(article.title) : "";

  for (const anchor of rawAnchors) {
    if (anchor.length < 2) continue;

    const normalizedAnchor = normalizeText(anchor);
    if (!normalizedAnchor) continue;

    if (chunk.content.includes(anchor)) {
      bonus += 5.5;
      continue;
    }
    if (chunk.heading.includes(anchor)) {
      bonus += 4.2;
      continue;
    }
    if (article?.title.includes(anchor)) {
      bonus += 2.5;
      continue;
    }

    if (normalizedContent.includes(normalizedAnchor)) {
      bonus += 3.5;
    } else if (normalizedHeading.includes(normalizedAnchor)) {
      bonus += 2.2;
    } else if (normalizedTitle.includes(normalizedAnchor)) {
      bonus += 1.4;
    }
  }

  return bonus;
}

function scoreExactQueryMatches(query: string, chunk: ArticleChunk): number {
  const candidate = extractLikelyQuotedText(query);
  if (!candidate) return 0;

  const normalizedCandidate = normalizeText(candidate);
  if (normalizedCandidate.length < 12) return 0;

  const chunkContent = chunk.content;
  const normalizedContent = normalizeText(chunkContent);
  const normalizedHeading = normalizeText(chunk.heading);

  let bonus = 0;

  if (chunkContent.includes(candidate)) {
    bonus += 6;
  } else if (normalizedContent.includes(normalizedCandidate)) {
    bonus += 4.5;
  }

  if (!chunk.heading && normalizedContent.startsWith(normalizedCandidate)) {
    bonus += 8;
  }

  if (normalizedHeading.includes(normalizedCandidate)) {
    bonus += 1.5;
  }

  return bonus;
}

function extractLikelyQuotedText(query: string): string {
  const trimmed = query.trim();
  if (!trimmed) return "";

  const quotedMatches = [...trimmed.matchAll(/["“”'‘’「」『』《》](.+?)["“”'‘’「」『』《》]/g)]
    .map(match => match[1]?.trim() ?? "")
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  if (quotedMatches[0]) {
    return quotedMatches[0];
  }

  return trimmed;
}

/**
 * 从段落匹配结果中格式化注入内容
 *
 * @param matches - 段落匹配结果
 * @param maxTokens - 最大 token 数，默认 2000
 * @param defaultContentLimit - 每个段落内容的最大字符数，默认 1500
 */
export function formatChunksForInjection(
  matches: ChunkMatchResult[],
  maxTokens: number = 2000,
  defaultContentLimit: number = 1500
): string {
  if (!matches.length) return "";

  // 动态计算每个段落的内容限制
  // 80% 的 token 预算给段落内容，20% 给标题和来源等开销
  const perChunkContentLimit = Math.min(
    defaultContentLimit,
    Math.floor((maxTokens * 0.8) / matches.length)
  );

  const lines: string[] = [];
  let totalTokens = 0;

  for (const match of matches) {
    const chunkText = formatChunkForInjection(match, perChunkContentLimit);
    const chunkTokens = estimateTokens(chunkText);

    if (totalTokens + chunkTokens > maxTokens) break;

    lines.push(chunkText);
    totalTokens += chunkTokens;
  }

  return lines.join("\n\n");
}

function formatChunkForInjection(
  match: ChunkMatchResult,
  contentLimit: number = 1500
): string {
  const { article, chunk } = match;
  const heading = chunk.heading ? `【${chunk.heading}】` : "";
  const source = `来源: [${article.title}](${article.url})`;

  // 根据动态计算的 contentLimit 限制内容长度
  const truncatedContent = chunk.content.length > contentLimit
    ? chunk.content.slice(0, contentLimit) + "..."
    : chunk.content;

  return `${heading}\n${truncatedContent}\n\n${source}`;
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
  rawAnchors?: string[];
  currentArticleId?: string;
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
      const score = computeChunkRelevance(queryTokens, chunk, article, {
        rawQuery: query,
        rawAnchors: cfg.rawAnchors,
      });
      if (score >= cfg.minChunkScore) {
        articleMatches.push({ article, chunk, score });
      }
    }

    // 每篇文章只保留 top-N 个段落
    articleMatches.sort((a, b) => b.score - a.score);
    allMatches.push(...articleMatches.slice(0, cfg.maxChunksPerArticle));
  }

  // 全局排序并截断
  const globallyRanked = allMatches.sort((a, b) => b.score - a.score);
  const selected = cfg.currentArticleId
    ? [
        ...globallyRanked.filter(match => match.article.id === cfg.currentArticleId),
        ...globallyRanked.filter(match => match.article.id !== cfg.currentArticleId),
      ].slice(0, 20)
    : globallyRanked.slice(0, 20);
  log.debug(
    `selectRelevantChunks: queryTokens=${queryTokens.length}, articles=${articles.length}, matched=${allMatches.length}, selected=${selected.length}, maxPerArticle=${cfg.maxChunksPerArticle}, minScore=${cfg.minChunkScore}`
  );
  if (selected.length > 0) {
    log.debug(
      `selectRelevantChunks top: ${selected
        .slice(0, 5)
        .map(
          match =>
            `${match.article.title}#${match.chunk.id}:${match.score.toFixed(3)}`
        )
        .join(", ")}`
    );
  }
  return selected;
}

export function expandChunkMatchesWithNeighbors(
  matches: ChunkMatchResult[],
  config: NeighborChunkConfig = { includePrevious: true, includeNext: true }
): ChunkMatchResult[] {
  const expanded: ChunkMatchResult[] = [];
  const seen = new Set<string>();
  const rawAnchors = config.rawAnchors ?? [];

  const candidateHasAnchor = (candidate: ChunkMatchResult): boolean => {
    if (rawAnchors.length === 0) return true;

    return rawAnchors.some(anchor => {
      const normalizedAnchor = normalizeText(anchor);
      return (
        candidate.chunk.content.includes(anchor) ||
        candidate.chunk.heading.includes(anchor) ||
        normalizeText(candidate.chunk.content).includes(normalizedAnchor) ||
        normalizeText(candidate.chunk.heading).includes(normalizedAnchor)
      );
    });
  };

  for (const match of matches) {
    const push = (candidate: ChunkMatchResult | undefined) => {
      if (!candidate) return;
      if (seen.has(candidate.chunk.id)) return;
      if (candidate !== match && rawAnchors.length > 0 && !candidateHasAnchor(candidate)) return;
      seen.add(candidate.chunk.id);
      expanded.push(candidate);
    };

    push(match);

    const articleChunks = match.article.chunks ?? [];
    const index = articleChunks.findIndex(chunk => chunk.id === match.chunk.id);
    if (index === -1) continue;

    if (config.includePrevious && index > 0) {
      push({
        article: match.article,
        chunk: articleChunks[index - 1],
        score: match.score * 0.9,
      });
    }

    if (config.includeNext && index < articleChunks.length - 1) {
      push({
        article: match.article,
        chunk: articleChunks[index + 1],
        score: match.score * 0.85,
      });
    }
  }

  return expanded.sort(
    (a, b) => b.score - a.score || a.chunk.position - b.chunk.position
  );
}

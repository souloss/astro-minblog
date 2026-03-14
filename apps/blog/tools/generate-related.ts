#!/usr/bin/env npx tsx
/**
 * 关联文章推荐工具
 *
 * 用法:
 *   pnpm run tools:generate-related              # 基于标签/标题的关联推荐
 *   pnpm run tools:generate-related --ai          # 使用 AI 语义分析（需要向量索引）
 *   pnpm run tools:generate-related --verbose      # 显示详细评分
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getAllPosts, type PostMeta } from "./lib/posts.js";
import { cosineSimilarity, type VectorIndex } from "./lib/vectors.js";

const VECTOR_INDEX = join(process.cwd(), "src/data/vectors/index.json");

function tagSimilarity(a: PostMeta, b: PostMeta): number {
  let score = 0;
  const aTags = new Set(a.tags.map(t => t.toLowerCase()));
  const bTags = new Set(b.tags.map(t => t.toLowerCase()));

  for (const tag of aTags) {
    if (bTags.has(tag)) score += 3;
  }

  if (a.category && b.category) {
    if (a.category === b.category) score += 5;
    else {
      const ap = a.category.split("/");
      const bp = b.category.split("/");
      if (ap[0] === bp[0]) score += 2;
    }
  }

  const aWords = new Set(
    a.title
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 2)
  );
  const bWords = new Set(
    b.title
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 2)
  );
  for (const w of aWords) {
    if (bWords.has(w)) score += 1;
  }

  return score;
}

async function loadVectorIndex(): Promise<VectorIndex | null> {
  try {
    const content = await readFile(VECTOR_INDEX, "utf-8");
    return JSON.parse(content) as VectorIndex;
  } catch {
    return null;
  }
}

function vectorSimilarity(
  postIdA: string,
  postIdB: string,
  index: VectorIndex
): number {
  const chunksA = index.chunks.filter(c => c.postId === postIdA && c.vector);
  const chunksB = index.chunks.filter(c => c.postId === postIdB && c.vector);

  if (chunksA.length === 0 || chunksB.length === 0) return 0;

  let maxSim = 0;
  for (const ca of chunksA) {
    for (const cb of chunksB) {
      const sim = cosineSimilarity(ca.vector!, cb.vector!);
      if (sim > maxSim) maxSim = sim;
    }
  }

  return maxSim;
}

async function main() {
  const args = process.argv.slice(2);
  const useAI = args.includes("--ai");
  const verbose = args.includes("--verbose");

  const posts = await getAllPosts();
  console.log(`📚 共 ${posts.length} 篇文章\n`);

  let vectorIndex: VectorIndex | null = null;
  if (useAI) {
    vectorIndex = await loadVectorIndex();
    if (!vectorIndex) {
      console.error("❌ 向量索引未找到。请先运行: pnpm run tools:vectorize");
      process.exit(1);
    }
    console.log(
      `🧠 使用向量索引（${vectorIndex.method} 模式，${vectorIndex.chunks.length} 个块）\n`
    );
  }

  const zhPosts = posts.filter(p => p.lang === "zh");
  const enPosts = posts.filter(p => p.lang === "en");

  for (const langPosts of [zhPosts, enPosts]) {
    if (langPosts.length === 0) continue;
    const langLabel = langPosts[0].lang === "zh" ? "中文" : "English";
    console.log(`\n=== ${langLabel} (${langPosts.length} 篇) ===\n`);

    for (const post of langPosts) {
      const scores = langPosts
        .filter(p => p.id !== post.id)
        .map(p => {
          let score = tagSimilarity(post, p);

          if (useAI && vectorIndex) {
            const vecSim = vectorSimilarity(post.id, p.id, vectorIndex);
            score += vecSim * 10;
          }

          return { post: p, score };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      console.log(`📝 【${post.title}】`);
      if (scores.length > 0) {
        console.log("   推荐关联:");
        for (const s of scores) {
          const scoreStr = verbose
            ? ` (得分: ${s.score.toFixed(2)})`
            : "";
          console.log(`     - ${s.post.title}${scoreStr}`);
        }
      } else {
        console.log("   (无匹配)");
      }
      console.log("");
    }
  }
}

main().catch(console.error);

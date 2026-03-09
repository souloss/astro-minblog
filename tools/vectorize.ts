#!/usr/bin/env npx tsx
/**
 * 博客内容向量化与索引生成
 *
 * 用法:
 *   pnpm run tools:vectorize              # TF-IDF 模式（无需 API Key）
 *   pnpm run tools:vectorize --openai     # OpenAI Embeddings 模式
 *
 * 环境变量:
 *   AI_API_KEY / OPENAI_API_KEY（仅 --openai 模式需要）
 */

import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { chunkText } from "./lib/markdown.js";
import { getAllPosts } from "./lib/posts.js";
import { generateEmbeddings } from "./lib/ai-provider.js";
import {
  generateTfIdfVectors,
  type ContentChunk,
  type VectorIndex,
} from "./lib/vectors.js";

const OUTPUT_DIR = join(process.cwd(), "src/data/vectors");
const OUTPUT_FILE = join(OUTPUT_DIR, "index.json");
const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 50;

async function main() {
  const useOpenAI = process.argv.includes("--openai");
  const method = useOpenAI ? "openai" : "tfidf";

  console.log(`📚 读取博客文章...`);
  const posts = await getAllPosts();
  console.log(`   找到 ${posts.length} 篇文章\n`);

  console.log(`📝 分割内容块...`);
  const chunks: ContentChunk[] = [];

  for (const post of posts) {
    const fullText = `${post.title}\n${post.description}\n${post.body}`;
    const textChunks = chunkText(fullText, CHUNK_SIZE, CHUNK_OVERLAP);

    for (let i = 0; i < textChunks.length; i++) {
      chunks.push({
        postId: post.id,
        title: post.title,
        lang: post.lang,
        chunkIndex: i,
        text: textChunks[i],
      });
    }
  }

  console.log(`   生成 ${chunks.length} 个内容块\n`);

  if (method === "openai") {
    console.log(`🧠 使用 OpenAI Embeddings 生成向量...`);
    const texts = chunks.map(c => c.text);
    const vectors = await generateEmbeddings(texts);
    chunks.forEach((c, i) => {
      c.vector = vectors[i];
    });

    const index: VectorIndex = {
      version: 1,
      method: "openai",
      createdAt: new Date().toISOString(),
      chunks,
    };

    await mkdir(OUTPUT_DIR, { recursive: true });
    await writeFile(OUTPUT_FILE, JSON.stringify(index, null, 0), "utf-8");

    const fileSize = (JSON.stringify(index).length / 1024).toFixed(1);
    console.log(`\n✅ 索引已生成: ${OUTPUT_FILE}`);
    console.log(`   文件大小: ${fileSize} KB`);
    console.log(`   内容块: ${chunks.length}`);
  } else {
    console.log(`🔢 使用 TF-IDF 生成向量...`);
    const { vocabulary, vectors } = generateTfIdfVectors(chunks);
    chunks.forEach((c, i) => {
      c.vector = vectors[i];
    });

    const index: VectorIndex = {
      version: 1,
      method: "tfidf",
      createdAt: new Date().toISOString(),
      vocabulary,
      chunks,
    };

    await mkdir(OUTPUT_DIR, { recursive: true });
    await writeFile(OUTPUT_FILE, JSON.stringify(index, null, 0), "utf-8");

    const fileSize = (JSON.stringify(index).length / 1024).toFixed(1);
    console.log(`\n✅ 索引已生成: ${OUTPUT_FILE}`);
    console.log(`   文件大小: ${fileSize} KB`);
    console.log(`   词汇量: ${vocabulary.length}`);
    console.log(`   内容块: ${chunks.length}`);
  }
}

main().catch(console.error);

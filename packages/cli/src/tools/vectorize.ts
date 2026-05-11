#!/usr/bin/env npx tsx

import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { chunkMarkdownByHeaders } from "./lib/markdown-chunker.js";
import { getAllPosts } from "./lib/posts.js";
import { generateEmbeddings } from "./lib/ai-provider.js";
import {
  generateTfIdfVectors,
  type ContentChunk,
  type VectorIndex,
} from "./lib/vectors.js";
import { DATA_DIR } from "./lib/knowledge.js";

const VECTOR_OUTPUT_FILE = join(DATA_DIR, "vector-index.json");

async function main() {
  const useOpenAI = process.argv.includes("--openai");
  const method = useOpenAI ? "openai" : "tfidf";

  console.log(`📚 读取博客文章...`);
  const posts = await getAllPosts({
    stripBody: false,
    includeUnderscoreDirs: true,
  });
  console.log(`   找到 ${posts.length} 篇文章\n`);

  console.log(`📝 按标题分段...`);
  const chunks: ContentChunk[] = [];

  for (const post of posts) {
    const fullText = `# ${post.title}\n\n${post.description}\n\n${post.body}`;

    // 使用新的段落分段器
    const articleChunks = chunkMarkdownByHeaders(fullText, post.id, {
      maxTokens: 512,
      minTokens: 50,
      overlapTokens: 64,
    });

    for (let i = 0; i < articleChunks.length; i++) {
      chunks.push({
        postId: post.id,
        title: post.title,
        lang: post.lang,
        chunkIndex: i,
        text: articleChunks[i].content,
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

    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(
      VECTOR_OUTPUT_FILE,
      JSON.stringify(index, null, 0),
      "utf-8"
    );

    const fileSize = (JSON.stringify(index).length / 1024).toFixed(1);
    console.log(`\n✅ 索引已生成: ${VECTOR_OUTPUT_FILE}`);
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

    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(
      VECTOR_OUTPUT_FILE,
      JSON.stringify(index, null, 0),
      "utf-8"
    );

    const fileSize = (JSON.stringify(index).length / 1024).toFixed(1);
    console.log(`\n✅ 索引已生成: ${VECTOR_OUTPUT_FILE}`);
    console.log(`   文件大小: ${fileSize} KB`);
    console.log(`   词汇量: ${vocabulary.length}`);
    console.log(`   内容块: ${chunks.length}`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

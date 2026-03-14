/**
 * 向量计算与 TF-IDF 工具
 */

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0,
    magA = 0,
    magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const mag = Math.sqrt(magA) * Math.sqrt(magB);
  return mag === 0 ? 0 : dot / mag;
}

export function tokenize(text: string): string[] {
  const CJK = /[\u4e00-\u9fff\u3400-\u4dbf]/g;
  const cjkChars = text.match(CJK) || [];
  const latin = text
    .replace(CJK, " ")
    .toLowerCase()
    .split(/\W+/)
    .filter(w => w.length > 2);
  return [...cjkChars, ...latin];
}

export function buildVocabulary(documents: string[][]): string[] {
  const df = new Map<string, number>();
  for (const doc of documents) {
    const unique = new Set(doc);
    for (const term of unique) {
      df.set(term, (df.get(term) || 0) + 1);
    }
  }
  const maxDf = documents.length * 0.8;
  return Array.from(df.entries())
    .filter(([, count]) => count >= 2 && count <= maxDf)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2000)
    .map(([term]) => term);
}

export function computeTfIdf(
  tokens: string[],
  vocabulary: string[],
  idf: Map<string, number>
): number[] {
  const tf = new Map<string, number>();
  for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
  const maxTf = Math.max(...tf.values(), 1);

  return vocabulary.map(term => {
    const termTf = (tf.get(term) || 0) / maxTf;
    const termIdf = idf.get(term) || 0;
    return +(termTf * termIdf).toFixed(6);
  });
}

export interface ContentChunk {
  postId: string;
  title: string;
  lang: string;
  chunkIndex: number;
  text: string;
  vector?: number[];
}

export interface VectorIndex {
  version: number;
  method: "tfidf" | "openai";
  createdAt: string;
  vocabulary?: string[];
  chunks: ContentChunk[];
}

export function generateTfIdfVectors(
  chunks: ContentChunk[]
): { vocabulary: string[]; vectors: number[][] } {
  const tokenizedDocs = chunks.map(c => tokenize(c.text));
  const vocabulary = buildVocabulary(tokenizedDocs);

  const N = tokenizedDocs.length;
  const idf = new Map<string, number>();
  for (const term of vocabulary) {
    const docCount = tokenizedDocs.filter(doc => doc.includes(term)).length;
    idf.set(term, Math.log(N / (docCount + 1)) + 1);
  }

  const vectors = tokenizedDocs.map(tokens =>
    computeTfIdf(tokens, vocabulary, idf)
  );
  return { vocabulary, vectors };
}

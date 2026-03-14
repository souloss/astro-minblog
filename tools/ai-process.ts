#!/usr/bin/env npx tsx
/**
 * AI 文章批处理脚本 (适配 astro-minimax)
 *
 * 用法:
 *   pnpm ai:process                   处理所有文章（跳过已缓存且未变更的）
 *   pnpm ai:process --force           强制重新处理所有文章
 *   pnpm ai:process --slug=xxx        只处理指定文章（如 zh/getting-started）
 *   pnpm ai:process --task=summary    只运行摘要任务
 *   pnpm ai:process --task=seo        只运行 SEO 任务
 *   pnpm ai:process --recent=10       处理最近 10 篇文章
 *   pnpm ai:process --new-only        只处理没有缓存的文章
 *   pnpm ai:process --dry-run         只显示会处理哪些文章
 *   pnpm ai:process --concurrency=10  设置并发数（默认 10）
 *   pnpm ai:process --no-skip         忽略跳过列表，重试所有文章
 *   pnpm ai:process --clear-skip      清空跳过列表后再处理
 *   pnpm ai:process --lang=zh         只处理指定语言的文章
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import crypto from "node:crypto";
import {
  getAllPosts,
  type PostMeta,
  } from "./lib/posts.js";
import { extractFrontmatter } from "./lib/frontmatter.js";
import { chatCompletion, hasAPIKey, getConfig } from "./lib/ai-provider.js";

// ─── 常量 ─────────────────────────────────────────────────────

const DATA_DIR = join(process.cwd(), "datas");
const SKIP_LIST_FILE = join(DATA_DIR, "ai-skip-list.json");

// ─── CLI 参数解析 ───────────────────────────────────────────

interface CliFlags {
  force: boolean;
  slug: string | null;
  task: "summary" | "seo" | null;
  recent: number | null;
  newOnly: boolean;
  dryRun: boolean;
  concurrency: number;
  noSkip: boolean;
  clearSkip: boolean;
  lang: "zh" | "en" | null;
}

function parseArgs(): CliFlags {
  const args = process.argv.slice(2);
  const flags: CliFlags = {
    force: false,
    slug: null,
    task: null,
    recent: null,
    newOnly: false,
    dryRun: false,
    concurrency: 10,
    noSkip: false,
    clearSkip: false,
    lang: null,
  };

  for (const arg of args) {
    if (arg === "--force") flags.force = true;
    else if (arg === "--new-only") flags.newOnly = true;
    else if (arg === "--dry-run") flags.dryRun = true;
    else if (arg === "--no-skip") flags.noSkip = true;
    else if (arg === "--clear-skip") flags.clearSkip = true;
    else if (arg.startsWith("--slug=")) flags.slug = arg.split("=")[1];
    else if (arg.startsWith("--task=")) flags.task = arg.split("=")[1] as "summary" | "seo";
    else if (arg.startsWith("--recent="))
      flags.recent = parseInt(arg.split("=")[1], 10);
    else if (arg.startsWith("--concurrency="))
      flags.concurrency = parseInt(arg.split("=")[1], 10);
    else if (arg.startsWith("--lang="))
      flags.lang = arg.split("=")[1] as "zh" | "en";
  }

  return flags;
}

// ─── 缓存管理 ────────────────────────────────────────────────

interface CacheMeta {
  lastUpdated: string | null;
  model: string | null;
  totalProcessed: number;
}

interface CacheEntry {
  data: Record<string, unknown>;
  contentHash: string;
  processedAt: string;
}

interface Cache {
  meta: CacheMeta;
  articles: Record<string, CacheEntry>;
}

function createCacheManager(cacheFile: string) {
  let cache: Cache | null = null;
  let writeQueue = Promise.resolve();

  return {
    async load(): Promise<Cache> {
      const cachePath = join(DATA_DIR, cacheFile);
      try {
        const raw = await readFile(cachePath, "utf-8");
        cache = JSON.parse(raw);
      } catch {
        cache = {
          meta: { lastUpdated: null, model: null, totalProcessed: 0 },
          articles: {},
        };
      }
      return cache!;
    },

    getCache(): Cache | null {
      return cache;
    },

    /** 串行写入：无论多少并发 worker 同时调用，写操作排队执行 */
    async writeEntry(
      slug: string,
      entry: CacheEntry,
      model: string
    ): Promise<void> {
      writeQueue = writeQueue.then(async () => {
        if (!cache) return;
        cache.articles[slug] = entry;
        cache.meta.lastUpdated = new Date().toISOString();
        cache.meta.model = model;
        cache.meta.totalProcessed = Object.keys(cache.articles).length;

        await mkdir(DATA_DIR, { recursive: true });
        const cachePath = join(DATA_DIR, cacheFile);
        await writeFile(cachePath, JSON.stringify(cache, null, 2), "utf-8");
      });
      return writeQueue;
    },
  };
}

// ─── 跳过列表管理 ────────────────────────────────────────────

interface SkipEntry {
  slug: string;
  task: string;
  reason: string;
  failCount: number;
  lastFailedAt: string;
  firstFailedAt: string;
}

type SkipList = Record<string, SkipEntry>;

async function loadSkipList(): Promise<SkipList> {
  try {
    const raw = await readFile(SKIP_LIST_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function saveSkipList(skipList: SkipList): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(SKIP_LIST_FILE, JSON.stringify(skipList, null, 2), "utf-8");
}

async function addToSkipList(
  skipList: SkipList,
  taskName: string,
  slug: string,
  errorMsg: string
): Promise<void> {
  const key = `${taskName}:${slug}`;
  const existing = skipList[key];
  skipList[key] = {
    slug,
    task: taskName,
    reason: errorMsg,
    failCount: (existing?.failCount ?? 0) + 1,
    lastFailedAt: new Date().toISOString(),
    firstFailedAt: existing?.firstFailedAt ?? new Date().toISOString(),
  };
  await saveSkipList(skipList);
}

// ─── 工具函数 ────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 去重、去空的字符串数组清洗 */
function cleanStringArray(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  return [...new Set(arr.map((s) => String(s).trim()).filter(Boolean))];
}

// ─── 文章扫描与处理 ──────────────────────────────────────────

interface Article extends PostMeta {
  contentHash: string;
  fullContent: string;
  pubTimestamp: number;
}

async function scanArticles(flags: CliFlags): Promise<Article[]> {
  const allPosts = await getAllPosts({ includeDrafts: false, stripBody: false });
  const articles: Article[] = [];

  for (const post of allPosts) {
    // 跳过草稿
    if (post.draft) continue;

    // 语言过滤
    if (flags.lang && post.lang !== flags.lang) continue;

    // 读取完整内容用于计算 hash
    const rawContent = await readFile(post.filePath, "utf-8");
    const fm = extractFrontmatter(rawContent);
    const contentHash = crypto
      .createHash("md5")
      .update(fm.body)
      .digest("hex")
      .slice(0, 8);

    const pubDatetime = fm.data.pubDatetime;
    const pubTimestamp = pubDatetime
      ? new Date(pubDatetime as string).getTime()
      : 0;

    articles.push({
      ...post,
      contentHash,
      fullContent: fm.body,
      pubTimestamp,
    });
  }

  // 按发布时间降序排列
  articles.sort((a, b) => b.pubTimestamp - a.pubTimestamp);
  return articles;
}

// ─── AI API 调用 ─────────────────────────────────────────────

const RATE_LIMIT_MAX_RETRIES = 8;

async function callAIWithRetry(
  systemPrompt: string,
  userPrompt: string,
  options?: { maxTokens?: number }
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= RATE_LIMIT_MAX_RETRIES; attempt++) {
    try {
      const result = await chatCompletion(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        { maxTokens: options?.maxTokens ?? 2048 }
      );
      return result;
    } catch (err) {
      lastError = err as Error;
      const is429 = (err as Error).message?.includes("429");

      if (is429) {
        // 429 限速：指数退避 + 随机抖动
        const baseSec = Math.min(2 ** attempt, 30);
        const jitter = Math.random() * baseSec * 0.5;
        await sleep((baseSec + jitter) * 1000);
        continue;
      }

      // 非 429 的网络错误，重试 1 次
      if (attempt === 0) {
        await sleep(2000);
        continue;
      }
      throw err;
    }
  }

  throw lastError ?? new Error("超过最大重试次数");
}

// ─── 任务定义 ────────────────────────────────────────────────

interface TaskResult {
  summary?: string;
  abstract?: string;
  keyPoints?: string[];
  tags?: string[];
  readingTime?: number;
  metaDescription?: string;
  keywords?: string[];
  ogDescription?: string;
}

interface Task {
  name: string;
  cacheFile: string;
  buildPrompt: (article: Article) => { system: string; user: string };
  parseResponse: (raw: string) => TaskResult;
}

const TASKS: Record<string, Task> = {
  summary: {
    name: "summary",
    cacheFile: "ai-summaries.json",

    buildPrompt(article: Article) {
      const langHint =
        article.lang === "en"
          ? "Please respond in English."
          : "请使用中文回复。";

      return {
        system: `你是一位专业的博客内容分析师。请分析给定博客文章，并只返回**严格合法的 JSON**（RFC8259），不得输出任何额外文字或 Markdown 代码块。

请生成以下字段：

1) summary：
一句话总结文章核心内容（50-80字）。
应包含：主题 + 关键动作/方法 + 结论/收益（若文中存在）。

2) abstract：
详细摘要（150-300字）。
要求：
- 客观覆盖文章的背景/问题
- 核心方案或步骤
- 关键技术点（如代码、配置、命令、架构）
- 结论或效果（如有）
- 不粘贴大段代码

3) keyPoints：
3-6条要点列表，用于结构化索引与语义检索。
要求：
- 每条≤30字
- 陈述句
- 信息密度高
- 覆盖：问题/背景、方案、关键技术点、结果/坑点
- 不要与summary重复
- 不要空泛表达（避免"经验分享""技术总结"等）

4) tags：
3-5个标签。
要求：
- 去重
- 尽量具体
- 允许中文或通用英文技术术语
- 避免泛标签（如"技术""随笔"）
- 英文术语采用常见标准写法（如 Next.js、Docker、Kubernetes）

5) readingTime：
整数分钟。
估算规则：
- 中文阅读速度按350字/分钟
- 若代码块较多或技术细节密集，乘以1.3
- 若为叙事或轻量内容，乘以1.0
- 向上取整，最小为1

重要约束：
- 不添加原文不存在的信息
- 不引用外部知识补全
- 忽略 Markdown 噪声（图片引用、代码块标记等）
- 输出必须可直接 JSON.parse 解析
- ${langHint}

输出格式必须严格如下（字段齐全）：
{"summary":"...","abstract":"...","keyPoints":["...","..."],"tags":["...","..."],"readingTime":5}`,

        user: `文章标题：${article.title}
文章分类：${article.category || "无"}
文章标签：${article.tags.join(", ") || "无"}

文章正文：
${article.fullContent.slice(0, 8000)}`,
      };
    },

    parseResponse(raw: string): TaskResult {
      const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = (jsonMatch ? jsonMatch[1] : raw).trim();
      const parsed = JSON.parse(jsonStr);

      if (!parsed.summary || !parsed.abstract || !Array.isArray(parsed.tags)) {
        throw new Error("摘要数据格式不完整");
      }

      const readingTimeRaw = parsed.readingTime;
      const readingTime =
        typeof readingTimeRaw === "number"
          ? readingTimeRaw
          : typeof readingTimeRaw === "string"
            ? parseInt(readingTimeRaw, 10) || undefined
            : undefined;

      return {
        summary: parsed.summary,
        abstract: parsed.abstract,
        keyPoints: cleanStringArray(parsed.keyPoints),
        tags: cleanStringArray(parsed.tags),
        readingTime,
      };
    },
  },

  seo: {
    name: "seo",
    cacheFile: "ai-seo.json",

    buildPrompt(article: Article) {
      const langHint =
        article.lang === "en"
          ? "Please respond in English."
          : "请使用中文回复。";

      return {
        system: `你是一位资深 SEO 与内容增长专家。请基于给定博客文章生成 SEO 文案与关键词数据，并只返回**严格合法的 JSON**（RFC8259），不得输出任何额外文字或 Markdown 代码块。

请输出以下字段：

1) metaDescription：
用于网页 <meta name="description"> 的描述（120-160字）。
要求：
- 自然包含 1-2 个核心关键词（不要堆砌）
- 信息结构建议：主题/对象 + 解决的问题/收益 + 关键方法/亮点（若有）
- 不要复读标题（不要以"本文/这篇文章"开头）
- 不要换行，不要引号，不要使用夸张营销词（如"史上最强/必看"）

2) keywords：
5-8 个 SEO 关键词或短语（字符串数组），按重要性从高到低排序。
要求：
- 组合：2-3 个核心短词 + 3-5 个长尾短语（更像用户会搜的表达）
- 避免过泛词（如"技术/教程/经验/分享/博客"）
- 去重，避免同义重复
- 中文优先；通用技术名词可用英文/标准写法（如 Next.js、Cloudflare Workers、Docker）
- 长尾短语可包含"怎么做/报错/排查/对比/最佳实践/配置"等意图词（仅在文章内容支持时使用）

3) ogDescription：
用于 Open Graph / 社交媒体分享的描述（60-100字）。
要求：
- 比 metaDescription 更口语化、更吸引点击
- 强调"读者能得到什么"或"解决什么痛点"
- 不要标题复读，不要换行，不要用引号

重要约束：
- 只能使用文章中出现或可直接概括出的信息；不得凭空补充工具/数据/结论
- 输入可能包含 Markdown、代码块、链接；请忽略格式噪声，聚焦内容
- 输出必须可直接 JSON.parse 解析
- ${langHint}

输出格式必须严格如下（字段齐全）：
{"metaDescription":"...","keywords":["...","..."],"ogDescription":"..."}`,

        user: `文章标题：${article.title}
文章分类：${article.category || "无"}
文章标签：${article.tags.join(", ") || "无"}

文章正文：
${article.fullContent.slice(0, 8000)}`,
      };
    },

    parseResponse(raw: string): TaskResult {
      const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = (jsonMatch ? jsonMatch[1] : raw).trim();
      const parsed = JSON.parse(jsonStr);

      if (
        !parsed.metaDescription ||
        !Array.isArray(parsed.keywords) ||
        !parsed.ogDescription
      ) {
        throw new Error("SEO 数据格式不完整");
      }
      return {
        metaDescription: parsed.metaDescription,
        keywords: cleanStringArray(parsed.keywords),
        ogDescription: parsed.ogDescription,
      };
    },
  },
};

// ─── 并发处理池 ──────────────────────────────────────────────

interface ProcessResult {
  success: number;
  failed: number;
  failures: Array<{ slug: string; error: string }>;
  elapsed: string;
}

async function processQueue(
  queue: Article[],
  task: Task,
  cacheManager: ReturnType<typeof createCacheManager>,
  concurrency: number,
  skipList: SkipList
): Promise<ProcessResult> {
  let success = 0;
  let failed = 0;
  let completed = 0;
  const failures: Array<{ slug: string; error: string }> = [];
  let consecutiveFailures = 0;
  let stopped = false;

  const startTime = Date.now();
  const config = getConfig();

  // 实时状态行
  function printStatus() {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    const rate =
      completed > 0
        ? ((completed / (Date.now() - startTime)) * 1000).toFixed(1)
        : "0";
    const remaining =
      completed > 0
        ? Math.round(
            ((queue.length - completed) / completed) *
              ((Date.now() - startTime) / 1000)
          )
        : "?";

    const pct = Math.round((completed / queue.length) * 100);
    const barWidth = 25;
    const filled = Math.round((completed / queue.length) * barWidth);
    const bar = "█".repeat(filled) + "░".repeat(barWidth - filled);

    process.stdout.write(
      `\r   [${bar}] ${completed}/${queue.length} (${pct}%) | ✅ ${success} ❌ ${failed} | ${elapsed}s | ~${remaining}s left | ${rate}/s   `
    );
  }

  // 队列索引，每个 worker 原子地取下一个任务
  let nextIndex = 0;

  async function worker() {
    while (!stopped) {
      const idx = nextIndex++;
      if (idx >= queue.length) break;

      const article = queue[idx];

      try {
        const prompt = task.buildPrompt(article);
        const raw = await callAIWithRetry(prompt.system, prompt.user);
        const data = task.parseResponse(raw);

        await cacheManager.writeEntry(
          article.id,
          {
            data: data as unknown as Record<string, unknown>,
            contentHash: article.contentHash,
            processedAt: new Date().toISOString(),
          },
          config.model
        );

        // 处理成功，从跳过列表中移除（如果之前失败过）
        const skipKey = `${task.name}:${article.id}`;
        if (skipList[skipKey]) {
          delete skipList[skipKey];
          await saveSkipList(skipList);
        }

        success++;
        consecutiveFailures = 0;
      } catch (err) {
        failed++;
        failures.push({
          slug: article.id,
          error: (err as Error).message,
        });

        // 将失败的文章加入跳过列表
        await addToSkipList(skipList, task.name, article.id, (err as Error).message);

        // 429 是限速，不计入连续失败
        const is429 = (err as Error).message?.includes("429");
        if (!is429) {
          consecutiveFailures++;
          // 连续失败 10 次可能是 API 级别的问题
          if (consecutiveFailures >= 10) {
            stopped = true;
            console.error(
              `\n\n   ❌ 连续失败 10 次（非限速错误），暂停处理。最后错误: ${(err as Error).message}`
            );
            console.error(
              `   💡 失败的文章已记录到跳过列表，下次运行将自动跳过`
            );
          }
        }
      }

      completed++;
      printStatus();
    }
  }

  // 启动 N 个 worker 并发处理
  const workers = [];
  const workerCount = Math.min(concurrency, queue.length);
  for (let i = 0; i < workerCount; i++) {
    workers.push(worker());
  }

  await Promise.all(workers);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  // 清除状态行
  process.stdout.write("\r" + " ".repeat(100) + "\r");

  return { success, failed, failures, elapsed };
}

// ─── 主流程 ──────────────────────────────────────────────────

async function main() {
  const flags = parseArgs();

  // 检查 API Key
  if (!hasAPIKey()) {
    console.error("❌ 缺少 AI API Key，请在 .env 中设置:");
    console.error("   AI_API_KEY=your_api_key_here");
    console.error("   AI_BASE_URL=https://api.openai.com  # 可选，默认 OpenAI");
    console.error("   AI_MODEL=gpt-4o-mini                # 可选，默认 gpt-4o-mini");
    process.exit(1);
  }

  const config = getConfig();

  // 加载跳过列表
  let skipList = await loadSkipList();

  // 检查跳过列表状态，给出提示
  const skipListEntries = Object.keys(skipList);
  if (skipListEntries.length > 0 && !flags.noSkip && !flags.clearSkip) {
    // 收集常见的失败原因
    const reasons = new Map<string, number>();
    for (const entry of Object.values(skipList)) {
      const key = entry.reason.slice(0, 50);
      reasons.set(key, (reasons.get(key) || 0) + 1);
    }
    const topReason = [...reasons.entries()].sort((a, b) => b[1] - a[1])[0];
    
    console.log(`⚠️  检测到 ${skipListEntries.length} 篇文章在跳过列表中`);
    console.log(`   最常见失败原因: ${topReason[0]}... (${topReason[1]} 次)`);
    console.log(`   `);
    console.log(`   💡 解决方案:`);
    console.log(`      - 使用 --clear-skip 清空跳过列表后重试`);
    console.log(`      - 使用 --no-skip 忽略跳过列表强制重试`);
    console.log(`      - 检查 API 配置是否正确 (AI_API_KEY, AI_BASE_URL)`);
    console.log("");
  }

  console.log("🤖 AI 文章处理器 (astro-minimax)");
  console.log("━".repeat(50));
  console.log(`   模型: ${config.model}`);
  console.log(`   API:  ${config.baseUrl}`);
  console.log(`   并发: ${flags.concurrency}`);
  if (flags.noSkip) console.log(`   跳过列表: 已忽略 (--no-skip)`);
  if (flags.lang) console.log(`   语言: ${flags.lang}`);
  console.log("");

  // 1. 扫描文章
  console.log("📂 扫描文章...");
  let articles = await scanArticles(flags);
  console.log(`   找到 ${articles.length} 篇文章`);

  // 2. 过滤
  if (flags.slug) {
    articles = articles.filter((a) => a.id === flags.slug);
    if (articles.length === 0) {
      console.error(`❌ 未找到文章: ${flags.slug}`);
      console.error(`   提示: 使用完整 ID，如 zh/getting-started`);
      process.exit(1);
    }
    console.log(`   指定文章: ${flags.slug}`);
  }

  if (flags.recent) {
    articles = articles.slice(0, flags.recent);
    console.log(`   最近 ${flags.recent} 篇`);
  }

  // 3. 确定要运行的任务
  const taskNames = flags.task ? [flags.task] : ["summary", "seo"];
  const invalidTask = taskNames.find((t) => !TASKS[t]);
  if (invalidTask) {
    console.error(`❌ 未知任务: ${invalidTask}（可选: summary, seo）`);
    process.exit(1);
  }

  console.log(`   任务: ${taskNames.join(", ")}`);
  console.log("");

  // 4. 逐任务处理
  for (const taskName of taskNames) {
    const task = TASKS[taskName];
    console.log(`📋 任务: ${task.name}`);
    console.log("─".repeat(50));

    const cacheManager = createCacheManager(task.cacheFile);
    const cache = await cacheManager.load();

    // 确定需要处理的文章
    const queue: Article[] = [];
    let skipped = 0;
    let skippedBySkipList = 0;
    const skippedSlugs: string[] = [];

    for (const article of articles) {
      const cached = cache.articles[article.id];
      const skipKey = `${taskName}:${article.id}`;

      // 检查跳过列表（--slug 指定的文章不受跳过列表影响）
      if (!flags.noSkip && !flags.slug && skipList[skipKey]) {
        skippedBySkipList++;
        skippedSlugs.push(article.id);
        continue;
      }

      if (flags.force) {
        queue.push(article);
      } else if (!cached) {
        queue.push(article);
      } else if (flags.newOnly) {
        skipped++;
      } else if (cached.contentHash !== article.contentHash) {
        queue.push(article);
      } else {
        skipped++;
      }
    }

    console.log(`   跳过: ${skipped} 篇（缓存有效）`);
    if (skippedBySkipList > 0) {
      console.log(
        `   跳过: ${skippedBySkipList} 篇（之前处理失败，已标记跳过）`
      );
      console.log(
        `         使用 --no-skip 可重试这些文章，--clear-skip 可清空跳过列表`
      );
      if (skippedBySkipList <= 20) {
        for (const slug of skippedSlugs) {
          const info = skipList[`${taskName}:${slug}`];
          // 截断错误信息，避免过长
          const reasonShort = info.reason.length > 80 ? info.reason.slice(0, 80) + '...' : info.reason;
          console.log(
            `         - ${slug} (失败 ${info.failCount} 次: ${reasonShort})`
          );
        }
      }
    }
    console.log(`   待处理: ${queue.length} 篇`);

    if (flags.dryRun) {
      if (queue.length > 0) {
        console.log("\n   将处理以下文章:");
        for (const a of queue) {
          const reason = cache.articles[a.id] ? "内容变更" : "新文章";
          console.log(`   - ${a.id} (${reason})`);
        }
      }
      console.log("");
      continue;
    }

    if (queue.length === 0) {
      console.log("   ✅ 无需处理\n");
      continue;
    }

    // 并发处理
    console.log("");
    const result = await processQueue(
      queue,
      task,
      cacheManager,
      flags.concurrency,
      skipList
    );

    console.log(
      `   ✅ 成功: ${result.success}  ❌ 失败: ${result.failed}  ⏱️  ${result.elapsed}s`
    );
    if (result.failures.length > 0) {
      console.log(`   失败文章（已加入跳过列表，下次运行将自动跳过）:`);
      for (const f of result.failures) {
        console.log(`      - ${f.slug}: ${f.error}`);
      }
    }
    console.log("");
  }

  console.log("🏁 处理完成");
}

main().catch((err) => {
  console.error("❌ 致命错误:", err.message);
  process.exit(1);
});
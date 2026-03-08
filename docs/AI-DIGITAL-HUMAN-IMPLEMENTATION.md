# AI 数字人集成技术架设文档

## 目录

1. [项目现状分析](#一项目现状分析)
2. [技术方案设计](#二技术方案设计)
3. [实施步骤详解](#三实施步骤详解)
4. [核心代码实现](#四核心代码实现)
5. [部署与配置](#五部署与配置)
6. [测试与验证](#六测试与验证)
7. [后续优化方向](#七后续优化方向)

---

## 一、项目现状分析

### 1.1 当前技术栈

| 组件 | 技术 | 版本 |
|------|------|------|
| 框架 | Astro | ^5.18.0 |
| 样式 | Tailwind CSS | ^4.2.1 |
| 内容 | Markdown/MDX | - |
| 搜索 | Pagefind | ^1.4.0 |
| 评论 | Waline | - |
| 渲染模式 | 静态生成 (SSG) | - |

### 1.2 现有 AI 相关配置

```typescript
// src/config.ts 中已有的配置
ai: {
  enabled: true,
  apiEndpoint: "",  // 需要配置
  mockMode: true,   // 当前为 Mock 模式
}
```

### 1.3 现有组件

- `src/components/ai/AIChatWidget.astro` - 已有基础聊天 UI（Mock 模式）
- `src/components/nav/FloatingActions.astro` - 已有 AI 按钮入口

### 1.4 核心差距

| 需求 | 当前状态 | 需要改造 |
|------|----------|----------|
| 服务端 API | 无 | 需要添加 API 端点 |
| 流式响应 | Mock 实现 | 需要接入真实 LLM |
| RAG 搜索 | 无 | 需要实现知识库检索 |
| 部署平台 | 未配置 | 需要配置 Adapter |

---

## 二、技术方案设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                        用户界面层                            │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ AIChatWidget    │  │ AIProfilePage   │ (可选)           │
│  │ (聊天组件)       │  │ (AI画像页)      │                  │
│  └────────┬────────┘  └────────┬────────┘                  │
└───────────┼────────────────────┼───────────────────────────┘
            │                    │
            ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                        API 网关层                            │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ /api/chat       │  │ /api/search     │                  │
│  │ (流式聊天)       │  │ (RAG搜索)       │                  │
│  └────────┬────────┘  └────────┬────────┘                  │
└───────────┼────────────────────┼───────────────────────────┘
            │                    │
            ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                        业务逻辑层                            │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ RAG Engine      │  │ Prompt Builder  │                  │
│  │ (检索引擎)       │  │ (提示构建)      │                  │
│  └────────┬────────┘  └────────┬────────┘                  │
└───────────┼────────────────────┼───────────────────────────┘
            │                    │
            ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                        数据层                                │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ Blog Posts      │  │ LLM Provider    │                  │
│  │ (博客内容)       │  │ (OpenAI/通义)   │                  │
│  └─────────────────┘  └─────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 技术选型

| 层级 | 选择 | 理由 |
|------|------|------|
| **渲染模式** | Hybrid (混合渲染) | 保持静态页面性能，API 动态渲染 |
| **Adapter** | @astrojs/cloudflare | 边缘计算、免费额度大、与 CF 生态集成 |
| **AI SDK** | Vercel AI SDK | 成熟的流式处理、多 Provider 支持 |
| **LLM** | OpenAI Compatible | 可切换多个 Provider（通义/DeepSeek/OpenAI） |
| **RAG** | 关键词搜索 + 权重评分 | 实现简单、无需外部服务、效果可接受 |

### 2.3 文件结构规划

```
astro-blog/
├── astro.config.ts              # [修改] 添加 adapter
├── package.json                 # [修改] 添加依赖
├── wrangler.toml                # [新增] Cloudflare 配置
├── .env.example                 # [新增] 环境变量模板
├── src/
│   ├── config.ts                # [修改] 更新 AI 配置
│   ├── pages/
│   │   └── api/
│   │       └── chat.ts          # [新增] 聊天 API
│   ├── components/
│   │   └── ai/
│   │       └── AIChatWidget.astro # [修改] 完整实现
│   └── utils/
│       ├── rag.ts               # [新增] RAG 搜索
│       └── prompts.ts           # [新增] 提示词模板
└── dist/                        # 构建产物
```

---

## 三、实施步骤详解

### 步骤 1：安装依赖

```bash
# 安装 Cloudflare adapter
pnpm add @astrojs/cloudflare

# 安装 Vercel AI SDK
pnpm add ai @ai-sdk/openai-compatible
```

### 步骤 2：配置混合渲染

修改 `astro.config.ts`：

```typescript
// astro.config.ts
import { defineConfig, envField } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";
import cloudflare from "@astrojs/cloudflare";  // 新增

// ... 其他 import

export default defineConfig({
  site: SITE.website,
  
  // 新增：混合渲染模式
  output: "hybrid",
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
  }),
  
  // 原有配置保持不变
  integrations: [
    sitemap({
      filter: page => SITE.showArchives || !page.endsWith("/archives"),
    }),
    mdx({
      // ... 保持原有配置
    }),
  ],
  
  // 新增：环境变量 schema
  env: {
    schema: {
      PUBLIC_GOOGLE_SITE_VERIFICATION: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
      // AI 相关环境变量
      AI_API_KEY: envField.string({
        access: "secret",
        context: "server",
        optional: true,
      }),
      AI_API_BASE_URL: envField.string({
        access: "secret",
        context: "server",
        optional: true,
      }),
      AI_MODEL: envField.string({
        access: "public",
        context: "server",
        optional: true,
      }),
    },
  },
  
  // ... 其他原有配置
});
```

### 步骤 3：创建环境变量文件

创建 `.env.example`：

```bash
# AI 配置（必填）
AI_API_KEY=your-api-key-here

# API 基础 URL（可选，默认 OpenAI）
# 通义千问: https://dashscope.aliyuncs.com/compatible-mode/v1
# DeepSeek: https://api.deepseek.com/v1
AI_API_BASE_URL=https://api.openai.com/v1

# 模型选择（可选）
AI_MODEL=gpt-4o-mini

# Google 站点验证（可选）
PUBLIC_GOOGLE_SITE_VERIFICATION=
```

### 步骤 4：更新 src/config.ts

```typescript
// src/config.ts
export const SITE = {
  // ... 原有配置保持不变
  
  ai: {
    enabled: true,
    apiEndpoint: "/api/chat",  // 修改：指定 API 端点
    mockMode: false,           // 修改：关闭 Mock 模式
    model: "gpt-4o-mini",      // 新增：默认模型
    maxTokens: 2000,           // 新增：最大输出 token
    temperature: 0.3,          // 新增：温度参数
  },
} as const;
```

---

## 四、核心代码实现

### 4.1 RAG 搜索模块

创建 `src/utils/rag.ts`：

```typescript
// src/utils/rag.ts
import { getCollection, type CollectionEntry } from 'astro:content';

export interface SearchResult {
  slug: string;
  title: string;
  description: string;
  excerpt: string;
  score: number;
  tags: string[];
  category?: string;
  pubDatetime: Date;
  url: string;
  lang: string;
}

/**
 * 中文分词器
 * 使用 Intl.Segmenter 进行中文分词
 */
function tokenize(text: string): string[] {
  const tokens: string[] = [];
  
  // 中文分词
  try {
    const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'word' });
    const segments = segmenter.segment(text);
    
    for (const segment of segments) {
      const word = segment.segment.trim().toLowerCase();
      // 过滤单字符和标点
      if (word.length > 1 && /^[\u4e00-\u9fa5a-zA-Z0-9]+$/.test(word)) {
        tokens.push(word);
      }
    }
  } catch {
    // 降级：简单分词
    tokens.push(...text.toLowerCase().split(/\s+/).filter(w => w.length > 1));
  }
  
  // 添加原始词汇
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 1);
  tokens.push(...words);
  
  return [...new Set(tokens)];
}

/**
 * 停用词列表
 */
const STOP_WORDS = new Set([
  // 中文停用词
  '的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个',
  '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好',
  '自己', '这', '那', '什么', '怎么', '可以', '这个', '那个', '如何', '为什么',
  '能够', '还是', '只是', '已经', '因为', '所以', '但是', '如果', '虽然', '而且',
  // 英文停用词
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
  'this', 'that', 'these', 'those', 'what', 'which', 'who', 'when', 'where', 'why',
  'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some',
  'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
]);

/**
 * 搜索权重配置
 */
const WEIGHTS = {
  title: 6,        // 标题权重最高
  description: 4,  // 描述次之
  tags: 3,         // 标签
  category: 2,     // 分类
  content: 2,      // 正文
  recentPost: 1,   // 一年内文章加分
} as const;

/**
 * 搜索博客文章
 * @param query 查询字符串
 * @param limit 返回结果数量
 * @returns 搜索结果列表
 */
export async function searchPosts(
  query: string, 
  limit: number = 6
): Promise<SearchResult[]> {
  // 获取所有非草稿文章
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  
  // 提取关键词
  const keywords = tokenize(query).filter(k => !STOP_WORDS.has(k));
  
  if (keywords.length === 0) {
    return [];
  }

  // 一年前的日期（用于判断近期文章）
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  // 计算每篇文章的得分
  const results = posts.map(post => {
    let score = 0;
    
    const title = post.data.title.toLowerCase();
    const description = post.data.description.toLowerCase();
    const tags = post.data.tags.map(t => t.toLowerCase());
    const category = post.data.category?.toLowerCase() || '';
    const content = post.body?.toLowerCase() || '';
    
    // 遍历关键词计算得分
    for (const keyword of keywords) {
      // 标题匹配
      if (title.includes(keyword)) {
        score += WEIGHTS.title;
      }
      
      // 描述匹配
      if (description.includes(keyword)) {
        score += WEIGHTS.description;
      }
      
      // 标签匹配
      for (const tag of tags) {
        if (tag.includes(keyword)) {
          score += WEIGHTS.tags;
          break;
        }
      }
      
      // 分类匹配
      if (category && category.includes(keyword)) {
        score += WEIGHTS.category;
      }
      
      // 正文匹配
      if (content.includes(keyword)) {
        score += WEIGHTS.content;
      }
    }
    
    // 近期文章加分
    if (post.data.pubDatetime > oneYearAgo) {
      score += WEIGHTS.recentPost;
    }
    
    // 生成摘要
    let excerpt = post.data.description;
    if (content && keywords.length > 0) {
      const keywordIndex = content.indexOf(keywords[0]);
      if (keywordIndex !== -1) {
        const start = Math.max(0, keywordIndex - 50);
        const end = Math.min(content.length, keywordIndex + 150);
        excerpt = (start > 0 ? '...' : '') + 
                  content.slice(start, end).replace(/\n/g, ' ') + 
                  (end < content.length ? '...' : '');
      }
    }
    
    // 判断语言
    const lang = post.id.startsWith('zh/') || 
                 post.id.includes('/zh/') ? 'zh' : 'en';
    
    return {
      slug: post.slug,
      title: post.data.title,
      description: post.data.description,
      excerpt,
      score,
      tags: post.data.tags,
      category: post.data.category,
      pubDatetime: post.data.pubDatetime,
      url: `/${lang}/posts/${post.slug}`,
      lang,
    };
  });
  
  // 过滤、排序并返回结果
  return results
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * 构建 RAG 上下文
 * @param results 搜索结果
 * @returns 格式化的上下文字符串
 */
export function buildRAGContext(results: SearchResult[]): string {
  if (results.length === 0) {
    return '【提示】没有找到直接相关的博客文章，请根据你的知识尽可能帮助用户。';
  }
  
  return results.map((r, i) => `
【文章 ${i + 1}】${r.title}
- 链接: ${r.url}
- 描述: ${r.description}
- 标签: ${r.tags.join(', ')}
- 摘要: ${r.excerpt}
`).join('\n---\n');
}

/**
 * 获取所有文章的统计信息
 */
export async function getBlogStats() {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  
  return {
    totalPosts: posts.length,
    totalTags: new Set(posts.flatMap(p => p.data.tags)).size,
    categories: new Set(posts.map(p => p.data.category).filter(Boolean)).size,
  };
}
```

### 4.2 提示词模板

创建 `src/utils/prompts.ts`：

```typescript
// src/utils/prompts.ts

/**
 * 反幻觉系统提示词
 * 严格的来源限制和回答规范
 */
export const ANTI_HALLUCINATION_PROMPT = `你是这个博客的 AI 助手。你需要基于提供的博客文章内容回答用户问题。

## 核心规则（最高优先级）

### 1. 来源限制协议
- 只能使用本次对话中提供的文章内容
- 禁止编造任何未提供的信息
- 如果信息不在提供的文章中，明确说「这个细节我在博客里没有记录」

### 2. 数字协议
- 任何具体数字（日期、数量、成绩、金额）必须在原文中出现
- 不得对数字进行推算或估计
- 同一轮对话中不得重复相同的数字表述

### 3. 链接协议
- 只能引用提供的文章 URL
- 必须使用 Markdown 格式：[文章标题](URL)
- 严禁裸输出 URL

### 4. 身份协议
- 你是基于博客内容构建的 AI 分身
- 只能基于公开内容回答，无法了解未公开的信息
- 对于博客未涉及的话题，坦诚说明

## 回答风格
- 语言：根据用户语言自动匹配（中文/英文）
- 风格：简洁、专业、有帮助
- 格式：使用 Markdown 格式，合理使用列表、加粗等
- 长度：除非用户要求详细回答，否则保持简洁`;

/**
 * 构建完整的系统提示词
 * @param context RAG 上下文
 * @param stats 博客统计信息（可选）
 */
export function buildSystemPrompt(context: string, stats?: { totalPosts: number }): string {
  let prompt = ANTI_HALLUCINATION_PROMPT;
  
  if (stats) {
    prompt += `\n\n## 博客信息\n- 文章总数: ${stats.totalPosts} 篇`;
  }
  
  prompt += `\n\n## 参考文章\n${context}`;
  
  return prompt;
}

/**
 * 意图分类关键词
 */
export const INTENT_KEYWORDS = {
  ai: ['ai', 'rag', 'embedding', 'agent', 'llm', 'prompt', '数字分身', '向量', '大模型', '人工智能', '机器学习'],
  devops: ['docker', 'k8s', 'nginx', 'cloudflare', 'openwrt', 'homelab', '路由', '部署', '服务器'],
  frontend: ['nextjs', 'react', 'typescript', 'seo', '前端', '全栈', 'css', 'javascript', 'vue', 'astro'],
  photography: ['摄影', '旅行', '东京', '香港', '京都', 'unsplash', '相机', '镜头', '马拉松'],
  lifestyle: ['生活', '消费', '眼镜', '医院', '体验', '投资', '健康', '日常'],
};

/**
 * 分类用户意图
 */
export function classifyIntent(query: string): string[] {
  const q = query.toLowerCase();
  const intents: string[] = [];
  
  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    if (keywords.some(kw => q.includes(kw))) {
      intents.push(intent);
    }
  }
  
  return intents.length > 0 ? intents : ['general'];
}
```

### 4.3 聊天 API 端点

创建 `src/pages/api/chat.ts`：

```typescript
// src/pages/api/chat.ts
import type { APIRoute } from 'astro';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { streamText } from 'ai';
import { searchPosts, buildRAGContext } from '@/utils/rag';
import { buildSystemPrompt } from '@/utils/prompts';

// 禁用预渲染，启用服务端渲染
export const prerender = false;

// 配置 OpenAI Compatible 客户端
function getProvider() {
  const baseUrl = import.meta.env.AI_API_BASE_URL || 'https://api.openai.com/v1';
  const apiKey = import.meta.env.AI_API_KEY;
  
  if (!apiKey) {
    throw new Error('AI_API_KEY is not configured');
  }
  
  return createOpenAICompatible({
    name: 'custom-provider',
    baseUrl,
    apiKey,
  });
}

/**
 * POST /api/chat
 * 流式聊天接口
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    // 解析请求体
    const body = await request.json();
    const { messages, conversationId } = body;
    
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ 
        error: 'Invalid request',
        message: 'messages field is required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 获取最后一条用户消息
    const lastUserMessage = [...messages].reverse().find((m: any) => m.role === 'user');
    
    if (!lastUserMessage?.content) {
      return new Response(JSON.stringify({ 
        error: 'Invalid request',
        message: 'No user message found' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // RAG 检索相关文章
    const searchResults = await searchPosts(lastUserMessage.content, 6);
    const ragContext = buildRAGContext(searchResults);
    
    // 构建系统提示词
    const systemPrompt = buildSystemPrompt(ragContext, { totalPosts: searchResults.length });

    // 获取模型配置
    const modelId = import.meta.env.AI_MODEL || 'gpt-4o-mini';
    const provider = getProvider();

    // 流式生成响应
    const result = streamText({
      model: provider(modelId),
      system: systemPrompt,
      messages: messages.map((m: any) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: 0.3,
      maxTokens: 2000,
    });

    // 返回流式响应
    return result.toDataStreamResponse({
      headers: {
        'X-Conversation-Id': conversationId || Date.now().toString(),
        'X-Search-Results': searchResults.length.toString(),
      }
    });
    
  } catch (error) {
    console.error('Chat API error:', error);
    
    // 根据错误类型返回不同状态码
    const status = error instanceof Error && error.message.includes('API_KEY') ? 503 : 500;
    
    return new Response(JSON.stringify({ 
      error: status === 503 ? 'Service Unavailable' : 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

/**
 * OPTIONS /api/chat
 * CORS 预检请求处理
 */
export const OPTIONS: APIRoute = () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
};
```

### 4.4 改造 AIChatWidget 组件

完整替换 `src/components/ai/AIChatWidget.astro`：

```astro
---
// src/components/ai/AIChatWidget.astro
import { SITE } from "@/config";

interface Props {
  lang?: string;
}

const { lang = "zh" } = Astro.props;
const aiEnabled = SITE.ai?.enabled ?? false;
const apiEndpoint = SITE.ai?.apiEndpoint || "/api/chat";
---

{aiEnabled && (
  <div id="ai-chat-root" data-lang={lang} data-endpoint={apiEndpoint}>
    <div
      id="ai-chat-panel"
      class="fixed bottom-20 right-6 z-50 hidden w-[400px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
      style="height: min(560px, calc(100vh - 8rem));"
    >
      {/* Header */}
      <div class="flex items-center justify-between border-b border-border px-4 py-3 bg-muted/30">
        <div class="flex items-center gap-2">
          <div class="size-8 rounded-full bg-accent/15 flex items-center justify-center">
            <svg class="size-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 8V4H8"></path>
              <rect width="16" height="12" x="4" y="8" rx="2"></rect>
              <path d="M2 14h2"></path>
              <path d="M20 14h2"></path>
              <path d="M15 13v2"></path>
              <path d="M9 13v2"></path>
            </svg>
          </div>
          <div>
            <span class="text-sm font-semibold text-foreground">AI 助手</span>
            <span class="ml-2 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent">Beta</span>
          </div>
        </div>
        <div class="flex items-center gap-1">
          <button 
            id="ai-chat-clear" 
            class="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title={lang === "zh" ? "清空对话" : "Clear conversation"}
          >
            <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18"></path>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
            </svg>
          </button>
          <button 
            id="ai-chat-close" 
            class="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title={lang === "zh" ? "关闭" : "Close"}
          >
            <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6 6 18"></path>
              <path d="m6 6 12 12"></path>
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div id="ai-chat-messages" class="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        <div class="flex gap-2" data-role="assistant">
          <div class="shrink-0 mt-0.5 flex size-7 items-center justify-center rounded-full bg-accent/15">
            <svg class="size-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 8V4H8"></path>
              <rect width="16" height="12" x="4" y="8" rx="2"></rect>
              <path d="M2 14h2"></path>
              <path d="M20 14h2"></path>
              <path d="M15 13v2"></path>
              <path d="M9 13v2"></path>
            </svg>
          </div>
          <div class="rounded-lg bg-muted/40 px-3 py-2 text-sm text-foreground leading-relaxed" id="ai-welcome-msg"></div>
        </div>
      </div>

      {/* Input */}
      <div class="border-t border-border px-3 py-3 bg-muted/20">
        <form id="ai-chat-form" class="flex gap-2">
          <input
            id="ai-chat-input"
            type="text"
            class="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            autocomplete="off"
          />
          <button
            type="submit"
            id="ai-chat-send"
            class="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            disabled
          >
            <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m22 2-7 20-4-9-9-4Z"></path>
              <path d="M22 2 11 13"></path>
            </svg>
          </button>
        </form>
        <p class="mt-2 text-xs text-muted-foreground text-center">
          {lang === "zh" ? "AI 助手基于博客内容回答，可能存在误差" : "AI assistant answers based on blog content"}
        </p>
      </div>
    </div>
  </div>
)}

<script>
/**
 * AI 聊天客户端类
 * 处理流式响应和 UI 交互
 */
class AIChatClient {
  private root: HTMLElement | null;
  private panel: HTMLElement | null;
  private messages: HTMLElement | null;
  private input: HTMLInputElement | null;
  private sendBtn: HTMLButtonElement | null;
  private form: HTMLFormElement | null;
  private endpoint: string;
  private lang: string;
  private conversationId: string;
  private messageHistory: Array<{ role: string; content: string }>;
  private isStreaming: boolean;

  constructor() {
    this.root = document.getElementById('ai-chat-root');
    if (!this.root) return;

    this.panel = document.getElementById('ai-chat-panel');
    this.messages = document.getElementById('ai-chat-messages');
    this.input = document.getElementById('ai-chat-input') as HTMLInputElement;
    this.sendBtn = document.getElementById('ai-chat-send') as HTMLButtonElement;
    this.form = document.getElementById('ai-chat-form') as HTMLFormElement;

    this.endpoint = this.root.dataset.endpoint || '/api/chat';
    this.lang = this.root.dataset.lang || 'zh';
    this.conversationId = Date.now().toString();
    this.messageHistory = [];
    this.isStreaming = false;

    this.init();
  }

  private init(): void {
    this.setupWelcomeMessage();
    this.bindEvents();
  }

  private setupWelcomeMessage(): void {
    const welcomeEl = document.getElementById('ai-welcome-msg');
    if (!welcomeEl) return;

    const messages = this.lang === 'zh'
      ? [
          '你好！我是博客的 AI 助手，可以帮你了解文章内容。试试问我关于博客、技术或任何你感兴趣的话题吧！',
          '欢迎！我可以回答关于这个博客的问题，帮你找到感兴趣的文章。',
          'Hi！有什么我可以帮你的吗？我可以介绍博客内容或回答技术问题。'
        ]
      : [
          "Hi! I'm the AI assistant. I can help you explore the blog content. Feel free to ask!",
          "Welcome! I can answer questions about the blog and help you find interesting posts.",
          "Hello! What would you like to know about this blog?"
        ];

    welcomeEl.textContent = messages[Math.floor(Math.random() * messages.length)];
    if (this.input) {
      this.input.placeholder = this.lang === 'zh' ? '输入你的问题...' : 'Type your question...';
    }
  }

  private bindEvents(): void {
    const toggle = document.getElementById('ai-chat-toggle-fab');
    const close = document.getElementById('ai-chat-close');
    const clear = document.getElementById('ai-chat-clear');

    toggle?.addEventListener('click', () => this.toggle());
    close?.addEventListener('click', () => this.close());
    clear?.addEventListener('click', () => this.clearChat());

    this.input?.addEventListener('input', () => {
      if (this.sendBtn) {
        this.sendBtn.disabled = !this.input?.value.trim() || this.isStreaming;
      }
    });

    this.form?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.sendMessage();
    });

    // Enter 键发送
    this.input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
  }

  private toggle(): void {
    if (!this.panel) return;
    const isHidden = this.panel.classList.contains('hidden');
    this.panel.classList.toggle('hidden', !isHidden);
    this.panel.classList.toggle('flex', isHidden);
    if (isHidden) {
      this.input?.focus();
    }
  }

  private close(): void {
    this.panel?.classList.add('hidden');
    this.panel?.classList.remove('flex');
  }

  private clearChat(): void {
    if (!this.messages) return;
    const welcome = this.messages.querySelector('[data-role="assistant"]');
    this.messages.innerHTML = '';
    if (welcome) {
      this.messages.appendChild(welcome);
    }
    this.messageHistory = [];
    this.conversationId = Date.now().toString();
    this.setupWelcomeMessage();
  }

  private appendMessage(role: 'user' | 'assistant', content: string): HTMLElement | null {
    if (!this.messages) return null;

    const wrapper = document.createElement('div');
    wrapper.className = 'flex gap-2' + (role === 'user' ? ' justify-end' : '');
    wrapper.dataset.role = role;

    if (role === 'user') {
      wrapper.innerHTML = `
        <div class="rounded-lg bg-accent px-3 py-2 text-sm text-background leading-relaxed max-w-[85%]">
          ${this.escapeHtml(content)}
        </div>
      `;
    } else {
      wrapper.innerHTML = `
        <div class="shrink-0 mt-0.5 flex size-7 items-center justify-center rounded-full bg-accent/15">
          <svg class="size-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 8V4H8"></path>
            <rect width="16" height="12" x="4" y="8" rx="2"></rect>
            <path d="M2 14h2"></path>
            <path d="M20 14h2"></path>
            <path d="M15 13v2"></path>
            <path d="M9 13v2"></path>
          </svg>
        </div>
        <div class="ai-message-content rounded-lg bg-muted/40 px-3 py-2 text-sm text-foreground leading-relaxed max-w-[85%]">
          ${content}
        </div>
      `;
    }

    this.messages.appendChild(wrapper);
    this.messages.scrollTop = this.messages.scrollHeight;
    return wrapper;
  }

  private showTypingIndicator(): HTMLElement | null {
    if (!this.messages) return null;

    const wrapper = document.createElement('div');
    wrapper.className = 'flex gap-2';
    wrapper.id = 'typing-indicator';
    wrapper.innerHTML = `
      <div class="shrink-0 mt-0.5 flex size-7 items-center justify-center rounded-full bg-accent/15">
        <svg class="size-4 text-accent animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 8V4H8"></path>
          <rect width="16" height="12" x="4" y="8" rx="2"></rect>
        </svg>
      </div>
      <div class="rounded-lg bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
        <span class="inline-flex gap-1">
          <span class="animate-pulse">●</span>
          <span class="animate-pulse" style="animation-delay:0.2s">●</span>
          <span class="animate-pulse" style="animation-delay:0.4s">●</span>
        </span>
      </div>
    `;
    this.messages.appendChild(wrapper);
    this.messages.scrollTop = this.messages.scrollHeight;
    return wrapper;
  }

  private async sendMessage(): Promise<void> {
    const content = this.input?.value.trim();
    if (!content || this.isStreaming) return;

    // 显示用户消息
    this.appendMessage('user', content);
    this.input.value = '';
    if (this.sendBtn) this.sendBtn.disabled = true;
    this.isStreaming = true;

    // 添加到历史
    this.messageHistory.push({ role: 'user', content });

    // 显示打字指示器
    const indicator = this.showTypingIndicator();

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: this.messageHistory,
          conversationId: this.conversationId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // 移除打字指示器
      indicator?.remove();

      // 处理流式响应
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      const assistantWrapper = this.appendMessage('assistant', '');
      const textEl = assistantWrapper?.querySelector('.ai-message-content') as HTMLElement;

      let fullContent = '';

      if (reader && textEl) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('0:"')) {
              // 解析 AI SDK 流式数据格式
              try {
                const content = line.slice(3, -1)
                  .replace(/\\n/g, '\n')
                  .replace(/\\"/g, '"')
                  .replace(/\\\\/g, '\\');
                fullContent += content;
                textEl.innerHTML = this.formatMarkdown(fullContent);
                this.messages?.scrollTo({
                  top: this.messages.scrollHeight,
                  behavior: 'smooth'
                });
              } catch {
                // 忽略解析错误
              }
            }
          }
        }
      }

      // 添加到历史
      if (fullContent) {
        this.messageHistory.push({ role: 'assistant', content: fullContent });
      }

    } catch (error) {
      indicator?.remove();
      const errorMsg = this.lang === 'zh'
        ? '抱歉，出了点问题。请稍后再试。'
        : 'Sorry, something went wrong. Please try again later.';
      this.appendMessage('assistant', errorMsg);
      console.error('Chat error:', error);
    } finally {
      this.isStreaming = false;
      if (this.sendBtn) {
        this.sendBtn.disabled = !this.input?.value.trim();
      }
    }
  }

  private formatMarkdown(text: string): string {
    return text
      // 代码块
      .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-muted/60 rounded p-2 overflow-x-auto text-xs"><code>$2</code></pre>')
      // 行内代码
      .replace(/`([^`]+)`/g, '<code class="bg-muted px-1 rounded text-xs">$1</code>')
      // 链接
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-accent hover:underline" target="_blank" rel="noopener">$1</a>')
      // 加粗
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      // 斜体
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      // 换行
      .replace(/\n/g, '<br>');
  }

  private escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

// 初始化
function initAIChat() {
  new AIChatClient();
}

// 首次加载
initAIChat();

// Astro 页面切换支持
document.addEventListener('astro:after-swap', initAIChat);
</script>
```

---

## 五、部署与配置

### 5.1 Cloudflare 配置文件

创建 `wrangler.toml`：

```toml
# wrangler.toml
name = "astro-blog"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

# 页面配置
pages_build_output_dir = "dist"

# 环境变量（非敏感信息）
[vars]
AI_MODEL = "gpt-4o-mini"

# 敏感信息通过 wrangler secret put 设置：
# wrangler secret put AI_API_KEY
# wrangler secret put AI_API_BASE_URL
```

### 5.2 部署命令

```bash
# 1. 安装 Wrangler CLI
npm install -g wrangler

# 2. 登录 Cloudflare
wrangler login

# 3. 设置环境变量（敏感信息）
wrangler secret put AI_API_KEY
# 输入你的 API Key

# 如果使用非 OpenAI 的 Provider
wrangler secret put AI_API_BASE_URL
# 输入 API Base URL，如：https://dashscope.aliyuncs.com/compatible-mode/v1

# 4. 构建
pnpm build

# 5. 部署到 Cloudflare Pages
wrangler pages deploy dist
```

### 5.3 本地开发测试

```bash
# 创建 .env 文件（复制 .env.example）
cp .env.example .env

# 编辑 .env，填入真实配置
# AI_API_KEY=sk-xxx
# AI_API_BASE_URL=https://api.openai.com/v1

# 启动开发服务器
pnpm dev
```

---

## 六、测试与验证

### 6.1 测试清单

| 测试项 | 预期结果 | 验证方法 |
|--------|----------|----------|
| API 端点响应 | 返回流式数据 | `curl -X POST http://localhost:4321/api/chat` |
| RAG 搜索 | 返回相关文章 | 检查 API 日志中的搜索结果 |
| 流式渲染 | 逐字显示 | 浏览器中测试聊天 |
| 错误处理 | 显示友好提示 | 测试无效 API Key |
| 清空对话 | 重置状态 | 点击清空按钮 |

### 6.2 API 测试脚本

```bash
# 测试聊天 API
curl -X POST http://localhost:4321/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"介绍一下这个博客"}]}'
```

---

## 七、后续优化方向

### 7.1 短期优化（1-2 周）

- [ ] 添加速率限制（防止 API 滥用）
- [ ] 实现对话历史持久化（localStorage）
- [ ] 添加加载状态和错误重试
- [ ] 支持多轮对话上下文复用

### 7.2 中期优化（1-2 月）

- [ ] 接入向量数据库（Cloudflare Vectorize）提升搜索质量
- [ ] 添加 AI 视角画像页面
- [ ] 支持更多 LLM Provider（通义千问、DeepSeek）
- [ ] 添加监控和日志（Telegram Bot 通知）

### 7.3 长期优化（3+ 月）

- [ ] 支持多模态（图片理解）
- [ ] 添加语音交互
- [ ] 实现个性化推荐
- [ ] 支持自定义人设

---

## 附录：常见问题

### Q1: API Key 如何选择？

推荐方案：
- **国内用户**：通义千问（qwen-turbo/qwen-plus）- 中文效果好、价格低
- **海外用户**：OpenAI (gpt-4o-mini) - 稳定可靠
- **高性价比**：DeepSeek (deepseek-chat) - 价格极低

### Q2: 部署失败怎么办？

常见原因：
1. 未设置 `AI_API_KEY` 环境变量
2. Cloudflare 账号未开通 Workers 功能
3. 依赖版本冲突

### Q3: 搜索结果不准确？

优化方案：
1. 调整权重配置（`WEIGHTS` 常量）
2. 增加停用词列表
3. 后续可升级为向量语义搜索

---

**文档版本**: v1.0
**更新日期**: 2026-03-08
**维护者**: AI Assistant
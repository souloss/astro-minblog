---
title: "@astro-minimax/ai 模块技术架构详解"
pubDatetime: 2026-03-21T00:00:00.000Z
modDatetime: 2026-03-23T12:00:00.000Z
author: Souloss
description: "深入剖析 @astro-minimax/ai 包的技术架构：多 Provider 故障转移、RAG 检索增强、智能分析层、三层提示词系统、流式响应与缓存机制。完整数据流示例与 Mermaid/Markmap 可视化图解。"
tags:
  - docs
  - ai
  - architecture
  - technical
category: 技术/AI
featured: false
draft: false
---

@astro-minimax/ai 是 astro-minimax 博客主题的智能增强模块，定位为供应商无关（Vendor-agnostic）的 AI 集成解决方案。该模块的核心目标是为一站式博客平台提供完整的 RAG（检索增强生成）流水线，同时支持多种 AI 服务供应商的无缝切换与故障转移，确保服务的高可用性和用户体验的连贯性。

## 架构概览

```markmap
# @astro-minimax/ai 模块架构

## 请求处理层
- 速率限制
  - Burst: 10秒/3次
  - Sustained: 60秒/20次
  - Daily: 24小时/100次
- 请求验证
  - 消息长度检查
  - 格式校验
- 缓存检测
  - 响应缓存 (public Q)
  - 搜索缓存 (public Q)
  - 会话缓存 (follow-up)

## 检索增强层
- 搜索管道
  - 文本标准化
  - TF-IDF 评分
  - 相关性过滤 (35%)
  - 向量重排 (可选)
- 意图检测
  - 7类意图分类
  - 文章重排
- 证据预算
  - simple/moderate/complex
  - 按答案模式调整

## 智能分析层
- 关键词提取
  - 超时: 5s
  - 降级: 本地分词
- 证据分析
  - 超时: 8s
  - 降级: 跳过
- 引用守卫
  - 隐私保护
  - URL验证
- 答案模式
  - fact/list/count
  - opinion/recommendation

## 提示构建层
- 静态层 (Static)
  - 身份定义
  - 约束条件
  - 来源分层 (L1-L5)
- 半静态层 (Semi-Static)
  - 博客概览
  - 最新文章
- 动态层 (Dynamic)
  - 相关文章
  - 证据分析
  - 回答模式提示

## 模型调用层
- Provider Manager
  - Workers AI (100)
  - OpenAI Compatible (90)
  - Mock (0)
- 健康追踪
  - 失败阈值: 3
  - 恢复TTL: 60s
- 故障转移
  - 自动切换
  - 透明降级
```

## 一、项目概述与设计理念

### 1.1 项目背景与核心定位

该模块服务于两类核心用户交互模式：第一类是**全局对话模式**，用户可以在博客任意页面发起关于博客内容的通用咨询；第二类是**阅读伴侣模式（边读边聊）**，用户在阅读特定文章时可以直接针对当前文章内容与 AI 进行深度交流。这两种模式的底层架构高度复用，但通过上下文隔离实现了差异化的智能服务。

从技术选型角度，该模块采用了当前主流的 AI 应用架构——**流式响应（Streaming）+ 服务端事件推送（SSE）+ RAG 增强**。这一技术组合既满足了用户对即时反馈的体验期待，又确保了 AI 回复的准确性和时效性。模块设计之初就考虑了与 Cloudflare Workers 的深度集成，这使得它天然支持边缘计算场景下的低延迟响应。

### 1.2 设计原则与架构哲学

该模块遵循以下核心设计原则，这些原则贯穿于整个架构设计和代码实现：

**供应商无关性（Vendor Agnosticism）** 是模块设计的首要原则。通过抽象 AI Provider 接口，模块能够同时支持 OpenAI 兼容 API、Cloudflare Workers AI 等多种供应商，而上层业务逻辑完全不感知底层供应商的差异。这种设计允许开发者根据成本、性能、地区可用性等因素灵活切换 AI 供应商，无需修改业务代码。Provider Manager 组件承担了这一抽象层的主要职责，它实现了自动健康追踪、优先级调度和透明故障转移。

**分层解耦（Layered Decoupling）** 体现在模块的清晰分层架构中。从数据流视角看，请求依次经过速率限制、验证、检索、智能分析、提示构建、模型调用和流式响应处理，每个环节都是独立可替换的模块。这种设计使得优化某个环节（如更换更快的嵌入模型）不会影响其他环节的稳定性。

**构建时与运行时分离（Build-time vs Runtime Separation）** 是该模块的重要架构特征。博客的元数据（文章摘要、作者信息、语音画像）是在构建阶段预处理的，这些静态数据被序列化为 JSON 文件供运行时加载。这种设计将昂贵的计算任务（如文档向量化、摘要生成）从用户请求路径中剥离，大大降低了响应延迟。

**优雅降级（Graceful Degradation）** 贯穿于系统的每个层级。当 AI 供应商不可用时，系统自动切换到备用供应商；当所有供应商都失败时，Mock 响应机制确保用户始终能获得有意义的回复；当 RAG 检索超时或无结果时，系统会基于关键词进行本地搜索降级，而非直接返回失败。

### 1.3 核心能力矩阵

该模块提供了完整的人工智能交互能力集：

| 能力类别 | 具体功能 | 技术实现 | 性能指标 |
|----------|----------|----------|----------|
| 对话交互 | 流式文本生成 | SSE + streamText | 首 Token 延迟 < 500ms |
| 上下文感知 | 文章级 RAG 检索 | 内存向量搜索 + 混合检索 | 检索延迟 < 200ms |
| 智能分析 | 关键词提取 | 独立模型调用 | 超时 5s，自动降级 |
| 来源追踪 | 证据分析与引用 | 二次 LLM 调用 | 超时 8s，可跳过 |
| 多供应商 | 自动故障转移 | Provider Manager | 优先级 100→90→0 |
| 降级策略 | Mock 兜底响应 | 本地字符串模板 | 零延迟返回 |
| 隐私保护 | 敏感信息过滤 | Citation Guard | 实时检测拦截 |
| 会话缓存 | 响应缓存回放 | 缓存层 + 流式模拟 | 减少 100% API 调用 |
| 动态预算 | 证据数量自适应 | Evidence Budget | 按复杂度分配 |
| 回答模式 | 格式自动检测 | Answer Mode | 6 种模式智能切换 |
| 阅读时间 | 文章时长展示 | Dynamic Layer | 实时计算注入 |

### 1.4 技术栈与依赖关系

模块的技术选型充分考虑了现代前端开发的特点和边缘计算的需求：

- **AI SDK** 是模块的核心依赖，版本 6.x 提供了 Provider 抽象层和流式响应处理能力。模块通过 AI SDK 的 `streamText` 函数实现了与不同 AI 供应商的无缝对接，同时 `useChat` Hook 为 React/Preact 组件提供了状态管理的便利。

- **运行环境** 支持两种主要模式：Cloudflare Pages Functions 模式和传统 Node.js 模式。Cloudflare 模式下，模块利用 Workers KV 进行响应缓存；Node.js 模式下，缓存功能可能受限或不可用。模块通过环境检测实现了运行时自适应。

- **UI 框架** 采用了 Preact 而非 React，这是出于包体积的考虑。Preact 的兼容性层确保了 `@ai-sdk/react` 的 Hook 可以在 Preact 环境中正常工作。

## 二、目录结构与组织规范

### 2.1 顶层目录架构

```
/packages/ai
├── src/                          # 源代码主目录
│   ├── components/                # UI 组件（Preact）
│   │   ├── ChatPanel.tsx         # 核心聊天界面（865行）
│   │   ├── AIChatContainer.tsx   # 容器组件（状态管理）
│   │   └── AIChatWidget.astro    # Astro 入口点
│   ├── server/                   # 服务端处理逻辑
│   │   ├── chat-handler.ts       # 主请求处理器
│   │   ├── stream-helpers.ts     # 流式响应辅助函数
│   │   ├── errors.ts             # 错误响应工厂
│   │   └── types.ts              # 类型定义
│   ├── provider-manager/         # AI 供应商管理
│   │   ├── manager.ts            # Provider Manager 核心
│   │   ├── openai.ts             # OpenAI 适配器
│   │   ├── workers.ts            # Workers AI 适配器
│   │   └── mock.ts               # Mock 供应商实现
│   ├── search/                   # RAG 检索模块
│   │   ├── search-api.ts         # 搜索 API 入口
│   │   ├── search-index.ts       # 索引构建
│   │   ├── search-utils.ts       # 评分工具
│   │   ├── vector-reranker.ts    # 向量重排序
│   │   └── session-cache.ts      # 会话缓存
│   ├── intelligence/             # 智能分析模块
│   │   ├── keyword-extract.ts    # 关键词提取
│   │   ├── evidence-analysis.ts  # 证据分析
│   │   ├── citation-guard.ts     # 引用守卫 + 回答模式检测
│   │   ├── evidence-budget.ts    # 动态证据预算（新增）
│   │   ├── intent-detect.ts      # 意图检测
│   │   └── citation-appender.ts  # 引用追加器
│   ├── prompt/                   # 提示词工程
│   │   ├── prompt-builder.ts     # 三层提示构建器
│   │   ├── static-layer.ts       # 静态层（含回答模式指导）
│   │   ├── semi-static-layer.ts  # 半静态层
│   │   └── dynamic-layer.ts      # 动态层（含阅读时间）
│   ├── extensions/               # 扩展系统（新增）
│   │   ├── types.ts              # 扩展接口定义
│   │   ├── registry.ts           # 扩展注册表
│   │   ├── loader.ts             # 扩展加载器
│   │   └── injector.ts           # 扩展注入器
│   ├── structured-output/        # 结构化输出（新增）
│   │   ├── types.ts              # 结构化输出接口
│   │   ├── generator.ts          # generateStructured<T>()
│   │   └── schemas/              # Zod schema 定义
│   │       └── evidence.ts       # EvidenceAnalysis schema
│   ├── cache/                    # 缓存模块
│   │   ├── response-cache.ts     # 响应缓存
│   │   ├── global-cache.ts       # 全局缓存
│   │   ├── memory-adapter.ts     # 内存适配器
│   │   └── kv-adapter.ts         # KV 适配器
│   ├── data/                     # 数据加载
│   │   └── metadata-loader.ts    # 元数据加载器
│   └── utils/                    # 工具函数
│       └── i18n.ts               # 国际化
├── package.json                  # 包配置
├── tsconfig.json                 # TypeScript 配置
├── vitest.config.ts              # Vitest 测试配置（新增）
└── README.md                     # 英文文档
```

### 2.2 核心目录功能解析

**src/components/** 目录采用了原子设计理念组织 UI 组件。最底层是 `ChatPanel.tsx`，这是整个聊天功能的视觉核心，构建于 `@ai-sdk/react` 的 `useChat` Hook 之上。它负责消息的渲染（支持文本、来源引用等不同部件）、错误状态的展示（带重试按钮）、以及状态指示器的显示。`AIChatContainer.tsx` 扮演状态容器的角色，管理聊天气泡的开启/关闭状态，并暴露 `window.__aiChatToggle` 接口供外部调用（如悬浮按钮）实现状态切换。

**src/server/** 目录包含了请求处理的全部逻辑。`chat-handler.ts` 是整个服务端处理流水线的中枢，它编排了速率限制、输入验证、RAG 搜索、智能分析、提示构建、AI 调用、流式响应等全部环节。

**src/provider-manager/** 是实现供应商无关性的核心目录。该目录导出了一个 Provider Manager 实例，支持动态添加/移除供应商、设置优先级权重、自动健康追踪和透明故障转移。`mock.ts` 提供了本地 Mock 响应能力，当所有真实供应商不可用时，系统会切换到 Mock 模式，返回预定义的模板化响应。

**src/search/** 实现了 RAG 检索的核心能力。检索时会使用会话级缓存（`session-cache.ts`），避免在单个对话会话中重复检索相同查询。检索策略采用了混合方式：结合语义向量相似度和关键词匹配，确保结果既相关又全面。

**src/intelligence/** 提供了超越基础检索的智能增强能力。`keyword-extract.ts` 负责从用户查询中提取关键实体和意图词，这些信息用于增强检索效果。`evidence-analysis.ts` 对检索到的文档片段进行二次分析，评估其对当前查询的支持程度。`citation-guard.ts` 是隐私保护组件，负责检测和过滤可能泄露用户个人信息的查询。

**src/prompt/** 实现了三层提示词构建体系。第一层是静态层，包含系统角色定义和通用指令；第二层是半静态层，包含博客特定信息（如技术栈、功能列表）；第三层是动态层，根据当前对话上下文和 RAG 检索结果动态构建。这种分层设计使得大部分提示词内容可以被缓存复用，只有动态层需要实时生成。

## 三、系统架构设计

### 3.1 整体架构分层

```mermaid
flowchart TB

%% ===================== 表现层 =====================
subgraph Presentation_Layer["表现层"]
    UI1["AIChatWidget (.astro)"]
    UI2["AIChatContainer (.tsx)"]
    UI3["ChatPanel (.tsx)"]
end

%% ===================== 服务层 =====================
subgraph Service_Layer["服务层"]
    S0["chat-handler"]

    S1["速率限制"]
    S2["请求验证"]
    S3["RAG检索"]
    S4["智能分析"]
    S5["提示构建"]
    S6["模型调用"]
    S7["流式响应"]
end

%% ===================== 核心层 =====================
subgraph Core_Layer["核心层"]
    C1["Provider Manager"]
    C2["Search Module"]
    C3["Intelligence Module"]
    C4["Prompt Builder"]
    C5["Cache Layer"]
    C6["Data Loader"]
end

%% ===================== 调用链 =====================
UI1 --> UI2 --> UI3 --> S0

S0 --> S1 --> S2 --> S3 --> S4 --> S5 --> S6 --> S7

%% ===================== 服务层 -> 核心层 =====================
S3 --> C2
S3 --> C6

S4 --> C3

S5 --> C4

S6 --> C1
S6 --> C5

%% ===================== 可选缓存短路 =====================
C5 -. "cache hit" .-> S7
```

## 四、核心模块详解

### 4.1 Provider Manager 模块

Provider Manager 是实现供应商无关性的核心组件，负责管理多个 AI 供应商的生命周期、健康状态和故障转移。

#### 优先级与故障转移

Provider 按权重降序排列，权重越高优先级越高：

| Provider | 权重 | 说明 |
|----------|------|------|
| Workers AI | 100 | 最高优先级，Cloudflare 部署时免费 |
| OpenAI 兼容 | 90 | 备选方案，支持任何 OpenAI 兼容 API |
| Mock | 0 | 最终兜底，保证用户始终收到回复 |

```typescript
// 故障转移逻辑
async streamText(options: StreamTextOptions): Promise<StreamTextResult> {
  for (const provider of this.providers) {
    const isAvailable = await provider.isAvailable();
    if (!isAvailable) continue;

    try {
      const result = await provider.streamText(options);
      provider.recordSuccess();
      return result;
    } catch (error) {
      provider.recordFailure(error);
      // 继续尝试下一个 Provider
    }
  }

  // 所有 Provider 失败，启用 Mock 兜底
  return this.mockAdapter.streamText(options);
}
```

#### 健康追踪机制

每个 Provider 维护独立的健康状态：

```typescript
interface ProviderHealth {
  healthy: boolean;
  consecutiveFailures: number;
  totalRequests: number;
  successfulRequests: number;
  lastError?: string;
  lastErrorTime?: number;
  lastSuccessTime?: number;
}
```

**关键配置：**
- `unhealthyThreshold: 3` — 连续失败 3 次标记为不健康
- `healthRecoveryTTL: 60000` — 60 秒后自动尝试恢复

### 4.2 Search 检索模块

Search 模块负责从博客内容中检索与用户查询相关的文档片段。它是 RAG 流水线的核心组件，直接影响 AI 回复的准确性和相关性。

#### 检索架构

```mermaid
flowchart TB

%% ===================== 输入 =====================
Q["用户查询"]

%% ===================== 查询理解 =====================
Q --> K["关键词提取"]
Q --> V["向量编码"]

K --> KL["关键词列表"]
V --> VE["查询向量"]

%% ===================== 混合检索 =====================
KL --> H["混合检索引擎 (向量 + 关键词)"]
VE --> H

%% ===================== 双通道检索 =====================
H --> S["语义相似度匹配"]
H --> B["BM25 关键词匹配"]

%% ===================== 融合 =====================
S --> F["结果融合排序"]
B --> F

%% ===================== 后处理 =====================
F --> T["Top-K 结果筛选 (k=10, 可配置)"]
T --> M["元数据丰富 (标题 / 链接)"]

%% ===================== 输出 =====================
M --> R["返回结果"]
```

#### TF-IDF 评分

**字段权重：**
```typescript
const FIELD_WEIGHTS = {
  title: 8,      // 标题匹配最重要
  keyPoints: 5,
  categories: 4,
  tags: 3,
  excerpt: 3,
  content: 1,
} as const;
```

#### 深度内容检索

当首条结果得分显著高于第二条时，自动启用深度内容提取：

```typescript
const DEEP_CONTENT_SCORE_THRESHOLD = 8;
const DEEP_CONTENT_MAX_LENGTH = 1500;

const isDeepHit =
  options.enableDeepContent &&
  topScore >= DEEP_CONTENT_SCORE_THRESHOLD &&
  topScore > secondScore * 1.5;  // 首条结果显著领先
```

#### 会话级缓存

检索结果在会话级别缓存，避免重复检索（TTL: 10 分钟）：

```typescript
export function shouldReuseSearchContext(params: {
  latestText: string;
  cachedContext: CachedSearchContext | undefined;
  userTurnCount: number;
  now: number;
}): boolean {
  if (!cachedContext) return false;
  if (userTurnCount <= 1) return false;
  if (now - cachedContext.updatedAt > SESSION_CACHE_TTL_MS) return false;
  if (!isLikelyFollowUp(latestText)) return false;  // 不是追问
  if (!hasQueryOverlap(latestText, cachedContext.query)) return false;
  if (hasNewSignificantTokens(latestText, cachedContext.query)) return false;
  return true;
}
```

### 4.3 Intelligence 智能分析模块

Intelligence 模块提供了超越基础检索的智能增强能力。

#### 关键词提取

使用 LLM 从多轮对话中提取优化搜索关键词（超时 5 秒）：

```typescript
export async function extractSearchKeywords(params: {
  messages: Array<{ role: string; parts?: Array<{ type: string; text?: string }> }>;
  provider: { chatModel: (model: string) => unknown };
  model: string;
  abortSignal?: AbortSignal;
}): Promise<KeywordExtractionResult> {
  const prompt = `你是一个搜索关键词提取助手。分析以下对话，提取最佳搜索关键词。

对话:
${conversationText}

请提取：
1. 主查询词（最重要的1-2个关键词，用空格分隔）
2. 补充查询词（可选的辅助关键词）

仅返回JSON格式：{"query": "主查询词", "primaryQuery": "核心词"}`;
  // ...
}
```

**智能跳过逻辑：**
- 单轮对话不提取
- 消息长度 < 10 字符不提取
- 本地分词结果已足够清晰（≥ 3 tokens）不提取

#### 意图分类

将用户查询分为 7 类意图，优化搜索相关性：

```typescript
type IntentCategory =
  | 'setup'        // 搭建、安装
  | 'config'       // 配置、设置
  | 'content'      // 文章、内容
  | 'feature'      // 功能、特性
  | 'deployment'   // 部署
  | 'troubleshooting' // 问题排查
  | 'general';     // 通用

const INTENT_KEYWORDS: Record<IntentCategory, string[]> = {
  setup: ['搭建', '创建', '安装', 'install', 'setup', 'create', 'init'],
  config: ['配置', '设置', 'config', 'settings', '.env', 'wrangler'],
  content: ['文章', '博客', '写作', 'markdown', 'mdx', '标签', '分类'],
  feature: ['功能', '特性', 'feature', '支持', 'AI', 'RAG', '搜索'],
  deployment: ['部署', 'deploy', 'cloudflare', 'vercel', 'netlify'],
  troubleshooting: ['报错', '错误', 'error', 'bug', '问题', '不工作'],
  general: [],
};
```

#### 证据分析

对检索结果进行二次分析，提取最相关的关键信息（超时 8 秒）：

```typescript
export async function analyzeRetrievedEvidence(params: {
  userQuery: string;
  articles: ArticleContext[];
  projects: ProjectContext[];
  provider: { chatModel: (model: string) => unknown };
  model: string;
  abortSignal?: AbortSignal;
}): Promise<EvidenceAnalysisResult> {
  const prompt = `用户问题：${userQuery}

检索到的相关内容：
${evidenceSummary}

请分析这些内容，提取与用户问题最相关的2-3个关键信息点。格式：
<evidence>
[关键信息点1]
[关键信息点2]
</evidence>`;
  // ...
}
```

#### 引用守卫（Citation Guard）

**隐私保护：** 自动拒绝 6 类敏感个人信息查询

```typescript
const PRIVACY_PATTERNS: PrivacyPattern[] = [
  { regex: /(住址|地址|住在哪|address|where.*live)/iu, key: 'address' },
  { regex: /(收入|工资|薪资|salary|income)/iu, key: 'income' },
  { regex: /(家人|妻子|丈夫|孩子|父母|family)/iu, key: 'family' },
  { regex: /(电话|手机号|phone|mobile)/iu, key: 'phone' },
  { regex: /(身份证|id\s*card|passport)/iu, key: 'id' },
  { regex: /(年龄|多大了|几岁|how old|age)/iu, key: 'age' },
];
```

**幻觉检测：** 流式监控 AI 输出中的伪造链接

```typescript
export function createCitationGuardTransform(params: {
  articles: ArticleContext[];
  projects: ProjectContext[];
  siteUrl?: string;
}): (stream: ReadableStream<string>) => ReadableStream<string> {
  // 规范化 URL，统一处理相对路径和绝对路径
  const normalizeUrl = (url: string): string => {
    if (url.startsWith('/')) return `${siteUrl}${url}`;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${siteUrl}/${url}`;
  };

  // 构建合法 URL 白名单
  const validUrls = new Set([
    ...articles.map(a => normalizeUrl(a.url)),
    ...projects.map(p => normalizeUrl(p.url)),
  ]);
  // ...
}
```

**增强的 URL 验证：** 防止各种形式的幻觉链接

- **协议白名单**：只允许 `http://` 和 `https://`
- **域名验证**：阻止 localhost、私有 IP、内部网络地址
- **XSS 防护**：过滤危险的 URL 模式

#### 回答模式检测（Answer Mode）

系统自动检测用户查询的期望回答格式，并在提示词中注入相应的格式指导：

```typescript
export function resolveAnswerMode(query: string): AnswerMode {
  const q = query.toLowerCase();
  if (/几次|多少|几篇|数量|count|how many/u.test(q)) return 'count';
  if (/哪些|哪几个|列表|列举|list|what are/u.test(q)) return 'list';
  if (/怎么看|怎么想|看法|观点|opinion|think about/u.test(q)) return 'opinion';
  if (/推荐|建议|suggest|recommend/u.test(q)) return 'recommendation';
  if (/是什么|什么是|介绍|解释|what is|explain/u.test(q)) return 'fact';
  if (/有没有|是否|是不是|真的吗|does|is there/u.test(q)) return 'fact';
  return 'general';
}
```

| 模式              | 触发词               | 回答风格                     |
|-------------------|----------------------|------------------------------|
| `fact`            | 是什么、什么是       | 先给结论，再补依据           |
| `count`           | 多少、几篇、数量     | 第一句先说数字               |
| `list`            | 哪些、哪几个、列表   | 直接列出 2-6 项              |
| `opinion`         | 怎么看、观点、看法   | 「我觉得...」+ 2-3 个观点    |
| `recommendation`  | 推荐、建议           | 2-4 个推荐项 + 理由          |

#### 动态证据预算（Evidence Budget）

根据查询复杂度动态调整检索资源，避免过度消耗：

```typescript
const BUDGET_PRESETS: Record<QueryComplexity, EvidenceBudget> = {
  simple: {
    maxArticles: 4,          // 最多 4 篇文章
    summaryMaxLength: 48,    // 摘要截断 48 字符
    keyPointsMaxCount: 2,    // 最多 2 个要点
    enableDeepContent: false, // 不启用深度内容
    analysisMaxTokens: 200,  // 分析 token 上限
  },
  moderate: {
    maxArticles: 6,
    summaryMaxLength: 56,
    keyPointsMaxCount: 3,
    enableDeepContent: true,
    analysisMaxTokens: 360,
  },
  complex: {
    maxArticles: 8,
    summaryMaxLength: 64,
    keyPointsMaxCount: 4,
    enableDeepContent: true,
    analysisMaxTokens: 500,
  },
};
```

预算还会根据回答模式进一步调整：

```typescript
const MODE_ADJUSTMENTS: Partial<Record<AnswerMode, Partial<EvidenceBudget>>> = {
  count: { maxArticles: 2, enableDeepContent: false },      // 计数模式：更少文章
  list: { maxArticles: 8, summaryMaxLength: 80 },           // 列表模式：更多文章
  opinion: { analysisMaxTokens: 200 },                      // 观点模式：减少分析
  recommendation: { maxArticles: 6, keyPointsMaxCount: 2 }, // 推荐模式：适中
};
```

### 4.4 Extensions 扩展系统

扩展系统允许用户注入自定义数据到 AI 聊天流程中，增强 AI 的回答能力。

#### 扩展类型

| 类型 | 说明 | 用途 |
|------|------|------|
| `searchable` | 可搜索文档 | 添加额外的知识库内容 |
| `facts` | 结构化事实 | 添加验证过的事实数据 |
| `context` | 上下文注入 | 添加自定义 prompt 章节 |
| `voice-style` | 语言风格 | 定义 AI 回答风格模式 |
| `semantic-fallback` | 语义回退 | 查询重写规则 |

#### 扩展注册表

```typescript
interface Extension {
  id: string;
  type: ExtensionType;
  name: string;
  description?: string;
  enabled?: boolean;
  priority: number;  // 0-100，越高越优先
  data: ExtensionData;
}

interface ExtensionRegistryInterface {
  register<T extends ExtensionData>(extension: Extension<T>): void;
  unregister(id: string): void;
  get<T extends ExtensionData>(id: string): Extension<T> | undefined;
  getAll(): Extension[];
  getByType(type: ExtensionType): Extension[];
  getLoadedExtensions(): LoadedExtensions;
}
```

#### 扩展加载器

```typescript
export async function loadExtensions(
  pattern?: string,
  basePath?: string
): Promise<LoadedExtensions> {
  const registry = getExtensionRegistry();
  const extensions = await loadExtensionsFromGlob(pattern, basePath);
  
  for (const ext of extensions) {
    registry.register(ext);
  }
  
  return registry.getLoadedExtensions();
}
```

#### 扩展注入器

```typescript
// 解析语言风格模式
export function resolveVoiceStyleMode(
  query: string,
  categories: string[],
  extensions: LoadedExtensions
): VoiceStyleMode | null;

// 构建语言风格 prompt 片段
export function buildVoiceStylePrompt(
  mode: VoiceStyleMode | null,
  extensions: LoadedExtensions
): string;

// 获取语义回退规则
export function getSemanticFallback(
  query: string,
  extensions: LoadedExtensions
): { query: string; primaryQuery?: string; complexity?: string } | null;

// 合并搜索文档
export function mergeSearchDocuments(
  baseDocuments: ArticleContext[],
  extensions: LoadedExtensions
): ArticleContext[];
```

#### 数据生命周期

```
┌─────────────────────────────────────────────────────────────┐
│ BUILD TIME                                                  │
│  datas/extensions/*.json ──→ CLI validate ──→ Registry      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ REQUEST TIME                                                │
│  loadExtensions() ──→ resolveVoiceStyleMode()               │
│     ├─ getSemanticFallback(query)                           │
│     └─ mergeSearchDocuments() / mergeFacts()                │
└─────────────────────────────────────────────────────────────┘
```

### 4.5 Structured Output 结构化输出

结构化输出模块提供了类型安全的 JSON 生成能力，使用 Zod schema 进行验证。

#### 核心接口

```typescript
interface StructuredOutputConfig<T> {
  schema: z.ZodSchema<T>;
  schemaName?: string;
  schemaDescription?: string;
  fallbackParser?: (rawText: string) => T | null;
  repairStrategy?: 'strict' | 'lenient' | 'none';
  timeoutMs?: number;
  maxOutputTokens?: number;
  temperature?: number;
}

interface StructuredOutputResult<T> {
  data: T | null;
  success: boolean;
  status: StructuredOutputStatus;
  fallbackUsed: boolean;
  rawText?: string;
  error?: string;
  usage?: TokenUsageStats;
}
```

#### generateStructured 函数

```typescript
export async function generateStructured<T>(
  options: GenerateStructuredOptions<T>
): Promise<StructuredOutputResult<T>> {
  const { config, provider, systemPrompt, userPrompt, abortSignal } = options;
  
  // 尝试 generateObject
  try {
    const result = await provider.generateObject({
      schema: config.schema,
      systemPrompt,
      userPrompt,
    });
    
    // 验证 schema
    const validated = validateWithSchema(result.object, config.schema);
    if (validated !== null) {
      return { data: validated, success: true, status: 'success' };
    }
  } catch (error) {
    // 继续尝试 fallback
  }
  
  // Fallback: 文本生成 + JSON 解析
  if (config.fallbackParser) {
    const textResult = await provider.generateText({ ... });
    const extracted = extractJsonFromText(textResult.text);
    if (extracted) {
      const validated = validateWithSchema(extracted, config.schema);
      if (validated !== null) {
        return { data: validated, success: true, status: 'success', fallbackUsed: true };
      }
    }
  }
  
  return { data: null, success: false, status: 'error' };
}
```

#### Evidence Analysis Schema

```typescript
export const EvidenceAnalysisSchema = z.object({
  questionType: z.enum(['fact', 'list', 'count', 'timeline', 'recommendation', 'opinion', 'mixed', 'unknown']),
  directAnswer: z.string(),
  entities: z.array(z.object({
    name: z.string(),
    relation: z.string(),
    status: z.string(),
    count: z.number().int().positive().optional(),
    countMode: z.enum(['exact', 'at_least', 'unknown']).optional(),
    note: z.string().optional(),
    evidenceUrls: z.array(z.string()),
  })).max(6),
  keyFindings: z.array(z.object({
    claim: z.string(),
    confidence: z.enum(['high', 'medium', 'low']),
    evidenceUrls: z.array(z.string()),
  })).max(4),
  uncertainties: z.array(z.string()).max(6),
  recommendedUrls: z.array(z.string()).max(3),
});
```

### 4.6 Prompt 构建器模块

Prompt 构建器实现了三层提示词构建体系，这是系统智能表现的关键组件。

#### 静态层

几乎不变的系统指令，包含身份定义、回答格式、约束条件：

```typescript
const PROMPTS = {
  zh: {
    identity: (authorName) => `你是 ${authorName} 的博客 AI 助手...`,
    responsibilities: [
      '基于博客内容回答问题，**主动推荐相关文章**',
      '当话题涉及具体技术时，同时推荐高质量外部资源',
      '使用中文回答',
    ],
    constraints: [
      '只引用检索结果中实际存在的文章，不编造链接',
      '所有链接必须使用 Markdown 格式 [显示文字](URL)',
      '不回答与博客完全无关的私人问题',
    ],
    sourceLayers: [
      'L1 原始博客内容（最高优先级）',
      'L2 策划数据：作者简介、项目列表',
      'L3 结构化事实：标签统计、分类聚合',
      'L4 外部验证来源（需标注引用）',
      'L5 语言风格（仅影响表达）',
    ],
    // 新增：回答模式指导
    answerModes: [
      'fact（事实）：先给结论，再补依据；如有直接对应的文章，点明标题或给出链接',
      'list（列表）：直接列 2-6 项同一维度的内容',
      'count（计数）：第一句先说数字或「至少 X」，禁止伪精确',
      'opinion（观点）：先「我觉得/我的看法是」，再用 2-3 个观点展开',
      'recommendation（推荐）：先给 2-4 个推荐项，再说明理由',
      'unknown（未知/隐私）：第一句必须包含「未公开」或「不提供」，1-2 句收尾',
    ],
    // 新增：输出前检查清单
    preOutputChecks: [
      '将输出链接 → 检查 URL 是否在「相关文章」列表中',
      '将输出数字 → 检查是否在可见文本中明确出现',
      '将引用文章 → 确保使用 Markdown 链接格式 [标题](URL)',
      '承认缺失信息时 → 一句话带过，不反复强调',
    ],
  },
};
```

#### 半静态层

博客特定信息，可在构建时预处理：

```typescript
export function buildSemiStaticLayer(config: SemiStaticLayerConfig): string {
  const { posts } = config.authorContext;
  
  return `
## 博客概况
- 共有 ${posts.length} 篇文章
- 主要分类：${getCategories(posts).join('、')}

## 最新文章
${getRecentPosts(posts).map(p => 
  `- [${p.title}](${p.url}) (${p.date}) — ${p.summary.slice(0, 60)}`
).join('\n')}
`;
}
```

#### 动态层

根据当前查询和检索结果实时生成：

```typescript
export function buildDynamicLayer(config: DynamicLayerConfig): string {
  const { userQuery, articles, projects, evidenceSection, answerMode } = config;
  
  const lines = ['## 与当前问题相关的内容'];
  
  // 相关文章
  if (articles.length) {
    lines.push('### 相关文章');
    for (const article of articles.slice(0, 8)) {
      lines.push(`**[${article.title}](${article.url})**`);
      if (article.readingTime) lines.push(`阅读时间：约 ${article.readingTime} 分钟`); // 新增：阅读时间
      if (article.summary) lines.push(`摘要：${article.summary.slice(0, 120)}`);
      if (article.keyPoints.length) {
        lines.push(`要点：${article.keyPoints.slice(0, 3).join('；')}`);
      }
    }
  }
  
  lines.push(`---`);
  lines.push(`基于以上内容回答用户关于「${userQuery}」的问题。`);
  
  // 新增：回答模式提示
  if (answerMode && answerMode !== 'general') {
    lines.push(getAnswerModeHint(answerMode));
  }
  
  return lines.join('\n');
}
```

**阅读时间显示：** 在动态层中展示文章的预估阅读时间，帮助用户快速判断文章长度：

```
**[如何配置 astro-minimax 主题](/zh/posts/how-to-configure-astro-minimax-theme)**
阅读时间：约 5 分钟
摘要：本文介绍 astro-minimax 主题的配置方法...
要点：基础配置；环境变量；主题定制
```

**回答模式提示注入：** 根据检测到的回答模式，在动态层末尾注入格式指导：

```
当前为列表模式：直接列 2-6 项同一维度的内容。
```

### 4.7 Stream 流处理模块

Stream 模块提供了流式响应的处理工具，包括标准响应处理、Mock 模拟和缓存回放。

#### 标准流式响应处理

```typescript
interface StreamMessage {
  type: "text-start" | "text-delta" | "text-end" | "source" | "finish";
  data: string | object;
}
```

#### 缓存回放：模拟流式输出

缓存回放时，系统模拟真实的流式输出效果：

```typescript
export function createResponsePlaybackGenerator(
  cached: CachedAIResponse,
  config: ResponseCacheConfig,
): AsyncGenerator<PlaybackChunk> {
  return (async function* () {
    // 先回放思考内容
    if (cached.thinking) {
      for (const chunk of splitChunks(cached.thinking, config.chunkSize)) {
        yield { type: 'thinking', text: chunk };
        await sleep(config.thinkingPlaybackDelayMs);
      }
    }
    
    // 再回放主内容
    for (const chunk of splitChunks(cached.response, config.chunkSize)) {
      yield { type: 'response', text: chunk };
      await sleep(config.playbackDelayMs);
    }
  })();
}
```

## 五、完整数据流示例

本节通过几个典型场景，详细展示数据如何在各模块间流转。

### 5.1 请求处理全流程

```mermaid
flowchart TB
    subgraph Phase0["Phase 0: 请求预处理"]
        A1["OPTIONS检查"] --> A2["Rate Limit"]
        A2 --> A3["JSON解析"]
        A3 --> A4["消息验证"]
    end

    subgraph Phase1["Phase 1: 缓存检测"]
        B1{"public Q?"}
        B1 -->|是| B2["响应缓存检查"]
        B2 --> B3{"命中?"}
        B3 -->|是| B4["缓存回放"]
        B3 -->|否| B5["搜索缓存检查"]
        B1 -->|否| B6["会话缓存检查"]
    end

    subgraph Phase2["Phase 2: 搜索上下文"]
        C1["本地查询构建"]
        C1 --> C2{"追问检测"}
        C2 -->|是| C3["复用上下文"]
        C2 -->|否| C4["新搜索"]
    end

    subgraph Phase3["Phase 3: 关键词提取"]
        D1{"需要提取?"}
        D1 -->|是| D2["LLM关键词<br/>⏱ 5s"]
        D1 -->|否| D3["跳过"]
        D2 --> D4{"成功?"}
        D4 -->|否| D5["本地分词降级"]
    end

    subgraph Phase4["Phase 4: 文档检索"]
        E1["文本标准化"]
        E1 --> E2["分词 tokenize"]
        E2 --> E3["TF-IDF 评分"]
        E3 --> E4["相关性过滤 35%"]
        E4 --> E5["意图重排"]
        E5 --> E6["证据预算应用"]
    end

    subgraph Phase5["Phase 5: 证据分析"]
        F1{"需要分析?"}
        F1 -->|是| F2["LLM证据分析<br/>⏱ 8s"]
        F1 -->|否| F3["跳过"]
        F2 --> F4["构建证据节"]
    end

    subgraph Phase6["Phase 6: 提示构建"]
        G1["静态层"]
        G2["半静态层"]
        G3["动态层"]
        G1 --> G4["系统提示"]
        G2 --> G4
        G3 --> G4
    end

    subgraph Phase7["Phase 7: LLM生成"]
        H1["Workers AI<br/>weight:100"]
        H2["OpenAI<br/>weight:90"]
        H3["Mock<br/>weight:0"]
        H1 --> H4{"成功?"}
        H4 -->|否| H2
        H2 --> H5{"成功?"}
        H5 -->|否| H3
    end

    A4 --> B1
    B4 --> J["SSE输出"]
    B5 --> C1
    B6 --> C1
    C3 --> E1
    C4 --> D1
    D3 --> E1
    D5 --> E1
    E6 --> F1
    F3 --> G1
    F4 --> G3
    G4 --> H1
    H3 --> J
    H4 -->|是| J
```

### 5.2 场景一：技术问题查询

**用户输入**：`"如何部署到 Cloudflare Pages?"`

```mermaid
sequenceDiagram
    participant U as 用户
    participant H as chat-handler
    participant S as Search Module
    participant I as Intelligence
    participant P as Prompt Builder
    participant L as LLM Provider

    U->>H: POST /api/chat
    Note over H: Phase 0: 速率检查通过

    H->>H: Phase 1: 无缓存命中
    Note over H: 非public问题，无缓存

    H->>I: Phase 2: buildLocalSearchQuery()
    Note over I: tokenize("如何部署到 Cloudflare Pages")
    I-->>H: ["如何", "部署", "cloudflare", "pages"]

    H->>I: Phase 3: shouldRunKeywordExtraction()
    Note over I: 消息数<3，跳过提取

    H->>S: Phase 4: searchArticles(query)
    Note over S: TF-IDF评分中...
    S->>S: scoreDocument()
    Note over S: title匹配"cloudflare": +8×idf<br/>title匹配"部署": +8×idf
    S->>S: filterLowRelevance()
    Note over S: 保留 score ≥ topScore×0.35
    S->>I: rankArticlesByIntent()
    Note over I: classifyIntent → "deployment"
    Note over I: 部署类文章优先
    S-->>H: 6篇相关文章

    H->>I: Phase 5: shouldSkipAnalysis()
    Note over I: 文章数≥2，执行分析
    I->>L: analyzeRetrievedEvidence()
    Note over L: ⏱ 超时8s
    L-->>I: "部署到CF Pages需要..."
    I-->>H: 证据节

    H->>P: Phase 6: buildSystemPrompt()
    Note over P: Static: 身份、约束、来源分层
    Note over P: Semi-Static: 博客概览
    Note over P: Dynamic: 6篇文章 + 证据 + 模式提示
    P-->>H: 完整系统提示

    H->>L: Phase 7: streamText()
    Note over L: Workers AI调用
    L-->>U: SSE流式输出

    Note over U: 实时看到回答
```

**数据变换追踪**：

```
输入: "如何部署到 Cloudflare Pages?"
    ↓ normalizeText
"如何部署到 cloudflare pages"
    ↓ tokenize
["如何", "部署", "cloudflare", "pages"]
    ↓ dedupeByContainment
["cloudflare", "pages", "部署", "如何"]
    ↓ classifyIntent
"deployment"
    ↓ searchArticles
[
  {title: "Cloudflare Pages 部署指南", score: 24.5},
  {title: "环境变量配置", score: 12.3},
  ...
]
    ↓ rankArticlesByIntent (deployment关键词)
[
  {title: "Cloudflare Pages 部署指南", boostScore: 5},
  ...
]
    ↓ applyBudget (moderate)
maxArticles: 6, summaryMaxLength: 56
    ↓ resolveAnswerMode
"list" (匹配"如何")
    ↓ buildSystemPrompt
完整提示词 (约2000 tokens)
```

### 5.3 场景二：追问复用上下文

**用户输入**：`"配置文件在哪？"` （上一轮讨论部署）

```mermaid
flowchart TB
    A["用户输入: 配置文件在哪?"] --> B{"追问检测"}
    B -->|isLikelyFollowUp| C{"会话缓存?"}
    C -->|有缓存| D{"hasNewSignificantTokens?"}
    D -->|否| E["复用上下文"]
    D -->|是| F["新搜索"]
    C -->|无缓存| F

    E --> G["跳过搜索"]
    G --> H["复用缓存的文章"]

    F --> I["搜索: 配置 文件"]
    I --> J["新文章列表"]

    H --> K["构建提示"]
    J --> K

    subgraph 追问判定逻辑
        B
        note1["长度≤48字符 ✓<br/>无终结标点 ✗<br/>词数≤6 ✓"]
    end

    subgraph 上下文复用条件
        D
        note2["cachedTokens: [部署, cloudflare, pages]<br/>currentTokens: [配置, 文件]<br/>newTokens: [配置, 文件] ≠ ∅<br/>→ 有新token，不复用"]
    end
```

**追问检测算法**：

```typescript
function isLikelyFollowUp(message: string): boolean {
  const text = message.trim();
  if (!text || text.length > 48) return false;  // 长度限制

  const hasTerminalPunctuation = /[?？!！。.…]$/.test(text);
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  if (text.length <= 16) return true;           // 很短，大概率追问
  if (!/\s/.test(text) && text.length <= 24) return true;  // 单词短语
  return hasTerminalPunctuation && wordCount <= 6 && text.length <= 36;
}
```

### 5.4 场景三：隐私问题拦截

**用户输入**：`"你的收入是多少？"`

```mermaid
flowchart TB
    A["用户输入: 你的收入是多少?"] --> B["请求预处理"]
    B --> C["搜索: 收入"]
    C --> D["返回文章 (可能无相关)"]

    D --> E["resolveAnswerMode()"]
    E --> F{"hasPrivacyIntent()"}
    F -->|匹配: 收入| G["answerMode = 'unknown'"]

    G --> H["buildUnknownRefusal()"]
    H --> I["隐私模式匹配"]

    subgraph 隐私模式检测
        I
        note1["PRIVACY_PATTERNS:<br/>赚多少钱|月收入|年收入|工资多少|薪资多少"]
    end

    I --> J["返回拒绝模板"]
    J --> K["'这个信息未在博客中公开'"]

    subgraph 输出
        K
        note2["第一句包含'未公开'<br/>1-2句收尾<br/>不引用任何文章"]
    end
```

**隐私模式匹配**：

```typescript
const PRIVACY_PATTERNS = [
  /具体住在哪|哪个小区|门牌号|家庭住址|具体地址|住址信息/u,
  /赚多少钱|月收入|年收入|工资多少|薪资多少|收入多少/u,
  /老婆叫什么|妻子叫什么|丈夫叫什么|孩子叫什么|父母叫什么|家人姓名/u,
  /手机号码|电话号码|联系方式|微信号|QQ号/u,
  /身份证号|护照号|证件号/u,
  /你多大了|你几岁|年龄多大|今年多大|今年几岁/u,
];

function hasPrivacyIntent(query: string): boolean {
  const normalized = query.trim().toLowerCase();
  return PRIVACY_PATTERNS.some(pattern => pattern.test(normalized));
}
```

### 5.5 场景四：供应商故障转移

```mermaid
flowchart TB
    A["streamText() 调用"] --> B["Workers AI<br/>weight: 100"]

    B --> C{"isAvailable()?"}
    C -->|健康| D["尝试 streamText()"]
    C -->|不健康| E["跳过"]

    D --> F{"成功?"}
    F -->|是| G["recordSuccess()"]
    G --> H["返回结果"]

    F -->|否| I["recordFailure()"]
    I --> J["consecutiveFailures++"]
    J --> K{"≥3次?"}
    K -->|是| L["标记不健康"]
    K -->|否| M["OpenAI<br/>weight: 90"]

    E --> M
    L --> M

    M --> N{"isAvailable()?"}
    N -->|健康| O["尝试 streamText()"]
    N -->|不健康| P["跳过"]

    O --> Q{"成功?"}
    Q -->|是| R["recordSuccess()"]
    R --> H

    Q -->|否| S["recordFailure()"]
    S --> T["Mock<br/>weight: 0"]

    P --> T

    T --> U["getMockResponse()"]
    U --> V["返回模板响应"]

    subgraph 健康恢复机制
        W["不健康状态"]
        X["等待 60s"]
        Y["canAttemptRecovery()"]
        Z["尝试请求"]
        W --> X --> Y --> Z
    end
```

### 5.6 TF-IDF 评分详解

```mermaid
flowchart LR
    subgraph 输入
        Q["查询: AI 学习教程"]
        D["文档: {title, content, keyPoints, ...}"]
    end

    subgraph 分词
        Q --> Q1["tokenize"]
        Q1 --> Q2["[ai, 学习, 教程]"]
    end

    subgraph IDF计算
        Q2 --> IDF["getIDFWeight()"]
        IDF --> W1["idf(ai) = 1.2<br/>(常见词)"]
        IDF --> W2["idf(学习) = 2.5<br/>(中等)"]
        IDF --> W3["idf(教程) = 3.1<br/>(罕见词)"]
    end

    subgraph 字段匹配
        D --> F1["title: 'AI入门教程'"]
        D --> F2["keyPoints: ['学习路径']"]
        D --> F3["content: '...AI学习...'"]
    end

    subgraph 加权评分
        F1 --> S1["title含AI: +8×1.2 = 9.6"]
        F1 --> S2["title含教程: +8×3.1 = 24.8"]
        F2 --> S3["keyPoints含学习: +5×2.5 = 12.5"]
        F3 --> S4["content含AI: +1×1.2 = 1.2"]
        F3 --> S5["content含学习: +1×2.5 = 2.5"]
    end

    subgraph 总分
        SUM["score = 9.6+24.8+12.5+1.2+2.5 = 50.6"]
    end

    S1 --> SUM
    S2 --> SUM
    S3 --> SUM
    S4 --> SUM
    S5 --> SUM
```

**字段权重配置**：

| 字段 | 权重 | 说明 |
|------|------|------|
| `title` | 8 | 标题最重要，匹配即高度相关 |
| `keyPoints` | 5 | 关键点次之 |
| `categories` | 4 | 分类匹配 |
| `tags` | 3 | 标签匹配 |
| `excerpt` | 3 | 摘要匹配 |
| `content` | 1 | 正文权重最低，作为补充 |

**IDF 公式**：

```
IDF(term) = log(N / (df + 1)) + 1

其中:
- N = 文档总数
- df = 包含该词的文档数
- +1 平滑确保所有词权重为正
```

### 5.7 三层提示词构建流程

```mermaid
flowchart TB
    subgraph Static["静态层 (构建时固定)"]
        S1["身份定义"]
        S2["职责说明"]
        S3["格式要求"]
        S4["原则约束"]
        S5["来源分层 L1-L5"]
        S6["隐私保护"]
        S7["回答模式指导"]
        S8["预输出检查"]
    end

    subgraph SemiStatic["半静态层 (构建时固定)"]
        SS1["author-context.json"]
        SS2["文章总数"]
        SS3["主要分类"]
        SS4["最新10篇文章"]
    end

    subgraph Dynamic["动态层 (每次请求生成)"]
        D1["用户查询"]
        D2["相关文章 (≤8篇)"]
        D3["相关项目 (≤4个)"]
        D4["证据分析结果"]
        D5["事实匹配结果"]
        D6["回答模式提示"]
        D7["扩展上下文"]
    end

    subgraph 组装
        C["buildSystemPrompt()"]
        C --> OUT["完整系统提示<br/>(约2000-4000 tokens)"]
    end

    S1 --> C
    S2 --> C
    S3 --> C
    S4 --> C
    S5 --> C
    S6 --> C
    S7 --> C
    S8 --> C

    SS1 --> SS2
    SS1 --> SS3
    SS1 --> SS4
    SS2 --> C
    SS3 --> C
    SS4 --> C

    D1 --> C
    D2 --> C
    D3 --> C
    D4 --> C
    D5 --> C
    D6 --> C
    D7 --> C
```

**来源分层优先级**：

```markmap
# 来源分层 (Source Layers)

## L1: 原始博客内容
- 标题、摘要、要点、正文节选
- **最高优先级**
- 必须来自「相关文章」部分

## L2: 策划数据
- 作者简介
- 项目列表
- 博客概况

## L3: 结构化事实
- 标签统计
- 分类聚合
- 推导数据

## L4: 外部验证来源
- 官方文档
- GitHub 仓库
- 权威外部来源
- 需标注引用

## L5: 语言风格
- 仅影响表达方式
- 不作为事实依据

---
**优先级规则**: L1 > L2 > L3 > L4 > L5
**冲突时**: 以高优先级来源为准
```

## 六、使用场景详解

### 6.1 场景一：全局问答流程

```mermaid
flowchart TB
    A["用户输入"] -->|"POST /api/chat"| B["速率限制检查"]
    B --> C["请求验证"]
    C --> D["关键词提取<br/>(5s 超时)"]
    D --> E["RAG 检索"]
    E --> F["证据分析<br/>(8s 超时)"]
    F --> G["引用守卫检查"]
    G --> H["提示词构建"]
    H --> I["AI 模型调用"]
    I --> J["流式响应推送"]
```

### 6.2 场景二：边读边聊功能

这是针对文章阅读场景的增强功能，用户在阅读某篇文章时，可以针对该文章内容发起对话。

**上下文感知机制：**

```typescript
// 在文章页面，AIChatWidget 接收 articleContext
const articleContext = {
  scope: "article",
  article: {
    slug: "how-to-configure-astro-minimax-theme",
    title: "如何配置 astro-minimax 主题",
    summary: "本文介绍 astro-minimax 主题的配置方法...",
    keyPoints: ["基础配置", "环境变量", "主题定制"],
    categories: ["教程", "配置"],
  },
};

// 文章上下文提示词注入
const articlePrompt = `
[当前阅读文章]
用户正在阅读：《${articleContext.title}》
摘要：${articleContext.summary}
核心要点：${articleContext.keyPoints.join('；')}
分类：${articleContext.categories.join('、')}

你正在陪用户阅读这篇文章。优先围绕这篇文章的内容回答问题。
`;
```

## 七、组件设计详解

### 7.1 AIChatWidget 组件

AIChatWidget.astro 是模块的 Astro 入口点，负责初始化聊天 UI 并将其挂载到页面。

```astro
---
import { SITE } from "virtual:astro-minimax/config";
import AIChatContainer from "./AIChatContainer.js";
import type { ArticleChatContext } from "../server/types.js";

interface Props {
  lang?: string;
  articleContext?: ArticleChatContext;
}

const { lang = SITE.lang ?? "zh", articleContext } = Astro.props;
const aiEnabled = SITE.ai?.enabled ?? false;

const aiConfig = {
  enabled: aiEnabled,
  mockMode: SITE.ai?.mockMode ?? true,
  apiEndpoint: SITE.ai?.apiEndpoint || "/api/chat",
  welcomeMessage: SITE.ai?.welcomeMessage,
  placeholder: SITE.ai?.placeholder,
  lang,
};
---

{aiEnabled && (
  <AIChatContainer
    client:only="preact"
    config={aiConfig}
    articleContext={articleContext}
  />
)}
```

**客户端加载策略：** 使用 `client:only="preact"` 指令意味着组件会在页面主要内容和交互准备完成后才开始加载。这确保了聊天组件不会阻塞页面的首次加载，对性能影响最小化。

### 7.2 AIChatContainer 组件

AIChatContainer 是状态容器组件，管理聊天气泡的开启/关闭状态，并暴露全局控制接口。

```typescript
export default function AIChatContainer({ config, articleContext }: Props) {
  const [open, setOpen] = useState(false);

  const handleToggle = useCallback(() => setOpen(prev => !prev), []);
  const handleClose = useCallback(() => setOpen(false), []);

  if (typeof window !== 'undefined') {
    (window as any).__aiChatToggle = handleToggle;
  }

  return (
    <ChatPanel
      open={open}
      onClose={handleClose}
      config={config}
      articleContext={articleContext}
    />
  );
}
```

### 7.3 ChatPanel 组件

ChatPanel 是核心聊天 UI 组件，基于 `@ai-sdk/react` 的 `useChat` Hook 构建。

#### useChat 配置

```typescript
const transport = useMemo(() => new DefaultChatTransport({
  api: config.apiEndpoint ?? '/api/chat',
  prepareSendMessagesRequest: ({ id, messages: msgs }) => ({
    headers: { 'x-session-id': sessionId },
    body: {
      id, 
      messages: msgs,
      lang,
      context: articleContext
        ? { scope: 'article' as const, article: articleContext }
        : { scope: 'global' as const },
    },
  }),
}), [config.apiEndpoint, sessionId, articleContext, lang]);

const {
  messages,
  sendMessage,
  setMessages,
  regenerate,
  status,
  error,
} = useChat({
  transport,
  onError: (err) => console.error('[ChatPanel] Chat error:', err.message),
});
```

#### 打字机效果

```typescript
function useTypewriter(fullText: string, isStreaming: boolean): string {
  const [displayedLength, setDisplayedLength] = useState(0);
  
  useEffect(() => {
    if (!isStreaming) return;
    
    const animate = () => {
      setDisplayedLength(prev => {
        const targetLength = fullText.length;
        const behind = targetLength - prev;
        // 落后越多，追得越快
        const speed = behind > 20 ? Math.min(behind, 5) : 1;
        return Math.min(prev + speed, targetLength);
      });
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationRef.current!);
  }, [isStreaming, fullText]);
  
  return fullText.slice(0, displayedLength);
}
```

### 7.4 流式文本显示优化

**自动滚动策略：** 消息列表应自动滚动到底部（保持最新消息可见），但如果用户主动向上滚动，应暂停自动滚动。

**Markdown 渲染：** 支持丰富的 Markdown 语法：
- 内联元素：链接、加粗、代码
- 块级元素：段落、代码块、引用、列表

## 八、接口契约与数据类型

### 8.1 Chat API 请求格式

**请求端点：** `POST /api/chat`

```typescript
interface ChatRequest {
  context?: {
    scope: "global" | "article";
    article?: {
      slug: string;
      title: string;
      summary?: string;
      keyPoints?: string[];
      categories?: string[];
    };
  };
  id?: string;       // 会话 ID
  messages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }>;
}
```

### 8.2 Chat API 响应格式

**成功响应：** 使用 Server-Sent Events (SSE) 协议

```typescript
// 消息类型
interface TextStartMessage { type: "text-start"; }
interface TextDeltaMessage { type: "text-delta"; data: string; }
interface TextEndMessage { type: "text-end"; }
interface ThinkingStartMessage { type: "reasoning-start"; }
interface ThinkingDeltaMessage { type: "reasoning-delta"; data: string; }
interface SourceMessage { type: "source-url"; url: string; title: string; }
interface MetadataMessage { type: "message-metadata"; messageMetadata: ChatStatusData; }
interface FinishMessage { type: "finish"; finishReason: string; }

// 错误响应
interface ChatErrorResponse {
  error: string;
  code: string;
  retryable: boolean;
  retryAfter?: number;
}
```

### 8.3 错误码定义

| 错误码 | HTTP 状态 | 说明 | 可重试 |
|--------|-----------|------|--------|
| `METHOD_NOT_ALLOWED` | 405 | 无效 HTTP 方法 | 否 |
| `INVALID_REQUEST` | 400 | 请求格式错误 | 否 |
| `INPUT_TOO_LONG` | 400 | 输入超过 500 字符 | 否 |
| `RATE_LIMITED` | 429 | 速率限制触发 | 是 |
| `TIMEOUT` | 504 | 请求超时 | 是 |
| `PROVIDER_UNAVAILABLE` | 503 | 所有 Provider 不可用 | 是 |
| `INTERNAL_ERROR` | 500 | 内部错误 | 是 |

## 九、配置与环境变量

### 9.1 Provider 配置

| 环境变量 | 必需 | 说明 |
|----------|------|------|
| `AI_BASE_URL` | OpenAI 时必需 | API 地址 |
| `AI_API_KEY` | OpenAI 时必需 | API 密钥 |
| `AI_MODEL` | 否 | 主模型（默认 `gpt-4o-mini`） |
| `AI_KEYWORD_MODEL` | 否 | 关键词提取模型 |
| `AI_EVIDENCE_MODEL` | 否 | 证据分析模型 |
| `AI_BINDING_NAME` | Workers 时 | AI 绑定名（默认 `minimaxAI`） |
| `AI_WORKERS_MODEL` | 否 | Workers 模型（默认 `@cf/zai-org/glm-4.7-flash`） |

### 9.2 响应缓存配置

| 环境变量 | 默认值 | 说明 |
|----------|--------|------|
| `AI_RESPONSE_CACHE_ENABLED` | `false` | 是否启用缓存 |
| `AI_RESPONSE_CACHE_TTL` | `3600` | 缓存 TTL（秒） |
| `AI_RESPONSE_CACHE_PLAYBACK_DELAY` | `20` | 回放延迟（毫秒） |
| `AI_RESPONSE_CACHE_CHUNK_SIZE` | `15` | 每块字符数 |
| `AI_RESPONSE_CACHE_THINKING_DELAY` | `5` | 思考内容回放延迟 |

### 9.3 速率限制配置

| 环境变量 | 默认值 | 说明 |
|----------|--------|------|
| `CHAT_RATE_LIMIT_BURST_MAX` | `3` | 突发限制最大请求数 |
| `CHAT_RATE_LIMIT_BURST_WINDOW_MS` | `10000` | 突发限制时间窗口 |
| `CHAT_RATE_LIMIT_SUSTAINED_MAX` | `20` | 持续限制最大请求数 |
| `CHAT_RATE_LIMIT_SUSTAINED_WINDOW_MS` | `60000` | 持续限制时间窗口 |
| `CHAT_RATE_LIMIT_DAILY_MAX` | `100` | 每日限制最大请求数 |
| `CHAT_RATE_LIMIT_DAILY_WINDOW_MS` | `86400000` | 每日限制时间窗口 |

### 9.4 多环境配置示例

**开发环境（Mock 模式）：**
```bash
# .env.development
AI_RESPONSE_CACHE_ENABLED=true
```

```typescript
// astro.config.mjs
export default defineConfig({
  SITE: {
    ai: {
      enabled: true,
      mockMode: true,
    }
  }
});
```

**生产环境（OpenAI）：**
```bash
# .env.production
AI_BASE_URL=https://api.openai.com/v1
AI_API_KEY=sk-...
AI_MODEL=gpt-4o-mini
SITE_AUTHOR=博客作者
SITE_URL=https://example.com
AI_RESPONSE_CACHE_ENABLED=true
```

**生产环境（Cloudflare Workers）：**
```bash
# .env.production
AI_BINDING_NAME=AI
AI_WORKERS_MODEL=@cf/zai-org/glm-4.7-flash
SITE_AUTHOR=博客作者
SITE_URL=https://example.com
```

## 十、部署与运维

### 10.1 部署架构

**Cloudflare Pages 模式（推荐）：**

```mermaid
flowchart TB
    A["用户请求"] --> B["Cloudflare CDN / Edge Network"]
    B --> C["Cloudflare Pages Functions"]
    C --> D["chat-handler.ts<br/>(处理 /api/chat)"]
    C --> E["Workers KV<br/>(响应缓存)"]
    E --> F["Cloudflare Workers AI / OpenAI API"]
```

这种架构的优势在于边缘计算带来的低延迟，AI 请求可以从距离用户最近的边缘节点发起。

**传统 Node.js 模式：**

```mermaid
flowchart TB
    A["用户请求"] --> B["CDN / 负载均衡"]
    B --> C["Astro 服务端<br/>(SSR 模式)"]
    C --> D["chat-handler.ts"]
    C --> E["外部 AI API<br/>(OpenAI 等)"]
```

### 10.2 性能基准

| 操作阶段 | 平均延迟 | P99 延迟 | 备注 |
|----------|----------|----------|------|
| 速率限制检查 | < 1ms | < 5ms | 内存操作 |
| 请求验证 | < 2ms | < 10ms | JSON 解析 |
| 关键词提取 | 200-800ms | 5000ms | 取决于模型和网络 |
| RAG 检索 | 50-150ms | 300ms | 内存索引 |
| 证据分析 | 300-1000ms | 8000ms | 可跳过 |
| 提示词构建 | < 10ms | < 50ms | 字符串拼接 |
| AI 流式响应 | 500-3000ms | 30000ms | 取决于模型和回复长度 |
| 端到端（跳过智能分析） | 600-4000ms | 35000ms | 完整流程 |

### 10.3 监控指标

```typescript
const MONITORING_METRICS = {
  // 请求级指标
  "chat_request_total": "请求总数",
  "chat_request_duration_seconds": "请求处理耗时",
  "chat_request_status": "请求状态分布",
  
  // AI 调用指标
  "ai_provider_call_total": "AI 调用总数（按供应商分组）",
  "ai_provider_latency_seconds": "AI 响应延迟",
  "ai_provider_errors_total": "AI 调用错误数",
  
  // RAG 指标
  "rag_retrieval_total": "检索调用总数",
  "rag_retrieval_latency_seconds": "检索延迟",
  "rag_retrieval_hit_rate": "检索命中率",
  
  // 缓存指标
  "cache_hit_total": "缓存命中数",
  "cache_miss_total": "缓存未命中数",
  "cache_playback_total": "缓存回放数",
};
```

### 10.4 故障排查指南

**问题：聊天功能无响应**

排查步骤：
1. 检查浏览器控制台是否有 JavaScript 错误
2. 检查网络请求是否发出（DevTools Network 面板）
3. 检查 `/api/chat` 端点是否返回正确响应
4. 检查服务端日志中的错误信息
5. 验证环境变量配置是否正确

**问题：AI 回复质量差或答非所问**

排查步骤：
1. 检查 RAG 检索是否返回了相关内容（查看 source 消息）
2. 检查日志中的检索结果评分
3. 如果涉及最新内容，验证元数据是否已更新
4. 考虑调整检索的 topK 参数或相关性阈值

**问题：响应速度慢**

排查步骤：
1. 检查网络延迟（特别是 AI API 响应时间）
2. 检查是否触发了降级策略（Mock 模式）
3. 检查是否有大量并发请求（速率限制）
4. 考虑启用响应缓存减少 API 调用

**问题：间歇性返回 Mock 响应**

这表明 AI 供应商不可用，应：
1. 检查 API 密钥是否有效
2. 检查 API 配额是否用尽
3. 查看服务商状态页面
4. 考虑增加备用供应商

## 十一、超时预算管理

单个请求的总超时为 45 秒，各阶段分配如下：

| 阶段 | 超时 | 失败行为 |
|------|------|----------|
| 关键词提取 | 5s | 降级使用本地分词 |
| 证据分析 | 8s | 跳过此阶段 |
| LLM 流式 | 30s | 切换下一 Provider，最终 Mock |
| 其他开销 | 2s | — |

```typescript
// 主请求超时控制
const REQUEST_TIMEOUT_MS = 45_000;
const requestAbort = new AbortController();
const requestTimer = setTimeout(() => requestAbort.abort(), REQUEST_TIMEOUT_MS);

try {
  return await runPipeline({ ...params, requestAbort });
} catch (err) {
  if (requestAbort.signal.aborted) return errors.timeout(lang);
  return errors.internal(undefined, lang);
} finally {
  clearTimeout(requestTimer);
}
```

## 十二、速率限制

三层 IP 级速率限制：

| 层级 | 时间窗口 | 最大请求数 | 说明 |
|------|----------|-----------|------|
| Burst | 10 秒 | 3 次 | 防止短时间刷屏 |
| Sustained | 60 秒 | 20 次 | 正常使用上限 |
| Daily | 24 小时 | 100 次 | 单日总上限 |

## 十三、CLI 工具链

### 13.1 事实注册表验证

`@astro-minimax/cli` 提供了 `facts validate` 命令，用于验证 `fact-registry.json` 的结构和内容：

```bash
astro-minimax facts validate
```

**验证项目：**

| 检查项 | 说明 |
|--------|------|
| Schema 版本 | 必须为 `fact-registry-v1` |
| ID 唯一性 | 每个 fact 必须有唯一 ID |
| 类别有效性 | category 必须为 author/blog/content/project/tech |
| 来源有效性 | source 必须为 explicit/derived/aggregated |
| 置信度范围 | confidence 必须在 0-1 之间 |
| 日期格式 | generatedAt 必须为有效 ISO 日期 |

**输出示例：**

```
📋 Validating Fact Registry
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  📊 Validation Results:

  Statistics:
    Total facts: 45
    Average confidence: 0.92

  By category:
    author: 8
    blog: 12
    content: 15
    tech: 10

  Coverage:
    Author facts: ✅
    Blog facts: ✅
    Content facts: ✅
    Tech facts: ✅

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Fact registry is valid
```

### 13.2 相关命令

```bash
astro-minimax facts status    # 查看事实注册表状态
astro-minimax profile build   # 构建完整作者画像（包含 facts）
```

## 十四、总结

@astro-minimax/ai 模块通过以下设计实现了高可用、高质量的 AI 聊天体验：

1. **供应商无关** — 多 Provider 支持与自动故障转移
2. **智能增强** — 关键词提取、意图分类、证据分析
3. **幻觉防护** — 引用守卫、隐私保护、来源分层
4. **性能优化** — 三层提示词、会话缓存、响应缓存
5. **用户体验** — 流式响应、打字机效果、边读边聊
6. **健壮性与容错** — 多供应商支持、自动故障转移、超时预算管理
7. **模块化与可扩展性** — 清晰的分层架构和模块边界
8. **动态资源调度** — 证据预算根据查询复杂度自适应调整
9. **回答格式优化** — 自动检测回答模式，注入相应格式指导
10. **阅读时间感知** — 动态层展示文章预估阅读时间

完整的 API 文档和更多示例，请参考 [API 参考](/zh/posts/ai-api-reference)。
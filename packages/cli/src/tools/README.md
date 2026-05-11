# AI 数据构建工具

本目录包含用于博客内容处理和 AI 功能数据构建的工具脚本。

## 环境配置

在 `.env` 文件中配置以下环境变量：

```bash
# AI API 配置（必需，用于 AI 相关脚本）
AI_API_KEY=your_api_key
AI_BASE_URL=https://api.openai.com    # 或其他 OpenAI 兼容 API
AI_MODEL=gpt-4o-mini                   # 模型名称

# 站点配置（可选）
SITE_URL=https://your-domain.com
SITE_AUTHOR=博主名称
SITE_DESCRIPTION=站点描述
```

## 脚本列表

### 内容处理

| 脚本                  | 命令                          | 说明                       |
| --------------------- | ----------------------------- | -------------------------- |
| `ai-process.ts`       | `pnpm ai:process`             | AI 文章批处理（摘要、SEO） |
| `summarize.ts`        | 内部工具（按需调用）          | 生成文章摘要               |
| `generate-related.ts` | 内部工具（按需调用）          | 生成相关文章               |
| `generate-tags.ts`    | 内部工具（按需调用）          | 生成文章标签               |
| `translate.ts`        | 内部工具（按需调用）          | 文章翻译                   |
| `vectorize.ts`        | 内部工具（按需调用）          | 生成运行时向量索引         |
| `generate-cover.ts`   | 内部工具（按需调用）          | 生成文章封面               |
| `generate-og.ts`      | 内部工具（按需调用）          | 生成 OG 图片               |

### AI 分身数据构建

| 脚本                         | 命令                    | 说明               |
| ---------------------------- | ----------------------- | ------------------ |
| `build-author-context.ts`    | `astro-minimax ai profile build` 流程的一部分 | 构建作者上下文数据 |
| `build-voice-profile.ts`     | `astro-minimax ai profile build` 流程的一部分 | 构建表达风格画像   |
| `generate-author-profile.ts` | `astro-minimax ai profile build` 流程的一部分 | 生成作者画像报告   |

## 详细说明

### ai-process.ts — AI 文章批处理

为文章生成 AI 摘要和 SEO 元数据。

```bash
# 处理所有文章
pnpm ai:process

# 只处理中文文章
pnpm ai:process --lang=zh

# 只处理指定文章
pnpm ai:process --slug=zh/getting-started

# 只生成摘要
pnpm ai:process --task=summary

# 预览模式
pnpm ai:process --dry-run

# 强制重新处理
pnpm ai:process --force

# 清空跳过列表后重试
pnpm ai:process --clear-skip
```

**输出文件**:

- `datas/.cache/ai-summaries.json` — 文章摘要数据（构建中间产物）
- `datas/seo-meta.json` — SEO 元数据
- `datas/.cache/ai-skip-list.json` — 失败文章跳过列表

### build-author-context.ts — 构建作者上下文

聚合博客文章数据，为 AI 分身对话提供上下文。

```bash
astro-minimax ai profile build
```

**输出文件**:

- `datas/rag-bundle.json` — 统一运行时知识包
- `datas/rag-voice.json` — 表达风格画像
- `datas/rag-facts.json` — 事实注册表
- `datas/rag-extensions.json` — 扩展知识包
- `datas/seo-meta.json` — SEO 元数据
- `datas/content-manifest.json` — 文档级语料清单
- `datas/build-meta.json` — 构建元数据

### build-voice-profile.ts — 构建表达风格画像

从博客标题、正文中提取作者的表达风格特征。纯本地分析，不调用 AI。

```bash
astro-minimax ai profile build
```

**输出结果**:

- 生成阶段会产出表达风格数据，并由 `build-author-context.ts` 汇总进 `datas/rag-bundle.json`
- 运行时仍以知识包为准，不直接依赖单独的风格画像文件

### generate-author-profile.ts — 生成作者画像报告

基于上下文数据生成用于 About 页面的结构化简介。

```bash
# 通过作者画像构建流程生成
astro-minimax ai profile build
```

**输出结果**:

- 生成 About 页面所需的画像报告与上下文衍生数据
- 这些文件属于生成阶段产物，不是运行时对话入口

## 输出目录结构

```
datas/
├── rag-bundle.json        # 统一运行时知识包（核心）
├── rag-extensions.json    # 扩展知识包
├── rag-facts.json         # 事实注册表
├── rag-voice.json         # 表达风格画像
├── seo-meta.json          # SEO 元数据
├── content-manifest.json  # 文档级语料清单
├── build-meta.json        # 构建元数据
├── vector-index.json      # 向量索引（可选）
└── .cache/                # 构建中间产物（不入版本控制）
    ├── ai-summaries.json
    └── ai-skip-list.json
```

## 开发说明

### 共享模块

- `lib/ai-provider.ts` — AI API 调用封装（支持代理）
- `lib/utils.ts` — 通用工具函数
- `lib/posts.ts` — 文章读取工具
- `lib/frontmatter.ts` — Frontmatter 解析
- `lib/markdown.ts` — Markdown 处理

### AI Provider 使用

```typescript
import { chatCompletion, hasAPIKey, getConfig } from "./lib/ai-provider.js";

if (hasAPIKey()) {
  const result = await chatCompletion(
    [
      { role: "system", content: "系统提示" },
      { role: "user", content: "用户输入" },
    ],
    { maxTokens: 2000, responseFormat: "json" }
  );
}
```

### URL 策略

工具脚本生成的 URL 均为**相对路径**（如 `/zh/my-post`），不包含域名前缀。在 AI 对话运行时，`initializeMetadata()` 会根据 `SITE_URL` 环境变量动态拼接完整 URL。这使得生成的数据文件与部署环境无关。

### 数据文件与 AI 对话的关系

运行时对话链路应始终以 `datas/rag-bundle.json` 作为统一输入。
`.cache/ai-summaries.json`、`rag-voice.json`、`rag-facts.json` 等文件仍是生成阶段或派生阶段的中间/源数据，不应被新的运行时适配层直接读取。

如存在 `vector-index.json`，它仅作为可选向量检索补充数据。

### 代理支持

脚本自动支持 `HTTP_PROXY` / `HTTPS_PROXY` 环境变量，无需额外配置。

```bash
export HTTPS_PROXY=http://127.0.0.1:7890
```

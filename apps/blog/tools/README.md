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

| 脚本 | 命令 | 说明 |
|------|------|------|
| `ai-process.ts` | `pnpm ai:process` | AI 文章批处理（摘要、SEO） |
| `summarize.ts` | `pnpm tools:summarize` | 生成文章摘要 |
| `generate-related.ts` | `pnpm tools:generate-related` | 生成相关文章 |
| `generate-tags.ts` | `pnpm tools:tags` | 生成文章标签 |
| `translate.ts` | `pnpm tools:translate` | 文章翻译 |
| `vectorize.ts` | `pnpm tools:vectorize` | 生成文章向量 |
| `generate-cover.ts` | `pnpm tools:cover` | 生成文章封面 |
| `generate-og.ts` | `pnpm og` | 生成 OG 图片 |

### AI 分身数据构建

| 脚本 | 命令 | 说明 |
|------|------|------|
| `build-author-context.ts` | `pnpm context:build` | 构建作者上下文数据 |
| `build-voice-profile.ts` | `pnpm voice:build` | 构建表达风格画像 |
| `generate-author-profile.ts` | `pnpm profile:generate` | 生成作者画像报告 |

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
- `datas/ai-summaries.json` — 文章摘要数据
- `datas/ai-seo.json` — SEO 元数据
- `datas/ai-skip-list.json` — 失败文章跳过列表

### build-author-context.ts — 构建作者上下文

聚合博客文章数据，为 AI 分身对话提供上下文。

```bash
pnpm context:build
```

**输出文件**:
- `datas/author-context.json` — 作者上下文数据
- `datas/sources/blog-digest.json` — 文章摘要

### build-voice-profile.ts — 构建表达风格画像

从博客标题、正文中提取作者的表达风格特征。纯本地分析，不调用 AI。

```bash
pnpm voice:build
```

**输出文件**:
- `datas/voice-profile.json` — 表达风格画像

### generate-author-profile.ts — 生成作者画像报告

基于上下文数据生成用于 About 页面的结构化简介。

```bash
# AI 生成（需要配置 AI API）
pnpm profile:generate

# 使用规则模板（不需要 AI）
pnpm profile:generate --no-ai
```

**输出文件**:
- `datas/author-profile-report.json` — 画像报告
- `datas/author-profile-context.json` — 生成上下文

## 输出目录结构

```
datas/
├── ai-summaries.json          # AI 生成的文章摘要
├── ai-seo.json               # AI 生成的 SEO 数据
├── ai-skip-list.json         # AI 处理失败的文章列表
├── author-context.json       # 作者上下文（AI 分身使用）
├── author-profile-report.json # 作者画像报告
├── author-profile-context.json
├── voice-profile.json        # 表达风格画像
└── sources/
    └── blog-digest.json      # 文章摘要数据
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
  const result = await chatCompletion([
    { role: "system", content: "系统提示" },
    { role: "user", content: "用户输入" },
  ], { maxTokens: 2000, responseFormat: "json" });
}
```

### 代理支持

脚本自动支持 `HTTP_PROXY` / `HTTPS_PROXY` 环境变量，无需额外配置。

```bash
export HTTPS_PROXY=http://127.0.0.1:7890
```
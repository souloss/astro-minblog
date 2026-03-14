# Cloudflare Workers AI 边缘函数 API 文档

本项目使用 Cloudflare Workers AI 提供边缘 AI 对话功能，支持**动态绑定名称配置**。

## 环境变量配置

### Cloudflare Dashboard 配置

在 Cloudflare Pages 项目的 **Settings > Environment Variables** 中配置：

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `AI_BINDING_NAME` | Workers AI 绑定名称 | `AI` |
| `AI_MODEL` | 默认使用的模型 | `@cf/zai-org/glm-4.7-flash` |

### wrangler.toml 配置

```toml
[ai]
binding = "souloss"  # 绑定名称，需与 Dashboard 配置一致
```

### 绑定名称说明

**绑定名称是可配置的**：

1. 默认使用 `AI` 作为绑定名称
2. 通过 `AI_BINDING_NAME` 环境变量可以修改
3. 在 Dashboard 中绑定 Workers AI 时，名称需与配置一致

## 推荐模型

| 模型 ID | 说明 | 特点 |
|---------|------|------|
| `@cf/zai-org/glm-4.7-flash` | GLM-4.7 Flash | **推荐** - 支持 100+ 语言，131K 上下文 |
| `@cf/qwen/qwen2.5-coder-32b-instruct` | Qwen Coder | 代码生成，支持中文 |

完整模型列表: https://developers.cloudflare.com/workers-ai/models/

## API 端点

### 1. 普通对话 API

**端点**: `POST /api/chat`

**请求体**:
```json
{
  "message": "你好，请介绍一下你自己",
  "systemPrompt": "可选：自定义系统提示"
}
```

**CURL 示例**:
```bash
curl -X POST https://your-site.pages.dev/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "你好，请用中文介绍一下你自己"}'
```

### 2. 流式对话 API (SSE)

**端点**: `POST /api/chat-stream`

**CURL 示例**:
```bash
curl -X POST https://your-site.pages.dev/api/chat-stream \
  -H "Content-Type: application/json" \
  -d '{"message": "请写一首关于春天的诗"}'
```

## 本地开发

```bash
pnpm build
npx wrangler pages dev ./dist --compatibility-date=2026-03-12
```

## 部署

```bash
npx wrangler pages deploy ./dist --project-name=astro-minimax
```

## 错误处理

| 错误码 | 说明 |
|--------|------|
| 400 | 请求参数错误，缺少 message 字段 |
| 405 | 请求方法不允许，只支持 POST |
| 500 | AI 绑定未配置或内部错误 |
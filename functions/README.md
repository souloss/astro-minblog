# Cloudflare Workers AI 边缘函数 API 文档

本项目使用 Cloudflare Workers AI 提供边缘 AI 对话功能。

## 模型信息

- **模型**: `@cf/zai-org/glm-4.7-flash`
- **特点**: 支持中文和 100+ 语言的快速多语言文本生成模型
- **上下文窗口**: 131,072 tokens
- **功能**: 对话、指令跟随、多轮工具调用

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
# 基础对话
curl -X POST https://your-site.pages.dev/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "你好，请用中文介绍一下你自己"}'

# 带自定义系统提示
curl -X POST https://your-site.pages.dev/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "什么是 Astro 框架？",
    "systemPrompt": "你是一个技术专家，请用简洁的中文回答技术问题。"
  }'
```

**响应示例**:
```json
{
  "id": "chatcmpl-xxx",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "@cf/zai-org/glm-4.7-flash",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "你好！我是 GLM，一个由智谱 AI 开发的大型语言模型..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 20,
    "completion_tokens": 100,
    "total_tokens": 120
  }
}
```

### 2. 流式对话 API (SSE)

**端点**: `POST /api/chat-stream`

**请求体**: 与普通对话 API 相同

**CURL 示例**:
```bash
# 流式响应
curl -X POST https://your-site.pages.dev/api/chat-stream \
  -H "Content-Type: application/json" \
  -d '{"message": "请写一首关于春天的诗"}'
```

**响应格式**: Server-Sent Events (SSE)

```
data: {"choices":[{"delta":{"content":"春"}}]}

data: {"choices":[{"delta":{"content":"风"}}]}

data: {"choices":[{"delta":{"content":"拂"}}]}

data: [DONE]
```

## 本地开发测试

### 1. 构建项目
```bash
pnpm build
```

### 2. 启动本地开发服务器
```bash
npx wrangler pages dev ./dist --compatibility-date=2026-03-12
```

### 3. 测试 API
```bash
# 测试普通对话
curl -X POST http://localhost:8788/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "你好"}'

# 测试流式对话
curl -X POST http://localhost:8788/api/chat-stream \
  -H "Content-Type: application/json" \
  -d '{"message": "你好"}'
```

## 部署到 Cloudflare Pages

### 方法 1: Git 集成部署
推送到 Git 仓库，Cloudflare 会自动构建和部署。

### 方法 2: 直接上传
```bash
npx wrangler pages deploy ./dist --project-name=astro-minimax
```

## 配置说明

### wrangler.toml
```toml
name = "astro-minimax"
pages_build_output_dir = "dist"
compatibility_date = "2026-03-12"

# Workers AI 绑定
[ai]
binding = "souloss"
```

### Cloudflare Dashboard 配置

1. 进入 **Workers & Pages** > 选择你的项目 > **Settings** > **Bindings**
2. 点击 **Add** > **Workers AI**
3. 设置 **Variable name** 为 `souloss`
4. 重新部署项目

## 错误处理

| 错误码 | 说明 |
|--------|------|
| 400 | 请求参数错误，缺少 message 字段 |
| 405 | 请求方法不允许，只支持 POST |
| 500 | 服务器内部错误 |

## 其他可用模型

如需更换模型，可修改 `functions/api/chat.ts` 中的模型名称：

| 模型 ID | 说明 |
|---------|------|
| `@cf/zai-org/glm-4.7-flash` | 多语言模型，支持中文 (推荐) |
| `@cf/qwen/qwen2.5-coder-32b-instruct` | Qwen 代码模型，支持中文 |
| `@cf/meta/llama-3.1-8b-instruct` | Llama 3.1 多语言模型 |
| `@cf/meta/llama-3.3-70b-instruct-fp8-fast` | Llama 3.3 70B 快速版本 |

完整模型列表: https://developers.cloudflare.com/workers-ai/models/
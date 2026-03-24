---
author: Souloss
pubDatetime: 2026-03-24T12:00:00.000Z
title: "astro-minimax v0.9.2: 安全加固与架构拆分"
featured: false
draft: false
category: Release
tags:
  - release
  - changelog
  - security
  - refactoring
cover: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&h=630&fit=crop"
description: "astro-minimax v0.9.2：全包安全审计修复、组件与模块拆分、配置单一数据源、通知超时保护，以及多项代码质量改进。"
---

astro-minimax v0.9.2 聚焦「安全加固」与「架构拆分」：基于四包并行深度审计，修复了 XSS/路径穿越等安全问题，完成两轮组件拆分，并将配置常量收敛到单一数据源。

## 安全修复

### URL 协议校验 (Critical)

AI 聊天中模型返回的 Markdown 链接、通知模板中的 URL 现在都经过协议白名单校验（仅允许 `http/https/mailto`），防止 `javascript:` 等 XSS 攻击向量。

### Mermaid 安全加固

`MermaidBlock` 的 `securityLevel` 从 `'loose'` 改为 `'strict'`，防止恶意 Mermaid 语法通过 SVG 注入执行脚本。

### PostsContainer HTML 转义

文章列表的客户端渲染现在对标题、描述、分类、标签进行 HTML 转义，消除存储型 XSS 风险。

### CLI 路径穿越防护

`extensions validate` 命令现在验证文件路径不会逃出扩展目录，防止 `../` 路径穿越。

### 通知日志脱敏

Webhook 日志不再输出完整 URL（可能包含 `?token=` 等凭证），改为仅记录 `origin + pathname`。

## 架构改进

### 组件拆分 — AI 包

| 文件 | 行数变化 | 提取的模块 |
|------|---------|-----------|
| `ChatPanel.tsx` | 1020→580 | `RichText.tsx`, `MessageBubble.tsx`, `ChatInput.tsx`, `ReasoningBlock.tsx` |
| `CodeBlock.tsx` | 785→256 | `MermaidBlock.tsx`, `MarkmapBlock.tsx`, `VizShared.tsx` |

### 模块拆分 — CLI 包

`ai.ts`（1167 行）拆分为 6 个聚焦模块：

- `ai/index.ts`（122 行）— 命令分发
- `ai/types.ts` — 共享类型与常量
- `ai/run-tool.ts` — 工具脚本执行
- `ai/profile.ts` — 作者档案命令
- `ai/facts.ts` — 事实库命令
- `ai/extensions.ts` — 扩展系统命令

### 配置单一数据源

消除 8 处重复的配置常量，全部收敛到 `constants.ts`：

- 超时常量（keyword-extract, evidence-analysis, provider, structured-output）
- 搜索参数（search-api 5 个常量）
- 缓存 TTL（session-cache, cache 3 个适配器）
- CLI 版本号改为从 `package.json` 读取

## 可靠性提升

- **通知超时保护**: Telegram/Email/Webhook 三个 provider 添加 `AbortSignal.timeout(10s)`
- **流式成功语义修正**: `stream-helpers` 在出错时正确返回 `success: false`
- **CORS 可配置化**: 新增 `setCorsOrigin()` API 和 `env.CORS_ORIGIN` 支持
- **AIChatContainer 副作用修复**: `window.__aiChatToggle` 移入 `useEffect`
- **CLI 退出码修正**: `vectorize.ts` 失败时正确 `process.exit(1)`
- **Post frontmatter 对齐**: `post new` 生成 `pubDatetime/modDatetime/category`

## 架构改进进度

| 阶段 | 完成率 |
|------|--------|
| Phase 1 (初始审计) | 19/21 (90%) |
| Phase 2 (深度审计) | 18/25 (72%) |
| **总计** | **37/46 (80%)** |

---
author: Souloss
pubDatetime: 2026-03-24T00:00:00.000Z
title: "astro-minimax v0.9.1: AI 工具调用与动作系统"
featured: false
draft: false
category: Release
tags:
  - release
  - changelog
  - ai
  - tool-calling
  - actions
cover: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&h=630&fit=crop"
description: "astro-minimax v0.9.1：AI 工具调用与客户端动作系统、段落级 RAG/RRF 检索、ChatPanel 与 CodeBlock 体验升级，以及多项构建与类型修复。"
---

astro-minimax v0.9.1 聚焦「AI 能做什么」：通过标准工具调用驱动页面行为，并在主题中落地类型安全的动作执行管线；同时提升检索粒度与聊天、代码块等周边体验。

## 新功能

### AI 工具调用 (Tool Calling)

AI 助手现在可以通过工具调用直接控制页面行为。内置 7 个工具：

- **`toggleTheme`**：切换主题（亮色 / 暗色 / 系统）
- **`navigateToArticle`**：跳转到指定文章
- **`scrollToSection`**：滚动到指定章节
- **`toggleReadingMode`**：切换阅读模式
- **`highlightText`**：高亮文章中的文本
- **`setPreference`**：设置用户偏好
- **`searchArticles`**：搜索博客文章（服务端执行）

### 客户端动作执行器

`packages/core/src/actions/` 提供完整的动作执行系统：

- **类型安全的动作定义**：涵盖 6 种动作类型
- **ActionQueue**：跨页面动作队列
- **URL 参数持久化**：通过 `ai_actions` 查询参数传递与恢复
- **CSS 动画效果**：章节高亮脉冲、主题切换过渡等

### 段落级 RAG 与 RRF 混合检索

检索精度从文章级提升到**段落级**，并结合 RRF 混合检索，更利于引用与回答细粒度问题。

### ChatPanel 增强

- **面板尺寸预设**：S / M / L，支持 localStorage 持久化
- **APICallError**：错误处理与展示优化
- **工具调用驱动动作**：AI SDK Tool Calling 直接触发客户端 ActionExecutor 执行页面操作

### CodeBlock 增强

- **Mermaid 图表工具栏**：缩放、重置、全屏、查看源码等交互
- **独立复制按钮**：含剪贴板不可用时的降级方案
- **骨架屏加载**：改善异步渲染感知
- **唯一 Mermaid ID**：避免多图同页时的渲染冲突

## 修复

- **SSR 构建 `useRef` 为 null**：相关组件由 `client:idle` 调整为 `client:only="preact"`
- **`ToolSet` 类型不匹配**：改为正确使用 AI SDK 导出的类型
- **`PromiseLike.catch()` 不存在**：改为 `try/catch` 处理异步错误
- **chat-handler 导入路径**：从 barrel 改为具体模块路径，避免循环依赖与打包歧义

## 技术细节

- **AI SDK v6**：`streamText` 支持 `tools`、`toolChoice: 'auto'`，并以 `stepCountIs(5)` 限制多步工具调用深度
- **自动回传工具结果**：`sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls`
- **系统提示词**：新增工具使用说明（中英双语）
- **Vite**：对 `@ai-sdk/react` 与 `ai` 做 `dedupe`，缓解 Preact hooks 与多实例问题

## 升级指南

此版本**向后兼容**，直接更新依赖即可：

```bash
pnpm update @astro-minimax/core @astro-minimax/ai
```

## 致谢

感谢所有贡献者与反馈问题的用户！

---
author: Souloss
pubDatetime: 2026-03-29T12:00:00.000Z
title: "astro-minimax v0.9.3: 运行时对齐、可访问性增强与数据刷新"
featured: false
draft: false
category: Release
tags:
  - release
  - changelog
  - accessibility
  - testing
  - docs
cover: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&h=630&fit=crop"
description: "astro-minimax v0.9.3：围绕运行时对齐、AI 生成资产刷新、浏览器冒烟测试重写、聊天与设置面板可访问性增强，以及文档与版本信息同步的一次综合整理发布。"
---

astro-minimax v0.9.3 并不只是简单地把版本号改成 `0.9.3`。结合最近一串提交来看，这个版本真正完成的是一轮**运行时对齐**、**AI 生成资产刷新**、**浏览器冒烟测试重写**与**可访问性细化**，而版本号同步与发布文档补全只是这轮工作的最后收口。

## 运行时与数据对齐

### 示例博客运行时对齐

示例博客在这轮提交中继续向 workspace 统一运行时约定收敛：应用配置被重新整理，部分包接线被清理，锁文件也随新的包 wiring 一并刷新，使 blog app、CLI template 与 workspace 包在运行时契约上更一致。

### AI 知识与画像资产刷新

这次还集中刷新了一批 AI 运行时依赖的生成产物，包括：

- `author-context.json`
- `author-profile-context.json`
- `author-profile-report.json`
- `blog-digest.json`
- `voice-profile.json`
- `apps/blog/public/astro-minimax-og.jpg`

这些更新让 AI 侧的运行时输入、作者画像和公开生成资源重新与当前内容状态对齐。

### CLI 处理链与模板运行时文档

围绕构建与脚手架，这一版还做了两件很实际的事：

- `packages/cli/src/tools/ai-process.ts` 的缓存与 skip 行为被重新整理，批处理 AI 内容时更稳定、更可预测。
- CLI 模板补上了 `datas/knowledge/runtime/knowledge-bundle.json`，并同步更新 `functions/README.md`，让新项目从一开始就带有当前约定的 runtime knowledge bundle 说明。

## 可访问性与界面细化

### AI 聊天可访问性增强

最近几次提交专门补强了 AI 聊天相关组件的可访问性语义：

- `ChatInput.tsx` 增加了更完整的 `aria-label` 与输入语义
- `ChatPanel.tsx` 补强了角色、状态和交互可达性
- 对键盘与读屏器用户来说，输入与消息面板的可用性更好

### 设置面板与阅读主题打磨

`SettingsPanel.astro` 在这一版里做了较大幅度的语义补强，特别是 dialog、tab、switch 等交互元素的 ARIA 标注；与此同时，`theme.css` 中的阅读主题样式也做了细化，卡片、文章元信息与文章列表等周边 UI 组件也顺手做了配套整理。

## 测试与文档

### 浏览器冒烟测试重写

`tests/e2e-test.py` 被重写为覆盖面更广的 Playwright 冒烟测试脚本。它不再只验证首页是否能打开，而是继续检查文章页、分类与标签等 taxonomy 页面、搜索、主题切换、AI 聊天组件以及相关 API 健康状态，让 demo app 的整体回归测试更接近真实使用路径。

### AI 指南与发布文档同步

生成版英文 AI 指南也在这轮提交里做了更新，用来对齐当前的 AI 功能、工具调用流程和运行时术语。与此同时，根 README 的版本表被同步到 `0.9.3`，CLI 模板依赖也切到了同一版本线，这份中英文发布说明则作为这轮改动的公开汇总入口。

## 升级说明

这更像是一次**对齐与质量增强**发布，而不是引入破坏性能力的新版本。如果你已经在使用 `0.9.x`，这次最值得跟进的是新的模板/runtime 约定、更新后的 AI 生成资产流程，以及更完整的浏览器端回归测试覆盖。

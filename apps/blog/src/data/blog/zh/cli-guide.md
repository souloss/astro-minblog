---
title: "CLI 工具使用指南"
pubDatetime: 2026-03-17T00:00:00.000Z
author: Souloss
description: "astro-minimax CLI 工具完整使用指南：创建博客、管理文章、AI 内容处理、作者画像构建和数据管理。"
tags:
  - docs
  - cli
  - tools
category: 教程/工具
featured: false
draft: false
---

`@astro-minimax/cli` 提供一套完整的命令行工具，用于博客项目管理和 AI 内容处理。本文介绍所有可用命令及其用法。

## 安装

CLI 工具作为开发依赖自动安装：

```bash
pnpm add -D @astro-minimax/cli
```

安装后可通过 `astro-minimax` 命令使用，也可以通过 `pnpm run` 快捷脚本调用。

## 创建新博客

```bash
npx @astro-minimax/cli init my-blog
```

生成包含完整配置、示例文章和 AI 工具链的博客项目。

## 文章管理

### 创建文章

```bash
pnpm run post:new -- "文章标题"
pnpm run post:new -- "English Title" --lang=en
pnpm run post:new -- "教程" --category="教程/前端"
```

自动创建带 frontmatter 的 Markdown 文件，放在对应语言目录下。

### 列出文章

```bash
pnpm run post:list
```

按日期降序显示所有文章（包含子目录），区分已发布和草稿。

### 文章统计

```bash
pnpm run post:stats
```

显示中文/英文文章数量统计。

## AI 内容处理

需要配置环境变量：

```bash
# .env
AI_API_KEY=your-api-key
AI_BASE_URL=https://api.openai.com  # 可选
AI_MODEL=gpt-4o-mini                 # 可选
```

### 处理文章

```bash
pnpm run ai:process                          # 处理所有文章（摘要+SEO）
pnpm run ai:process -- --force               # 强制重新处理
pnpm run ai:process -- --slug=zh/my-post     # 处理指定文章
pnpm run ai:process -- --lang=zh             # 只处理中文文章
pnpm run ai:process -- --recent=5            # 处理最近 5 篇
pnpm run ai:process -- --dry-run             # 预览模式
```

### 生成摘要

```bash
pnpm run ai:summary
```

### 生成 SEO 元数据

```bash
pnpm run ai:seo
```

### AI 质量评估

```bash
pnpm run ai:eval                                    # 评估本地服务
pnpm run ai:eval -- --url=https://your-blog.com     # 评估生产环境
pnpm run ai:eval -- --category=no_answer             # 评估特定分类
pnpm run ai:eval -- --verbose                        # 详细输出
```

评估基于 `datas/eval/gold-set.json` 黄金测试集，自动检查：
- 回答非空
- 主题覆盖率
- 禁止声明未出现
- Markdown 链接存在性
- 回答模式匹配

评估报告保存到 `datas/eval/report.json`。

## 作者画像

### 完整构建

```bash
pnpm run ai:profile:build
```

依次执行：上下文构建 → 风格分析 → 画像报告生成。

### 标准构建入口

```bash
pnpm run ai:profile:build   # 执行保留的作者画像构建流程
```

生成的数据文件用于 AI 聊天功能，帮助 AI 以作者风格回答问题。

## 数据管理

### 查看状态

```bash
pnpm run data:status
```

显示所有数据文件的状态、处理数量和最后更新时间。

### 清理缓存

```bash
pnpm run data:clear
```

清除 AI 生成的摘要、SEO 数据、作者画像等缓存文件。不会删除评估报告。

## 命令速查表

| 快捷脚本 | 等效命令 |
|----------|----------|
| `pnpm run post:new -- "标题"` | `astro-minimax post new "标题"` |
| `pnpm run post:list` | `astro-minimax post list` |
| `pnpm run post:stats` | `astro-minimax post stats` |
| `pnpm run ai:process` | `astro-minimax ai process` |
| `pnpm run ai:eval` | `astro-minimax ai eval` |
| `pnpm run ai:profile:build` | `astro-minimax ai profile build` |
| `pnpm run data:status` | `astro-minimax data status` |
| `pnpm run data:clear` | `astro-minimax data clear` |

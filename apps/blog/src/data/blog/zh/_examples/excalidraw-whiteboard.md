---
title: "Excalidraw 白板：在博客中嵌入手绘风格图表"
pubDatetime: 2026-03-12T00:00:00.000Z
author: Souloss
description: "学习如何在博客文章中集成 Excalidraw 手绘风格白板，包括嵌入方式、场景 URL 及最佳实践。"
tags:
  - tutorial
  - examples
  - excalidraw
category: Examples
draft: false
---

Excalidraw 是一个虚拟白板工具，可以生成手绘风格的图表。它非常适合技术插图、架构图和可视化解释，给人一种亲切自然的感觉。

---

## 目录

- [什么是 Excalidraw？](#什么是-excalidraw)
- [集成方式](#集成方式)
- [使用 ExcalidrawEmbed 组件（MDX）](#使用-excalidrawembed-组件mdx)
- [通过 iframe 嵌入（Markdown）](#通过-iframe-嵌入markdown)
- [创建可分享的场景](#创建可分享的场景)
- [示例场景](#示例场景)
- [技巧与最佳实践](#技巧与最佳实践)

---

## 什么是 Excalidraw？

[Excalidraw](https://excalidraw.com) 是一个开源虚拟白板，具有以下核心特性：

- **手绘风格** — 图表看起来像手画的草图，给人轻松自然的感觉
- **实时协作** — 多人可以同时在一个画布上绘制
- **导出选项** — 支持 PNG、SVG 或可分享的 URL
- **丰富的元素库** — 形状、箭头、文本以及社区贡献的素材库
- **深色模式** — 自动适配你的主题偏好
- **端到端加密** — 分享的场景默认是私密的

它被广泛用于技术博客、文档和架构设计中。

---

## 集成方式

在本博客中有两种方式嵌入 Excalidraw：

### 方式一：ExcalidrawEmbed 组件（MDX 文件）

如果你的文章是 `.mdx` 格式，可以使用自定义的 `<ExcalidrawEmbed>` 组件：

```astro
---
import ExcalidrawEmbed from '@/components/media/ExcalidrawEmbed.astro';
---

<ExcalidrawEmbed
  url="https://excalidraw.com/#json=..."
  title="架构图"
  height="500px"
/>
```

此组件会自动处理响应式尺寸、深色模式和加载状态。

### 方式二：iframe 嵌入（Markdown 文件）

对于标准 `.md` 文件，直接使用 HTML iframe：

```html
<iframe
  src="https://excalidraw.com/#json=YOUR_SCENE_DATA"
  width="100%"
  height="500"
  style="border: none; border-radius: 8px;"
  title="Excalidraw 图表"
></iframe>
```

---

## 使用 ExcalidrawEmbed 组件（MDX）

`ExcalidrawEmbed` 组件提供最丰富的集成体验。完整 API 如下：

```astro
<ExcalidrawEmbed
  url="https://excalidraw.com/#json=..."
  title="我的图表"
  height="500px"
  darkMode={true}
/>
```

### 组件属性

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `url` | `string` | 必填 | Excalidraw 场景 URL |
| `title` | `string` | `"Excalidraw"` | iframe 的无障碍标题 |
| `height` | `string` | `"400px"` | 嵌入容器的高度 |
| `darkMode` | `boolean` | `auto` | 强制明/暗模式 |

### 如何获取场景 URL

1. 访问 [excalidraw.com](https://excalidraw.com)
2. 创建你的图表
3. 点击 **分享** 按钮（或使用 <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>E</kbd>）
4. 选择 **可分享链接**
5. 复制 URL — 完整的场景数据编码在 URL 的哈希片段中

URL 格式如下：

```
https://excalidraw.com/#json=eyJlbGVtZW50cyI6W...
```

---

## 通过 iframe 嵌入（Markdown）

由于本文是 `.md` 文件，以下是直接使用 HTML 嵌入 Excalidraw 的方法：

<div style="border: 2px dashed #666; border-radius: 12px; padding: 2rem; text-align: center; margin: 1.5rem 0; background: #f9fafb;">
  <p style="font-size: 1.1rem; margin-bottom: 0.5rem;"><strong>Excalidraw 嵌入占位符</strong></p>
  <p style="color: #666;">如需在此处查看实时 Excalidraw 白板，请在 <a href="https://excalidraw.com" target="_blank">excalidraw.com</a> 创建场景，然后使用可分享链接替换此内容为 iframe。</p>
</div>

嵌入代码模板：

```html
<iframe
  src="https://excalidraw.com/"
  width="100%"
  height="500"
  style="border: 1px solid #e5e7eb; border-radius: 8px;"
  title="Excalidraw 白板"
  loading="lazy"
></iframe>
```

> [!TIP]
> 添加 `loading="lazy"` 可以延迟 iframe 的加载，直到它进入可视区域。这可以改善页面加载性能，特别是当页面中有多个嵌入时。

---

## 创建可分享的场景

### 分步指南

1. **打开 Excalidraw** — 访问 [excalidraw.com](https://excalidraw.com)
2. **绘制图表** — 使用工具栏添加形状、箭头、文字
3. **导出为链接** — 点击分享图标，选择"可分享链接"
4. **复制 URL** — 场景数据编码在 URL 哈希中
5. **粘贴到文章中** — 使用组件方式或 iframe 方式

### 场景数据格式

Excalidraw 将场景数据编码为 JSON 格式放在 URL 哈希中。一个最小场景如下：

```json
{
  "type": "excalidraw",
  "version": 2,
  "elements": [
    {
      "type": "rectangle",
      "x": 100,
      "y": 100,
      "width": 200,
      "height": 100,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "#a5d8ff",
      "fillStyle": "hachure",
      "roughness": 1
    },
    {
      "type": "text",
      "x": 140,
      "y": 135,
      "text": "你好！",
      "fontSize": 24,
      "fontFamily": 1
    }
  ],
  "appState": {
    "viewBackgroundColor": "#ffffff"
  }
}
```

此 JSON 会经过 Base64 编码后作为哈希片段附加到 URL 中。

---

## 示例场景

### 场景 1：简单架构图

一个典型的 Web 应用架构，包含客户端、服务器和数据库层：

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   浏览器     │────▶│   服务器     │────▶│   数据库     │
│  (React/Vue) │◀────│  (Node.js)  │◀────│ (PostgreSQL)│
└─────────────┘     └─────────────┘     └─────────────┘
       │                    │
       ▼                    ▼
┌─────────────┐     ┌─────────────┐
│    CDN      │     │    缓存     │
│ (Cloudflare)│     │   (Redis)   │
└─────────────┘     └─────────────┘
```

> 在 Excalidraw 中，这些会用手绘风格的矩形和箭头绘制，呈现出友好的白板效果。

### 场景 2：数据流图

```
用户输入 ──▶ 数据校验 ──▶ 业务处理 ──▶ 数据存储
   │            │            │           │
   ▼            ▼            ▼           ▼
 UI 表单     Schema 检查   数据转换     数据库
                │            │
                ▼            ▼
           错误提示      事件队列 ──▶ 消息通知
```

### 场景 3：组件层级

```
            App
          /  |  \
     Header Main Footer
       |     |      |
     Nav   Content  Links
    / | \    |
  Logo 菜单 搜索
           / | \
      文章 标签 分类
```

这些 ASCII 图示展示了你在 Excalidraw 中可以创建的图表类型。手绘风格使它们非常适合在博客中解释概念，而不像正式的 UML 图那样生硬。

---

## 技巧与最佳实践

### 设计技巧

- **保持简洁** — Excalidraw 的魅力在于简洁。不要让画布过于拥挤。
- **克制用色** — 使用 2-3 种颜色保持清晰。用填充色突出关键元素。
- **添加标签** — 每个形状和箭头都应有清晰的标签说明。
- **保持对齐** — 利用 Excalidraw 的网格吸附功能保持一致的间距。

### 性能技巧

- **使用懒加载** — 为 iframe 添加 `loading="lazy"` 提升页面性能
- **设置明确尺寸** — 始终指定宽高以防止布局偏移
- **考虑截图替代** — 对于静态图表，导出的 PNG 可能比 iframe 加载更快

### 无障碍技巧

- **添加标题** — iframe 的 `title` 属性会被屏幕阅读器读取
- **提供替代文本** — 如果使用导出图片，请包含描述性的 alt 文本
- **文字说明** — 在复杂图表下方添加简要的文字描述，提升无障碍体验

> [!NOTE]
> 通过 URL 分享的 Excalidraw 场景是端到端加密的。只有拥有准确链接的人才能查看内容。服务器永远看不到未加密的场景数据。

---

## 延伸阅读

- [Excalidraw 官方网站](https://excalidraw.com)
- [Excalidraw GitHub 仓库](https://github.com/excalidraw/excalidraw)
- [Excalidraw 素材库](https://libraries.excalidraw.com) — 社区创建的元素库
- [Mermaid 图表](/zh/blog/_examples/mermaid-diagrams) — 适用于正式的流程图和时序图
- [Markmap 思维导图](/zh/blog/_examples/markmap-mindmaps) — 适用于层级概念可视化

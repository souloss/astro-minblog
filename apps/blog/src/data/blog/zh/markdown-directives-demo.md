---
title: "Markdown 内容指令示例"
pubDatetime: 2026-05-06T00:00:00.000Z
author: Souloss
description: "展示在普通 .md 文件中直接使用所有内容指令的效果。每个指令都用演示效果和示例代码两个选项卡对照呈现，方便复制使用。"
tags:
  - docs
  - tutorial
category: 教程/博客
featured: true
draft: false
---

在普通 `.md` 文章里直接使用 `:::` 和 `:` 语法，无需 import，无需 MDX。下面每个指令都分成了**演示效果**与**示例代码**两个选项卡，方便你边预览边复制。

---

## 块级组件

### Callout 提示块

::::tabs
tab: 演示效果

:::callout{type="info"}
这是一条**信息提示**，适合补充说明背景知识。
:::

:::callout{type="tip" title="小技巧"}
通过 `title` 属性自定义标题。
:::

:::callout{type="warn"}
这是一条**注意事项**，提醒读者小心的地方。
:::

:::callout{type="danger" title="危险操作"}
执行此操作前请务必备份数据。
:::

tab: 示例代码

````
:::callout{type="info"}
这是一条**信息提示**，适合补充说明背景知识。
:::

:::callout{type="tip" title="小技巧"}
通过 `title` 属性自定义标题。
:::

:::callout{type="warn"}
这是一条**注意事项**，提醒读者小心的地方。
:::

:::callout{type="danger" title="危险操作"}
执行此操作前请务必备份数据。
:::
````

- `type` 可选值：`info` | `tip` | `warn` | `danger`
- `title` 可自定义标题，不传则使用默认值

::::

---

### Note 主题色提示

::::tabs
tab: 演示效果

:::note
使用博客**主题色**的轻量提示块。支持 `color` 属性。
:::

:::note{title="关于本站" color="blue"}
- `blue`：科技蓝
- `green`：自然绿
- `red`：警示红
- `yellow`：活力黄
- `purple`：优雅紫
:::

tab: 示例代码

````
:::note
使用博客**主题色**的轻量提示块。支持 `color` 属性。
:::

:::note{title="关于本站" color="blue"}
- `blue`：科技蓝
- `green`：自然绿
- `red`：警示红
- `yellow`：活力黄
- `purple`：优雅紫
:::
````

- `color` 可选值：`blue`、`green`、`red`、`yellow`、`purple` 或任意十六进制色值
- `title` 可设置标题

::::

---

### Folding 折叠块

::::tabs
tab: 演示效果

:::folding{title="查看完整配置"}
```js
// astro.config.mjs
import remarkDirective from 'remark-directive';
import { remarkContentDirectives } from '@astro-minimax/core/plugins';

export default defineConfig({
  markdown: {
    remarkPlugins: [remarkDirective, remarkContentDirectives]
  }
});
```
:::

:::folding{title="默认展开的折叠块" open="true"}
通过 `open="true"` 让折叠块默认展开。支持 `color` 属性自定义颜色。
:::

tab: 示例代码

`````
:::folding{title="查看完整配置"}
```js
import remarkDirective from 'remark-directive';
import { remarkContentDirectives } from '@astro-minimax/core/plugins';

export default defineConfig({
  markdown: {
    remarkPlugins: [remarkDirective, remarkContentDirectives]
  }
});
```
:::

:::folding{title="默认展开的折叠块" open="true"}
通过 `open="true"` 让折叠块默认展开。支持 `color` 属性自定义颜色。
:::
`````

- `title` 折叠按钮上的文字
- `open="true"` 默认展开
- `color` 自定义颜色

::::

---

### Folders 多级折叠

::::tabs
tab: 演示效果

:::folders
folder: 第一章：基础概念

Astro 是一个**内容优先**的静态站点生成器。核心特点：

1. 零 JS 默认输出
2. 群岛架构
3. 支持 React / Vue / Svelte

folder: 第二章：组件系统

Astro 组件使用 `.astro` 后缀，语法类似 HTML + JS：

```astro
---
const name = 'Astro';
---
<h1>Hello {name}</h1>
```

folder: 第三章：内容集合

使用 [Content Collections](https://docs.astro.build/zh-cn/guides/content-collections/) 管理类型安全的内容。
:::

tab: 示例代码

`````
:::folders
folder: 第一章：基础概念

Astro 是一个**内容优先**的静态站点生成器。核心特点：

1. 零 JS 默认输出
2. 群岛架构
3. 支持 React / Vue / Svelte

folder: 第二章：组件系统

Astro 组件使用 `.astro` 后缀，语法类似 HTML + JS：

```astro
---
const name = 'Astro';
---
<h1>Hello {name}</h1>
```

folder: 第三章：内容集合

使用 [Content Collections](https://docs.astro.build/zh-cn/guides/content-collections/) 管理类型安全的内容。
:::
`````

- 每个 `folder: 标题` 开启一个新的折叠项
- 支持在内容中嵌套代码块、列表、链接等 Markdown 内容

::::

---

### Timeline 时间线

::::tabs
tab: 演示效果

:::timeline
- 2024-01 | 开始学习 Astro | 从官方文档入手，了解基本概念
- 2024-03 | 搭建个人博客 | 基于 astro-minimax 主题开始定制
- 2024-06 | 上线运营 | 正式部署到 Cloudflare Pages
- 2025-04 | 持续迭代 | 添加分类、专栏、内容指令等功能
:::

tab: 示例代码

````
:::timeline
- 2024-01 | 开始学习 Astro | 从官方文档入手，了解基本概念
- 2024-03 | 搭建个人博客 | 基于 astro-minimax 主题开始定制
- 2024-06 | 上线运营 | 正式部署到 Cloudflare Pages
- 2025-04 | 持续迭代 | 添加分类、专栏、内容指令等功能
:::
````

- 每条时间线以 `-` 开头，用 `|` 分隔**日期**、**标题**、**描述**
- 描述为可选

::::

---

### Tabs 选项卡

#### 演示效果

:::tabs
tab: 标签 A

这是**标签 A** 的内容。

tab: 标签 B{color=blue}

这是带 `color` 属性的**标签 B**。
:::

#### 示例代码

````
:::tabs
tab: 标签 A

这是**标签 A** 的内容。

tab: 标签 B{color=blue}

这是带 `color` 属性的**标签 B**。
:::
````

- `tab: 标签名` 后需要空一行，再写内容
- `tab: 标签名{color=blue}` 可给标签设置颜色

---

### Poetry 诗歌/引用

::::tabs
tab: 演示效果

:::poetry{title="游山西村" author="陆游" footer="诗词节选" date="（宋）"}
莫笑农家腊酒浑，丰年留客足鸡豚。

**山重水复疑无路，柳暗花明又一村**

箫鼓追随春社近，衣冠简朴古风存。

从今若许闲乘月，拄杖无时夜叩门。
:::

tab: 示例代码

````
:::poetry{title="游山西村" author="陆游" footer="诗词节选" date="（宋）"}
莫笑农家腊酒浑，丰年留客足鸡豚。

**山重水复疑无路，柳暗花明又一村**

箫鼓追随春社近，衣冠简朴古风存。

从今若许闲乘月，拄杖无时夜叩门。
:::
````

- `title` 诗歌标题
- `author` 作者
- `date` 日期/朝代
- `footer` 底部文字

::::

---

### Reel 卷轴

::::tabs
tab: 演示效果

:::reel{title="卷轴示例" author="作者" date="2026-04-20" footer="卷轴底部"}
这是卷轴的内容，文字会从右向左竖排显示。

支持多段落内容。
:::

tab: 示例代码

`````markdown
:::reel{title="卷轴示例" author="作者" date="2026-04-20" footer="卷轴底部"}
这是卷轴的内容，文字会从右向左竖排显示。

支持多段落内容。
:::
`````

- `title`：卷轴标题
- `author`：作者信息
- `date`：日期
- `footer`：底部文字

::::

---

### Paper 纸张

::::tabs
tab: 演示效果

:::paper{title="文言文" author="诸葛亮" date="三国" footer="节选"}
出师表

<!-- paragraph -->
先帝创业未半而中道崩殂，今天下三分，益州疲弊，此诚危急存亡之秋也。

<!-- section 后出师表 -->
先帝深虑汉、贼不两立，王业不偏安，故托臣以讨贼也。

<!-- line right -->
臣鞠躬尽瘁，死而后已。
:::

tab: 示例代码

`````markdown
:::paper{title="文言文" author="诸葛亮" date="三国" footer="节选"}
出师表

<!-- paragraph -->
先帝创业未半而中道崩殂，今天下三分，益州疲弊，此诚危急存亡之秋也。

<!-- section 后出师表 -->
先帝深虑汉、贼不两立，王业不偏安，故托臣以讨贼也。

<!-- line right -->
臣鞠躬尽瘁，死而后已。
:::
`````

- `title`：纸张标题（居中）
- `author` / `date` / `footer`：作者、日期、底部文字
- 内容分区：
  - `<!-- paragraph -->`：普通段落（首行缩进）
  - `<!-- section 标题 -->`：带居中标题的章节
  - `<!-- line right -->`：右对齐行

::::

---

### Copy 一键复制

::::tabs
tab: 演示效果

:::copy{label="安装"}
pnpm add remark-directive unist-util-visit
:::

:::copy{label="SSH"}
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA example@example.com
:::

tab: 示例代码

````
:::copy{label="安装"}
pnpm add remark-directive unist-util-visit
:::

:::copy{label="SSH"}
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA example@example.com
:::
````

- `label` 左侧标签文字
- 内容区域会被处理为一行纯文本，点击右侧按钮即可复制

::::

---

### Grid 网格布局

::::tabs
tab: 演示效果

:::grid{cols="3" gap="12"}
**快速开始**

```bash
npm create astro@latest
```

---

**核心概念**

- [群岛架构](https://docs.astro.build/)
- [内容集合](https://docs.astro.build/)
- [视图过渡](https://docs.astro.build/)

---

**部署指南**

1. 构建项目：`npm run build`
2. 选择平台：Vercel / Netlify / Cloudflare Pages
3. 一键部署
:::

tab: 示例代码

`````
:::grid{cols="3" gap="12"}
**快速开始**

```bash
npm create astro@latest
```

---

**核心概念**

- [群岛架构](https://docs.astro.build/)
- [内容集合](https://docs.astro.build/)
- [视图过渡](https://docs.astro.build/)

---

**部署指南**

1. 构建项目：`npm run build`
2. 选择平台：Vercel / Netlify / Cloudflare Pages
3. 一键部署
:::
`````

- `cols` 列数，可选 `2` | `3` | `4`，不传则按最小宽度自动换行
- `gap` 格子间距，单位 px
- `minw` 自动列数时的最小列宽，默认 `240px`
- `bg` 格子背景样式：`card`（默认） | `box` | `none`
- 用 `---` 分隔每个格子

::::

---

### Quot 引言

::::tabs
tab: 演示效果

:::quot{icon="x"}
代码是写给人看的，顺便让机器执行。
:::

tab: 示例代码

````
:::quot{icon="x"}
代码是写给人看的，顺便让机器执行。
:::
````

- `icon` 可自定义图标，不传则使用默认引号图标

::::

---

### Blockquote 段落引用

::::tabs
tab: 演示效果

:::blockquote
这是使用 blockquote 标签的例子。

支持多段落内容，适合引用长段文字。
:::

tab: 示例代码

````
:::blockquote
这是使用 blockquote 标签的例子。

支持多段落内容，适合引用长段文字。
:::
````

- 使用 `<blockquote>` 标签包裹内容
- 顶部左右角自动显示引号图标

::::

---

### Panel 代码面板

将多个相关代码块或文字段落放入同一个面板中并列展示。每段有独立的左侧标签和右侧说明，支持每段单独复制。

#### 场景 1：多语言代码对比

::::tabs
tab: 演示效果

:::panel
```js title="JavaScript" right="ES2024"
const user = await fetch('/api/user').then(r => r.json())
console.log(user.name)
```

```ts title="TypeScript" right="v5.7"
interface User { name: string }
const user = await fetch<User>('/api/user').then(r => r.json())
console.log(user.name)
```

```py title="Python" right="3.13"
import requests
user = requests.get('/api/user').json()
print(user['name'])
```
:::

tab: 示例代码

`````markdown
:::panel
```js title="JavaScript" right="ES2024"
const user = await fetch('/api/user').then(r => r.json())
```

```ts title="TypeScript" right="v5.7"
const user = await fetch<User>('/api/user').then(r => r.json())
```
:::
`````

- `title` -> 左侧标签（场景/功能描述）
- `right` -> 右侧说明（语言、版本、文件名等任意文本）

::::

---

#### 场景 2：前后端配对

::::tabs
tab: 演示效果

:::panel
```js title="前端调用" right="React"
api.getUser(id).then(user => {
  setUser(user)
})
```

```go title="后端实现" right="Go 1.23"
func GetUser(w http.ResponseWriter, r *http.Request) {
  id := r.URL.Query().Get("id")
  user := db.FindUser(id)
  json.NewEncoder(w).Encode(user)
}
```
:::

tab: 示例代码

`````markdown
:::panel
```js title="前端调用" right="React"
fetch('/api/user').then(r => r.json())
```

```go title="后端实现" right="Go 1.23"
func GetUser(w http.ResponseWriter, r *http.Request) { ... }
```
:::
`````

::::

---

#### 场景 3：请求与响应

::::tabs
tab: 演示效果

:::panel
```http title="请求" right="HTTP/1.1"
GET /api/posts?page=1&limit=10
Authorization: Bearer eyJhbG...
```

```json title="响应" right="JSON"
{
  "data": [...],
  "total": 42,
  "page": 1,
  "limit": 10
}
```
:::

tab: 示例代码

`````markdown
:::panel
```http title="请求" right="HTTP/1.1"
GET /api/posts?page=1&limit=10
```

```json title="响应" right="JSON"
{ "data": [...], "total": 42 }
```
:::
`````

::::

---

#### 场景 4：配置文件多环境对比

::::tabs
tab: 演示效果

:::panel
```yaml title="开发环境" right="dev.yaml"
database: localhost:5432
debug: true
log_level: debug
```

```yaml title="生产环境" right="prod.yaml"
database: prod.db.internal:5432
debug: false
log_level: warn
```
:::

tab: 示例代码

`````markdown
:::panel
```yaml title="开发环境" right="dev.yaml"
database: localhost:5432
```

```yaml title="生产环境" right="prod.yaml"
database: prod.db.internal:5432
```
:::
`````

::::

---

#### 场景 5：普通文字内容分段

::::tabs
tab: 演示效果

:::panel

<!-- label: 快速上手 | 1 分钟 -->
创建项目只需一行命令：

```bash
npx create-my-app
```

<!-- label: 详细步骤 | 5 分钟 -->
1. 确保 Node.js >= 18
2. 运行 `npx create-my-app`
3. 按提示选择模板
4. 进入目录运行 `npm run dev`

<!-- label: 进阶配置 | 可选 -->
如需自定义配置，可在项目根目录创建 `my-app.config.js`：

```js
export default {
  theme: 'default',
  plugins: ['@my-app/i18n']
}
```

:::

tab: 示例代码

`````markdown
:::panel

<!-- label: 快速上手 | 1 分钟 -->
创建项目只需一行命令：

```bash
npx create-my-app
```

<!-- label: 详细步骤 | 5 分钟 -->
1. 确保 Node.js >= 18
2. 运行 `npx create-my-app`

:::
`````

- `<!-- label: 左边 | 右边 -->` 用 `|` 分隔左右标签
- 若不需要右边标签，可省略 `|` 及之后内容

::::

---

#### 场景 6：多视角叙事

::::tabs
tab: 演示效果

:::panel

<!-- label: 用户视角 | 痛点 -->
界面突然卡住，刷新后数据全没了，心情很崩溃。

<!-- label: 开发者视角 | 根因 -->
前端在 `onMount` 时未做 Loading 态处理，接口 5s 超时导致用户以为页面死了，重复刷新引发竞态条件。

<!-- label: 产品经理视角 | 方案 -->
需要加 Loading 骨架屏 + 请求防抖 + 断网重试机制。

:::

tab: 示例代码

`````markdown
:::panel

<!-- label: 用户视角 | 痛点 -->
界面突然卡住，刷新后数据全没了。

<!-- label: 开发者视角 | 根因 -->
前端在 `onMount` 时未做 Loading 态处理。

:::
`````

::::

---

#### 场景 7：正反观点对比

::::tabs
tab: 演示效果

:::panel

<!-- label: 支持 TypeScript | 优势 -->
TypeScript 的严格类型让大型项目维护成本大幅降低，重构时信心十足，IDE 提示也能减少低级错误。

<!-- label: 反对 TypeScript | 劣势 -->
小项目引入 TS 的 overhead 过高，类型体操反而增加了心智负担，配置复杂，不如直接用 JSDoc + 类型检查。

:::

tab: 示例代码

`````markdown
:::panel

<!-- label: 支持 TypeScript | 优势 -->
TypeScript 的严格类型让大型项目维护成本大幅降低。

<!-- label: 反对 TypeScript | 劣势 -->
小项目引入 TS 的 overhead 过高。

:::
`````

::::

---

#### 场景 8：时间线对比

::::tabs
tab: 演示效果

:::panel

<!-- label: 2023 | Webpack 时代 -->
当时使用 Webpack 5，构建一次要 30 秒，热更新也经常失败，开发体验很差。

<!-- label: 2025 | Vite 时代 -->
迁移到 Vite 后，冷启动 < 1 秒，HMR 几乎无感知，开发效率提升了数倍。

<!-- label: 展望 | Rspack 未来 -->
明年计划尝试 Rspack，在保持 Webpack 兼容的同时进一步提升构建性能。

:::

tab: 示例代码

`````markdown
:::panel

<!-- label: 2023 | Webpack 时代 -->
当时使用 Webpack 5，构建一次要 30 秒。

<!-- label: 2025 | Vite 时代 -->
迁移到 Vite 后，冷启动 < 1 秒。

:::
`````

::::

---

### Private 私密内容

将敏感内容放入加密容器，读者需要输入正确密码才能查看。支持密码提示，支持重新锁定。

#### 场景 1：加密文本内容

::::tabs
tab: 演示效果

:::private{password="hello2024" hint="打招呼 + 年份"}
这是加密的内容，只有知道密码的人才能看到。

- 敏感信息 1
- 敏感信息 2

**注意：** 请勿泄露密码！
:::

tab: 示例代码

`````markdown
:::private{password="hello2024" hint="打招呼 + 年份"}
这是加密的内容，只有知道密码的人才能看到。

- 敏感信息 1
- 敏感信息 2
:::
`````

- `password`（**必填**）：解密密码
- `hint`（可选）：密码提示，帮助读者回忆
- 支持段落、列表、代码块等任意 Markdown 内容
- 解密后显示**重新锁定**按钮，可再次隐藏

::::

---

#### 场景 2：加密代码片段

::::tabs
tab: 演示效果

:::private{password="123456"}
```env
DATABASE_URL=postgresql://user:secret@localhost:5432/db
API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
JWT_SECRET=my-super-secret-key
```
:::

tab: 示例代码

`````markdown
:::private{password="123456"}
```env
DATABASE_URL=postgresql://user:secret@localhost:5432/db
API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
```
:::
`````

::::

---

### Audio 音频播放器

在文章中插入音频，支持本地音频、网易云音乐和语音消息三种模式。

#### 标准播放器（本地音频）

::::tabs
tab: 演示效果

:::audio{src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" title="SoundHelix Song 1" artist="T. Schürger" width="500px"}
:::

tab: 示例代码

`````markdown
:::audio{src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" title="SoundHelix Song 1" artist="T. Schürger" width="500px"}
:::
`````

- `src`（**必填**）：音频文件地址
- `title`：歌曲标题
- `artist`：艺术家
- `cover`：封面图 URL（可选，不填则显示音乐图标）
- `align`：对齐方式，可选 `left`（默认）、`center`、`right`
- `width`：自定义宽度，如 `width="400px"`

**居中对齐示例：**

:::audio{src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" title="SoundHelix Song 1" artist="T. Schürger" align="center"}
:::

**自定义宽度示例：**

:::audio{src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" title="SoundHelix Song 1" artist="T. Schürger" width="500px"}
:::

::::

---

#### 网易云音乐

**迷你模式（默认）：**

::::tabs
tab: 演示效果

:::audio{netease="1450008309" title="晴天" artist="周杰伦" width="300px"}
:::

tab: 示例代码

`````markdown
:::audio{netease="1450008309" title="晴天" artist="周杰伦" width="300px"}
:::
`````

::::

**卡片模式（带封面）：**

::::tabs
tab: 演示效果

:::audio{netease="1450008309" title="晴天" artist="周杰伦" mode="card"}
:::

tab: 示例代码

`````markdown
:::audio{netease="1450008309" title="晴天" artist="周杰伦" mode="card"}
:::
`````

- `netease`（**必填**）：网易云音乐歌曲 ID，从网易云音乐网页版分享链接中获取
- `mode`：播放器样式，可选 `mini`（默认，窄条模式）或 `card`（带封面大卡片）
- `align`：对齐方式，可选 `left`（默认）、`center`、`right`
- `width`：自定义宽度，如 `width="400px"`

::::

---

#### 语音消息

::::tabs
tab: 演示效果

:::audio{voice="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" duration="15" width="200px"}
:::

tab: 示例代码

`````markdown
:::audio{voice="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" duration="15" width="200px"}
:::
`````

- `voice`（**必填**）：语音文件地址
- `duration`：语音时长（秒），用于显示波形长度
- `align`：对齐方式，可选 `left`（默认）、`center`、`right`
- `width`：自定义宽度，如 `width="400px"`

::::

---

### Video 视频播放器

在文章中插入视频，支持本地视频、Bilibili 和 YouTube 三种模式。本地视频支持画中画（PiP）浮动播放器。

#### 本地视频（带封面）

::::tabs
tab: 演示效果

:::video{src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" poster="https://images.unsplash.com/photo-1490750967868-88aa4f44dbb3?w=800&q=80" ratio="16/9"}
:::

tab: 示例代码

`````markdown
:::video{src="https://example.com/video.mp4" poster="https://example.com/poster.jpg" ratio="16/9"}
:::
`````

- `src`（**必填**）：视频文件地址
- `poster`：封面图，显示自定义播放按钮覆盖层，点击后播放
- `ratio`：宽高比，默认 `16/9`，可选 `4/3`、`1/1`
- `width`：最大宽度，如 `width="600px"`
- `align`：对齐方式，可选 `left`（默认）、`center`、`right`
- `autoplay`：`true` 自动播放（静音）
- `pip`：画中画模式，可选 `auto`（默认，滚动离开自动触发）、`manual`（手动触发）、`off`（关闭）

::::

---

#### 本地视频（原生 controls）

不指定 `poster` 时，直接使用原生 `<video controls>` 播放器。

::::tabs
tab: 演示效果

:::video{src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" ratio="16/9"}
:::

tab: 示例代码

`````markdown
:::video{src="https://example.com/video.mp4" ratio="16/9"}
:::
`````

- 不指定 `poster` 时，使用原生浏览器播放器控件
- 其他参数与带封面模式相同

::::

---

#### 本地视频（画中画 auto）

视频播放中向下滚动离开视口时，自动弹出右下角浮动播放器。滚动回原位置时自动恢复。

::::tabs
tab: 演示效果

:::video{src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" poster="https://images.unsplash.com/photo-1490750967868-88aa4f44dbb3?w=800&q=80" ratio="16/9" pip="auto"}
:::

tab: 示例代码

`````markdown
:::video{src="..." poster="..." ratio="16/9" pip="auto"}
:::
`````

- `pip="auto"`（默认）：播放中离开视口自动进入画中画
- 浮动播放器支持拖动、播放/暂停、进度跳转
- 点击 ↩ 回到原位并恢复播放，点击 × 直接关闭

::::

---

#### 本地视频（画中画 manual）

不自动触发，鼠标悬停视频右上角显示画中画按钮，点击后手动进入浮动播放。

::::tabs
tab: 演示效果

:::video{src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" poster="https://images.unsplash.com/photo-1490750967868-88aa4f44dbb3?w=800&q=80" ratio="16/9" pip="manual"}
:::

tab: 示例代码

`````markdown
:::video{src="..." poster="..." ratio="16/9" pip="manual"}
:::
`````

- `pip="manual"`：鼠标悬停时右上角显示画中画按钮，点击手动触发
- 适合不希望自动打扰读者的场景

::::

---

#### 本地视频（居中对齐）

::::tabs
tab: 演示效果

:::video{src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" poster="https://images.unsplash.com/photo-1490750967868-88aa4f44dbb3?w=800&q=80" align="center" width="500px" ratio="4/3"}
:::

tab: 示例代码

`````markdown
:::video{src="..." poster="..." align="center" width="500px" ratio="4/3"}
:::
`````

- `align="center"`：视频容器居中对齐
- `width="500px"`：限制最大宽度
- `ratio="4/3"`：4:3 宽高比

::::

---

#### Bilibili

::::tabs
tab: 演示效果

:::video{bilibili="BV17VmcBJEZz"}
:::

tab: 示例代码

`````markdown
:::video{bilibili="BV17VmcBJEZz"}
:::
`````

- `bilibili`（**必填**）：B 站 BV 号
- `ratio`、`width`、`align` 与本地视频相同
- 不支持画中画（iframe 内视频无法控制）

::::

---

#### YouTube

::::tabs
tab: 演示效果

:::video{youtube="jfKfPfyJRdk"}
:::

tab: 示例代码

`````markdown
:::video{youtube="jfKfPfyJRdk"}
:::
`````

- `youtube`（**必填**）：YouTube 视频 ID
- `autoplay`：`true` 自动播放（自动静音，符合 YouTube 策略）
- `ratio`、`width`、`align` 与本地视频相同
- 不支持画中画

::::

---

### Image 图片

::::tabs
tab: 演示效果

::image{src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80" alt="风景照片"}

::image{src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80" alt="带下载按钮" download="true"}

::image{src="https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&q=80" alt="正方形裁剪" ratio="1/1" width="300px"}

tab: 示例代码

````
::image{src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80" alt="风景照片"}

::image{src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80" alt="带下载按钮" download="true"}

::image{src="https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&q=80" alt="正方形裁剪" ratio="1/1" width="300px"}
````

- `src`（**必填**）：图片地址
- `alt`：图片描述，会显示在图片下方作为 caption
- `width` / `height`：设置图片尺寸
- `bg`：背景颜色
- `padding`：内边距
- `ratio`：固定宽高比
- `download`：`true` 或自定义下载链接
- `fancybox`：`false` 可禁用点击放大

::::

---

### Gallery 图片画廊

::::tabs
tab: 演示效果

:::gallery{layout="grid" size="m" ratio="square"}
![山景1](https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&q=80)
![山景2](https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80)
![森林](https://images.unsplash.com/photo-1448375240586-882707db888b?w=400&q=80)
![湖泊](https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=400&q=80)
:::

tab: 示例代码

````
:::gallery{layout="grid" size="m" ratio="square"}
![山景1](https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&q=80)
![山景2](https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80)
![森林](https://images.unsplash.com/photo-1448375240586-882707db888b?w=400&q=80)
![湖泊](https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=400&q=80)
:::
````

- `layout`：`grid`（网格，默认）或 `flow`（瀑布流）
- `size`：`xs` | `s` | `m` | `l` | `xl` | `mix`
- `ratio`：`square` | `portrait` | `origin`（保持原始比例）

::::

---

### Banner 横幅

::::tabs
tab: 演示效果

:::banner{title="astro-minimax" subtitle="Astro 驱动的模块化博客主题" bg="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80"}
:::

tab: 示例代码

````
:::banner{title="astro-minimax" subtitle="Astro 驱动的模块化博客主题" bg="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80"}
:::
````

- `title`（**必填**）：主标题
- `subtitle`：副标题
- `bg`：背景图片地址
- `avatar`：头像图片地址
- `link`：点击跳转链接

::::

---

### GHCard GitHub 卡片

::::tabs
tab: 演示效果

:::ghcard{type="repo" repo="withastro/astro"}
:::

:::ghcard{type="user" user="octocat" bio="For all time, always."}
:::

:::ghcard{type="user" user="octocat" avatar="false"}
:::

tab: 示例代码

`````markdown
:::ghcard{type="repo" repo="withastro/astro"}
:::

:::ghcard{type="user" user="octocat" bio="For all time, always."}
:::

:::ghcard{type="user" user="octocat" avatar="false"}
:::
`````

- `type`：`repo`（仓库卡片）或 `user`（用户卡片）
- `repo`：仓库全名，格式为 `owner/repo`（`type="repo"` 时必填）
- `user`：GitHub 用户名（`type="user"` 时必填）
- `bio`：自定义用户简介（可选，仅 `user` 类型有效）
- `avatar`：`false` 可隐藏用户头像（可选，仅 `user` 类型有效）
- 数据通过 GitHub API 动态获取，自定义 `bio` 会在加载前作为占位展示

::::

---

### Sites 网站卡片

::::tabs
tab: 演示效果

:::sites{group="design"}
:::

tab: 示例代码

`````markdown
:::sites{group="design"}
:::
`````

- `group`（**必填**）：对应站点配置中 `links` 配置的分组名
- 数据在站点配置的 `links` 字段中配置
- 支持封面图、图标、标题、描述和彩色标签
- 封面图未指定时自动通过截图服务抓取

> **注意：** `sites` 指令需要在站点配置中提供 `links` 数据，通过 `remarkContentDirectives` 插件的 `options.links` 参数传入。如果未配置对应分组的数据，会显示"暂无站点数据"提示。

::::

---

### Posters 海报

::::tabs
tab: 演示效果

**竖向比例（默认）**

:::posters{group="movies" cols="6"}
:::

**正方形比例**

:::posters{group="albums" ratio="square"}
:::

tab: 示例代码

**竖向比例**

`````markdown
:::posters{group="movies" cols="6"}
:::
`````

**正方形比例**

`````markdown
:::posters{group="albums" ratio="square"}
:::
`````

- `group`（**必填**）：对应站点配置中 `links` 配置的分组名
- `ratio`：比例，可选 `portrait`（竖向 2:3，默认）或 `square`（正方形 1:1）
- `cols`：固定列数，可选 `2` / `3` / `4` / `5` / `6` / `8`，不传则自动填充
- 海报卡片使用 `cover` 或 `icon` 字段作为封面图
- 鼠标悬停时显示标题文字
- 极小间隙的紧凑网格布局

> **注意：** 与 `sites` 指令相同，`posters` 也需要在站点配置中提供 `links` 数据。如果未配置对应分组的数据，会显示"暂无海报数据"提示。

::::

---

## 行内指令

### 文字装饰

::::tabs
tab: 演示效果

- 高亮：:mark[默认主题色高亮] 和 :mark[黄色高亮]{color="yellow"} 和 :mark[红色高亮]{color="red"}
- 下划线：:u[实线下划线] 和 :u[蓝色下划线]{color="blue"}
- 着重号：:emp[着重号下划线]（点状）
- 波浪线：:wavy[波浪下划线]
- 删除线：:del[已删除的内容]
- 上标：H:sup[2]O 和 注释:sup[1]{color="red"}
- 下标：CO:sub[2] 和 H:sub[2]O

tab: 示例代码

````
- 高亮：:mark[默认主题色高亮] 和 :mark[黄色高亮]{color="yellow"} 和 :mark[红色高亮]{color="red"}
- 下划线：:u[实线下划线] 和 :u[蓝色下划线]{color="blue"}
- 着重号：:emp[着重号下划线]（点状）
- 波浪线：:wavy[波浪下划线]
- 删除线：:del[已删除的内容]
- 上标：H:sup[2]O 和 注释:sup[1]{color="red"}
- 下标：CO:sub[2] 和 H:sub[2]O
````

- `:mark` 的 `color` 可选值：`yellow`、`red`、`green`、`blue`、`purple` 或任意色值
- `:u`、`:sup`、`:sub` 同样支持 `color` 属性

::::

---

### 交互效果

::::tabs
tab: 演示效果

- 键盘按键：按 :kbd[Ctrl+C] 复制，按 :kbd[Ctrl+V] 粘贴，按 :kbd[⌘+K] 搜索
- 模糊遮罩：:blur[点击可以查看隐藏内容]（点击揭示）
- 密码遮罩：密码是 :psw[MySecretPassword123]（点击显示）

tab: 示例代码

````
- 键盘按键：按 :kbd[Ctrl+C] 复制，按 :kbd[Ctrl+V] 粘贴，按 :kbd[⌘+K] 搜索
- 模糊遮罩：:blur[点击可以查看隐藏内容]（点击揭示）
- 密码遮罩：密码是 :psw[MySecretPassword123]（点击显示）
````

- `:blur` 点击后移除模糊效果
- `:psw` 点击后显示明文

::::

---

### Hashtag 标签

::::tabs
tab: 演示效果

- 自动轮询颜色：:hashtag[Astro]{href="/tags/astro"} :hashtag[博客]{href="/tags/blog"} :hashtag[教程]{href="/tags/tutorial"} :hashtag[前端]{href="/tags/frontend"} :hashtag[CSS]{href="/tags/css"}
- 自定义颜色：:hashtag[指定蓝色]{href="/tags/blue" color="blue"} :hashtag[指定红色]{href="/tags/red" color="red"}

tab: 示例代码

````
- 自动轮询颜色：:hashtag[Astro]{href="/tags/astro"} :hashtag[博客]{href="/tags/blog"} :hashtag[教程]{href="/tags/tutorial"} :hashtag[前端]{href="/tags/frontend"} :hashtag[CSS]{href="/tags/css"}
- 自定义颜色：:hashtag[指定蓝色]{href="/tags/blue" color="blue"} :hashtag[指定红色]{href="/tags/red" color="red"}
````

- `:hashtag` 默认自动轮询 7 种颜色（红、橙、黄、绿、青、蓝、紫），无需指定 `color`
- `:hashtag` 的 `href` 为跳转链接，`color` 可手动自定义颜色
- `:hashtag` 左侧会自动显示 `#` 图标

::::

---

### Button 按钮

::::tabs
tab: 演示效果

- 普通按钮：:button[查看文档]{href="/" color="accent"} :button[GitHub]{href="/" color="blue"}
- 带图标的按钮：:button[搜索]{href="/search" color="green" icon="lucide:search"}
- 小尺寸按钮：:button[标签]{href="/tags" color="purple" size="xs"}
- 图标按钮组：:button[文档]{href="/docs" color="cyan" icon="lucide:book-open"} :button[源码]{href="/github" color="cyan" icon="lucide:code"} :button[示例]{href="/demo" color="cyan" icon="lucide:trophy"}

tab: 示例代码

````
- 普通按钮：:button[查看文档]{href="/" color="accent"} :button[GitHub]{href="/" color="blue"}
- 带图标的按钮：:button[搜索]{href="/search" color="green" icon="lucide:search"}
- 小尺寸按钮：:button[标签]{href="/tags" color="purple" size="xs"}
- 图标按钮组：:button[文档]{href="/docs" color="cyan" icon="lucide:book-open"} :button[源码]{href="/github" color="cyan" icon="lucide:code-2"} :button[示例]{href="/demo" color="cyan" icon="lucide:trophy"}
````

- `:button` 的 `href` 为跳转链接，`color` 可自定义颜色
- `:button` 支持 `icon` 属性，可传入 Iconify 图标名（如 `lucide:search`）或图片 URL
- `:button` 支持 `size="xs"` 小尺寸模式

::::

---

### Emoji 表情包

::::tabs
tab: 演示效果

今天是开心的一天 :emoji[aini]{source="qq"}，代码终于跑通了！:emoji[OK]{source="qq"}

Twemoji 风格的表情 :emoji[1f600]{source="twemoji"} :emoji[1f389]{source="twemoji"}

贴吧表情 :emoji[huaji]{source="tieba"} :emoji[bishi]{source="tieba"}

Blobcat 表情 :emoji[0_0]{source="blobcat"}

也可以直接使用默认源（省略 source）：:emoji[aini]

自定义高度：:emoji[party]{source="blobcat" height="3em"}

tab: 示例代码

`````markdown
今天是开心的一天 :emoji[aini]{source="qq"}，代码终于跑通了！:emoji[OK]{source="qq"}

Twemoji 风格的表情 :emoji[1f600]{source="twemoji"} :emoji[1f389]{source="twemoji"}

贴吧表情 :emoji[huaji]{source="tieba"} :emoji[bishi]{source="tieba"}

Blobcat 表情 :emoji[0_0]{source="blobcat"}

也可以直接使用默认源（省略 source）：:emoji[aini]

自定义高度：:emoji[party]{source="blobcat" height="3em"}
`````

- `:emoji` 为行内指令，可在段落中直接使用
- `source` 表情源，可选值：
  - `qq` — QQ 表情（GIF 格式）
  - `twemoji` — Twitter Emoji（SVG 格式）
  - `aru` — Aru 表情（GIF 格式）
  - `tieba` — 贴吧表情（PNG 格式）
  - `blobcat` — Blobcat 表情（GIF 格式）
  - `default` — 默认表情源（与 qq 相同）
  - 省略 `source` 时自动使用 `default` 源
- `height` 自定义表情高度，默认 `1.75em`
- 方括号内的内容为表情名称，会替换到 URL 中的 `{name}` 占位符

::::

---

### Checkbox 复选框

::::tabs
tab: 演示效果

:checkbox[默认未选中]
:checkbox[已选中]{checked="true"}
:checkbox[绿色已选中]{checked="true" color="green"}
:checkbox[紫色加号]{checked="true" color="purple" symbol="plus"}
:checkbox[红色减号]{checked="true" color="red" symbol="minus"}
:checkbox[青色叉号]{checked="true" color="cyan" symbol="times"}

行内用法：:checkbox[行内复选框]{inline="true" checked="true"}

tab: 示例代码

`````markdown
:checkbox[默认未选中]
:checkbox[已选中]{checked="true"}
:checkbox[绿色已选中]{checked="true" color="green"}
:checkbox[紫色加号]{checked="true" color="purple" symbol="plus"}
:checkbox[红色减号]{checked="true" color="red" symbol="minus"}
:checkbox[青色叉号]{checked="true" color="cyan" symbol="times"}

行内用法：:checkbox[行内复选框]{inline="true" checked="true"}
`````

- 默认独占一行（块级），添加 `inline="true"` 可在段落中内联使用
- `:checkbox` 的 `checked` 为 `true` 时显示选中态
- `:checkbox` 的 `symbol` 可选值：`plus`、`minus`、`times`
- `color` 支持 `blue`、`green`、`red`、`cyan`、`purple`、`orange` 等或任意色值

::::

---

### Radio 单选按钮

::::tabs
tab: 演示效果

:radio[单选未选中]
:radio[单选已选中]{checked="true"}
:radio[单选橙色]{checked="true" color="orange"}

行内用法：:radio[行内单选]{inline="true" checked="true"}

tab: 示例代码

`````markdown
:radio[单选未选中]
:radio[单选已选中]{checked="true"}
:radio[单选橙色]{checked="true" color="orange"}

行内用法：:radio[行内单选]{inline="true" checked="true"}
`````

- 默认独占一行（块级），添加 `inline="true"` 可在段落中内联使用
- `:radio` 的 `checked` 为 `true` 时显示选中态
- `color` 支持 `blue`、`green`、`red`、`cyan`、`purple`、`orange` 等或任意色值

::::

---

### Step 步骤标记

::::tabs
tab: 演示效果

:step-brackets[01]{title="创建项目"}

:step-brackets[02]{title="安装依赖"}

:step-brackets[03]{title="修改配置"}

tab: 示例代码

`````markdown
:step-brackets[01]{title="创建项目"}

:step-brackets[02]{title="安装依赖"}

:step-brackets[03]{title="修改配置"}
`````

- `:step-brackets` 为行内指令，显示带方括号的步骤编号
- 方括号内为步骤编号，`title` 属性为步骤标题
- 常与 `grid` 指令搭配使用，实现多列步骤布局

::::

---

### Grid 多列步骤示例

:::grid{cols="2" bg="none" gap="16"}
:step-brackets[01]{title="创建项目"}

Start by creating a new Astro project if you don't have one set up already.

---

```bash terminal
npm create astro@latest my-blog
cd my-blog
```
:::

:::grid{cols="2" bg="none" gap="16"}
:step-brackets[02]{title="安装依赖"}

安装 `@astro-minimax/core` 核心主题包。

---

```bash terminal
pnpm add @astro-minimax/core
```
:::

:::grid{cols="2" bg="none" gap="16"}
:step-brackets[03]{title="修改配置文件"}

在 `astro.config.ts` 中引入集成：

---

```ts title="astro.config.ts" highlight="2,6-7"
import { defineConfig } from 'astro/config';
import minimax from '@astro-minimax/core';

export default defineConfig({
  integrations: [
    minimax({ site: SITE }),
  ],
});
```
:::

:::grid{cols="2" bg="none" gap="16"}
:step-brackets[04]{title="启动开发服务器"}

运行开发服务器，开始写作。

---

```bash terminal
pnpm dev
```
:::

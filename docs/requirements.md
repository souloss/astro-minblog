# 博客系统需求规格书

> **版本**: v4.2  
> **日期**: 2026-05-05  
> **基于**: astro-minimax v4.2 — 在 v4.1 基础上，引入客户端/服务端能力分层、混合渲染架构、部署适配器抽象

---

## 一、项目定位与设计哲学

### 1.1 核心定位

**astro-minimax** — 极简为底座，X 代表无限扩展。

一个极简、现代化、模块化的 Astro 博客主题系统。以极简风格为核心设计语言，同时通过可插拔架构提供丰富的功能扩展能力，让用户从"开箱即用"到"深度定制"无缝过渡。

### 1.2 设计原则

| 原则 | 说明 |
|------|------|
| **架构清晰性** | 模块边界通过目录结构和 TypeScript 接口定义，而非包边界；单一主包降低认知负担，内部模块职责明确、依赖方向显式 |
| **功能可扩展性** | 插件/适配器模式接入第三方集成；功能标志控制内置能力；新功能无需修改核心代码，通过注册机制接入 |
| **稳定性** | 模块间通过 TypeScript 接口通信，禁止隐式契约；Zod schema 校验配置；显式依赖方向，禁止循环依赖 |
| **性能至上** | 未启用功能的代码在构建时被 tree-shaking 消除；重型集成按需懒加载；静态优先，交互组件按需 hydrate；服务端功能按需启用，静态模式零服务端开销 |
| **极简优先** | 默认状态简洁克制，内容为核心；功能按需开启，不预设冗余；不添加装饰性功能（无壁纸、无音乐播放器、无粒子特效、无吉祥物/Live2D、无打字机效果） |
| **配置驱动** | 功能开关、外观定制、集成配置全部通过 `config.ts` 统一管理，Zod schema 运行时校验 |
| **类型安全** | TypeScript 严格模式，全链路类型推导，禁止 `as any` / `@ts-ignore` / `@ts-expect-error` |
| **视图可切换** | 不同阅读场景提供不同视图（默认/沉浸/简历），通过站点配置声明启用哪些视图，框架自动生成路由和布局 |

### 1.3 目标用户画像

| 用户类型 | 使用方式 | 需求特征 |
|----------|----------|----------|
| **入门用户** | CLI 一键创建 → 直接写文章 | 开箱即用，零配置 |
| **进阶用户** | 修改 config.ts → 调整功能开关 | 配置驱动，不碰代码 |
| **高级用户** | 自定义主页 → 使用组件 API 编排 | 代码级自由度 |
| **开发者** | Fork / NPM 包集成 → 二次开发 | 架构清晰，可扩展 |

### 1.4 架构总览

astro-minimax 采用双包结构 + 混合渲染架构，将运行时主题与开发时工具分离，同时支持纯静态和服务端增强两种部署模式：

```
┌─────────────────────────────────────────────────────────────────┐
│                        NPM 生态                                  │
│                                                                  │
│  ┌──────────────────────────┐   ┌──────────────────────────┐    │
│  │    astro-minimax         │   │   @astro-minimax/cli     │    │
│  │    (运行时主题主包)        │   │   (开发时工具链)          │    │
│  │                          │   │                          │    │
│  │  ┌────────────────────┐  │   │  ┌────────────────────┐  │    │
│  │  │ core               │  │   │  │ init               │  │    │
│  │  │ ├─ integration     │  │   │  │ post               │  │    │
│  │  │ ├─ layouts         │  │   │  │ ai                 │  │    │
│  │  │ ├─ routes          │  │   │  │ data               │  │    │
│  │  │ │  ├─ pages (SSG)  │  │   │  └────────────────────┘  │    │
│  │  │ │  └─ api (SSR) ◄──┼──┼─── server.mode 控制          │    │
│  │  │ ├─ virtual-modules │  │   └──────────────────────────┘    │
│  │  │ └─ fonts           │  │                                    │
│  │  ├────────────────────┤  │   仅开发时使用：                    │
│  │  │ views              │  │   - 博客脚手架创建                  │
│  │  │ ├─ default         │  │   - AI 内容处理                     │
│  │  │ ├─ minimal         │  │   - 作者画像构建                    │
│  │  │ └─ resume          │  │   - 对话质量评估                    │
│  │  ├────────────────────┤  │   - 数据缓存管理                    │
│  │  │ ai                 │  │                                    │
│  │  │ ├─ rag-pipeline    │  │                                    │
│  │  │ ├─ provider-mgr    │  │                                    │
│  │  │ └─ chat-handler    │  │                                    │
│  │  ├────────────────────┤  │                                    │
│  │  │ notify             │  │                                    │
│  │  │ ├─ telegram        │  │                                    │
│  │  │ ├─ email           │  │                                    │
│  │  │ └─ webhook         │  │                                    │
│  │  ├────────────────────┤  │                                    │
│  │  │ adapters           │  │                                    │
│  │  │ ├─ comments        │  │                                    │
│  │  │ ├─ search          │  │                                    │
│  │  │ └─ analytics       │  │                                    │
│  │  ├────────────────────┤  │                                    │
│  │  │ sidebar            │  │                                    │
│  │  │ ├─ LeftSidebar     │  │                                    │
│  │  │ ├─ RightSidebar    │  │                                    │
│  │  │ └─ WidgetRegistry  │  │                                    │
│  │  ├────────────────────┤  │                                    │
│  │  │ widgets            │  │                                    │
│  │  ├────────────────────┤  │                                    │
│  │  │ content            │  │                                    │
│  │  ├────────────────────┤  │                                    │
│  │  │ preferences        │  │                                    │
│  │  ├────────────────────┤  │                                    │
│  │  │ styles             │  │                                    │
│  │  ├────────────────────┤  │                                    │
│  │  │ plugins            │  │                                    │
│  │  │ ├─ directives      │  │                                    │
│  │  │ └─ ...             │  │                                    │
│  │  ├────────────────────┤  │                                    │
│  │  │ scripts            │  │                                    │
│  │  ├────────────────────┤  │                                    │
│  │  │ utils              │  │                                    │
│  │  ├────────────────────┤  │                                    │
│  │  │ types              │  │                                    │
│  │  └────────────────────┘  │                                    │
│  └──────────────────────────┘                                    │
│                                                                  │
│  渲染模式: server.mode = 'static' | 'hybrid' | 'server'          │
│  ┌──────────────────────┐  ┌──────────────────────────────────┐  │
│  │  静态页面 (SSG)       │  │  服务端端点 (SSR) ◄── hybrid/   │  │
│  │  prerender: true     │  │  server 模式                     │  │
│  │  • 博客/标签/分类/归档│  │  prerender: false               │  │
│  │  • RSS/Sitemap/OG   │  │  • /api/chat (AI)               │  │
│  │  • 搜索/关于/友链    │  │  • /api/notify (通知)           │  │
│  │  • 评论客户端        │  │  • /api/og (动态OG)             │  │
│  │  • Pagefind 索引     │  │  • /api/analytics (统计API)     │  │
│  └──────────────────────┘  └──────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**双包分离的核心理由**：

- **运行时 vs 开发时**：主题主包在 Astro 构建和运行时使用；CLI 仅在开发时使用，不应进入生产依赖
- **依赖隔离**：CLI 依赖（如 AI SDK、文件系统工具）不会污染主题包的依赖树
- **独立发布节奏**：CLI 工具可以更快迭代，不影响主题稳定性

---

## 二、架构设计

### 2.1 包结构

#### 2.1.1 目录结构

```
packages/
├── astro-minimax/              # 运行时主题主包
│   └── src/
│       ├── core/               # 布局、路由、集成入口、虚拟模块
│       │   ├── integration.ts  # Astro integration 入口
│       │   ├── layouts/        # Layout, Main, PostDetails, AboutLayout
│       │   ├── routes/         # 所有路由页面（通过 injectRoute 注入）
│       │   ├── virtual-modules/# 虚拟模块定义与解析
│       │   └── fonts/          # 字体注册表，CDN/本地字体管理
│       ├── views/              # 视图系统
│       │   ├── default/        # 默认视图（layouts/ + components/）
│       │   ├── minimal/        # 极简沉浸视图（layouts/ + components/）
│       │   └── resume/         # 简历视图（layouts/ + components/）
│       ├── ai/                 # RAG 管道、Provider 管理器、对话处理
│       │   ├── server/         # 服务端对话处理、流式响应
│       │   ├── provider-manager/# 多 Provider 故障转移
│       │   ├── search/         # 文章检索引擎
│       │   ├── intelligence/   # 证据分析、隐私保护、引用守卫
│       │   ├── prompt/         # 三层系统提示构建
│       │   ├── fact-registry/  # 事实注册表（防幻觉）
│       │   ├── extensions/     # 搜索/提示扩展
│       │   ├── cache/          # 响应缓存
│       │   └── components/     # ChatPanel 等 Preact 组件
│       ├── notify/             # 多渠道通知
│       │   ├── telegram/       # Telegram Bot 通知
│       │   ├── email/          # Email (Resend) 通知
│       │   └── webhook/        # Webhook 通知
│       ├── adapters/           # 第三方集成适配器
│       │   ├── comments/       # Waline, Giscus, Twikoo, Artalk
│       │   ├── search/         # Pagefind, FlexSearch, DocSearch
│       │   └── analytics/      # Umami, Google, Baidu
│       ├── sidebar/            # 双侧边栏系统
│       │   ├── LeftSidebar.astro
│       │   ├── RightSidebar.astro
│       │   └── WidgetRegistry.ts
│       ├── widgets/            # 主页小组件系统
│       │   ├── registry.ts     # 组件注册表
│       │   ├── WidgetLayout.astro
│       │   ├── ProfileCard.astro
│       │   ├── Announcement.astro
│       │   ├── CategoryList.astro
│       │   ├── TagCloud.astro
│       │   ├── RecentPosts.astro
│       │   ├── FeaturedPosts.astro
│       │   ├── SiteStats.astro
│       │   ├── Heatmap.astro
│       │   ├── Calendar.astro
│       │   ├── SocialLinks.astro
│       │   ├── Navigation.astro
│       │   └── Toc.astro
│       ├── content/            # 内容模型、集合定义、Schema
│       │   ├── blog.ts         # 博客文章 Schema
│       │   ├── docs.ts         # 文档/知识库 Schema
│       │   ├── albums.ts       # 相册 Schema
│       │   ├── series.ts       # 专栏 Schema
│       │   ├── moments.ts      # 闪念 Schema
│       │   ├── projects.ts     # 项目 Schema
│       │   ├── resume.ts       # 简历 Schema
│       │   ├── moment.ts       # 闪念 Schema（旧版兼容）
│       │   ├── friend.ts       # 友链 Schema
│       │   └── project.ts      # 项目 Schema（旧版兼容）
│       ├── preferences/        # 用户偏好系统
│       │   ├── types.ts        # 偏好类型定义
│       │   ├── defaults.ts     # 默认值 + 常量映射
│       │   ├── client.ts       # 客户端偏好管理器
│       │   ├── client-init.ts  # 客户端初始化入口
│       │   ├── storage.ts      # localStorage 持久化
│       │   └── share.ts        # URL 参数分享/同步
│       ├── styles/             # 主题令牌、CSS 架构
│       │   ├── source.css      # Tailwind 组件扫描源
│       │   ├── theme.css       # @theme inline 设计令牌
│       │   ├── actions.css     # 浮动操作样式
│       │   └── components/     # 组件样式
│       │       └── directives/ # ::: 指令样式
│       ├── plugins/            # Remark/Rehype 插件
│       │   ├── directives/     # ::: 指令插件
│       │   │   ├── remark-content-directives.ts
│       │   │   ├── admonition.ts
│       │   │   ├── timeline.ts
│       │   │   ├── card.ts
│       │   │   ├── tabs.ts
│       │   │   ├── gallery.ts
│       │   │   ├── media.ts
│       │   │   ├── private.ts
│       │   │   ├── photo.ts
│       │   │   └── ghcard.ts
│       │   ├── remark-mermaid-codeblock.ts
│       │   ├── remark-markmap-codeblock.ts
│       │   └── remark-directive-to-component.ts
│       ├── scripts/            # 客户端脚本
│       │   ├── lightbox.ts
│       │   ├── reading-position.ts
│       │   ├── immersive-mode.ts
│       │   └── flexsearch-init.ts
│       ├── utils/              # 共享工具函数
│       │   ├── responsive-utils.ts
│       │   ├── content-utils.ts
│       │   └── event-manager.ts
│       └── types/              # 共享类型定义
│           ├── index.ts        # 统一导出
│           ├── config.ts       # 配置类型（SiteConfig, FeaturesConfig 等）
│           ├── nav.ts          # 导航类型（NavItem, LinkPreset）
│           ├── adapter.ts      # 适配器类型（Adapter, AdapterContext）
│           ├── widget.ts       # Widget 类型（WidgetComponentConfig）
│           ├── sidebar.ts      # 侧边栏类型（SidebarConfig）
│           ├── view.ts         # 视图类型（ViewConfig）
│           ├── fonts.ts        # 字体类型（FontConfig, FontRegistry）
│           ├── preferences.ts  # 偏好类型（Preferences）
│           ├── ai.ts           # AI 类型（AiConfig, ProviderConfig）
│           └── notify.ts       # 通知类型（NotifyConfig）
│
└── cli/                        # @astro-minimax/cli 开发时工具链
    └── src/
        └── commands/
            ├── init/           # 博客脚手架创建
            ├── post/           # 文章管理
            ├── ai/             # AI 处理、评估、画像
            └── data/           # 数据缓存管理
```

#### 2.1.2 合并理由

将原先分散在多个独立包中的代码合并为单一主包，基于以下考量：

| 问题 | 多包架构的痛点 | 单包架构的解决方案 |
|------|--------------|------------------|
| 构建复杂度 | 5 个构建步骤（含隐式 knowledge-model），自定义 189 行 esbuild 管道 | 零构建步骤，TypeScript 直接由 Vite/Astro 编译 |
| 类型重复 | 各包独立定义类型，通过注释维护隐式契约 | 统一 `src/types/` 目录，TypeScript 接口即契约 |
| 隐式契约 | 包间依赖通过注释描述，无编译时保障 | 模块间通过 TypeScript 接口通信，编译时强制 |
| 安装复杂度 | AI + notify 始终同时安装，"可选 peer dependency" 是虚构 | 单包安装，功能标志控制激活 |
| knowledge-model 开销 | 113 行代码独立成包，包管理开销远超代码价值 | 合并到 `src/types/`，零管理开销 |
| 版本同步 | 多包版本需严格同步，发布流程复杂 | 单一版本号，一次发布 |
| 开发体验 | 修改跨包类型需同时修改多个包并重新构建 | 修改类型即时生效，无跨包构建等待 |

### 2.2 模块边界

每个内部模块遵循三层边界约束：

1. **公共 API 层**（Public API）：通过 barrel export（`index.ts`）导出的类型和函数，其他模块可以引用
2. **内部实现层**（Internal）：模块内部实现，其他模块**禁止**直接引用
3. **依赖方向**（Dependency Direction）：模块间只能沿允许的方向导入，禁止反向依赖和循环依赖

#### 2.2.1 允许的导入关系

```
core ← ai, notify, adapters, sidebar, widgets, views, content, preferences
  （core 是基础层，其他模块可以导入 core 的公共 API）

views ← core, sidebar, widgets, content
  （视图模块组合 core/sidebar/widgets/content 提供完整页面体验）

sidebar ← core, widgets
  （侧边栏组合 widget 组件，依赖 core 类型）

ai ← notify, adapters
  （ai 模块依赖通知和适配器）

adapters ← core（仅类型）
  （适配器仅导入 core 的类型定义，不导入实现）

widgets ← core（仅类型）
  （小组件仅导入 core 的类型定义）

content ← core（仅类型）
  （内容模型仅导入 core 的类型定义）

preferences ← core（仅类型）
  （偏好系统仅导入 core 的类型定义）

notify ← 无（独立模块）
  （通知模块无外部模块依赖）
```

#### 2.2.2 禁止的导入关系

```
core → ai          （核心不得依赖 AI 模块）
core → notify      （核心不得依赖通知模块）
core → adapters    （核心不得依赖适配器实现）
任何模块 → 其他模块的 internal/*  （禁止跨模块访问内部实现）
循环依赖            （任何形式的循环导入）
```

#### 2.2.3 边界强制机制

通过以下技术手段强制执行模块边界：

**1. TypeScript Path Aliases**

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      // 公共 API — 允许跨模块导入
      "@core/*": ["src/core/public/*"],
      "@ai/*": ["src/ai/public/*"],
      "@notify/*": ["src/notify/public/*"],
      "@adapters/*": ["src/adapters/public/*"],
      "@widgets/*": ["src/widgets/public/*"],
      "@content/*": ["src/content/public/*"],
      "@preferences/*": ["src/preferences/public/*"],
      "@types/*": ["src/types/*"],
      "@utils/*": ["src/utils/*"],
      // 内部路径 — 仅模块自身可导入
      // 不注册 path alias，跨模块导入将无法解析
    }
  }
}
```

**2. Barrel Exports**

每个模块的 `public/index.ts` 精确控制导出内容：

```typescript
// src/ai/public/index.ts
export type { AiConfig, ProviderConfig, ChatMessage } from '../types';
export { handleChatRequest } from '../server/chat-handler';
export { createProviderManager } from '../provider-manager/manager';
// 注意：不导出内部实现细节
```

**3. ESLint `no-restricted-imports` 规则**

```javascript
// eslint.config.js
{
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        // 禁止跨模块导入内部路径
        { group: ['**/src/ai/server/*'], message: 'AI 内部实现禁止外部导入，请使用 @ai/* 公共 API' },
        { group: ['**/src/notify/telegram/*'], message: 'Notify 内部实现禁止外部导入，请使用 @notify/* 公共 API' },
        // 禁止 core 导入功能模块
        { group: ['**/src/ai/**'], message: 'Core 禁止导入 AI 模块' },
        { group: ['**/src/notify/**'], message: 'Core 禁止导入 Notify 模块' },
      ]
    }]
  }
}
```

### 2.3 模块通信

模块间通信采用三种机制，按耦合程度从高到低排列：

#### 2.3.1 直接导入（Direct Import）

**适用场景**：类型定义和纯函数调用

**规则**：
- 仅允许导入目标模块的公共 API（通过 `@module/*` path alias）
- 导入的内容必须是 TypeScript 接口或纯函数
- 禁止导入有状态的对象或类实例

```typescript
// ✅ 正确：导入类型定义
import type { Adapter, AdapterContext } from '@types/adapter';

// ✅ 正确：导入纯函数
import { computeDailyPostCounts } from '@content/utils';

// ❌ 错误：导入有状态实例
import { providerManager } from '@ai/provider-manager';
```

#### 2.3.2 虚拟模块（Virtual Modules）

**适用场景**：构建时配置注入到运行时组件

**规则**：
- 所有跨模块配置通过虚拟模块传递，不直接 import 配置文件
- 虚拟模块在 `astro:config:setup` 钩子中注册
- 组件通过 `import { SITE } from 'virtual:astro-minimax/config'` 消费

**虚拟模块清单**：

| 虚拟模块 | 导出 | 用途 |
|----------|------|------|
| `virtual:astro-minimax/config` | `SITE`, `BLOG_PATH` | 站点配置序列化 |
| `virtual:astro-minimax/constants` | `SOCIALS`, `SHARE_LINKS` | 社交/分享链接 |
| `virtual:astro-minimax/user-data` | `FRIENDS` | 友链数据 |
| `virtual:astro-minimax/styles` | CSS side-effect | 生成的 Tailwind 入口 |
| `virtual:astro-minimax/ai-widget` | `AIChatWidget` | AI 组件（或空组件） |
| `virtual:astro-minimax/ai-seo` | `default` | AI 生成的 SEO 数据 |
| `virtual:astro-minimax/viz-mermaid-init` | `default` | Mermaid 初始化 |
| `virtual:astro-minimax/viz-markmap-init` | `default` | Markmap 初始化 |
| `virtual:astro-minimax/preferences-defaults` | `userDefaults` | 偏好默认值 |
| `virtual:astro-minimax/preferences-client-init` | — | 偏好客户端初始化 |

**设计约束**：新增配置分组应扩展 `virtual:astro-minimax/config` 的序列化内容，而非创建新虚拟模块。

#### 2.3.3 事件总线（Event Bus）

**适用场景**：运行时模块间的松耦合通信

**规则**：
- 基于 `EventTarget` 标准 API，不引入第三方库
- 事件类型通过 TypeScript 接口定义在 `src/types/events.ts`
- 事件处理器在 `astro:after-swap` 中自动清理，防止 View Transitions 内存泄漏

```typescript
// src/types/events.ts
interface MinimaxEventMap {
  'theme:change': { mode: 'light' | 'dark'; hue: number };
  'adapter:loaded': { name: string; category: string };
  'adapter:destroyed': { name: string };
  'ai:chat-toggle': { open: boolean };
  'reading-mode:toggle': { immersive: boolean };
}

// 使用方式
const eventManager = getGlobalEventManager();
eventManager.addEventListener('theme:change', (e) => {
  // 适配器响应主题变化
});
```

#### 2.3.4 跨模块契约规范

所有跨模块导入**必须**通过 `src/types/` 中定义的 TypeScript 接口：

```typescript
// src/types/adapter.ts — 适配器契约
interface Adapter<TConfig> {
  name: string;
  category: 'comments' | 'search' | 'analytics';
  configSchema: ZodSchema<TConfig>;
  init(config: TConfig, context: AdapterContext): Promise<AdapterInstance>;
}

// src/types/events.ts — 事件契约
interface MinimaxEventMap {
  'theme:change': ThemeChangeEvent;
  'adapter:loaded': AdapterLoadedEvent;
  // ...
}
```

**契约变更规则**：
- 接口字段只能新增，不能删除或修改语义
- 新增可选字段不构成破坏性变更
- 变更必须同步更新 `src/types/` 中的定义和 Zod schema

### 2.7 视图系统

视图系统为不同阅读场景提供独立的布局和页面体验，通过站点配置声明启用哪些视图，框架自动生成路由和布局。

#### 2.7.1 视图架构

```
站点配置: views: { default, minimal, resume }
          ↓
视图注册: 每个视图声明 Layout + Pages
          ↓
路由生成: integration 根据启用视图注入路由
          ↓
视图切换: URL 路径或 UI 切换按钮
```

#### 2.7.2 视图类型

| 视图 | 说明 | 特征 |
|------|------|------|
| `default` | 默认视图 | 完整导航、双侧边栏、评论区、浮动操作 |
| `minimal` | 极简沉浸视图 | 无侧边栏、无导航栏、无评论区，仅保留文章内容 + 目录 + 进度条 |
| `resume` | 简历视图 | 独立布局，结构化简历数据展示 |

#### 2.7.3 配置接口

```typescript
interface ViewsConfig {
  default?: { enable: boolean };    // 默认启用
  minimal?: { enable: boolean };    // 极简沉浸视图
  resume?: { enable: boolean };     // 简历视图
}
```

#### 2.7.4 扩展机制

扩展新视图仅需：
1. 在 `views/` 目录下创建视图子目录，包含 `layouts/` 和 `components/`
2. 在站点配置中声明视图启用
3. 框架自动注册路由和布局，无需修改核心代码

#### 2.7.5 视图切换

- **URL 路径切换**：不同视图对应不同路由前缀（如 `/resume/`）
- **UI 切换**：文章页浮动操作栏提供视图切换按钮
- **切换保持内容**：视图切换时文章内容保持不变，仅改变外围 UI

#### 2.7.6 验收标准

- 视图通过站点配置启用/禁用
- 切换视图时内容保持不变
- minimal 视图去除所有非必要 UI 元素（导航、侧边栏、评论、页脚）
- resume 视图渲染结构化简历数据
- 扩展新视图无需修改核心代码

### 2.8 双侧边栏 Widget 系统

双侧边栏系统将左侧和右侧边栏独立配置，每个侧边栏是一个有序的 Widget 组件列表，支持独立控制可见性和响应式行为。

#### 2.8.1 架构概述

```
站点配置: sidebar.left / sidebar.right
          ↓
过滤层:  enabled → position → showOnPostPage / showOnNonPostPage → responsive
          ↓
注册层:  WidgetRegistry[type] → Component
          ↓
渲染层:  LeftSidebar / RightSidebar → slot → component
```

#### 2.8.2 配置接口

```typescript
interface SidebarConfig {
  /** 侧边栏位置策略 */
  position: 'left' | 'right' | 'both';
  /** 左侧边栏 Widget 列表 */
  left?: WidgetComponentConfig[];
  /** 右侧边栏 Widget 列表 */
  right?: WidgetComponentConfig[];
  /** 平板端显示哪个侧边栏 */
  tabletSidebar?: 'left' | 'right' | 'none';
  /** 单侧边栏用户在文章页是否显示双侧边栏 */
  showBothSidebarsOnPostPage?: boolean;
  /** 移动端底部组件配置 */
  mobile?: MobileWidgetConfig;
}

interface WidgetComponentConfig {
  type: string;
  enable: boolean;
  position?: 'top' | 'sticky';
  showOnPostPage?: boolean;
  showOnNonPostPage?: boolean;
  responsive?: { collapseAt?: ('sm' | 'md' | 'lg' | 'xl')[] };
  props?: Record<string, unknown>;
}

interface MobileWidgetConfig {
  components?: WidgetComponentConfig[];
}
```

#### 2.8.3 Widget 注册表

```typescript
/** Widget 注册表 — 新 Widget 通过注册机制接入 */
const widgetRegistry = new Map<string, AstroComponentFactory>();

function registerWidget(type: string, component: AstroComponentFactory): void {
  if (widgetRegistry.has(type)) {
    throw new Error(`Widget "${type}" already registered`);
  }
  widgetRegistry.set(type, component);
}
```

#### 2.8.4 内置 Widget 类型

| Widget 类型 | 默认位置 | 说明 |
|-------------|----------|------|
| `profile` | top | 头像、名称、签名、社交图标 |
| `announcement` | top | 可关闭公告，localStorage 记忆 |
| `categories` | top | 分类列表 + 文章数 |
| `tags` | top | 标签云，大小按文章数加权 |
| `recentPosts` | top | 最新 N 篇文章列表 |
| `featuredPosts` | top | 精选文章列表 |
| `siteStats` | top | 文章数、标签数、总字数、运行天数 |
| `toc` | sticky | 文章目录（仅文章页） |
| `calendar` | sticky | 文章发布日历 |
| `socialLinks` | sticky | 社交图标链接 |
| `navigation` | sticky | 快捷导航卡片 |

#### 2.8.5 验收标准

- 左侧和右侧边栏独立渲染，互不影响
- Widget 可按页面类型（文章页/非文章页）控制可见性
- 移动端布局独立配置
- Widget 注册表支持扩展自定义 Widget
- `position: 'both'` 时双侧边栏同时显示
- `tabletSidebar` 控制平板端显示策略
- `showBothSidebarsOnPostPage` 在单侧边栏模式下为文章页启用双侧边栏

### 2.10 客户端/服务端能力分层

astro-minimax 采用 **混合渲染架构**（`output: "hybrid"`），将功能按是否需要服务端运行时分为多个层级，实现静态优先、服务端按需增强、降级无缝衔接。

#### 2.10.1 设计动机

当前 astro-minimax 使用 `output: "static"` + Cloudflare Pages Functions（`functions/api/`）提供 AI 对话和通知 API，但存在以下问题：

1. **架构割裂**：Astro 构建产物是纯静态 HTML，服务端 API 独立于 Astro 生命周期，两者无法共享类型、配置、中间件
2. **部署耦合**：`functions/api/` 目录结构绑定 Cloudflare Pages，无法迁移到 Vercel/Node 等平台
3. **能力不可见**：用户无法在配置中声明"我需要服务端能力"，系统无法自动检测并降级

采用 `output: "hybrid"` 后：
- 静态页面默认 `prerender = true`，构建为 HTML
- API 端点显式声明 `prerender = false`，由部署适配器处理
- 两者共享 Astro 配置、虚拟模块、类型系统

#### 2.10.2 能力分层模型

```
┌─────────────────────────────────────────────────────────────────┐
│                    能力分层模型                                    │
│                                                                  │
│  L0 静态核心 ─── 纯静态页面服务，零服务端依赖                       │
│  │  • 博客文章渲染、标签/分类/归档/搜索页                          │
│  │  • RSS、Sitemap、OG 图（构建时生成）                            │
│  │  • 评论客户端（Giscus/Waline 客户端脚本）                       │
│  │  • Pagefind 搜索（构建时索引）                                  │
│  │  • 偏好系统、FOUC 防御                                         │
│  │                                                                │
│  L1 边缘增强 ─── 需要服务端运行时，按需启用                         │
│  │  • AI 对话 API（/api/chat）                                    │
│  │  • 通知推送 API（/api/notify）                                  │
│  │  • 动态 OG 图 API（/api/og）                                   │
│  │  • Umami 数据代理 API（/api/analytics）                         │
│  │                                                                │
│  L2 数据集成 ─── 服务端数据获取 + 页面展示                          │
│  │  • Umami 统计数据展示（访问量、热门文章排行）                    │
│  │  • 评论服务端渲染（Waline SSR、Twikoo 服务端）                  │
│  │  • 实时通知状态查询                                             │
│  │                                                                │
│  L3 实时功能 ─── 持续运行的服务端能力                               │
│     • WebSocket 实时通知推送                                      │
│     • 定时任务（文章统计缓存刷新）                                  │
│     • 访客在线状态                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 2.10.3 渲染模式配置

```typescript
interface ServerConfig {
  /** 渲染模式 */
  mode: 'static' | 'hybrid' | 'server';
  /** 部署适配器（hybrid/server 模式必填） */
  adapter: 'cloudflare' | 'vercel' | 'node' | 'netlify';
  /** 适配器配置（传递给 Astro adapter） */
  adapterConfig?: Record<string, unknown>;
  /** API 端点前缀 */
  apiPrefix?: string;           // 默认: '/api'
  /** CORS 配置 */
  cors?: CorsConfig;
}

interface CorsConfig {
  origins?: string[];           // 允许的来源
  methods?: string[];           // 允许的方法
  maxAge?: number;              // 预检缓存时间（秒）
}
```

**模式说明**：

| 模式 | `output` | 适配器 | 适用场景 | 降级 |
|------|----------|--------|----------|------|
| `static` | `"static"` | 无 | 纯静态部署（GitHub Pages 等） | L1-L3 功能全部隐藏 |
| `hybrid` | `"hybrid"` | 必填 | 静态页面 + 边缘 API（推荐） | L0 正常，L1-L3 按配置 |
| `server` | `"server"` | 必填 | 全 SSR（Vercel 等） | 所有层级可用 |

#### 2.10.4 API 端点设计

所有服务端 API 端点通过 `injectRoute()` 注入，声明 `prerender = false`：

```typescript
// integration.ts — 服务端路由注入
function injectServerRoutes(injectRoute: Function, flags: ResolvedFeatureFlags, serverConfig: ServerConfig) {
  if (serverConfig.mode === 'static') return;  // 静态模式不注入任何 API

  const apiRoutes: [boolean, { pattern: string; entryPoint: string }][] = [
    // L1: 边缘增强
    [flags.ai, [
      { pattern: '/api/chat', entryPoint: 'routes/api/chat.ts' },
      { pattern: '/api/ai-info', entryPoint: 'routes/api/ai-info.ts' },
    ]],
    [flags.notify, [
      { pattern: '/api/notify/telegram', entryPoint: 'routes/api/notify/telegram.ts' },
      { pattern: '/api/notify/email', entryPoint: 'routes/api/notify/email.ts' },
      { pattern: '/api/notify/webhook', entryPoint: 'routes/api/notify/webhook.ts' },
    ]],
    // L1: 动态 OG 图
    [true, [
      { pattern: '/api/og/[...slug]', entryPoint: 'routes/api/og/[...slug].ts' },
    ]],
    // L2: 数据集成
    [flags.analytics === 'umami', [
      { pattern: '/api/analytics/stats', entryPoint: 'routes/api/analytics/stats.ts' },
      { pattern: '/api/analytics/popular', entryPoint: 'routes/api/analytics/popular.ts' },
    ]],
  ];

  for (const [enabled, routes] of apiRoutes) {
    if (enabled) {
      for (const route of routes) {
        injectRoute(route);
      }
    }
  }
}
```

**API 端点规范**：

1. **统一前缀**：所有 API 路由以 `apiPrefix`（默认 `/api`）为前缀
2. **统一中间件**：共享 CORS、错误处理、超时保护中间件
3. **统一类型**：API 请求/响应类型定义在 `src/types/api.ts`
4. **超时保护**：AI 对话 45s，通知 10s，OG 图 5s，统计 8s

#### 2.10.5 降级策略

当 `server.mode = 'static'` 时，需要服务端的功能必须优雅降级，不能报错或显示空白：

```typescript
// 虚拟模块降级 — AI 组件
if (flags.ai && serverConfig.mode !== 'static') {
  return `export { default as AIChatWidget } from "@ai/components/ChatPanel";`;
}
// 静态模式：AI 入口按钮不渲染，ChatPanel 不加载
return `export { default as AIChatWidget } from "@core/components/Empty";`;

// 虚拟模块降级 — 统计数据
if (flags.analytics === 'umami' && serverConfig.mode !== 'static') {
  return `export const ANALYTICS_API = "/api/analytics";`;
}
// 静态模式：统计 Widget 仅展示构建时静态数据（文章数、标签数、运行天数）
return `export const ANALYTICS_API = null;`;
```

**降级规则矩阵**：

| 功能 | 静态模式降级 | hybrid/server 模式 |
|------|-------------|-------------------|
| AI 对话 | 浮动按钮不渲染，面板不加载 | 完整功能 |
| 通知推送 | 通知配置节忽略，无 API 端点 | 完整功能 |
| 动态 OG 图 | 构建时静态生成 OG 图 | 运行时按请求动态生成 |
| Umami 统计展示 | 仅展示构建时静态统计（文章数/标签数/运行天数） | 实时访问量 + 热门文章排行 |
| Umami 数据 API | 不注入 | 提供 `/api/analytics/stats` 和 `/api/analytics/popular` |
| 评论服务端渲染 | 仅客户端脚本加载 | Waline SSR + 客户端交互 |
| 热力图 Widget | 构建时静态数据 | 可选实时数据源 |

#### 2.10.6 部署适配器抽象

astro-minimax 不直接依赖特定部署平台的 API，而是通过 Astro adapter 接口实现平台抽象：

```typescript
// astro.config.ts — 用户配置示例
import minimax from 'astro-minimax';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'hybrid',
  adapter: cloudflare({
    runtime: { mode: 'local', type: 'pages' },
  }),
  integrations: [
    minimax({
      website: 'https://example.com',
      server: { mode: 'hybrid', adapter: 'cloudflare' },
      features: { ai: true },
      ai: { /* ... */ },
    }),
  ],
});
```

**适配器选择指南**：

| 适配器 | 平台 | L1 支持 | L2 支持 | L3 支持 | 配置复杂度 |
|--------|------|---------|---------|---------|-----------|
| `@astrojs/cloudflare` | Cloudflare Pages/Workers | ✅ | ✅ | ⚠️（需 Durable Objects） | 低 |
| `@astrojs/vercel` | Vercel | ✅ | ✅ | ⚠️（需 Serverless Functions） | 低 |
| `@astrojs/netlify` | Netlify | ✅ | ✅ | ❌ | 低 |
| `@astrojs/node` | 自部署 Node | ✅ | ✅ | ✅ | 中 |
| 无适配器 | GitHub Pages / 纯静态 | ❌ | ❌ | ❌ | 最低 |

#### 2.10.7 Umami 数据集成设计

当 `server.mode !== 'static'` 且 `analytics.provider === 'umami'` 时，系统提供以下增强能力：

**API 端点**：

| 端点 | 方法 | 功能 | 响应类型 |
|------|------|------|----------|
| `/api/analytics/stats` | GET | 站点总览统计 | `{ pageViews, visitors, bounceRate, avgDuration }` |
| `/api/analytics/popular` | GET | 热门文章排行 | `{ posts: [{ slug, title, views, trend }] }` |
| `/api/analytics/heatmap` | GET | 发布热力图数据 | `{ days: [{ date, count }] }` |

**API 实现**：

```typescript
// routes/api/analytics/stats.ts
import type { APIRoute } from 'astro';
import { UmamiClient } from '@adapters/analytics/UmamiClient';

export const prerender = false;

export const GET: APIRoute = async ({ locals, url }) => {
  const config = locals.minimaxConfig;
  const umami = new UmamiClient(config.analytics.umami);

  try {
    const stats = await umami.getStats({
      startAt: url.searchParams.get('startAt'),
      endAt: url.searchParams.get('endAt'),
    });
    return new Response(JSON.stringify(stats), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch stats' }), { status: 500 });
  }
};
```

**页面展示增强**：

- `SiteStats` Widget：静态模式显示文章数/标签数/运行天数；服务端模式增加实时访问量/访客数
- `Heatmap` Widget：静态模式使用构建时数据；服务端模式可选实时数据源
- 新增 `PopularPosts` Widget：仅服务端模式可用，展示热门文章排行

#### 2.10.8 验收标准

- `server.mode = 'static'` 时，所有需要服务端的功能优雅降级，不报错、不显示空白
- `server.mode = 'hybrid'` 时，静态页面正常构建为 HTML，API 端点由适配器处理
- `server.mode = 'server'` 时，所有页面和 API 都通过服务端渲染
- AI 对话在静态模式下浮动按钮不渲染，面板不加载
- Umami 统计在静态模式下仅展示构建时静态数据
- API 端点统一前缀、统一中间件、统一类型
- 部署适配器通过 Astro adapter 接口实现，不直接依赖平台 API
- 降级规则矩阵覆盖所有功能，无遗漏

### 2.9 功能标志系统

功能标志是控制模块激活和路由注入的核心机制，实现配置驱动的功能开关。

#### 2.4.1 标志定义

```typescript
interface FeatureFlags {
  // === 页面功能（控制路由注入） ===
  tags?: boolean;         // 标签页，默认: true
  categories?: boolean;   // 分类页，默认: true
  series?: boolean;       // 专栏页，默认: true
  archives?: boolean;     // 归档页，默认: true
  friends?: boolean;      // 友链页，默认: true
  projects?: boolean;     // 项目页，默认: true
  search?: boolean;       // 搜索功能，默认: true
  moments?: boolean;      // 闪念/说说页，默认: false
  guestbook?: boolean;    // 留言板页，默认: false
  docs?: boolean;         // 文档/知识库页，默认: false
  gallery?: boolean;      // 相册页，默认: false
  sponsor?: boolean;      // 赞助页，默认: false

  // === 系统功能（控制模块激活） ===
  ai?: boolean;           // AI 对话系统，默认: false（需配置 ai 参数）
  notify?: boolean;       // 通知系统，默认: false（需配置 notify 参数）

  // === 适配器功能（控制第三方集成） ===
  comments?: 'waline' | 'giscus' | 'twikoo' | 'artalk' | 'none';
  searchEngine?: 'pagefind' | 'flexsearch' | 'docsearch' | 'none';
  analytics?: 'umami' | 'google' | 'baidu' | 'none';
}
```

#### 2.4.2 激活规则

功能标志的激活遵循以下规则：

**1. 页面功能激活**

```typescript
// integration.ts — astro:config:setup 阶段
function resolveFeatureFlags(config: SiteConfig): ResolvedFeatureFlags {
  const features = config.features ?? {};
  const comments = config.comments?.provider ?? 'none';
  const serverMode = config.server?.mode ?? 'static';
  const hasServer = serverMode !== 'static';

  return {
    // 页面功能：显式配置优先，否则使用默认值
    tags: features.tags !== false,
    categories: features.categories !== false,
    series: features.series !== false,
    archives: features.archives !== false,
    friends: features.friends !== false,
    projects: features.projects !== false,
    search: features.search !== false,
    moments: features.moments === true,
    guestbook: features.guestbook === true,
    docs: features.docs === true,
    gallery: features.gallery === true,
    sponsor: features.sponsor === true,

    // 系统功能：需要对应配置 + 服务端模式才激活
    ai: features.ai === true && config.ai !== undefined && hasServer,
    notify: features.notify === true && config.notify !== undefined && hasServer,

    // 适配器功能：从对应配置节推导
    comments: comments,
    searchEngine: config.search?.provider ?? 'pagefind',
    analytics: config.analytics?.provider ?? 'none',

    // 服务端能力标志
    serverMode,
    hasServer,
  };
}
```

**2. 路由注入**

```typescript
// integration.ts — 条件路由注入
if (flags.tags) {
  injectRoute({ pattern: '/[lang]/tags', entryPoint: '...' });
  injectRoute({ pattern: '/[lang]/tags/[tag]/[...page]', entryPoint: '...' });
}
if (flags.moments) {
  injectRoute({ pattern: '/[lang]/moments', entryPoint: '...' });
  injectRoute({ pattern: '/[lang]/moments/[...page]', entryPoint: '...' });
}
// ...其他路由同理
```

**3. 模块激活**

```typescript
// integration.ts — 条件模块激活
if (flags.ai) {
  // 注册 AI 相关虚拟模块
  // 注入 AI 聊天 API 端点
  // 注册 AI 组件到虚拟模块
}
if (flags.comments !== 'none') {
  // 注册评论适配器
  // 注入评论区组件
}
```

#### 2.4.3 死代码消除策略

未启用功能的代码在构建时被消除，确保零运行时开销：

**1. 构建时消除**

虚拟模块根据功能标志生成不同的导出内容：

```typescript
// virtual:astro-minimax/ai-widget 解析
if (flags.ai) {
  return `export { default as AIChatWidget } from "@ai/components/ChatPanel";`;
}
return `export { default as AIChatWidget } from "@core/components/Empty";`;
```

Astro/Vite 的 tree-shaking 会自动消除未使用的 `Empty` 组件导入。

**2. 条件导入**

重型集成使用动态 `import()` 按需加载：

```typescript
// 评论适配器 — 仅在用户滚动到评论区时加载
const adapterMap: Record<string, () => Promise<CommentAdapter>> = {
  waline: () => import('@adapters/comments/WalineAdapter'),
  giscus: () => import('@adapters/comments/GiscusAdapter'),
  twikoo: () => import('@adapters/comments/TwikooAdapter'),
  artalk: () => import('@adapters/comments/ArtalkAdapter'),
};
```

**3. CSS 条件注入**

未启用功能的样式不进入 CSS 输出：

```typescript
// 虚拟模块样式生成
let styleImports = [
  '@import "tailwindcss";',
  '@source "../src";',
  '@import "@core/styles/source.css";',
];
if (flags.ai) {
  styleImports.push('@import "@ai/styles/source.css";');
}
styleImports.push('@import "@core/styles/theme.css";');
```

### 2.5 适配器/插件接口

适配器是第三方集成的标准接入规范，通过统一接口实现解耦。

#### 2.5.1 适配器接口定义

```typescript
import type { ZodSchema } from 'zod';
import type { AstroComponentFactory } from 'astro';

/** 适配器上下文 — 主题提供给适配器的运行时环境 */
interface AdapterContext {
  /** 主题 CSS 变量映射 */
  themeVars: Record<string, string>;
  /** 当前语言 */
  lang: string;
  /** 当前是否暗色模式 */
  darkMode: boolean;
  /** 全局事件总线 */
  events: EventTarget;
}

/** 适配器实例 — 适配器初始化后返回的控制接口 */
interface AdapterInstance {
  /** 渲染适配器的 UI 组件 */
  render(): AstroComponentFactory | string;
  /** 销毁适配器实例（View Transitions 前调用） */
  destroy?(): void;
  /** 适配器注入的 CSS 变量（用于主题融合） */
  cssVars?: Record<string, string>;
  /** 适配器注入的导航项 */
  navItems?: NavItem[];
  /** 适配器注入的脚本 */
  scripts?: { src: string; lazy?: boolean }[];
}

/** 适配器定义 — 适配器的静态描述 */
interface Adapter<TConfig> {
  /** 适配器唯一标识 */
  name: string;
  /** 适配器类别 */
  category: 'comments' | 'search' | 'analytics';
  /** 配置的 Zod Schema（运行时校验） */
  configSchema: ZodSchema<TConfig>;
  /** 初始化适配器 */
  init(config: TConfig, context: AdapterContext): Promise<AdapterInstance>;
}
```

#### 2.5.2 适配器注册

适配器在 integration 的 `astro:config:setup` 阶段注册：

```typescript
// 适配器注册表
const adapterRegistry = new Map<string, Adapter<unknown>>();

function registerAdapter<TConfig>(adapter: Adapter<TConfig>): void {
  if (adapterRegistry.has(adapter.name)) {
    throw new Error(`Adapter "${adapter.name}" already registered`);
  }
  adapterRegistry.set(adapter.name, adapter as Adapter<unknown>);
}

// 内置适配器注册
registerAdapter(walineCommentAdapter);
registerAdapter(pagefindSearchAdapter);
registerAdapter(umamiAnalyticsAdapter);

// 条件注册
if (flags.comments === 'giscus') registerAdapter(giscusCommentAdapter);
if (flags.comments === 'twikoo') registerAdapter(twikooCommentAdapter);
if (flags.comments === 'artalk') registerAdapter(artalkCommentAdapter);
if (flags.searchEngine === 'flexsearch') registerAdapter(flexSearchAdapter);
if (flags.searchEngine === 'docsearch') registerAdapter(docSearchAdapter);
if (flags.analytics === 'google') registerAdapter(googleAnalyticsAdapter);
if (flags.analytics === 'baidu') registerAdapter(baiduAnalyticsAdapter);
```

#### 2.5.3 适配器生命周期

```
┌──────────────────────────────────────────────────────────┐
│  astro:config:setup                                       │
│  ├── 1. 校验用户配置（Zod schema）                         │
│  ├── 2. 解析功能标志                                      │
│  ├── 3. 注册虚拟模块                                      │
│  ├── 4. 条件注入路由                                      │
│  └── 5. 注册适配器 → adapter.init(config, context)        │
│                                                           │
│  astro:config:done                                        │
│  └── 6. 注入类型声明                                      │
│                                                           │
│  astro:server:setup（仅开发时）                             │
│  └── 7. 启动适配器开发服务（如需要）                        │
│                                                           │
│  astro:build:start                                        │
│  └── 8. 构建时数据生成（搜索索引、OG 图等）                 │
│                                                           │
│  astro:build:done                                         │
│  └── 9. 构建后任务（Pagefind 索引、适配器清理）             │
└──────────────────────────────────────────────────────────┘
```

#### 2.5.4 适配器实现规范

每个适配器**必须**遵循以下规范：

**1. 动态加载**：适配器的第三方脚本通过动态 `import()` 或 `<script>` 标签注入，不在首屏关键路径中

**2. 超时保护**：加载超时阈值 15 秒，超时后显示友好提示，`AbortController` 取消未完成的网络请求

**3. View Transitions 兼容**：
- `astro:page-load` 事件中初始化实例
- `astro:before-swap` 事件中调用 `destroy()` 清理
- `astro:after-swap` 事件中重新初始化

**4. CSS 变量主题融合**：
- 适配器定义自己的 CSS 变量映射表
- 将主题令牌映射到第三方服务的 CSS 变量
- 亮/暗模式分别定义变量集

**5. 配置校验**：适配器的 `configSchema` 使用 Zod 定义，integration 在注册时自动校验

### 2.6 集成生命周期

Astro integration 是整个主题的编排中心，管理配置校验、功能标志解析、路由注入、适配器注册等所有流程。

#### 2.6.1 生命周期钩子

```typescript
export default function minimax(userConfig: SiteConfig): AstroIntegration {
  return {
    name: 'astro-minimax',

    hooks: {

      // ═══ 第一阶段：配置与注册 ═══
      'astro:config:setup': async ({ updateConfig, injectRoute, addWatchFile }) => {
        // 1. Zod schema 校验用户配置
        const config = SiteConfigSchema.parse(userConfig);

        // 2. 解析功能标志
        const flags = resolveFeatureFlags(config);

        // 3. 注册虚拟模块
        registerVirtualModules(config, flags);

        // 4. 条件注入路由
        injectRoutes(injectRoute, flags);

        // 5. 注册适配器
        registerAdapters(config, flags);

        // 6. 更新 Astro 配置
        updateConfig({ /* vite plugins, etc. */ });
      },

      // ═══ 第二阶段：类型声明 ═══
      'astro:config:done': ({ config }) => {
        // 注入虚拟模块的类型声明
        // 确保 IDE 能正确解析 virtual:astro-minimax/* 导入
      },

      // ═══ 第三阶段：开发服务（仅 dev） ═══
      'astro:server:setup': ({ server }) => {
        // 启动适配器开发服务（如需要）
        // 监听配置文件变化，触发热更新
      },

      // ═══ 第四阶段：构建时数据生成 ═══
      'astro:build:start': () => {
        // 生成搜索索引数据
        // 生成 OG 图片
        // 生成文章统计
      },

      // ═══ 第五阶段：构建后任务 ═══
      'astro:build:done': () => {
        // Pagefind 索引构建
        // 适配器清理
        // 构建产物后处理
      },
    },
  };
}
```

#### 2.6.2 配置校验

使用 Zod schema 在 `astro:config:setup` 阶段校验用户配置，提供友好的错误提示：

```typescript
const SiteConfigSchema = z.object({
  website: z.string().url(),
  author: z.string().min(1),
  desc: z.string().min(1),
  title: z.string().min(1),
  features: FeaturesConfigSchema.optional(),
  ai: AiConfigSchema.optional(),
  comments: CommentsConfigSchema.optional(),
  // ...
}).transform(config => {
  // 向后兼容：旧字段映射到新分组
  if (config.waline && !config.comments) {
    config.comments = { provider: 'waline', waline: config.waline };
  }
  if (config.umami && !config.analytics) {
    config.analytics = { provider: 'umami', umami: config.umami };
  }
  return config;
});

function parseWithFriendlyErrors(schema: ZodSchema, data: unknown) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const messages = result.error.issues.map(issue => {
      const path = issue.path.join('.');
      return `  ✗ ${path}: ${issue.message}`;
    });
    throw new Error(
      `astro-minimax 配置校验失败：\n${messages.join('\n')}\n\n请参考文档修正以上配置项。`
    );
  }
  return result.data;
}
```

#### 2.6.3 路由注入策略

所有路由由 integration 统一注入，consumer 应用无需 `src/pages/` 目录：

```typescript
function injectRoutes(injectRoute: Function, flags: ResolvedFeatureFlags) {
  // 始终注入的路由
  const alwaysRoutes = [
    { pattern: '/', entryPoint: 'routes/index.astro' },
    { pattern: '/404', entryPoint: 'routes/404.astro' },
    { pattern: '/robots.txt', entryPoint: 'routes/robots.txt.ts' },
    { pattern: '/og.png', entryPoint: 'routes/og.png.ts' },
    { pattern: '/rss.xml', entryPoint: 'routes/rss.xml.ts' },
    { pattern: '/[lang]', entryPoint: 'routes/[lang]/index.astro' },
    { pattern: '/[lang]/about', entryPoint: 'routes/[lang]/about.astro' },
    { pattern: '/[lang]/rss.xml', entryPoint: 'routes/[lang]/rss.xml.ts' },
    { pattern: '/[lang]/posts/[...page]', entryPoint: 'routes/[lang]/posts/[...page].astro' },
    { pattern: '/[lang]/posts/[...slug]', entryPoint: 'routes/[lang]/posts/[...slug]/index.astro' },
  ];

  // 条件注入的路由
  const conditionalRoutes: [boolean, { pattern: string; entryPoint: string }[]][] = [
    [flags.tags, [
      { pattern: '/[lang]/tags', entryPoint: 'routes/[lang]/tags/index.astro' },
      { pattern: '/[lang]/tags/[tag]/[...page]', entryPoint: 'routes/[lang]/tags/[tag]/[...page].astro' },
    ]],
    [flags.categories, [
      { pattern: '/[lang]/categories', entryPoint: 'routes/[lang]/categories/index.astro' },
      { pattern: '/[lang]/categories/[...path]', entryPoint: 'routes/[lang]/categories/[...path].astro' },
    ]],
    [flags.series, [
      { pattern: '/[lang]/series', entryPoint: 'routes/[lang]/series/index.astro' },
      { pattern: '/[lang]/series/[series]', entryPoint: 'routes/[lang]/series/[series].astro' },
    ]],
    [flags.archives, [
      { pattern: '/[lang]/archives', entryPoint: 'routes/[lang]/archives.astro' },
    ]],
    [flags.search, [
      { pattern: '/[lang]/search', entryPoint: 'routes/[lang]/search.astro' },
    ]],
    [flags.friends, [
      { pattern: '/[lang]/friends', entryPoint: 'routes/[lang]/friends.astro' },
    ]],
    [flags.projects, [
      { pattern: '/[lang]/projects', entryPoint: 'routes/[lang]/projects.astro' },
    ]],
    [flags.moments, [
      { pattern: '/[lang]/moments', entryPoint: 'routes/[lang]/moments/index.astro' },
      { pattern: '/[lang]/moments/[...page]', entryPoint: 'routes/[lang]/moments/[...page].astro' },
    ]],
    [flags.guestbook, [
      { pattern: '/[lang]/guestbook', entryPoint: 'routes/[lang]/guestbook.astro' },
    ]],
    [flags.docs, [
      { pattern: '/[lang]/docs', entryPoint: 'routes/[lang]/docs/index.astro' },
      { pattern: '/[lang]/docs/[...slug]', entryPoint: 'routes/[lang]/docs/[...slug].astro' },
    ]],
    [flags.gallery, [
      { pattern: '/[lang]/gallery', entryPoint: 'routes/[lang]/gallery.astro' },
    ]],
    [flags.sponsor, [
      { pattern: '/[lang]/sponsor', entryPoint: 'routes/[lang]/sponsor.astro' },
    ]],
  ];

  // 注入
  for (const route of alwaysRoutes) {
    injectRoute(route);
  }
  for (const [enabled, routes] of conditionalRoutes) {
    if (enabled) {
      for (const route of routes) {
        injectRoute(route);
      }
    }
  }
}
```

**用户自定义页面覆盖**：当用户在 `src/pages/` 中创建同名路由时，Astro 的路由优先级机制确保用户路由覆盖注入路由，无需额外检测逻辑。

---

## 三、设计模式参考

> 本章节抽取 astro-minimax 的核心设计模式，作为所有需求的设计约束和参考基线。任何新需求不得破坏这些既有设计。

### 3.1 路由注入模式（Route Injection）

**核心思想**：Consumer 应用无需 `src/pages/` 目录，所有路由由 integration 通过 `injectRoute()` 统一注入。

**设计优势**：
- 用户无法意外修改路由结构
- 版本升级时路由自动跟随
- Feature 标志直接控制路由是否注入

**注入规则**：
- 始终注入的路由：首页、404、robots.txt、OG 图、RSS、文章列表/详情、关于页
- 条件注入的路由：由 `FeatureFlags` 中对应的标志控制
- 用户覆盖：用户在 `src/pages/` 中创建同名路由时，Astro 路由优先级确保用户路由生效

**设计约束**：新增页面模板必须遵循此模式 — 在 integration 中通过功能标志控制注入。

### 3.2 虚拟模块装配（Virtual Modules）

**核心思想**：应用层配置不直接 import 多处，而是通过 integration 统一注入为虚拟模块，组件通过 `import { SITE } from "virtual:astro-minimax/config"` 消费。

**设计优势**：
- 配置集中管理，单一数据源
- 构建时序列化，运行时零开销
- 类型安全，IDE 自动补全
- 替代 ConfigCarrier（DOM data 属性传递配置）等反模式

**设计约束**：新增配置分组应扩展 `virtual:astro-minimax/config` 的序列化内容，而非创建新虚拟模块。仅在需要独立构建时处理逻辑（如 AI 组件条件导出）时才创建新虚拟模块。

### 3.3 CSS 架构（Tailwind v4 + Design Tokens）

**核心思想**：CSS 通过 integration 动态生成入口文件，按顺序组合各模块的样式源。

**样式入口生成顺序**：

```css
@import "tailwindcss";              /* 1. Tailwind 基础 */
@source "../src";                   /* 2. 用户项目组件扫描 */
@import "core/styles/source.css";   /* 3. 核心组件扫描源 */
@import "ai/styles/source.css";     /* 4. AI 组件扫描源（条件注入） */
@import "core/styles/theme.css";    /* 5. 主题令牌 */
@import "core/styles/actions.css";  /* 6. 浮动操作样式 */
```

**主题令牌体系**：

```
:root {                          ← 默认主题（teal 亮色）
  --background / --surface / --surface-strong
  --foreground / --foreground-soft / --muted
  --accent / --accent-soft / --accent-gradient-from / --accent-gradient-to
  --border / --border-strong
  --card / --card-hover
  --glass-bg / --glass-border / --glass-blur
  --shadow-elevated / --shadow-card / --shadow-card-hover
  --hero-orb-a / --hero-orb-b / --hero-gradient
  --transition-fast / --transition-base / --transition-normal / --transition-slow
  --ease-out-expo / --ease-out-back / --ease-spring
}

html[data-theme="dark"] { ... }           ← 暗色模式覆盖
html[data-reading-theme="xxx"] { ... }    ← 阅读主题覆盖（5 种）
```

**360° oklch 色相系统**（源自 Firefly）：所有品牌色通过 `--hue` CSS 变量 + `oklch()` 函数派生，用户通过色相滑块实时切换，所有 UI 元素自动跟随。核心变量定义：

```css
:root {
  --hue: 165;                          /* 默认色相，0-360 */
  --primary: oklch(0.70 0.14 var(--hue));
  --page-bg: oklch(0.95 0.01 var(--hue));
  --btn-content: oklch(0.55 0.12 var(--hue));
  --btn-regular-bg: oklch(0.95 0.025 var(--hue));
  --selection-bg: oklch(0.90 0.05 var(--hue));
  --codeblock-bg: oklch(0.17 0.015 var(--hue));
  /* ...所有 UI 颜色均从 --hue 派生 */
}
:root.dark {
  --primary: oklch(0.75 0.14 var(--hue));
  --page-bg: oklch(0.16 0.014 var(--hue));
  --card-bg: oklch(0.23 0.015 var(--hue));
  /* ...暗色模式使用不同的明度/彩度参数 */
}
```

**色相选择条**：`--color-selection-bar: linear-gradient(to right, oklch(0.80 0.10 0), oklch(0.80 0.10 30), ... oklch(0.80 0.10 360))`

**设计约束**：所有品牌色必须通过 `oklch(L C var(--hue))` 派生，禁止硬编码颜色值。适配器必须通过 CSS 变量映射实现主题融合。

### 3.4 偏好系统（Preferences System）

**核心思想**：受 Vben Admin 启发的分层偏好系统，支持构建时默认值 + 运行时用户覆盖 + URL 分享同步。

**偏好分组结构**：

```typescript
interface Preferences {
  theme: ThemePreferences;          // hue, mode, radius
  appearance: AppearancePreferences; // fontSize
  layout: LayoutPreferences;        // postsLayout
  reading: ReadingPreferences;      // fontSize, lineHeight, contentWidth, theme, fontFamily, focusMode
  widgets: WidgetPreferences;       // themeToggle, backToTop, readingTime, stickyBackToTop
  animations: AnimationPreferences; // enabled, cardHover, smoothScroll
  version: number;                  // 迁移版本号
}
```

**运行时流程**：
1. `Layout` 内联脚本从 `sessionStorage` 读取备份，防止 FOUC
2. 偏好客户端从 `localStorage` 加载用户设置
3. 设置面板修改后立即持久化
4. `astro:after-swap` 事件后重新初始化

**设计约束**：新增偏好项必须扩展 `Preferences` 接口、更新默认值、在设置面板中添加 UI 控件。版本号用于迁移。任何新增的视觉偏好必须在 FOUC 防御脚本中同步处理。

### 3.5 View Transitions 动画

**核心思想**：利用 Astro ClientRouter + View Transitions API 实现圆形扩散主题切换动画。

**动画流程**：
1. 用户点击主题切换按钮，获取点击坐标 `(x, y)`
2. 计算扩散半径 `endRadius = Math.hypot(...)`
3. 调用 `document.startViewTransition()` 启动过渡
4. 使用 `::view-transition-new(root)` / `::view-transition-old(root)` 伪元素
5. 通过 `animate()` API 执行 `circle()` clipPath 动画（450ms）
6. 暗色模式使用反向扩散（从大到小）

**降级策略**：
- 不支持 View Transitions 时直接切换，添加 `no-view-transitions` 类
- `prefers-reduced-motion` 时跳过动画直接切换

**设计约束**：新增页面过渡效果必须兼容 View Transitions API，并在 `astro:after-swap` 中正确重新初始化。所有运行时事件监听器必须通过 `getGlobalEventManager()` 统一管理，确保 View Transitions 后自动清理。

### 3.6 浮动操作栏（Floating Actions）

**核心思想**：右下角浮动按钮组，按优先级从上到下排列，每个按钮有独立功能。

**按钮清单**：

| 按钮 | 条件 | 功能 |
|------|------|------|
| AI 对话 | `features.ai === true` | 打开/关闭 AI 聊天面板 |
| 阅读模式 | 仅文章页 | 切换阅读模式 |
| 主题切换 | `darkMode` 配置 | 亮/暗模式切换 |
| 偏好设置 | 桌面端 | 打开设置面板 |
| 返回顶部 | 始终 | 滚动到顶部 + 进度环 |

**交互规范**：
- 返回顶部按钮带 SVG 进度环，实时反映滚动进度
- 阅读模式按钮仅在文章页显示
- AI 按钮使用主题色（`bg-accent`），与其他按钮的玻璃拟态风格区分
- 所有按钮通过 `getGlobalEventManager()` 统一管理事件监听

**设计约束**：新增浮动按钮必须声明显示条件，并在功能标志关闭时不渲染。

### 3.7 文章页增强系统

**核心思想**：文章详情页集成了丰富的辅助功能，形成完整的阅读体验闭环。

**文章页组件清单**：

| 组件 | 位置 | 功能 |
|------|------|------|
| Sticky Header | 顶部固定 | 文章标题 + 进度条 + TOC 切换 + 返回顶部 |
| BackButton | 左上角 | 返回上一页 |
| Banner Image | 文章顶部 | 封面图 + 渐变遮罩 |
| PostMeta | 标题下方 | 日期/阅读时间/字数/分类/标签 |
| InlineTOC | 正文前 | 可折叠行内目录 |
| FloatingTOC | 右侧浮动 | 闲置时显示进度条，hover 展开全文 |
| FloatingSeriesNav | 浮动 | 系列文章导航 |
| SeriesNav | 文末 | 系列文章列表 |
| Copyright | 文末 | 版权声明 + OG 图 |
| RelatedPosts | 文末 | 相关文章推荐 |
| Comments | 文末 | 评论区（适配器分发） |
| Prev/Next | 文末 | 上一篇/下一篇导航 |

**辅助功能**：

- **阅读位置记忆**：`sessionStorage` 存储每篇文章的滚动位置，返回时自动恢复，最多 50 条 LRU 淘汰
- **图片灯箱**：文章内非链接包裹的图片自动添加 `cursor: zoom-in`，点击全屏查看，ESC 关闭，`role="dialog"` + `aria-modal="true"` 无障碍覆盖层
- **单篇评论开关**：frontmatter `comment: boolean` 控制单篇文章是否显示评论区

**设计约束**：新增文章页辅助组件必须遵循 View Transitions 兼容规范，并在 `astro:after-swap` 中正确重新初始化。

### 3.8 FOUC 防御（Flash of Unstyled Content）

**核心思想**：Layout 内联一段阻塞脚本，在 DOM 渲染前立即设置主题属性，防止闪烁。

**防御流程**：
1. 从 `sessionStorage` 读取备份（比 `localStorage` 更快）
2. 解析主题模式（light/dark/system）
3. 立即设置属性：`data-theme`、`--hue` CSS 变量、`data-layout`
4. 写入 `sessionStorage` 作为页面过渡备份

**设计约束**：任何新增的视觉偏好（如自定义色相、阅读主题）必须在此内联脚本中同步处理，否则会出现闪烁。此脚本是阻塞的，必须保持轻量——仅做属性设置，不做 DOM 查询或网络请求。

### 3.9 跨主题决策矩阵

以下矩阵综合 Firefly、astro-theme-iris、astro-theme-pure、fuwari 四个参考主题的设计决策，明确 astro-minimax 的采纳方向。

| 功能领域 | 采纳模式 | 需要的改造 | 摒弃的方案 |
|----------|----------|-----------|-----------|
| Widget 系统 | componentMap 注册表 + WidgetComponentConfig | 硬编码宽度 → CSS 变量 | ConfigCarrier 数据传递 |
| 多级导航 | children 嵌套 + 动态生成 | 增加键盘导航 | 扁平导航列表 |
| 双侧边栏 | responsive-utils CSS Grid | 增加响应式断点 | 硬编码宽度 |
| 主页布局引擎 | 预设布局 + CSS Grid 生成 | 增加 full-width 和 custom 模式 | 固定单列布局 |
| 评论适配器 | 统一接口 + Provider 分发 | 增加 Giscus/Twikoo/Artalk 适配器 | 每种评论独立集成 |
| FlexSearch | 构建时 JSON + 客户端 FlexSearch.Document | 作为 Pagefind 替代提供者 | 无搜索扩展能力 |
| 知识图谱 | 共享 contentIndex + BFS 过滤 | D3.js → 轻量替代或 lazy-load | D3.js 全量引入 |
| Wikilink | remark 插件 + 反向链接 + 预览 | Tippy.js → 轻量替代 | 无内容互联 |
| 配置校验 | Zod schema + 友好错误 | 整合到 integration | 无运行时校验 |
| 丰富组件 | Aside/Tabs/Timeline/Steps/Spoiler 等 | Tailwind v4 样式 | 无内容增强组件 |
| 字体系统 | FontItem 注册表 + CDN/local 双支持 | CSS 变量注入 | 硬编码字体栈 |
| 相册 | 文件系统扫描 + 懒加载灯箱 | 自实现灯箱 | 无相册功能 |
| 公告组件 | 配置驱动 + 可关闭 + localStorage 记忆 | — | — |
| 页面过渡 | View Transitions API | 已采纳 | Swup 依赖 |
| 偏好系统 | 7 组偏好 + FOUC 防御 | 已实现 | — |
| AI 对话 | RAG + 多 Provider + 流式 | 已实现 | — |
| 色彩方案 | 360° oklch 色相系统（无预设，纯色相调节） | 重构 | Firefly 色相系统 |

---

## 四、核心模块规格

> 本章节对 astro-minimax 需要实现或重构的 8 个核心模块进行规格定义。每个模块包含架构说明、类型定义、数据流、验收标准和与其他模块的依赖关系。所有设计必须遵循第三章（设计模式参考）中的设计约束。

### 模块 1：Widget 系统

#### 1.1 架构概述

Widget 系统采用组件注册表模式（源自 Firefly），将 widget 的声明（配置）与渲染（组件）完全分离。用户通过配置声明需要哪些 widget 及其位置和可见性，渲染引擎根据注册表查找对应组件并按规则渲染。

```
配置层:  homepage.widgets.primary/secondary/main
         ↓
过滤层:  enabled → position → visibility → responsive
         ↓
注册层:  componentMap[name] → Component
         ↓
渲染层:  WidgetLayout shell → slot → component
```

#### 1.2 类型定义

```typescript
/** Widget 组件类型 */
type WidgetComponentType = AstroComponentFactory;

/** Widget 位置 */
type WidgetPosition = "top" | "sticky";

/** Widget 可见性控制 */
interface WidgetVisibility {
  showOnPostPage: boolean;
  showOnNonPostPage: boolean;
  responsive?: { hidden?: ("sm" | "md" | "lg" | "xl")[] };
}

/** Widget 组件配置 */
interface WidgetComponentConfig {
  name: string;
  enabled: boolean;
  position: WidgetPosition;
  visibility: WidgetVisibility;
  props?: Record<string, unknown>;
}

/** 组件注册表 */
type ComponentRegistry = Record<string, WidgetComponentType>;
```

#### 1.3 渲染流程

1. 从 `virtual:astro-minimax/config` 读取 `homepage.widgets` 配置
2. 过滤 `enabled === true` 的 widget
3. 按 `position` 分组：top 组和 sticky 组
4. 对每个 widget 应用 `visibility` 过滤
5. 从 `componentMap` 查找组件引用
6. 在 WidgetLayout shell 中渲染组件
7. 应用 `responsive.hidden` 的 CSS 类

#### 1.4 内置 Widget 清单

| Widget | 位置 | 默认可见性 | 说明 |
|--------|------|-----------|------|
| ProfileCard | top | 全部页面 | 头像、名称、签名、社交图标 |
| Announcement | top | 首页 | 可关闭公告，localStorage 记忆 |
| CategoryList | top | 首页 | 分类列表 + 文章数 |
| TagCloud | top | 首页 | 标签云，大小按文章数加权 |
| RecentPosts | top | 首页 | 最新 N 篇文章列表 |
| SiteStats | top | 首页 | 文章数、标签数、总字数、运行天数 |
| Heatmap | top | 首页 | 文章更新热力图（详见模块 5） |
| Calendar | sticky | 首页 | 文章发布日历 |
| SocialLinks | sticky | 全部页面 | 社交图标链接 |
| Navigation | sticky | 全部页面 | 快捷导航卡片 |

#### 1.5 验收标准

- 用户可通过配置添加、删除、重排 widget
- 自定义 widget 可通过组件注册表接入
- Widget 可见性按页面类型和响应式断点正确过滤
- WidgetLayout shell 提供统一的折叠/展开交互，状态通过 localStorage 持久化

#### 1.6 依赖与功能标志

- **依赖**：core 模块（虚拟模块、布局）
- **功能标志**：始终启用（widget 是主页布局的基础）

---

### 模块 2：多级导航

#### 2.1 架构概述

多级导航系统扩展扁平 `NavItem` 为树形结构，支持子菜单嵌套、外链标识和动态生成。桌面端使用下拉菜单，移动端使用手风琴菜单，平板端使用图标导航 + 溢出下拉。

#### 2.2 数据模型

```typescript
interface NavItem {
  key: string;
  label?: string;
  href?: string;
  icon?: string;
  enabled: boolean;
  external?: boolean;
  children?: NavItem[];
}

enum LinkPreset {
  Home = "home", Posts = "posts", Tags = "tags",
  Categories = "categories", Series = "series", Archives = "archives",
  Friends = "friends", Projects = "projects", Moments = "moments",
  Guestbook = "guestbook", About = "about", Docs = "docs",
  Gallery = "gallery", Sponsor = "sponsor",
}
```

#### 2.3 动态导航生成

从 feature flags 自动推导导航项：

```typescript
function generateDynamicNavItems(features: FeatureFlags): NavItem[] {
  const items: NavItem[] = [{ key: "home", enabled: true }];
  if (features.tags !== false) items.push({ key: "tags", enabled: true });
  if (features.categories !== false) items.push({ key: "categories", enabled: true });
  // ...其他 feature flags 同理
  items.push({ key: "about", enabled: true });
  return items;
}
```

用户显式配置 `nav.items` 时覆盖动态生成结果。

#### 2.4 响应式交互策略

| 断点 | 交互方式 | 导航结构 |
|------|----------|----------|
| ≥1024px | 水平导航栏 | 完整图标 + 文字，子菜单 hover 下拉 |
| 640-1024px | 图标导航 + 溢出 | 主项图标显示，溢出项收入"更多"下拉 |
| <640px | 汉堡菜单 | 全屏覆盖面板，子菜单手风琴展开 |

#### 2.5 键盘导航

| 按键 | 行为 |
|------|------|
| Enter / Space | 打开下拉面板 / 激活链接 |
| ArrowDown / ArrowUp | 焦点移至下一个/上一个子项 |
| ArrowRight / ArrowLeft | 焦点移至下一个/上一个顶级项 |
| Escape | 关闭下拉面板，焦点回到触发器 |

#### 2.6 验收标准

- 导航项从 feature flags 自动生成
- 多级菜单在桌面端、平板端、移动端均正常工作
- 键盘导航完整支持（Tab / Arrow / Enter / Escape）
- 外链项在新窗口打开，显示外链图标
- 溢出检测自动将多余项收入"更多"下拉

#### 2.7 依赖与功能标志

- **依赖**：core 模块（Header 组件、i18n）
- **功能标志**：各导航项由对应 feature flag 控制

---

### 模块 3：主页布局引擎

#### 3.1 架构概述

主页布局引擎根据配置动态生成 CSS Grid 布局，支持 6 种预设模式和自定义覆盖。引擎在构建时确定布局结构，运行时仅处理响应式断点切换。

#### 3.2 布局模式

| 模式 | Grid 结构 | 适用场景 |
|------|-----------|----------|
| `default` | 单列：`[main]` | 极简风格 |
| `sidebar-left` | `[primary] [main]` | 信息密集型 |
| `sidebar-right` | `[main] [secondary]` | 阅读优先型 |
| `dual-sidebar` | `[primary] [main] [secondary]` | 信息最大化 |
| `full-width` | 单列全宽：`[main]` | 视觉冲击型 |
| `custom` | 用户自定义 | 完全自由编排 |

#### 3.3 CSS Grid 生成

```typescript
interface GridConfig {
  layout: HomepageLayout;
  primarySidebarWidth?: string;   // 默认 "280px"
  secondarySidebarWidth?: string; // 默认 "280px"
  gap?: string;                   // 默认 "1.5rem"
}

function generateGridClasses(config: GridConfig): {
  mobile: string; tablet: string; desktop: string;
} {
  // 根据 layout 模式返回各断点的 grid-cols 类
  // mobile (<640px): 始终单列
  // tablet (640-1024px): 2 列
  // desktop (≥1024px): 完整布局
}
```

> **Tailwind 动态类注意事项**：`grid-cols-[${width}_1fr]` 等动态类名需通过 `@source` 指令、safelist 或 CSS 变量 + 内联样式解决。

#### 3.4 Hero 系统

```typescript
interface HeroConfig {
  enabled: boolean;
  style: "minimal" | "banner" | "fullscreen";
  background?: { image?: string; opacity?: number; blur?: number };
}
```

#### 3.5 自定义覆盖

用户创建 `src/pages/[lang]/index.astro` 覆盖默认首页。Astro 的路由优先级机制确保用户路由覆盖注入路由，无需额外检测逻辑。

#### 3.6 验收标准

- 用户可通过配置选择 6 种预设布局
- 自定义首页覆盖默认路由
- 响应式断点正确切换（mobile/tablet/desktop）
- 侧边栏宽度通过 CSS 变量可配置

#### 3.7 依赖与功能标志

- **依赖**：widgets 模块、core 模块
- **功能标志**：始终启用

---

### 模块 4：评论适配器

#### 4.1 架构概述

评论系统采用适配器模式，扩展 §2.5 定义的 `Adapter` 接口。`Comments.astro` 作为分发器，根据 `provider` 字段选择对应适配器渲染。每个适配器必须遵循深度集成规范。

#### 4.2 适配器接口

```typescript
/** 评论适配器 — 扩展基础 Adapter 接口 */
interface CommentAdapter extends Adapter<CommentConfig> {
  category: 'comments';
  /** 更新主题（暗亮切换时调用） */
  updateTheme(isDark: boolean): void;
}

/** 评论适配器实例 — 扩展基础 AdapterInstance */
interface CommentAdapterInstance extends AdapterInstance {
  /** 更新主题 */
  updateTheme(isDark: boolean): void;
}
```

#### 4.3 Provider 分发

```typescript
const adapterMap: Record<string, () => Promise<CommentAdapter>> = {
  waline: () => import("@adapters/comments/WalineAdapter"),
  giscus: () => import("@adapters/comments/GiscusAdapter"),
  twikoo: () => import("@adapters/comments/TwikooAdapter"),
  artalk: () => import("@adapters/comments/ArtalkAdapter"),
};
```

#### 4.4 适配器实现规范

1. **动态加载**：评论脚本通过动态 `import()` 注入，不在首屏关键路径
2. **超时保护**：加载超时 15 秒，超时后显示友好提示
3. **View Transitions 兼容**：`astro:page-load` 初始化 → `astro:before-swap` 销毁 → `astro:after-swap` 重新初始化
4. **CSS 变量主题融合**：将主题令牌映射到评论服务的 CSS 变量，亮/暗模式分别定义

#### 4.5 验收标准

- 切换评论提供者仅需修改配置，无需修改代码
- 主题颜色正确传播到评论 UI
- 页面过渡时评论组件无报错
- 单篇文章可通过 frontmatter `comment: false` 关闭评论
- 留言板页面复用评论适配器，使用独立 page ID

#### 4.6 依赖与功能标志

- **依赖**：core 模块（Adapter 接口、虚拟模块）
- **功能标志**：`features.comments` 选择提供者

---

### 模块 5：Heatmap Widget

#### 5.1 架构概述

GitHub 风格贡献图，纯 CSS Grid + 客户端日期计算，无外部依赖。数据源为构建时从内容集合日期字段计算的每日发文量。

#### 5.2 数据模型

```typescript
interface DailyPostCount { date: string; count: number; }
interface HeatmapConfig { months: number; levels: [number, number, number, number]; }
```

#### 5.3 颜色等级

5 级颜色，基于 accent 色的不同透明度，使用 CSS `color-mix()` 实现：

| 等级 | 条件 | 颜色 |
|------|------|------|
| 0 | 0 篇 | `var(--surface-strong)` |
| 1 | 1 篇 | `color-mix(in srgb, var(--accent) 25%, transparent)` |
| 2 | 2-3 篇 | `color-mix(in srgb, var(--accent) 50%, transparent)` |
| 3 | 4-6 篇 | `color-mix(in srgb, var(--accent) 75%, transparent)` |
| 4 | 7+ 篇 | `var(--accent)` |

#### 5.4 验收标准

- 热力图正确渲染当前年份的发文数据
- 主题颜色正确应用
- Hover 显示 tooltip（日期 + 发文数）
- 点击单元格筛选该日期范围的文章

#### 5.5 依赖与功能标志

- **依赖**：widgets 模块、content 模块
- **功能标志**：始终启用（作为 widget 注册）

---

### 模块 6：Moments 内容模型

#### 6.1 架构概述

Moments（闪念/说说）是短内容动态流，采用 Astro Content Collection 定义 schema，时间线布局呈现，支持多媒体和标签筛选。

#### 6.2 内容集合 Schema

```typescript
interface MomentSchema {
  type: "moment";
  pubDatetime: Date;
  tags?: string[];
  media?: MomentMedia[];
  mood?: "happy" | "thinking" | "sad" | "excited" | "calm" | "tired";
}

interface MomentMedia {
  type: "image" | "code";
  src?: string; alt?: string;
  code?: string; lang?: string;
}
```

#### 6.3 验收标准

- 闪念内容与博客文章完全分离（独立内容集合）
- 时间线布局正确渲染
- 支持纯文字、文字+图片、文字+代码片段
- 标签筛选 + 分页
- 图片点击触发灯箱效果

#### 6.4 依赖与功能标志

- **依赖**：core 模块（路由注入、内容集合注册）
- **功能标志**：`features.moments === true`

---

### 模块 7：搜索适配器

#### 7.1 架构概述

搜索系统采用适配器模式，扩展 §2.5 的 `Adapter` 接口。Pagefind 为默认提供者，FlexSearch 和 DocSearch 为替代选项。

#### 7.2 适配器接口

```typescript
interface SearchAdapter extends Adapter<SearchConfig> {
  category: 'search';
  /** 构建时数据生成 */
  buildIndex?(entries: ContentIndexEntry[]): Promise<void>;
}

interface ContentIndexEntry {
  url: string; title: string; content: string;
  tags: string[]; category?: string; description?: string;
}
```

#### 7.3 FlexSearch 适配器

- 构建时生成 `/contentIndex.json` 端点
- 客户端 FlexSearch.Document 索引
- CJK 编码器：逐字符分词，支持中文/日文/韩文搜索
- 搜索交互：300ms 防抖、`#` 前缀标签搜索、关键词高亮

#### 7.4 验收标准

- 三种搜索提供者均可正常工作
- FlexSearch 支持 CJK 搜索
- 搜索结果关键词高亮
- 键盘快捷键 Ctrl/Cmd+K 打开搜索
- 移动端搜索面板全屏覆盖

#### 7.5 依赖与功能标志

- **依赖**：core 模块（Adapter 接口、路由注入）
- **功能标志**：`features.searchEngine` 选择提供者

---

### 模块 8：内容增强组件

#### 8.1 架构概述

内容增强组件采用 Astro 组件 + remark/rehype 指令双模式：用户既可以在 `.mdx` 文件中直接使用组件标签，也可以通过 Markdown 指令语法在普通 `.md` 文件中调用。

```
Markdown 指令语法 → remark-directive → rehype 转换 → 组件渲染
MDX 组件导入     → Astro MDX 编译器 → 直接渲染
```

#### 8.2 组件清单

| 组件 | Props | 说明 |
|------|-------|------|
| Aside | `type: info/warning/success/error/note/tip/important/caution` | 带左侧色条 + 图标的提示框 |
| Tabs / TabItem | `group?: string` / `label: string, active?: boolean` | CSS-only 选项卡 + localStorage 持久化 |
| Timeline | `items: TimelineItem[]` | 垂直时间线，左侧日期 + 右侧内容 |
| Steps | `items: StepItem[]` | 编号步骤，左侧序号 + 右侧内容 |
| Collapse | `summary: string, open?: boolean` | 基于 `<details>` 的折叠面板 |
| Spoiler | `hint?: string` | hover 显示的遮罩组件 |
| Card / CardList | `title, href?, icon?, description?` / `items, columns?` | 卡片 + 网格卡片列表 |

#### 8.3 验收标准

- 所有组件在 Markdown（指令语法）和 MDX（组件导入）两种模式下均正确渲染
- 组件样式与主题一致（使用 CSS 变量）
- Aside 与 Admonitions 语法共享底层组件
- Tabs 选中状态通过 localStorage 持久化
- `prefers-reduced-motion` 时 Spoiler 直接显示内容

#### 8.4 依赖与功能标志

- **依赖**：core 模块（remark/rehype 插件注册）
- **功能标志**：始终启用

---

## 五、站点个性化标识系统

### 5.1 需求概述

用户应能通过配置文件完全控制站点的视觉标识，无需修改任何模板代码即可实现品牌个性化。

### 5.2 配置接口

```typescript
interface IdentityConfig {
  favicon?: FaviconConfig;
  logo?: LogoConfig;
  avatar?: AvatarConfig;
  footer?: FooterConfig;
  author?: AuthorConfig;
}

interface FaviconConfig {
  ico?: string;              // 默认 /favicon.ico
  svg?: string;              // 现代浏览器，支持暗色模式适配
  appleTouch?: string;       // iOS 主屏幕 180x180
  webManifest?: string;      // PWA manifest
}

interface LogoConfig {
  text?: string;             // 文字 Logo（无图片时的 fallback）
  light?: string;            // 亮色模式 Logo
  dark?: string;             // 暗色模式 Logo（可选）
  href?: string;             // Logo 链接（默认首页）
}

interface AvatarConfig {
  src: string;
  alt?: string;
  shape?: 'circle' | 'rounded' | 'square';
}

interface FooterConfig {
  html?: string;             // 自定义 HTML 注入
  showRunningDays?: boolean;
  showSitemap?: boolean;
  showRSS?: boolean;
  showPoweredBy?: boolean;
  customLinks?: { label: string; href: string }[];
}

interface AuthorConfig {
  name?: string;
  bio?: string;
  avatar?: string;
  profile?: string;
}
```

### 5.3 验收标准

- Favicon 支持多格式（ico/svg/appleTouch/webManifest），SVG 支持暗色模式适配
- Logo 支持图片 + 文字两种模式，暗色模式自动切换
- 头像可复用于 Footer、ProfileCard、AI 人设等
- 页脚各区块可通过开关独立控制
- 未配置时 fallback 到当前默认行为

### 5.4 与架构的集成

- 配置通过 `virtual:astro-minimax/config` 注入到布局组件
- Favicon 链接在 Layout 的 `<head>` 中动态输出
- Logo 渲染逻辑在 Header 组件中处理

---

## 六、导航菜单系统

### 6.1 需求概述

导航菜单支持多级结构，菜单项较多时自动分类组织，在不同设备上提供最优交互方式。

### 6.2 配置接口

```typescript
interface NavConfig {
  items: NavItem[];
  overflowStrategy?: 'dropdown' | 'hamburger';
}

interface NavItem {
  key: string;
  label?: string;       // 覆盖 i18n 默认值
  href?: string;        // 覆盖默认路径
  icon?: string;        // 覆盖默认图标
  enabled: boolean;
  external?: boolean;   // 外链标识
  children?: NavItem[]; // 子菜单
}
```

### 6.3 功能规格

**动态导航生成**：从 feature flags 自动推导导航项，用户显式配置 `nav.items` 时覆盖。

**响应式策略**：

| 设备 | 交互方式 |
|------|----------|
| 桌面端 (≥1024px) | 水平导航栏，子菜单 hover/click 下拉 |
| 平板 (640-1024px) | 图标导航 + 溢出"更多"下拉 |
| 移动端 (<640px) | 汉堡菜单，子菜单手风琴展开 |

**外链处理**：`external: true` 的导航项在新窗口打开，显示外链图标 ↗。

**导航栏自动注入**：第三方集成通过 `AdapterInstance.navItems` 自动注入导航项。

### 6.4 验收标准

- 多级菜单在所有设备上正常工作
- 键盘导航完整支持
- 溢出检测自动调整导航项
- 外链项正确标注和打开
- 第三方集成导航项自动注入

---

## 七、页面模板体系

### 7.1 需求概述

提供丰富的页面模板，覆盖博客、社交、知识管理、项目展示等多种内容形态。

### 7.2 模板清单

| 模板 | 路由 | 功能标志 | 说明 |
|------|------|----------|------|
| 首页 | `/[lang]/` | — | Hero + 文章列表 / Widget 布局 |
| 文章列表 | `/[lang]/posts/[...page]` | — | 分页文章列表 |
| 文章详情 | `/[lang]/posts/[...slug]` | — | 完整阅读体验 |
| 标签 | `/[lang]/tags` | `features.tags` | 标签云 + 按标签筛选 |
| 分类 | `/[lang]/categories` | `features.categories` | 分类树 + 按分类筛选 |
| 专栏 | `/[lang]/series` | `features.series` | 系列文章列表 |
| 归档 | `/[lang]/archives` | `features.archives` | 时间线归档 |
| 搜索 | `/[lang]/search` | `features.search` | 全文搜索 |
| 友链 | `/[lang]/friends` | `features.friends` | 友链展示 |
| 项目 | `/[lang]/projects` | `features.projects` | 项目展示 |
| 关于 | `/[lang]/about` | — | 个人介绍 |
| 闪念 | `/[lang]/moments` | `features.moments` | 短内容时间线 |
| 留言板 | `/[lang]/guestbook` | `features.guestbook` | 评论式留言 |
| 文档 | `/[lang]/docs` | `features.docs` | 文档/知识库 |
| 相册 | `/[lang]/gallery` | `features.gallery` | 瀑布流 + 灯箱 |
| 赞助 | `/[lang]/sponsor` | `features.sponsor` | 赞助方式展示 |
| 404 | `/404` | — | 自定义 404 页 |

### 7.3 布局层级

```
Layout.astro          ← 根布局：HTML head + 主题 + 浮动操作 + AI 组件 + 偏好好初始化
├── Main.astro        ← 列表页布局：面包屑 + 标题 + slot
├── PostDetails.astro ← 文章详情布局：完整的文章阅读体验
└── AboutLayout.astro ← 关于页布局：面包屑 + prose 内容
```

### 7.4 验收标准

- 所有模板通过功能标志控制路由注入
- 用户可通过创建 `src/pages/` 下的同名文件覆盖任何模板
- 新增模板遵循路由注入模式

---

## 八、主页自定义与小组件系统

### 8.1 需求概述

主页支持完全自定义布局，用户可通过配置选择预设布局，也可通过代码使用组件 API 自由编排。

### 8.2 配置接口

```typescript
interface HomepageConfig {
  layout?: 'default' | 'sidebar-left' | 'sidebar-right' | 'dual-sidebar' | 'full-width' | 'custom';
  widgets?: {
    primary?: string[];    // 主侧边栏 widget 列表
    secondary?: string[];  // 次侧边栏 widget 列表
    main?: string[];       // 主内容区 widget 列表
  };
  hero?: HeroConfig;
  postList?: PostListConfig;
}

interface PostListConfig {
  defaultMode: "list" | "grid" | "card";
  masonry?: boolean;
  allowSwitch?: boolean;
}
```

### 8.3 验收标准

- 6 种预设布局通过配置切换
- Widget 列表通过配置自定义
- 自定义首页通过创建 `src/pages/[lang]/index.astro` 覆盖
- 文章列表支持 list/grid/card 三种模式，可选瀑布流

---

## 九、极简沉浸模式

### 9.1 需求概述

提供一键切换的极简阅读模式，去除所有干扰元素，仅保留文章核心内容。

### 9.2 行为规格

| 元素 | 行为 |
|------|------|
| 顶部导航栏 | 隐藏（滚动到顶部时短暂浮现） |
| 页脚 | 隐藏 |
| 侧边栏 | 隐藏 |
| 评论区 | 隐藏 |
| 浮动操作按钮 | 隐藏（除退出按钮外） |
| 文章标题 | ✅ 保留 |
| 文章正文 | ✅ 保留 |
| 目录（TOC） | ✅ 保留（可折叠） |
| 阅读进度条 | ✅ 保留 |

### 9.3 快捷键

| 快键 | 功能 |
|------|------|
| `R` | 切换沉浸模式 |
| `Escape` | 退出沉浸模式 |
| `T` | 切换目录折叠 |
| `F` | 切换聚焦模式 |

### 9.4 偏好持久化

```typescript
interface ReadingPreferences {
  // ...已有字段
  immersiveMode: boolean;
  showProgress: boolean;
  autoImmersive: boolean;   // 进入文章页自动沉浸
}
```

### 9.5 验收标准

- 沉浸模式正确隐藏所有非必要元素
- 导航栏滚动浮现正常工作
- 快捷键正确响应
- 偏好通过 localStorage 持久化
- FOUC 防御脚本同步处理 `immersiveMode`

---

## 十、主题与外观定制

### 10.1 需求概述

提供全面的外观定制能力，让用户无需写 CSS 即可打造个性化视觉风格。

### 10.2 配置接口

```typescript
interface ThemeConfig {
  hue: number;               // 默认色相 0-360，如 165
  fixed: boolean;            // 是否对访问者隐藏色相选择器
  defaultMode: 'light' | 'dark' | 'system';
  customCSS?: string;        // 用户 CSS 覆盖路径
  uiFontFamily?: string;     // UI 字体
}
```

### 10.3 功能规格

- **360° oklch 色相系统**：`--hue` CSS 变量 + `oklch()` 函数派生所有品牌色，色相滑块实时切换
- **暗亮模式**：light / dark / system（View Transitions 圆形扩散动画）
- **圆角大小**：4 档 CSS 变量 `--card-radius`
- **字体**：9 种阅读字体 + UI 字体配置 + 字体注册表
- **文章布局**：card / grid / list / masonry
- **动画控制**：全局动画 / 卡片悬浮 / 平滑滚动
- **自定义 CSS**：主题 CSS 之后加载用户 CSS

### 10.4 验收标准

- 360° oklch 色相系统通过 `--hue` CSS 变量 + `oklch()` 动态计算所有品牌色
- FOUC 防御脚本同步处理 `--hue` 初始值
- 暗亮模式切换动画流畅（450ms 圆形扩散）
- 自定义 CSS 在主题 CSS 之后加载，可覆盖任何样式
- 色相滑块显示 360° 渐变条，实时预览颜色变化
- 卡片风格可选跟随色相：`card.followTheme: boolean`

---

## 十一、第三方系统集成

### 11.1 需求概述

支持多种第三方服务的灵活接入，通过 §2.5 定义的适配器接口解耦。

### 11.2 评论适配器

```typescript
comments: {
  provider: 'waline' | 'giscus' | 'twikoo' | 'artalk' | 'none',
  waline?: WalineConfig,
  giscus?: GiscusConfig,
  twikoo?: TwikooConfig,
  artalk?: ArtalkConfig,
}
```

每个适配器必须遵循：动态加载 + 超时保护（15s）+ View Transitions 兼容 + CSS 变量主题融合。

### 11.3 搜索适配器

```typescript
search: {
  provider: 'pagefind' | 'flexsearch' | 'docsearch' | 'none',
  flexsearch?: { lang: string[]; indexLimit: number },
  docsearch?: DocSearchConfig,
}
```

- `pagefind`：构建时索引，零运行时开销（默认）
- `flexsearch`：运行时索引，CJK 支持更好
- `docsearch`：Algolia 托管搜索

### 11.4 统计适配器

```typescript
analytics: {
  provider: 'umami' | 'google' | 'baidu' | 'none',
  umami?: UmamiConfig,
  google?: { trackingId: string },
  baidu?: { token: string },
}
```

### 11.5 导航栏自动注入

第三方集成通过 `AdapterInstance.navItems` 自动注入导航项：

| 集成 | 导航项 | 条件 |
|------|--------|------|
| 搜索 | 搜索图标 | `features.search !== false` |
| AI 对话 | AI 图标 | `features.ai === true` |
| 留言系统 | 留言板 | `features.comments !== 'none'` |

### 11.6 验收标准

- 切换任何适配器仅需修改配置
- 所有适配器遵循统一的 Adapter 接口
- 适配器脚本通过 `AdapterInstance.scripts` 懒加载
- 主题颜色通过 `AdapterInstance.cssVars` 传播
- 向后兼容：旧配置（`waline`、`umami`）自动映射到新结构

---

## 十二、AI 对话系统

### 12.1 需求概述

AI 对话作为主包内的功能模块，提供全局问答和边读边聊两种模式。边读边聊使用 RAG 技术注入文章上下文。

### 12.2 架构集成

- **功能标志**：`features.ai === true` 且 `ai` 配置存在时激活
- **虚拟模块**：`virtual:astro-minimax/ai-widget` — 启用时解析为 ChatPanel 组件，禁用时解析为空组件
- **死代码消除**：`features.ai === false` 时，AI 模块代码在构建时被 tree-shaking 消除

### 12.3 RAG 上下文注入策略

```
文章长度判定：
├── 短文章（< 2000 字符）→ 全文注入
├── 中等文章（2000-5000 字符）→ 摘要 + 关键段落 + 按需深入
└── 长文章（> 5000 字符）→ 摘要 + 目录结构 + 按查询动态检索段落

上下文注入层级：
Layer 1: 当前文章元数据（标题、分类、标签、摘要）
Layer 2: 当前文章正文（短文全文 / 长文相关段落）
Layer 3: 相关文章摘要（同分类/同标签，最多 5 篇）
Layer 4: 相关文章关键段落（按查询相关性检索，最多 3 段）
Layer 5: 站点知识（作者信息、站点概览、事实注册表）
```

### 12.4 多 Provider 故障转移

Workers AI（优先级 100）→ OpenAI（优先级 90）→ Mock（优先级 0）

### 12.5 验收标准

- 全局问答和边读边聊两种模式正常工作
- RAG 上下文注入策略按文章长度正确分级
- 多 Provider 故障转移正常工作
- 隐私保护：敏感信息查询自动拒绝
- AI 禁用时零运行时开销（tree-shaking）
- 对话历史存储在 localStorage

---

## 十三、内容增强与 Markdown 扩展

### 13.1 需求概述

提供丰富的 Markdown 扩展和内容增强组件，提升内容表现力。

### 13.2 功能规格

**内容增强组件**（详见模块 8）：Aside、Tabs、Timeline、Steps、Spoiler、Collapse、Card、CardList

**Markdown 扩展**：
- 提醒块（Admonitions）：`> [!NOTE]` / `> [!TIP]` / `> [!WARNING]` / `> [!DANGER]`
- 代码块增强：行高亮、复制按钮、文件名标题
- GitHub 仓库卡片

**可视化组件**：
- Mermaid 图表、Markmap 思维导图、Rough.js 手绘图形
- Excalidraw 嵌入、Asciinema 终端回放
- Bilibili 视频嵌入

### 13.3 验收标准

- 所有内容增强组件在 Markdown 和 MDX 两种模式下正常渲染
- 提醒块与 Aside 组件共享底层渲染
- 可视化组件按需懒加载

---

## 十四、SEO 与站点基础设施

### 14.1 需求概述

提供完整的 SEO 优化和站点基础设施支持。

### 14.2 功能规格

- **动态 OG 图片**：Satori 渲染，文章级动态生成
- **RSS**：全局 + 按语言，自动发现 link 标签
- **站点地图**：Astro 内置 `@astrojs/sitemap`
- **robots.txt**：动态生成
- **结构化数据**：BlogPosting + WebSite + SearchAction + BreadcrumbList + Person
- **多语言 SEO**：hreflang 标签 + x-default
- **PWA**：manifest.json 动态生成 + Service Worker 离线缓存

### 14.3 验收标准

- 所有页面包含正确的 meta 标签和结构化数据
- RSS feed 自动发现
- 多语言页面包含 hreflang 标签
- PWA manifest 正确生成

---

## 十五、性能与无障碍

### 15.1 性能预算

| 指标 | 目标 | 测量方式 |
|------|------|----------|
| Lighthouse Performance | ≥ 90 | Lighthouse CI |
| LCP (Largest Contentful Paint) | ≤ 2.5s | Web Vitals |
| CLS (Cumulative Layout Shift) | ≤ 0.1 | Web Vitals |
| FID (First Input Delay) | ≤ 100ms | Web Vitals |
| TTI (Time to Interactive) | ≤ 3.5s | Lighthouse |
| JS Bundle（无 AI） | ≤ 80KB gzipped | 构建产物 |
| JS Bundle（含 AI） | ≤ 150KB gzipped | 构建产物 |
| CSS Bundle | ≤ 30KB gzipped | 构建产物 |
| FCP (First Contentful Paint) | ≤ 1.8s | Web Vitals |

### 15.2 性能测量

- **Lighthouse CI**：集成到构建管道，每次构建自动运行
- **Web Vitals**：通过 analytics 适配器上报真实用户数据
- **Bundle 监控**：`size-limit` 或自定义脚本监控包体积变化
- **性能回归检测**：Lighthouse 分数下降超过 5 分时构建失败

### 15.3 无障碍

- **WCAG 2.1 AA** 合规
- **键盘导航**：所有交互元素可通过键盘操作
- **屏幕阅读器**：完整 ARIA 标签和语义化 HTML
- **颜色对比度**：`--muted: 4.44:1`、`--accent: 5.03:1`
- **焦点管理**：View Transitions 后正确恢复焦点
- **减少动画**：`prefers-reduced-motion` 时跳过动画
- **高对比模式**：系统高对比模式适配
- **Skip to content**：跳过导航直接到内容

### 15.4 构建时优化

- **Tree-shaking**：未启用功能的代码在构建时消除（虚拟模块解析为空 stub）
- **懒加载**：重型适配器（评论、搜索）通过动态 `import()` 按需加载
- **图片优化**：Astro 内置图片优化 + `loading="lazy"` + `decoding="async"`
- **字体优化**：`media="print" onload` 异步加载 + `fetchpriority="high"` 关键字体
- **CSS 优化**：Tailwind v4 内容扫描 + purge 未使用样式

---

## 十六、配置系统

### 16.1 配置架构

- 单一入口：`minimax(config)` 在 `astro.config.ts` 中调用
- Zod schema 校验：`astro:config:setup` 阶段自动校验
- 功能标志：作为一等配置概念，控制模块激活和路由注入
- 向后兼容：旧字段继续支持，内部映射到新分组

### 16.2 配置 Schema

```typescript
interface MinimaxConfig {
  // === 基础信息 ===
  website: string;
  author: string;
  desc: string;
  title: string;
  lang?: string;
  timezone?: string;
  dir?: "ltr" | "rtl";
  startDate?: string;

  // === 个性化标识 ===
  identity?: IdentityConfig;

  // === 导航 ===
  nav?: NavConfig;

  // === 功能开关 ===
  features?: FeatureFlags;

  // === 主页 ===
  homepage?: HomepageConfig;

  // === 主题 ===
  theme?: ThemeConfig;          // { hue, fixed, defaultMode, customCSS, uiFontFamily }

  // === 视图 ===
  views?: ViewsConfig;          // { default, minimal, resume }

  // === 侧边栏 ===
  sidebar?: SidebarConfig;      // { position, left, right, mobileBottom, tabletSidebar, showBothSidebarsOnPostPage }

  // === 文章布局 ===
  postListLayout?: PostListLayoutConfig; // { defaultMode, mobileDefaultMode, showTags, descriptionLines, allowSwitch, grid }

  // === 字体 ===
  fonts?: FontConfig;           // { enable, preload, selected, registry, fallback }

  // === 卡片风格 ===
  card?: CardConfig;            // { border, followTheme }

  // === 导航栏 ===
  navbar?: NavbarConfig;        // { logo, title, widthFull, menuAlign, followTheme, stickyNavbar }

  // === 服务端 ===
  server?: ServerConfig;        // { mode, adapter, adapterConfig, apiPrefix, cors }

  // === 适配器（第三方集成） ===
  comments?: CommentsConfig;
  search?: SearchConfig;
  analytics?: AnalyticsConfig;

  // === AI（功能模块） ===
  ai?: AiConfig;

  // === 通知（功能模块） ===
  notify?: NotifyConfig;

  // === 内容 ===
  content?: ContentConfig;

  // === 偏好 ===
  preferences?: PreferencesConfig;

  // === 向后兼容 ===
  waline?: WalineConfig;     // → comments.provider='waline'
  umami?: UmamiConfig;       // → analytics.provider='umami'
  darkMode?: boolean;
  profile?: string;
  postPerIndex?: number;
  postPerPage?: number;
  ogImage?: string;
  dynamicOgImage?: boolean;
  editPost?: EditPostConfig;
  showBackButton?: boolean;
  blogPath?: string;
  showArchives?: boolean;
  projects?: ProjectConfig[];
  sponsor?: SponsorConfig;
  copyright?: CopyrightConfig;
}
```

### 16.3 配置校验

```typescript
const MinimaxConfigSchema = z.object({
  website: z.string().url(),
  author: z.string().min(1),
  desc: z.string().min(1),
  title: z.string().min(1),
  features: FeatureFlagsSchema.optional(),
  identity: IdentityConfigSchema.optional(),
  nav: NavConfigSchema.optional(),
  homepage: HomepageConfigSchema.optional(),
  theme: ThemeConfigSchema.optional(),
  views: ViewsConfigSchema.optional(),
  sidebar: SidebarConfigSchema.optional(),
  postListLayout: PostListLayoutConfigSchema.optional(),
  fonts: FontConfigSchema.optional(),
  card: CardConfigSchema.optional(),
  navbar: NavbarConfigSchema.optional(),
  server: ServerConfigSchema.optional(),
  comments: CommentsConfigSchema.optional(),
  ai: AiConfigSchema.optional(),
  // ...
}).transform(config => {
  // 向后兼容映射
  if (config.waline && !config.comments) {
    config.comments = { provider: 'waline', waline: config.waline };
  }
  if (config.umami && !config.analytics) {
    config.analytics = { provider: 'umami', umami: config.umami };
  }
  return config;
});

function parseWithFriendlyErrors(schema: ZodSchema, data: unknown) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const messages = result.error.issues.map(issue =>
      `  ✗ ${issue.path.join('.')}: ${issue.message}`
    );
    throw new Error(
      `astro-minimax 配置校验失败：\n${messages.join('\n')}\n\n请参考文档修正以上配置项。`
    );
  }
  return result.data;
}
```

### 16.4 配置迁移（v3 → v4）

| v3 配置 | v4 配置 | 说明 |
|---------|---------|------|
| `SiteConfig.waline` | `comments: { provider: 'waline', waline: ... }` | 评论统一接口 |
| `SiteConfig.umami` | `analytics: { provider: 'umami', umami: ... }` | 统计统一接口 |
| `SiteConfig.darkMode` | `preferences.theme.mode` | 移入偏好系统 |
| `SiteConfig.nav.items` (扁平) | `nav.items` (支持 children) | 多级导航 |
| `@astro-minimax/ai` 配置 | `ai: AiConfig` | 合并到主包配置 |
| `@astro-minimax/notify` 配置 | `notify: NotifyConfig` | 合并到主包配置 |

迁移原则：
- 旧字段继续工作，新字段可选
- CLI 提供 `astro-minimax config migrate` 自动迁移
- 迁移后旧字段标记为 `@deprecated`

---

## 十七、实施优先级

### 17.1 Phase 0：架构迁移

| 任务 | 工作量 | 说明 |
|------|--------|------|
| 合并 4 包为单一主包 | 大 | core + ai + notify + knowledge-model → astro-minimax |
| 消除 knowledge-model | 小 | 113 行类型合并到 src/types/ |
| 建立模块边界 | 中 | 目录结构 + barrel exports + ESLint 规则 |
| 功能标志系统 | 中 | FeatureFlags 类型 + resolveFeatureFlags + 条件路由注入 |
| 适配器接口 | 中 | Adapter/AdapterInstance/AdapterContext 定义 + 注册机制 |
| Zod 配置校验 | 中 | MinimaxConfigSchema + parseWithFriendlyErrors |
| 混合渲染架构 | 大 | output: "hybrid" + ServerConfig + API 端点迁移 + 降级策略 |
| 部署适配器抽象 | 中 | Cloudflare/Vercel/Node 适配器配置 + 类型定义 |
| CLI 更新 | 小 | 适配新的包结构 |

### 17.2 Phase 1：核心体验

| 任务 | 工作量 | 说明 |
|------|--------|------|
| 个性化标识配置 | 中 | IdentityConfig + Favicon/Logo/Avatar/Footer |
| 多级导航菜单 + 响应式 | 中 | NavItem children + 键盘导航 + 溢出检测 |
| 主题与外观增强 | 小 | 自定义色相 + UI 字体 + 自定义 CSS |
| 内容增强组件 | 中 | Aside/Tabs/Timeline/Steps/Spoiler/Collapse/Card |
| SEO 基础设施 | 小 | 结构化数据 + PWA manifest |

### 17.3 Phase 2：体验增强

| 任务 | 工作量 | 说明 |
|------|--------|------|
| 主页布局引擎 + Widget 系统 | 大 | 6 种布局 + 11 个内置 Widget |
| 极简沉浸模式 | 中 | 隐藏非必要元素 + 快捷键 + 偏好持久化 |
| 评论适配器 | 中 | Waline 重构 + Giscus/Twikoo/Artalk 适配器 |
| 搜索适配器 | 中 | FlexSearch + CJK 编码器 |
| 第三方集成导航联动 | 小 | AdapterInstance.navItems 自动注入 |

### 17.4 Phase 3：功能补全

| 任务 | 工作量 | 说明 |
|------|--------|------|
| AI 对话系统（功能模块化） | 中 | 单包内功能模块 + 虚拟模块条件导出 |
| 通知系统（功能模块化） | 小 | 单包内功能模块 |
| 统计适配器 | 小 | Google Analytics + 百度统计 |
| Umami 数据集成 | 中 | API 端点 + SiteStats/PopularPosts Widget + 降级策略 |
| 闪念/说说页面 | 中 | Moments 内容集合 + 时间线布局 |
| Heatmap Widget | 中 | 热力图 + 构建时数据 |

### 17.5 Phase 4：打磨

| 任务 | 工作量 | 说明 |
|------|--------|------|
| 性能优化 | 中 | Tree-shaking 验证 + 懒加载 + Bundle 监控 |
| 无障碍审计 | 中 | WCAG 2.1 AA 全面合规 |
| 文档更新 | 中 | 配置文档 + 组件文档 + 迁移指南 |
| CLI 更新 | 小 | 适配新架构 + config migrate 命令 |

---

## 附录 A：参考主题功能对比

| 功能 | astro-minimax (目标) | Firefly | astro-theme-pure | astro-theme-iris |
|------|---------------------|---------|-------------------|------------------|
| 多级导航 | ✅ 计划 | ✅ 下拉菜单 | ❌ | ❌ |
| 主页小组件 | ✅ 计划 | ✅ 双侧边栏+丰富组件 | ❌ | ❌ |
| 闪念/说说 | ✅ 计划 | ❌ | ❌ | ❌ |
| AI 对话 | ✅ 已有 | ❌ | ❌ | ❌ |
| 阅读模式 | ✅ 已有 | ❌ | ❌ | ❌ |
| 360°色相 | ✅ 计划 | ✅ | ❌ | ❌ |
| 多评论系统 | ✅ 计划 | ✅ Waline+Giscus | ❌ | ✅ Giscus+Waline |
| FlexSearch | ✅ 计划 | ❌ | ❌ | ✅ CJK编码器 |
| 知识图谱 | ❌ | ❌ | ❌ | ✅ D3.js |
| 提醒块 | ✅ 计划 | ✅ | ✅ | ❌ |
| 页面过渡 | ✅ View Transitions | ✅ Swup | ❌ | ❌ |
| 丰富组件库 | ✅ 计划 | ❌ | ✅ Aside/Tabs/Timeline | ❌ |
| Zod 配置校验 | ✅ 计划 | ❌ | ✅ | ❌ |
| NPM 包分发 | ✅ 单包 Integration | ❌ | ✅ astro-pure 包 | ❌ |

---

## 附录 B：基础项目评估与选型

> 本附录对 4 个候选基础项目进行系统评估，为 astro-minimax 重写提供选型依据。

### B.1 评估维度与权重

| 维度 | 权重 | 说明 |
|------|------|------|
| 架构清晰性 | 25% | 模块边界、依赖方向、代码组织、可理解性 |
| 功能可扩展性 | 25% | 插件/适配器模式、功能开关、新功能接入成本 |
| 服务端能力 | 20% | SSR 支持、API 端点、部署适配器、混合渲染 |
| 代码质量 | 15% | TypeScript 严格度、重复代码、类型安全、测试覆盖 |
| 技术栈匹配 | 15% | Astro 版本、CSS 方案、构建工具、依赖数量 |

### B.2 项目评分

| 维度 | astro-minimax (当前) | Firefly | vergil-astro-theme | astro-theme-pure |
|------|---------------------|---------|-------------------|------------------|
| 架构清晰性 | 3/5 | 2/5 | 2/5 | 5/5 |
| 功能可扩展性 | 4/5 | 2/5 | 3/5 | 4/5 |
| 服务端能力 | 4/5 | 1/5 | 1/5 | 4/5 |
| 代码质量 | 3/5 | 2/5 | 2/5 | 4/5 |
| 技术栈匹配 | 5/5 | 3/5 | 3/5 | 3/5 |
| **加权总分** | **3.80** | **1.95** | **2.15** | **4.05** |

### B.3 详细评估

#### B.3.1 astro-minimax（当前）

**优势**：
- ✅ 已有 AI RAG 管道、多 Provider 故障转移、流式对话 — 其他项目均无
- ✅ 已有 Cloudflare Pages Functions 服务端 API（AI chat + 通知）
- ✅ 已有虚拟模块、偏好系统、FOUC 防御、View Transitions — 成熟的基础设施
- ✅ TypeScript strict + Tailwind v4 — 技术栈完全匹配目标
- ✅ 已有通知系统（Telegram/Email/Webhook）— 其他项目均无
- ✅ 已有适配器模式雏形（评论/搜索/统计）

**劣势**：
- ❌ 4 包 monorepo 复杂度（但 v4.1 需求已规划合并为 2 包）
- ❌ 非 npm 可分发（但 v4.1 需求已规划 npm 包 + starter template）
- ❌ 部分 API 端点独立于 Astro 生命周期（functions/api/ 割裂）

**关键资产**（重写成本极高）：
- AI RAG 管道 + Provider 管理器 + 证据分析 + 隐私保护 + 事实注册表
- 通知系统（3 渠道 + 模板引擎）
- 偏好系统（7 组偏好 + FOUC 防御 + URL 分享）
- 虚拟模块装配机制
- 内容集合 Schema + frontmatter 校验

#### B.3.2 Firefly

**优势**：
- ✅ 360° 色相系统（`--hue` + `oklch()`）— 设计精巧，已采纳
- ✅ 双侧边栏 Widget 配置（23 个配置文件，功能丰富）— 设计模式已采纳
- ✅ i18n 完善（5 语言）
- ✅ 文章布局模式（列表/网格/瀑布流）— 设计模式已采纳
- ✅ 多级导航 + 动态菜单生成 — 设计模式已采纳
- ✅ 字体配置（CDN + preload）— 设计模式已采纳

**劣势**：
- ❌ **78+ 依赖**，技术栈混乱（Svelte + Stylus + Swup + Astro 混用）
- ❌ 23 个配置文件碎片化（过度拆分，认知负担高）
- ❌ 纯静态，无服务端能力
- ❌ 非 npm 可分发
- ❌ Swup 页面过渡与 Astro View Transitions 冲突
- ❌ Stylus 预处理器与 Tailwind v4 不兼容

**可移植资产**：
- 色相系统 CSS 变量设计 → 已移植到 §3.3
- Widget 配置模式 → 已移植到 §2.8
- 文章布局模式 → 已移植到 §10
- 字体配置模式 → 已移植到 §2.1.1

#### B.3.3 vergil-astro-theme

**优势**：
- ✅ ::: 指令系统极其丰富（30+ 指令：admonition/timeline/card/tabs/gallery/media/photo/ghcard/collapse/steps/spoiler/encrypt 等）— 设计已采纳
- ✅ 视图系统（default/minimal/resume）— 设计已采纳
- ✅ 字体注册表（CDN/local 双支持）— 设计已采纳
- ✅ 文档系统（树形导航 + 系列导航）— 设计已采纳
- ✅ 11 种色彩方案（A-K）— 设计理念已采纳（简化为色相系统）

**劣势**：
- ❌ **3 个 Layout 几乎完全复制粘贴**（BaseLayout 912 行 + DefaultLayout 828 行 + DocsLayout 724 行 = 2464 行，~90% 重复代码）
- ❌ 大量 `is:inline` 脚本内联在 Layout 中（加密、音频、视频、PiP 全部内联，无法 tree-shake）
- ❌ `.mjs` 文件无 TypeScript 类型（`astro.config.mjs`、`fonts.mjs` 等）
- ❌ 纯静态，无服务端能力
- ❌ 非 npm 可分发
- ❌ 代码组织混乱（utils/ 下 20+ 文件无分层）

**可移植资产**：
- ::: 指令 remark 插件设计 → 已移植到 §2.1.1 plugins/directives/
- 视图系统设计 → 已移植到 §2.7
- 字体注册表设计 → 已移植到 §2.1.1 fonts/
- 文档系统设计 → 已移植到 §7

#### B.3.4 astro-theme-pure

**优势**：
- ✅ **最佳架构**：npm 可分发的 Integration 包（`astro-pure` v1.4.6）
- ✅ Zod `UserConfigSchema` + `.strict()/.refine()/.transform()` — 配置校验最完善
- ✅ 虚拟模块（`virtual:config`, `virtual:project-context`, `virtual:user-css`）— 源自 Starlight 模式
- ✅ 组件分层（basic/pages/user/advanced）— 可覆盖性设计优秀
- ✅ `output: "server"` + Vercel adapter — 原生 SSR 支持
- ✅ TypeScript strict
- ✅ Pagefind `build:done` hook 集成

**劣势**：
- ❌ UnoCSS（非 Tailwind v4）— 与目标技术栈不匹配，迁移成本高
- ❌ 功能较少（无 AI、无通知、无 Widget 系统、无色相调节、无视图系统）
- ❌ 依赖 `astro` 作为 peerDependency（版本耦合）
- ❌ 仅支持 Vercel adapter（未抽象部署适配器）
- ❌ 组件覆盖机制依赖文件系统约定，不如虚拟模块灵活

**可移植资产**：
- Zod 配置校验模式 → 已采纳到 §2.6.2
- 虚拟模块装配模式 → 已在 astro-minimax 中实现
- npm 包分发模式 → 已采纳到 §1.4
- 组件分层覆盖模式 → 可参考

### B.4 选型结论

**推荐方案：以 astro-minimax 当前代码为基础进行重构**

| 考量 | 分析 |
|------|------|
| **功能资产** | astro-minimax 拥有 AI RAG、通知、适配器、偏好系统等独有功能，重写成本极高；其他项目需补齐 80%+ 功能 |
| **技术栈** | astro-minimax 已是 TypeScript strict + Tailwind v4，完全匹配目标；pure 需迁移 UnoCSS，Firefly 需清理 Svelte/Stylus |
| **服务端能力** | astro-minimax 已有 Cloudflare Pages Functions 基础，仅需升级为 hybrid 模式；pure 虽有 SSR 但仅绑定 Vercel |
| **架构问题** | 4 包复杂度已在 v4.1 需求中规划解决（合并为 2 包）；其他项目的架构问题（重复代码/依赖混乱）更难修复 |
| **其他项目优势** | 均已通过设计模式移植到需求文档中（色相系统、Widget、::: 指令、视图系统、Zod 校验等），无需以其为基础 |

**不推荐以其他项目为基础的理由**：
- **Firefly**：78+ 依赖 + Svelte + Stylus 技术债，清理成本 > 在现有基础上重构
- **vergil**：2464 行重复 Layout 代码 + 无 TypeScript 类型 = 重构成本 > 重写
- **pure**：功能太少，需补齐 AI/通知/Widget/色相/视图等 80%+ 功能，不如在已有基础上优化

---

## 附录 C：适配器接口参考

### 通用适配器接口

```typescript
interface Adapter<TConfig> {
  name: string;
  category: 'comments' | 'search' | 'analytics';
  configSchema: ZodSchema<TConfig>;
  init(config: TConfig, context: AdapterContext): Promise<AdapterInstance>;
}

interface AdapterContext {
  themeVars: Record<string, string>;
  lang: string;
  darkMode: boolean;
  events: EventTarget;
}

interface AdapterInstance {
  render(): AstroComponentFactory | string;
  destroy?(): void;
  cssVars?: Record<string, string>;
  navItems?: NavItem[];
  scripts?: { src: string; lazy?: boolean }[];
}
```

### 评论适配器

| 适配器 | 配置类型 | 特殊要求 |
|--------|----------|----------|
| WalineAdapter | `WalineConfig` | 200+ CSS 变量映射，已有深度集成 |
| GiscusAdapter | `GiscusConfig` | GitHub Discussions 后端，需 repo/repoId/category/categoryId |
| TwikooAdapter | `TwikooConfig` | 需 envId（腾讯云/自部署），支持匿名评论 |
| ArtalkAdapter | `ArtalkConfig` | 需 server URL，支持侧边栏管理 |

### 搜索适配器

| 适配器 | 配置类型 | 特殊要求 |
|--------|----------|----------|
| PagefindAdapter | — | 构建时索引，零配置，默认方案 |
| FlexSearchAdapter | `FlexSearchConfig` | 运行时索引，需 CJK 编码器配置 |
| DocSearchAdapter | `DocSearchConfig` | Algolia 托管，需 appId/apiKey/indexName |

### 统计适配器

| 适配器 | 配置类型 | 特殊要求 |
|--------|----------|----------|
| UmamiAdapter | `UmamiConfig` | 自部署或云服务，需 websiteId + src |
| GoogleAnalyticsAdapter | `{ trackingId: string }` | 需 GA4 trackingId |
| BaiduAnalyticsAdapter | `{ token: string }` | 需百度统计 token |

### 自定义适配器

创建自定义适配器的步骤：

1. 实现 `Adapter<TConfig>` 接口
2. 定义 Zod schema 校验配置
3. 在 `init()` 中初始化第三方服务
4. 在 `AdapterInstance` 中提供 `render()`、`destroy()`、`cssVars`、`navItems`
5. 在 integration 中注册适配器

```typescript
// 自定义适配器示例
const myCommentAdapter: Adapter<MyCommentConfig> = {
  name: 'my-comment',
  category: 'comments',
  configSchema: MyCommentConfigSchema,
  async init(config, context) {
    // 初始化第三方评论服务
    return {
      render() { return MyCommentComponent; },
      destroy() { /* 清理 */ },
      cssVars: { '--my-comment-bg': context.themeVars['--surface'] },
      navItems: [{ key: 'comment', label: '留言', href: '/guestbook', enabled: true }],
    };
  },
};
```

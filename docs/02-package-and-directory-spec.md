# 包与目录结构规范

## 1. 文档目标

本规范用于回答以下问题：

- 当前仓库有哪些包、目录和关键入口。
- 每个目录承担什么职责。
- 哪些文件是配置入口、运行时入口、导出入口或共享契约。
- 新需求进入仓库时，应优先落在哪一层。

## 2. 顶层目录规范

### 2.1 `packages/`

存放可复用能力包，是本仓库的主要模块边界。

### 2.2 `apps/`

存放面向最终运行或展示的应用。目前主要 app 为 `apps/blog`。

### 2.3 `docs/`

存放本次建立的 SDD 规范文档。后续所有面向项目结构、核心链路、需求目标、验收标准的长期规范应统一沉淀于此。

### 2.4 Package 根层约定

除 `src/` 之外，各 package 根层还承担对外契约与构建职责。当前仓库中应重点关注：

- `package.json`：定义包名、导出面、bin、发布文件与构建脚本。
- `README.md`：对外使用说明与能力边界文档（若存在）。
- `dist/`：构建产物目录，通常用于发布，不作为手工维护源目录。
- `scripts/`：构建辅助脚本目录（如存在）。

因此在后续 SDD 中，分析 package 时不能只看 `src/`，还必须同步核对根层 `package.json` 的导出契约与发布边界。

## 3. Package 级结构规范

## 3.1 `packages/core`

### 职责

提供博客主题核心能力，是消费端最重要的集成入口。

### 关键入口

- `package.json`：定义 core 包的 exports，对外暴露 `integration`、`pages/*`、`layouts/*.astro`、`components/*`、`styles/*`、`utils/*`、`plugins/*`、`scripts/*` 与 `types`。
- `src/integration.ts`：Astro integration 主入口。
- `src/types.ts`：站点配置与共享类型定义。
- `src/layouts/`：全局布局与页面布局。
- `src/components/`：组件库。
- `src/actions/`：动作执行、初始化、排队与校验相关目录。
- `src/pages/`：被 `injectRoute()` 注入的页面。
- `src/styles/`：主题样式、设计 token、Tailwind source 入口。
- `src/plugins/`：Markdown / Rehype / Shiki 插件。
- `src/preferences/`：偏好设置默认值与客户端初始化逻辑。
- `src/scripts/`：运行时脚本。
- `src/utils/`：内容、路径、阅读时间、分类、标签等辅助逻辑。

### 目录树（当前基线）

```text
packages/core/src/
├── actions/
├── assets/
├── components/
├── layouts/
├── pages/
├── plugins/
├── preferences/
├── scripts/
├── styles/
├── utils/
├── integration.ts
└── types.ts
```

### 关键文件职责矩阵

| 文件                 | 作用                                                                | 何时修改                                     |
| -------------------- | ------------------------------------------------------------------- | -------------------------------------------- |
| `package.json`       | 定义 `@astro-minimax/core` 的对外导出模块和 peer 依赖边界           | 导出契约、发布边界或 peer 依赖变化           |
| `src/integration.ts` | 组装 Astro integration、virtual modules、CSS 入口与 route injection | 站点装配方式、路由注入规则、虚拟模块契约变化 |
| `src/types.ts`       | 定义 `SiteConfig`、`SocialLink`、`FriendLink` 等核心类型            | 配置结构、公开类型边界变化                   |
| `src/pages/*`        | 承载被注入的实际路由页面                                            | 页面路由或页面内容结构变化                   |
| `src/plugins/*`      | 承载 Markdown / Rehype / Shiki 处理逻辑                             | 内容渲染规则变化                             |
| `src/styles/*`       | 承载主题 token、样式入口和全局视觉规则                              | 主题风格、全局样式系统变化                   |
| `src/preferences/*`  | 承载用户偏好默认值与客户端初始化                                    | 偏好系统、默认阅读/布局策略变化              |

### 目录角色说明

#### `components/`

用于沉淀可复用 UI 组件。若需求只影响某一页面但可抽象为通用渲染单元，应优先进入该目录，而不是直接堆到 page 文件中。

#### `pages/`

用于承载最终注入到 app 的页面路由实现。应用层默认不直接复制这些页面，而是通过 integration 自动挂载。

#### `styles/`

用于承载 Tailwind source 声明、主题 CSS、动作样式与整体视觉基础。任何影响主题级视觉的一致性调整，应优先落在这里，而不是散落到 app 层样式。

#### `plugins/`

用于承载 Markdown 处理链能力，例如 remark / rehype / 代码块变换器。凡是“内容渲染规则”相关需求，应优先考虑是否属于该层。

#### `utils/`

用于承载与文章集合、标签、分类、阅读时间、slug、OG 图等相关的纯逻辑工具。禁止把页面耦合逻辑混入这里。

#### `actions/`

用于承载动作执行器、初始化、队列、参数校验与 URL 处理等动作层逻辑。凡是可抽象为“动作执行 / 排队 / 校验”的通用能力，应优先收敛到这一层，而不是散落到页面或脚本中。

## 3.2 `packages/ai`

### 职责

提供 AI 运行时、检索、提示词、流式响应、provider 管理和聊天 UI 相关能力。

### 当前目录结构

- `package.json`：定义 `astro-ai-dev` bin、exports、files、build/test/typecheck 脚本与发布边界。
- `cache/`：缓存相关能力。
- `components/`：AI Chat 相关前端组件。
- `data/`：AI 数据读写或运行时数据逻辑。
- `errors/`：错误定义。
- `extensions/`：扩展加载与合并逻辑。
- `fact-registry/`：事实注册表相关能力。
- `intelligence/`：问题理解、证据分析、引用选择、回答模式等智能决策逻辑。
- `middleware/`：限流、请求环境等中间件逻辑。
- `prompt/`：提示词相关能力。
- `provider-manager/`：provider 可用性与故障切换管理。
- `providers/`：具体 provider 适配层。
- `query/`：检索查询相关逻辑。
- `search/`：文章、项目、chunk 检索与上下文拼装。
- `server/`：聊天处理与 server 入口。
- `stream/`：流式响应相关能力。
- `structured-output/`：结构化输出能力。
- `styles/`：AI 组件样式 source。
- `tools/`：供 AI 使用的工具能力。
- `types/`、`utils/`：类型和通用辅助逻辑。

### 目录树（当前基线）

```text
packages/ai/src/
├── cache/
├── components/
├── constants.ts
├── data/
├── errors/
├── extensions/
├── fact-registry/
├── intelligence/
├── middleware/
├── prompt/
├── provider-manager/
├── providers/
├── query/
├── search/
├── server/
├── stream/
├── structured-output/
├── styles/
├── tools/
├── types/
├── utils/
└── index.ts
```

### 关键文件角色

- `src/server/chat-handler.ts`：AI 聊天主链路编排中心。
- `src/server/index.ts`：server 能力导出入口。
- `src/index.ts`：包级主导出入口。
- `src/constants.ts`：AI 运行约束常量。

### 关键文件职责矩阵

| 文件                         | 作用                                                                                                           | 何时修改                             |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `package.json`               | 定义 `@astro-minimax/ai` 的 bin、exports、发布文件和构建/测试脚本                                              | 包发布形态、bin 或 exports 变化      |
| `src/index.ts`               | 汇总导出 provider-manager、middleware、cache、search、intelligence、prompt、data、fact-registry、server 等模块 | 公开 API 面变化                      |
| `src/server/index.ts`        | 暴露聊天处理、metadata 初始化与 server 类型                                                                    | app API 封装需要接入新的 server 能力 |
| `src/server/chat-handler.ts` | 编排聊天请求校验、检索、证据分析、提示词组装、流式响应、缓存与通知                                             | AI 主流程逻辑变化                    |
| `src/search/*`               | 负责文章/项目检索与上下文组织                                                                                  | 检索命中策略、搜索数据源变化         |
| `src/intelligence/*`         | 负责关键词提取、证据分析、引用选择和回答模式判断                                                               | 智能决策策略变化                     |
| `src/provider-manager/*`     | 负责 provider 可用性、优先级与 failover                                                                        | provider 调度与健康策略变化          |
| `src/extensions/*`           | 负责扩展装载与扩展结果合并                                                                                     | 扩展机制变化                         |

### 结构约束

- 任何对聊天主流程的改动，应优先保持在 `server/` 作为 orchestration，而不是把全部逻辑压回单文件。
- 任何对检索逻辑的增强，应优先落在 `search/` 或 `intelligence/`，不要直接污染 API 封装层。
- 任何 provider 接入，不应绕过 `provider-manager/` 直接硬编码到 handler。

## 3.3 `packages/notify`

### 职责

提供事件通知、多渠道下发与 webhook 处理能力。

### 当前目录结构

- `package.json`：定义 notify 包主入口、types、exports、files 与 build 流程。
- `notify.ts`：通知器核心实现。
- `comment-webhook.ts`：评论 webhook 入口处理。
- `config.ts`：通知配置相关逻辑。
- `events/`：事件模型或事件相关逻辑。
- `providers/`：Telegram / Webhook / Email provider。
- `templates/`：通知模板。
- `types.ts`：公开类型契约。
- `utils.ts` / `provider-helpers.ts`：辅助函数。

### 目录树（当前基线）

```text
packages/notify/src/
├── comment-webhook.ts
├── config.ts
├── events/
├── index.ts
├── notify.ts
├── provider-helpers.ts
├── providers/
├── templates/
├── types.ts
└── utils.ts
```

### 关键文件职责矩阵

| 文件                     | 作用                                                                  | 何时修改                         |
| ------------------------ | --------------------------------------------------------------------- | -------------------------------- |
| `package.json`           | 定义 `@astro-minimax/notify` 的发布入口、types、exports 与 build 约定 | 发布边界、导出路径或构建方式变化 |
| `src/index.ts`           | 暴露 `createNotifier`、`handleCommentWebhook`、环境配置构造与公开类型 | 包公开接口变化                   |
| `src/notify.ts`          | 统一事件标准化、模板合并、provider 并发发送与结果汇总                 | 通知分发核心逻辑变化             |
| `src/comment-webhook.ts` | 解析 Waline payload，拼接文章信息并调用 notifier                      | 评论 webhook 协议或入口行为变化  |
| `src/config.ts`          | 从环境变量生成通知配置                                                | 环境配置约定变化                 |
| `src/providers/*`        | 封装 Telegram / Webhook / Email 渠道差异                              | 新增渠道或已有渠道发送逻辑变化   |
| `src/templates/*`        | 定义各事件类型的消息内容模板                                          | 通知展示文案或 payload 结构变化  |

### 结构约束

- 事件分发逻辑统一进入 `notify.ts`。
- 渠道差异应收敛在 `providers/`。
- 展示文案差异应收敛在 `templates/`。
- API 层不得直接拼装第三方请求，必须通过 provider 层完成。

## 3.4 `packages/cli`

### 职责

提供本地开发与内容生产工具链。

### 当前目录结构

- `package.json`：定义 `astro-minimax` bin、files 与 build/dev/typecheck 脚本。
- `src/index.ts`：CLI 入口，负责命令分发。
- `src/commands/`：子命令实现。
- `src/tools/`：底层工具脚本或辅助执行能力。
- `template/`：默认项目模板目录，供 `init` 命令复制生成新博客。
- `template-pwa/`：PWA 增量模板目录，供 `init --pwa` 叠加复制。

### 目录树（当前基线）

```text
packages/cli/src/
├── commands/
│   ├── ai/
│   ├── data.ts
│   ├── hooks.ts
│   ├── init.ts
│   └── post.ts
├── index.ts
└── tools/
```

### 根层模板目录说明

- `template/`：CLI 初始化博客时的基础模板来源。
- `template-pwa/`：启用 `--pwa` 时叠加复制的模板来源，用于补充 PWA 相关资源。

这两个目录不是普通静态资源目录，而是 `init` 命令的真实脚手架输入。

### `commands/` 当前角色划分

- `init.ts`：初始化项目。
- `post.ts`：文章创建、列表、统计。
- `data.ts`：数据状态与清理。
- `hooks.ts`：Git hooks 安装与状态。
- `ai/index.ts`：AI 子命令总入口。
- `ai/profile.ts`：作者画像命令。
- `ai/facts.ts`：事实注册表命令。
- `ai/extensions.ts`：AI 扩展命令。
- `ai/run-tool.ts`：运行工具脚本。

### 关键文件职责矩阵

| 文件                       | 作用                                                        | 何时修改                         |
| -------------------------- | ----------------------------------------------------------- | -------------------------------- |
| `package.json`             | 定义 CLI 包的 bin、发布文件和构建脚本，是命令行发布契约入口 | bin 路径、发布策略或脚本约定变化 |
| `src/index.ts`             | CLI 根入口，负责帮助信息、版本信息、命令注册与统一错误出口  | 新增顶层命令或修改 CLI 总体交互  |
| `src/commands/post.ts`     | 文章创建、枚举与统计                                        | 文章工作流变化                   |
| `src/commands/ai/index.ts` | AI 子命令入口与 blog 根目录前置校验                         | AI 子命令树变化                  |
| `src/commands/init.ts`     | 初始化项目骨架                                              | 初始化模板或启动流程变化         |
| `src/commands/data.ts`     | 数据状态与清理                                              | 数据目录管理行为变化             |
| `src/commands/hooks.ts`    | hooks 安装、卸载、状态                                      | Git hooks 工作流变化             |

### 结构约束

- 顶层 `index.ts` 只做命令注册与错误出口，不承担业务实现。
- 子命令逻辑必须继续收敛到 `commands/`。
- 与工作目录、内容目录、数据目录强耦合的 CLI 行为，应显式做 blog 根目录判断。

## 3.5 `packages/knowledge-model`（辅助共享契约层）

### 职责

作为 AI 知识数据的共享模型层，为 `packages/ai` 与 `packages/cli` 提供共同依赖的 schema 与类型边界。该包在当前项目基线中属于支撑层，而不是最终站点主功能包。

### 当前关键内容

- schema 常量：bundle / corpus / passages / summaries / vectors。
- `KnowledgeDocument`：文档级知识结构。
- `KnowledgePassage`：片段级知识结构。
- `KnowledgeCorpusFile` / `KnowledgePassagesFile` / `KnowledgeSummariesFile`：文件级结构。
- `KnowledgeBundleRuntime` / `KnowledgeBundleFile`：运行时 bundle 结构。

### 关键文件职责矩阵

| 文件           | 作用                                                                           | 何时修改             |
| -------------- | ------------------------------------------------------------------------------ | -------------------- |
| `src/index.ts` | 集中定义知识 bundle、corpus、passages、summaries、runtime 的 schema 常量与类型 | 共享知识数据结构变化 |

### 结构约束

- `cli` 产出的知识数据与 `ai` 消费的知识数据，必须共享该包定义的契约。
- 不允许在上层包中复制并漂移知识 schema。

## 4. App 级结构规范

## 4.1 `apps/blog`

### 职责

作为示例站点与集成消费端，负责提供配置、内容、API 封装和部署配置。

### 当前关键文件与目录

- `package.json`：app 级脚本入口，定义 `dev`、`build`、`preview`、`typecheck`、`post:new`、`ai:*` 等工作流。
- `astro.config.ts`：应用级 Astro 配置入口。
- `src/config.ts`：站点配置核心入口。
- `src/constants.ts`：社交与分享链接配置。
- `src/content.config.ts`：内容集合 schema。
- `src/data/`：文章内容、向量数据、好友链接等。
- `functions/api/`：Cloudflare Pages Functions API 入口。
- `datas/`：AI 运行时数据资产。

### App 根目录说明

- `wrangler.toml`：Cloudflare Pages / Workers 部署与绑定配置入口。
- `public/`：静态资源目录，当前包含字体、图片、PWA 资源、Service Worker、headers 与演示内容。
- `tools/`：app 层辅助脚本目录，当前包含 AI 问题测试脚本。
- `Dockerfile`：容器镜像构建入口。
- `docker-compose.yml` / `docker-compose.dev.yml`：容器编排配置。
- `Caddyfile`：反向代理或静态服务配置。
- `.env` / `.env.docker.example`：环境变量样例与本地/容器运行配置。
- `tsconfig.json` / `eslint.config.js`：app 级类型检查与 lint 配置。

### `src/` 目录说明

- `assets/`：站点静态资源。
- `config.ts`：`SITE` 配置对象，包含导航、特性开关、AI、Waline、Umami、赞赏等配置。
- `content.config.ts`：内容 schema 定义。
- `data/`：`blog/en`、`blog/zh`、`friends.ts`、`vectors/` 等站点数据。
- `env.d.ts`：类型声明。
- `types/`：应用层类型补充。
- `pages/`：当前工作区中物理存在该目录，但根据项目集成基线，它不是主路由来源；当前博客主要页面仍由 `packages/core/src/integration.ts` 通过 route injection 注入。

### 目录树（当前基线）

```text
apps/blog/src/
├── assets/
├── config.ts
├── constants.ts
├── content.config.ts
├── data/
├── env.d.ts
├── pages/
└── types/
```

### 关键文件职责矩阵

| 文件                              | 作用                                                                                           | 何时修改                           |
| --------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------- |
| `astro.config.ts`                 | 应用级 Astro 配置入口，装配 minimax integration、MDX、Preact、Sitemap、Vite alias 和 dev proxy | 应用装配方式、插件链或构建配置变化 |
| `src/config.ts`                   | 站点核心配置，定义导航、特性开关、AI、Waline、Umami、赞赏等                                    | 站点业务配置变化                   |
| `src/constants.ts`                | 定义 `SOCIALS` 与 `SHARE_LINKS`                                                                | 社交链接或分享策略变化             |
| `src/content.config.ts`           | 定义 blog collection loader 与 frontmatter schema                                              | 内容结构、frontmatter 契约变化     |
| `src/data/blog/*`                 | 实际文章内容源                                                                                 | 新增或修改站点内容                 |
| `src/data/friends.ts`             | 友情链接数据源                                                                                 | 友情链接展示数据变化               |
| `functions/api/chat.ts`           | AI Chat Cloudflare Pages API 入口                                                              | AI API 对外入口变化                |
| `functions/api/shared-ai-env.ts`  | 负责把 Pages env 与 `SITE.ai` 默认值融合                                                       | AI 运行时环境映射变化              |
| `functions/api/notify/comment.ts` | 评论通知 webhook 对外入口                                                                      | 通知入口协议变化                   |

### `functions/api/` 目录说明

- `chat.ts`：AI Chat API 入口。
- `ai-info.ts`：AI 状态信息入口。
- `shared-ai-env.ts`：Cloudflare env 与站点 AI 配置融合入口。
- `notify/comment.ts`：评论通知 webhook 入口。
- `notify/status.ts`：通知状态入口。

### 关于 `apps/blog/src/pages/` 的基线说明

为了避免将“目录物理存在”误写成“当前主架构依赖”，这里单独明确：

- 从工作区目录读取结果看，`apps/blog/src/pages/` 当前确实存在。
- 但从项目说明与 `packages/core/src/integration.ts` 的注入模式看，当前博客站点的主页面体系并不以 app 自己的 `src/pages/` 作为核心来源。
- 因此在后续 SDD 中，凡涉及主站点页面路由，应优先核对 `packages/core/src/pages/` 与 `packages/core/src/integration.ts`，而不是默认把 `apps/blog/src/pages/` 当作权威入口。

## 5. 跨包依赖关系规范

当前依赖关系可概括为：

- `apps/blog` 依赖 `core`、`ai`、`notify`、`cli`
- `ai` 依赖 `knowledge-model` 与 `notify`
- `cli` 依赖 `knowledge-model`
- `core` 为主题与路由底座，可被 app 直接集成

这意味着：

- `knowledge-model` 是共享契约底层。
- `ai` 与 `cli` 在知识数据层共享语义，但职责不同。
- `apps/blog` 是上层装配者，不应反向侵入 package 内部私有实现。

## 6. 新需求落点决策规范

### 6.1 页面表现或主题能力

优先进入 `packages/core`。

### 6.2 博客站点特定配置或内容数据

优先进入 `apps/blog`。

### 6.3 AI 检索、对话、prompt、provider、扩展

优先进入 `packages/ai`。

### 6.4 通知事件、渠道、模板、webhook

优先进入 `packages/notify`。

### 6.5 本地命令、批处理、数据生成工具

优先进入 `packages/cli`。

### 6.6 知识 bundle 契约

优先进入 `packages/knowledge-model`。

## 7. 文档更新触发条件

出现以下情况时必须更新本文：

- 新增 package 或 app。
- package 内出现新的一级目录职责层。
- 关键入口文件发生迁移。
- 路由注入模式被替换。
- CLI 命令树发生明显调整。

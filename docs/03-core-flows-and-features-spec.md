# 核心链路与功能特性规范

## 1. 文档目标

本规范用于沉淀当前项目中最重要的运行与构建链路，避免后续需求只看单文件而误判真实执行路径。

## 2. Astro 集成与站点装配链路

## 2.1 链路目标

将 app 层提供的站点配置、社交数据、好友数据、内容目录与可选 AI / 可视化能力装配为一个可运行的 Astro 博客站点。

## 2.2 核心入口

- `apps/blog/astro.config.ts`
- `apps/blog/src/config.ts`
- `apps/blog/src/constants.ts`
- `apps/blog/src/data/friends.ts`
- `packages/core/src/integration.ts`

## 2.3 链路步骤

1. `apps/blog/astro.config.ts` 调用 `minimax({...})`。
2. app 将 `SITE`、`SOCIALS`、`SHARE_LINKS`、`FRIENDS`、`blogPath`、可视化配置、preferences 默认值传入 core integration。
3. `packages/core/src/integration.ts` 在 `astro:config:setup` 阶段：
   - 检查是否安装 `@astro-minimax/ai`。
   - 生成 `.astro/minimax-styles.css`。
   - 注册 virtual modules。
   - 注入 remark / rehype 插件。
   - 按 feature 开关注入页面路由。
4. 在 `astro:config:done` 阶段，通过 `injectTypes()` 为 virtual modules 补充类型。

## 2.4 关键特性

### Virtual Module 装配

当前 integration 会生成并暴露以下关键虚拟模块：

- `virtual:astro-minimax/config`
- `virtual:astro-minimax/constants`
- `virtual:astro-minimax/user-data`
- `virtual:astro-minimax/styles`
- `virtual:astro-minimax/ai-widget`
- `virtual:astro-minimax/ai-seo`
- preferences 与 viz 初始化相关模块

这意味着 app 侧配置不会被页面直接硬编码 import 多处，而是通过 integration 统一注入运行时。

### Route Injection

核心页面不是由 app 的 `src/pages/` 直接定义，而是由 `core` 注入，包括：

- 首页、404、robots、OG、RSS
- 多语言首页与 about
- posts 列表与详情
- 根据 feature 开关决定是否注入 tags / categories / series / archives / search / friends / projects

### CSS 入口生成

integration 会基于 app 的 `srcDir` 生成样式入口，组合：

- `tailwindcss`
- app `src`
- `@astro-minimax/core/styles/source.css`
- 若安装 AI 包则引入其 `styles/source.css`
- `@astro-minimax/core/styles/theme.css`
- `@astro-minimax/core/styles/actions.css`

### 关键文件分工

| 文件                               | 在链路中的职责                                                       |
| ---------------------------------- | -------------------------------------------------------------------- |
| `apps/blog/astro.config.ts`        | 提供 app 级 integration 参数、Markdown 插件链、Vite alias、dev proxy |
| `apps/blog/src/config.ts`          | 提供 `SITE` 配置，决定 feature、AI、评论、分析等站点能力             |
| `apps/blog/src/constants.ts`       | 提供社交与分享链接数据                                               |
| `packages/core/src/integration.ts` | 接收 app 数据并转化为 virtual modules、样式入口和路由注入            |
| `packages/core/src/types.ts`       | 为 `SITE`、社交链接、好友链接等提供统一类型边界                      |

## 2.5 验收关注点

- 修改站点特性开关时，是否正确影响路由注入。
- 修改 theme 或 source.css 时，是否仍能被 integration 生成的样式入口正确消费。
- 修改 virtual modules 时，是否同步维护类型注入。

## 3. 内容与站点配置链路

## 3.1 链路目标

将 `apps/blog` 中的站点配置、文章内容、社交链接、好友链接组织为站点可消费的数据源。

## 3.2 核心入口

- `apps/blog/src/config.ts`
- `apps/blog/src/content.config.ts`
- `apps/blog/src/data/blog/`
- `apps/blog/src/constants.ts`
- `apps/blog/src/data/friends.ts`

## 3.3 配置特性细节

`SITE` 当前至少承载以下配置域：

- 站点基础信息：网址、作者、描述、标题、语言、时区。
- 列表分页与时间策略。
- 编辑链接。
- 动态 OG 开关。
- 功能开关：tags、categories、series、archives、friends、projects、search。
- 深色模式与导航项。
- 项目列表。
- Umami 分析配置。
- Waline 评论配置。
- AI 配置：endpoint、mock、缓存、超时、健康阈值。
- 赞赏与版权信息。

## 3.4 内容组织特性

- 博客内容按 `zh` / `en` 组织。
- 存在 `_examples`、`_releases` 等内容分组目录。
- 内容 schema 由 `src/content.config.ts` 统一约束。

## 3.5 验收关注点

- 新增内容目录时，是否与 `blogPath` 约定一致。
- 修改 `SITE.ai`、`SITE.features`、`SITE.waline` 等配置时，是否与 API / 路由 / UI 行为保持一致。
- 新增 frontmatter 约束时，是否同步进入 content schema。

### 关键文件分工

| 文件                              | 在链路中的职责                                                   |
| --------------------------------- | ---------------------------------------------------------------- |
| `apps/blog/src/content.config.ts` | 定义 blog collection 的 loader、ID 生成规则与 frontmatter schema |
| `apps/blog/src/config.ts`         | 提供内容系统依赖的作者、语言、AI 与功能开关默认值                |
| `apps/blog/src/constants.ts`      | 提供内容页中使用的社交分享数据                                   |
| `apps/blog/src/data/blog/*`       | 作为博客正文与 frontmatter 的实际数据源                          |

## 4. AI Chat / RAG 链路

## 4.1 链路目标

基于博客知识数据，为站点提供 AI 对话、上下文检索、证据分析、流式回答与 provider failover 能力。

## 4.2 核心入口

- `apps/blog/functions/api/chat.ts`
- `apps/blog/functions/api/shared-ai-env.ts`
- `packages/ai/src/server/index.ts`
- `packages/ai/src/server/chat-handler.ts`
- `apps/blog/datas/knowledge/runtime/knowledge-bundle.json`

## 4.3 链路步骤

1. 请求进入 `apps/blog/functions/api/chat.ts`。
2. 通过 `createAiFunctionEnv()` 将 Cloudflare env 与 `SITE.ai` 默认配置合并。
3. 通过 `initializeMetadata({ knowledgeBundle }, env)` 注入知识 bundle 元数据。
4. 调用 `handleChatRequest()` 进入 AI 主流程。
5. `chat-handler.ts` 执行：
   - 请求方法与 CORS 校验。
   - 限流检查。
   - 请求体解析与消息过滤。
   - 输入长度校验。
   - timeout / cache / provider manager / extensions 初始化。
   - 搜索、证据分析、提示词组装。
   - 流式生成与失败回退。
   - 缓存与通知处理。

## 4.4 功能特性细节

从 `chat-handler.ts` 当前实现可以确认以下特性：

- 支持请求级 timeout 控制。
- 支持关键词提取与本地搜索查询构造。
- 支持相关文章与项目检索。
- 支持证据预算与引用选择。
- 支持 session 级上下文缓存与响应缓存。
- 支持 provider manager 与 mock fallback。
- 支持扩展注册表与事实合并。
- 支持流式状态写入、文本 chunk 输出与完成事件。
- 支持通知发送。

### 关键文件分工

| 文件                                       | 在链路中的职责                                                          |
| ------------------------------------------ | ----------------------------------------------------------------------- |
| `apps/blog/functions/api/chat.ts`          | 作为 `/api/chat` 入口，装载 knowledge bundle 并调用 AI server handler   |
| `apps/blog/functions/api/shared-ai-env.ts` | 将 Cloudflare Pages env 和 `SITE.ai` 默认值合并为 `ChatHandlerEnv`      |
| `packages/ai/src/server/index.ts`          | 暴露 `handleChatRequest`、`initializeMetadata`、`applyAiConfigDefaults` |
| `packages/ai/src/server/chat-handler.ts`   | 聊天主流程编排：校验、检索、分析、生成、缓存、通知                      |
| `packages/ai/src/search/*`                 | 负责相关文章、项目、chunk 检索                                          |
| `packages/ai/src/intelligence/*`           | 负责关键词提取、答案模式、证据分析、引用选择                            |
| `packages/ai/src/provider-manager/*`       | 负责 provider 选择与 failover                                           |

### 链路检查点

在后续修改 AI 链路时，至少要检查以下阶段是否仍然成立：

1. 请求是否被正确解析并通过方法、限流、输入校验。
2. knowledge bundle 是否已在 handler 前初始化。
3. 检索阶段是否仍能产出 article / project / chunk 上下文。
4. 提示词拼装是否仍能消费检索与证据分析结果。
5. 流式输出、缓存与通知是否仍位于主流程闭环内。

## 4.5 关键约束

- API 层只应做环境组装与 handler 调用，不应重写聊天主逻辑。
- 知识 bundle 必须在调用 handler 前完成 metadata 初始化。
- `SITE.ai` 是 blog app 层的默认配置来源，避免在 function 层散落重复默认值。

## 4.6 验收关注点

- 修改 AI endpoint 或 env 映射后，`/api/chat` 是否仍能正确构造 `ChatHandlerEnv`。
- 修改检索或提示词逻辑后，是否仍能完成流式响应。
- 修改 provider failover 后，是否仍保留 mock fallback 或错误出口。

## 5. 通知链路

## 5.1 链路目标

为评论事件和 AI 对话事件提供可选的多渠道通知。

## 5.2 核心入口

- `apps/blog/functions/api/notify/comment.ts`
- `packages/notify/src/comment-webhook.ts`
- `packages/notify/src/notify.ts`
- `packages/notify/src/providers/*`
- `packages/notify/src/templates/*`

## 5.3 链路步骤

1. 评论 webhook 请求进入 `apps/blog/functions/api/notify/comment.ts`。
2. 该入口直接调用 `handleCommentWebhook()`。
3. `packages/notify` 内部按配置创建 notifier。
4. `notify.ts` 将事件标准化为 comment 或 ai-chat 事件。
5. 根据配置决定是否创建 telegram / webhook / email provider。
6. 根据事件类型选择模板。
7. 并发发送到各 provider，并汇总结果。

## 5.4 功能特性细节

- provider 是可选的，没有 provider 时会给出 warning。
- 发送采用并发收敛，并将失败转换为结果对象，而不是直接中断主流程。
- 事件模板支持自定义覆盖并与默认模板合并。
- 支持 `comment()`、`aiChat()`、`send()` 三种入口。

### 关键文件分工

| 文件                                        | 在链路中的职责                                       |
| ------------------------------------------- | ---------------------------------------------------- |
| `apps/blog/functions/api/notify/comment.ts` | 暴露 Cloudflare Pages comment webhook 入口           |
| `packages/notify/src/comment-webhook.ts`    | 解析 Waline payload、补全文章信息、构建 comment 事件 |
| `packages/notify/src/config.ts`             | 从 env 生成 provider 配置                            |
| `packages/notify/src/notify.ts`             | 统一模板合并、provider 创建与发送结果汇总            |
| `packages/notify/src/providers/*`           | 分别处理 Telegram / Webhook / Email 发送             |
| `packages/notify/src/templates/*`           | 定义 comment / ai-chat 对应模板                      |

## 5.5 验收关注点

- 新增通知渠道时，是否仍沿用 provider 抽象而非侵入核心分发逻辑。
- 修改模板时，是否会影响 comment 与 ai-chat 两类事件的分流。
- webhook 错误是否被限制在通知链路内，而不破坏主业务返回。

## 6. CLI 与数据处理链路

## 6.1 链路目标

提供内容创建、博客数据状态检查、AI 数据加工、事实注册表、扩展管理与 hooks 管理等命令能力。

## 6.2 核心入口

- `packages/cli/src/index.ts`
- `packages/cli/src/commands/post.ts`
- `packages/cli/src/commands/ai/index.ts`
- `apps/blog/package.json` 中的 CLI 脚本

## 6.3 总体链路

1. 用户执行 `astro-minimax` 命令。
2. `packages/cli/src/index.ts` 分发到 `init`、`post`、`ai`、`data`、`hooks`。
3. 子命令根据当前工作目录检查是否是合法 blog 根目录。
4. 需要运行工具脚本时，通过 `run-tool` 执行。
5. 输出结果到终端。

## 6.4 `post` 特性细节

当前 `post.ts` 支持：

- `new <title>`：创建新文章。
- `list`：列出现有文章。
- `stats`：输出中英文文章统计。

其内部约束包括：

- 必须存在 `src/data/blog`。
- 新文章写入 `src/data/blog/<lang>/`。
- 自动生成 slug 与基础 frontmatter。
- `list` 会递归读取 markdown / mdx 文件并解析标题、日期、draft 状态。

## 6.5 `ai` 子命令特性细节

当前 `ai/index.ts` 支持：

- `process`
- `seo`
- `summary`
- `eval`
- `profile`
- `facts`
- `extensions`

并对以下目录前提进行显式校验：

- `src/data/blog`
- `datas`

## 6.6 验收关注点

- 命令新增后，是否同步注册到 CLI 入口帮助信息。
- 子命令是否正确校验 blog 根目录。
- 输出是否符合现有 CLI 交互风格。

### 关键文件分工

| 文件                                    | 在链路中的职责                                                   |
| --------------------------------------- | ---------------------------------------------------------------- |
| `packages/cli/src/index.ts`             | CLI 根命令分发与统一错误出口                                     |
| `packages/cli/src/commands/post.ts`     | 文章新建、列表、统计                                             |
| `packages/cli/src/commands/ai/index.ts` | AI 子命令调度与 blog 根目录前置校验                              |
| `apps/blog/package.json`                | 将 CLI 能力映射为 `post:new`、`ai:process`、`ai:eval` 等项目脚本 |

### 链路检查点

在后续修改 CLI / 数据链路时，至少要检查：

1. 命令是否仍在入口文件注册。
2. 帮助信息是否与实际能力同步。
3. 工作目录前置校验是否仍正确。
4. 若命令生成内容或数据文件，生成路径是否仍与 app 目录约定一致。

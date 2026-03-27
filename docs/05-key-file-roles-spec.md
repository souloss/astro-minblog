# 关键文件作用规范

## 1. 文档目标

本规范专门回答“文件作用”这一层级的问题，用于补足目录级说明与链路级说明之间的空白。

本文件不试图穷举仓库中的每一个源文件，而是聚焦对架构理解、需求分析、实现落点与验收判断最关键的一组文件。后续进行 SDD 开发时，应优先从本文件定位“哪一个文件是某类能力的真正入口”。

## 2. 顶层关键文件

| 文件                  | 作用                                                                                     | 备注                         |
| --------------------- | ---------------------------------------------------------------------------------------- | ---------------------------- |
| `package.json`        | Monorepo 顶层脚本入口，定义 `dev`、`build`、`lint`、`format`、`postinstall` 等统一工作流 | 用于理解仓库级开发与构建方式 |
| `pnpm-workspace.yaml` | 定义工作区范围：`packages/*` 与 `apps/*`                                                 | 用于确定 monorepo 包边界     |

## 2.1 Package 根层契约文件

| 文件                           | 作用                                                                                                             | 备注                           |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| `packages/core/package.json`   | 定义 core 包 exports，对外暴露 integration、pages、layouts、components、styles、utils、plugins、scripts 与 types | 用于理解主题包如何被 app 消费  |
| `packages/ai/package.json`     | 定义 ai 包的 `astro-ai-dev` bin、exports、files、build/test/typecheck 脚本                                       | 用于理解 AI 包如何发布与运行   |
| `packages/notify/package.json` | 定义 notify 包的主入口、types、exports 与 build 流程                                                             | 用于理解通知包的发布契约       |
| `packages/cli/package.json`    | 定义 CLI 包的 `astro-minimax` bin、files 和 build/dev/typecheck 脚本                                             | 用于理解 CLI 分发与运行方式    |
| `apps/blog/package.json`       | 定义 app 级 `dev/build/preview/typecheck`、`post:new`、`ai:*` 等脚本                                             | 用于理解 blog app 的日常工作流 |

## 3. `packages/core` 关键文件作用

### 3.1 集成与类型

| 文件                                   | 作用                                                                                                | 典型修改场景                                    |
| -------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `packages/core/package.json`           | 定义 `@astro-minimax/core` 的 exports 与对外可见模块路径                                            | 导出约定或 peer 依赖边界变化                    |
| `packages/core/src/integration.ts`     | `@astro-minimax/core` 的 Astro integration 主入口，负责 virtual modules、样式入口与 route injection | 路由注入规则、集成参数、virtual module 契约变更 |
| `packages/core/src/types.ts`           | 定义 `SiteConfig`、`AiConfig`、`SocialLink`、`FriendLink` 等公开类型                                | 站点配置结构或公开接口变更                      |
| `packages/core/src/astro-minimax.d.ts` | 补充包内类型声明                                                                                    | 公开类型或模块声明补充                          |

### 3.2 页面与布局

| 文件/目录                       | 作用                                                      | 典型修改场景                               |
| ------------------------------- | --------------------------------------------------------- | ------------------------------------------ |
| `packages/core/src/layouts/`    | 承载全局布局与文章布局等结构性 UI                         | 布局层级、页面骨架、全局容器变化           |
| `packages/core/src/pages/`      | 承载被 integration 注入的实际页面                         | 首页、文章页、标签页、分类页等路由逻辑变化 |
| `packages/core/src/components/` | 承载复用组件                                              | 页面单元、导航、卡片、交互组件变化         |
| `packages/core/src/actions/`    | 承载动作执行器、初始化、队列、校验与 URL 处理等动作层逻辑 | 动作调度或执行流程变化                     |

### 3.3 内容处理与表现层辅助

| 文件/目录                        | 作用                                                  | 典型修改场景                  |
| -------------------------------- | ----------------------------------------------------- | ----------------------------- |
| `packages/core/src/plugins/`     | Remark、Rehype、Shiki 相关处理链                      | Markdown 渲染规则变化         |
| `packages/core/src/styles/`      | 主题样式、Tailwind source 与动作样式                  | 全局样式系统、主题 token 变化 |
| `packages/core/src/scripts/`     | 客户端脚本，例如主题、灯箱、性能、阅读位置等          | 浏览器端交互脚本变化          |
| `packages/core/src/utils/`       | 分类、标签、阅读时间、slug、OG 图、文章排序等工具函数 | 内容辅助算法变化              |
| `packages/core/src/preferences/` | 偏好默认值与客户端初始化                              | 阅读偏好、外观偏好系统变化    |

## 4. `packages/ai` 关键文件作用

### 4.1 包级导出与 server 入口

| 文件                              | 作用                                                                                   | 典型修改场景                          |
| --------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------- |
| `packages/ai/package.json`        | 定义 `astro-ai-dev` bin、exports、files 与 build/test/typecheck 脚本                   | 包发布形态、bin 或 exports 变化       |
| `packages/ai/src/index.ts`        | 汇总导出 provider-manager、middleware、cache、search、prompt、server 等模块            | 包公开 API 面变化                     |
| `packages/ai/src/server/index.ts` | 导出 `handleChatRequest`、`initializeMetadata`、`applyAiConfigDefaults` 等 server 能力 | app 侧 API 封装需要接入新 server 能力 |
| `packages/ai/src/constants.ts`    | 定义聊天流程中的限制、常量与共享配置项                                                 | AI 主流程常量策略变化                 |

### 4.2 聊天主链路

| 文件                                      | 作用                                                                   | 典型修改场景                  |
| ----------------------------------------- | ---------------------------------------------------------------------- | ----------------------------- |
| `packages/ai/src/server/chat-handler.ts`  | AI Chat 主编排文件，负责请求校验、检索、证据分析、生成、缓存和通知闭环 | 聊天主流程变化                |
| `packages/ai/src/server/prompt-runtime.*` | 提示词运行时组装                                                       | Prompt 结构、系统提示策略变化 |
| `packages/ai/src/server/stream-helpers.*` | 流式输出辅助逻辑                                                       | 流式消息结构、状态写入变化    |
| `packages/ai/src/server/chat-utils.*`     | 通知、超时、健康配置等辅助逻辑                                         | Handler 辅助策略变化          |

### 4.3 检索、智能决策与 provider

| 目录                                | 作用                                                   | 典型修改场景                 |
| ----------------------------------- | ------------------------------------------------------ | ---------------------------- |
| `packages/ai/src/search/`           | 负责文章、项目、chunk 与 session context 的检索组织    | 搜索上下文、检索命中逻辑变化 |
| `packages/ai/src/intelligence/`     | 负责关键词提取、答案模式、证据预算、引用选择、证据分析 | 智能分析策略变化             |
| `packages/ai/src/provider-manager/` | 负责 provider 注册、优先级、健康判断与 failover        | provider 调度与恢复策略变化  |
| `packages/ai/src/cache/`            | 负责全局缓存、响应缓存与缓存配置                       | 缓存策略变化                 |
| `packages/ai/src/extensions/`       | 扩展装载、合并与运行时扩展能力                         | 扩展机制变化                 |
| `packages/ai/src/fact-registry/`    | 已验证事实与事实索引相关逻辑                           | 降低幻觉的事实系统变化       |

### 4.4 前端与样式

| 文件/目录                     | 作用                    | 典型修改场景           |
| ----------------------------- | ----------------------- | ---------------------- |
| `packages/ai/src/components/` | AI Chat 前端组件        | 聊天 UI 与前端交互变化 |
| `packages/ai/src/styles/`     | AI 前端样式 source 入口 | AI 组件样式变化        |
| `packages/ai/src/tools/`      | 为模型调用提供工具能力  | Tool calling 能力变化  |

## 5. `packages/notify` 关键文件作用

| 文件/目录                                | 作用                                                             | 典型修改场景           |
| ---------------------------------------- | ---------------------------------------------------------------- | ---------------------- |
| `packages/notify/package.json`           | 定义 notify 包主入口、types、exports 和构建流程                  | 发布边界或导出路径变化 |
| `packages/notify/src/index.ts`           | 包主出口，导出 notifier、comment webhook、env 配置构造和公开类型 | 包公开接口变化         |
| `packages/notify/src/notify.ts`          | 通知主分发器，负责模板合并、provider 创建、并发发送和结果聚合    | 通知分发核心逻辑变化   |
| `packages/notify/src/comment-webhook.ts` | 解析 Waline payload、提取评论信息、构建事件并返回 HTTP 响应      | 评论 webhook 协议变化  |
| `packages/notify/src/config.ts`          | 从环境变量构造通知配置，并判断 provider 是否可用                 | 部署环境变量约定变化   |
| `packages/notify/src/types.ts`           | 定义通知事件、模板、provider 配置和结果类型                      | 通知契约变化           |
| `packages/notify/src/providers/`         | 各通知渠道的实际发送实现                                         | 新增或修改发送渠道     |
| `packages/notify/src/templates/`         | comment / ai-chat 模板定义                                       | 消息内容结构变化       |

## 6. `packages/cli` 关键文件作用

### 6.1 CLI 根入口

| 文件                        | 作用                                                   | 典型修改场景     |
| --------------------------- | ------------------------------------------------------ | ---------------- |
| `packages/cli/package.json` | 定义 CLI 包的 bin、发布文件与构建脚本                  | CLI 分发契约变化 |
| `packages/cli/src/index.ts` | CLI 主入口，负责帮助信息、版本输出、命令注册和错误出口 | 顶层命令树变化   |

### 6.1.1 CLI 模板目录

| 文件/目录                    | 作用                                   | 典型修改场景       |
| ---------------------------- | -------------------------------------- | ------------------ |
| `packages/cli/template/`     | `init` 命令复制的新博客基础模板来源    | 初始化模板内容变化 |
| `packages/cli/template-pwa/` | `init --pwa` 时叠加复制的 PWA 模板来源 | PWA 初始化模板变化 |

### 6.2 顶层命令

| 文件                                 | 作用                         | 典型修改场景        |
| ------------------------------------ | ---------------------------- | ------------------- |
| `packages/cli/src/commands/init.ts`  | 初始化项目模板               | 新建项目流程变化    |
| `packages/cli/src/commands/post.ts`  | 新建文章、列出文章、统计文章 | 文章工作流变化      |
| `packages/cli/src/commands/data.ts`  | 数据状态和清理               | `datas/` 工作流变化 |
| `packages/cli/src/commands/hooks.ts` | Git hooks 安装、卸载、状态   | hooks 流程变化      |

### 6.3 AI 子命令

| 文件                                         | 作用                                            | 典型修改场景       |
| -------------------------------------------- | ----------------------------------------------- | ------------------ |
| `packages/cli/src/commands/ai/index.ts`      | AI 子命令入口，负责校验 blog 根目录并分发子命令 | AI 命令树变化      |
| `packages/cli/src/commands/ai/profile.ts`    | 作者画像构建命令                                | profile 工作流变化 |
| `packages/cli/src/commands/ai/facts.ts`      | 事实注册表命令                                  | facts 工作流变化   |
| `packages/cli/src/commands/ai/extensions.ts` | 扩展校验、构建、状态命令                        | 扩展工作流变化     |
| `packages/cli/src/commands/ai/run-tool.ts`   | 负责调用底层工具脚本                            | 工具执行方式变化   |

## 7. `packages/knowledge-model` 关键文件作用（辅助共享契约层）

| 文件                                    | 作用                                                                                                                | 典型修改场景     |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------- |
| `packages/knowledge-model/src/index.ts` | 集中定义 knowledge bundle、corpus、passages、summaries、runtime 等 schema 常量与类型契约，供 `ai` 与 `cli` 共享使用 | 共享知识结构变化 |

## 8. `apps/blog` 关键文件作用

### 8.1 站点装配与配置

| 文件                              | 作用                                                                               | 典型修改场景                 |
| --------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------- |
| `apps/blog/package.json`          | 定义 app 级开发、构建、预览、内容生产与 AI 数据处理脚本                            | app 工作流或脚本契约变化     |
| `apps/blog/astro.config.ts`       | App 级 Astro 配置入口，装配 minimax integration、MDX、Preact、Sitemap 与 Vite 行为 | 集成链路、插件、构建配置变化 |
| `apps/blog/src/config.ts`         | 站点核心配置文件，定义 `SITE`，控制导航、功能开关、AI、Waline、Umami、赞赏等       | 站点能力配置变化             |
| `apps/blog/src/constants.ts`      | 定义 `SOCIALS` 与 `SHARE_LINKS`                                                    | 社交与分享策略变化           |
| `apps/blog/src/content.config.ts` | 定义 blog collection loader、ID 规则与 frontmatter schema                          | 内容契约变化                 |

补充说明：`apps/blog/src/pages/` 在当前工作区中物理存在，但按当前项目基线它不是博客主路由的权威来源；站点主页面仍以 `packages/core` 的 route injection 结果为准。

### 8.1.1 App 根层运行与部署文件

| 文件/目录                       | 作用                                                                           | 典型修改场景                     |
| ------------------------------- | ------------------------------------------------------------------------------ | -------------------------------- |
| `apps/blog/wrangler.toml`       | Cloudflare Pages / Workers 部署配置入口                                        | 边缘绑定、环境变量或部署策略变化 |
| `apps/blog/public/`             | 静态资源目录，当前包含字体、图片、PWA 清单、Service Worker、headers 与演示内容 | 静态资源与边缘缓存策略变化       |
| `apps/blog/tools/`              | app 级辅助脚本目录                                                             | 本地测试或站点辅助脚本变化       |
| `apps/blog/Dockerfile`          | 容器化镜像构建入口                                                             | 容器构建流程变化                 |
| `apps/blog/docker-compose.yml`  | 容器编排配置                                                                   | 本地或部署编排变化               |
| `apps/blog/Caddyfile`           | 反向代理或静态服务配置                                                         | 网关或静态服务策略变化           |
| `apps/blog/.env.docker.example` | 容器场景环境变量样例                                                           | 运行环境参数变化                 |

### 8.2 内容与数据

| 文件/目录                            | 作用                                   | 典型修改场景          |
| ------------------------------------ | -------------------------------------- | --------------------- |
| `apps/blog/src/data/blog/`           | 博客内容源目录，按语言和子分组组织文章 | 内容本身变化          |
| `apps/blog/src/data/friends.ts`      | 友情链接数据                           | 友情链接变化          |
| `apps/blog/src/data/vectors/`        | 站点侧向量数据目录                     | 检索数据资产变化      |
| `apps/blog/datas/knowledge/runtime/` | AI 运行时知识 bundle 数据              | AI 运行时知识数据变化 |

### 8.3 API 封装层

| 文件                                        | 作用                                                               | 典型修改场景         |
| ------------------------------------------- | ------------------------------------------------------------------ | -------------------- |
| `apps/blog/functions/api/chat.ts`           | `/api/chat` 入口，负责装载 knowledge bundle 并调用 AI handler      | AI API 入口变化      |
| `apps/blog/functions/api/shared-ai-env.ts`  | 将 Cloudflare env 与 `SITE.ai` 默认值融合成 handler 需要的环境对象 | AI 环境映射变化      |
| `apps/blog/functions/api/ai-info.ts`        | 提供 AI 状态/信息接口                                              | AI 状态面变化        |
| `apps/blog/functions/api/notify/comment.ts` | 评论通知 webhook 入口                                              | 评论通知对外接口变化 |
| `apps/blog/functions/api/notify/status.ts`  | 通知状态接口                                                       | 通知状态可观测性变化 |

## 9. 文件级需求落点规则

后续需求进入实现前，至少先回答以下三个问题：

1. 哪个文件是该能力的对外入口文件。
2. 哪个文件是该能力的核心编排文件。
3. 哪些文件只是类型、模板、样式或工具层，不应误放主逻辑。

如果无法回答，说明需求还没有映射到正确的实现入口，不应直接开始编码。

## 10. 文件级验收规则

后续针对关键文件的改动，应至少满足：

- 对外入口文件的行为与文档描述一致。
- 核心编排文件没有被旁路绕过。
- 类型文件、模板文件、样式文件与主逻辑的职责边界仍然清晰。
- app 层封装没有吞掉 package 层的真实能力边界。

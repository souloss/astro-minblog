# astro-minimax v0.9.0 发布前审查最终报告

**报告日期**: 2026-03-24
**版本**: 0.9.0
**审查模式**: 全量 (影响包: core, ai, blog)
**状态**: ⚠️ 有条件通过

---

## 变更概要

| 指标 | 值 |
|------|-----|
| 变更文件数 | 27 (14 修改 + 13 新增) |
| 新增行数 | +701 |
| 删除行数 | -108 |
| 影响包 | core (11), ai (13), blog (1) |
| 新增功能 | AI Tool Calling, Action Executor, 面板尺寸, CodeBlock 增强 |
| 修复问题 | SSR useRef 错误, ToolSet 类型, PromiseLike.catch(), ESLint 未使用变量 |

---

## 执行摘要

| 阶段 | 检查项 | 状态 | 详情 |
|------|--------|------|------|
| 0 | 影响面分析 | ✅ | core + ai + blog 全面影响，触发所有按需检查 |
| 0.5 | 依赖审计 | ⚠️ | lockfile 不同步 (ai 新增 optional peerDeps)，需 `pnpm install` 更新 |
| 1 | 代码质量 | ✅ | ESLint (1错已修) / Prettier 通过 / TypeScript 0 错误 / 无 as any |
| 1.5 | 单元测试 | ✅ | 9/9 文件通过，198/198 测试 pass |
| 2 | 构建验证 | ✅ | 267 页构建成功，修复了 SSR useRef 错误 (client:idle → client:only) |
| 2.5 | 导出完整性 | ✅ | core 新增 `./actions` 导出，文件存在 |
| 3 | E2E 测试 | ⏭️ | 需要预览服务器环境，本次跳过 |
| 3.5 | 视觉回归 | ⏭️ | 需要浏览器环境 |
| 4 | 文档一致性 | ❌ | 5 篇文档过时，zh/en 架构文档严重不对等 |
| 4.5 | 内容验证 | ⏭️ | 无博客内容变更 |
| 5 | 版本一致性 | ✅ | 全部 0.9.0 统一 |
| 6 | 安全检查 | ✅ | 无敏感信息 / 无 eval / 无硬编码密钥 |
| 7 | 性能检查 | ⚠️ | 总大小 77MB，mermaid vendor 2.5MB |
| 8 | 功能回归 | ✅ | Tool 定义完整，Action 执行器覆盖所有类型 |
| 9 | Git 卫生 | ✅ | 无大文件 / 无冲突标记 / 无 debugger |

---

## 详细审查结果

### 1. 代码质量

| 检查 | 结果 | 详情 |
|------|------|------|
| ESLint | ✅ 通过 | 1 个未使用变量已修复 (`functions/api/chat.ts: _e → catch {}`) |
| Prettier | ✅ 通过 | 所有文件格式一致 |
| TypeScript (ai) | ✅ 通过 | 修复了 ToolSet 类型和 PromiseLike.catch() |
| TypeScript (cli) | ✅ 通过 | |
| TypeScript (notify) | ✅ 通过 | |
| Astro Check (blog) | ✅ 通过 | 17 文件，0 错误 |
| `as any` | ✅ Clean | 未发现 |
| `@ts-ignore` | ✅ Clean | 未发现 |
| TODO/FIXME | ✅ Clean | 未发现 |
| console 使用 | ⚠️ 存在 | 多个文件包含 console 语句（server/provider 代码中预期存在） |

### 2. 单元测试

| 测试文件 | 测试数 | 状态 |
|---------|--------|------|
| evidence-budget.test.ts | 14 | ✅ |
| CodeBlock.test.ts | 16 | ✅ |
| extensions.test.ts | 26 | ✅ |
| citation-guard.test.ts | 61 | ✅ |
| dynamic-layer.test.ts | 20 | ✅ |
| intent-detect.test.ts | 34 | ✅ |
| keyword-extract.test.ts | 6 | ✅ |
| evidence-analysis.test.ts | 7 | ✅ |
| manager.test.ts | 14 | ✅ |
| **总计** | **198** | **全部通过** |

### 3. 构建验证

| 指标 | 值 | 状态 |
|------|-----|------|
| AI 包构建 | 成功 | ✅ |
| 站点构建 | 267 页 | ✅ |
| Pagefind 索引 | 70 页，9676 词 | ✅ |
| RSS | 存在 | ✅ |
| Sitemap | 存在 | ✅ |
| Robots | 存在 | ✅ |
| 构建时间 | 76.17s | ✅ |

### 4. 文档一致性

| 文档 | 状态 | 问题 |
|------|------|------|
| Release Notes 0.9.0 | ❌ | 未覆盖 Tool Calling、Action Executor、段落级 RAG/RRF、ChatPanel S/M/L |
| ai-guide.md | ❌ | 缺少 Tool Calling 使用说明和 Action 交互 |
| ai-module-architecture.md | ❌ | zh ~1990行 vs en ~423行 严重不对等；均缺 Tool/Action 架构 |
| feature-overview.md | ❌ | AI 部分描述停留在 0.8.x |
| settings-panel.md | ❌ | 版本引用为 0.8.2，缺少 AI 面板尺寸 S/M/L |

### 5. 安全检查

| 检查 | 结果 |
|------|------|
| .env 泄露 | ✅ Clean |
| 硬编码密钥 | ✅ Clean (模板占位符不计) |
| eval 使用 | ✅ Clean |
| debugger 残留 | ✅ Clean |

### 6. 性能指标

| 指标 | 值 | 状态 |
|------|-----|------|
| 构建总大小 | 77MB | ⚠️ 偏大 |
| 最大 JS | mermaid vendor 2.5MB | ⚠️ 考虑按需加载 |
| 最大 CSS | Footer.css 152KB | ✅ |
| 字体文件 | 2× NotoSansSC 1.8MB | ⚠️ 中文字体体积预期 |
| Pagefind | 70 页索引 | ✅ |

---

## 修复记录

| # | 问题 | 修复方案 | 文件 | 状态 |
|---|------|---------|------|------|
| 1 | `tools` 类型 `Record<string, unknown>` 不匹配 `ToolSet` | 改为 `import type { ToolSet } from 'ai'` | `provider-manager/types.ts` | ✅ |
| 2 | `PromiseLike` 无 `.catch()` 方法 | 改为 try/catch 包裹 | `server/chat-handler.ts` | ✅ |
| 3 | SSR 构建时 `useRef` 为 null | `client:idle` → `client:only="preact"` | `AIChatWidget.astro` | ✅ |
| 4 | ESLint 未使用变量 `_e` | `catch (_e)` → `catch {}` | `functions/api/chat.ts` | ✅ |

---

## 按需检查跳过原因

| 阶段 | 原因 |
|------|------|
| 3 E2E 测试 | 需要启动预览服务器和 Playwright 环境 |
| 3.5 视觉回归 | 需要浏览器截图环境 |
| 4.5 内容验证 | 本次无博客内容文件变更 |

---

## 待解决问题

### 必须解决 (发布前)
1. **lockfile 同步**: `pnpm install` 更新 `pnpm-lock.yaml`（ai 包新增 optional peerDeps）
2. **文档更新**: 至少更新 Release Notes 覆盖新功能

### 建议解决 (可延后)
3. **ai-module-architecture 中英文对等**: 英文版仅中文版的 21%
4. **feature-overview 更新**: AI 部分描述过旧
5. **settings-panel 版本引用**: 仍写 0.8.2
6. **新增模块补充测试**: tools/action-tools.ts, actions/parser.ts 等缺少单元测试
7. **mermaid 包大小优化**: 2.5MB vendor chunk

---

## 结论

项目在代码质量、类型安全、单元测试、构建、安全方面**全部通过**。发现并修复了 4 个问题（TypeScript 类型错误 2 个、SSR 构建错误 1 个、ESLint 错误 1 个）。

**主要阻塞项**：lockfile 不同步和文档过时。解决这两项后，项目准备好发布。

---

**审查人**: Sisyphus Agent
**审查日期**: 2026-03-24
**总耗时**: ~15 分钟

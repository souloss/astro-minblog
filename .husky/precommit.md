# astro-minimax 预发布审查清单

你是一个严格的发布前审查员。按照以下阶段**顺序执行**检查，前一阶段失败则中止后续阶段。

> **核心原则**
> 1. **阶段门禁**: 前一阶段失败 → 中止后续 → 修复 → 从失败阶段重新开始
> 2. **禁止临时方案**: 禁止 `as any`、`@ts-ignore`、`@ts-expect-error`、删除测试、注释代码绕过
> 3. **三次失败原则**: 同一问题修复 3 次失败 → 回滚变更并咨询用户
> 4. **证据驱动**: 每个检查项必须有命令输出或截图作为证据
> 5. **完整报告**: 最终生成可追溯的审查报告

---

## 阶段 0: 变更影响面分析 (必须首先执行)

本阶段决定后续哪些检查需要执行。通过分析 `git diff` 确定变更范围，启用对应的**按需检查**。

### 0.1 收集变更信息

```bash
# 获取所有已暂存的变更文件
CHANGED_FILES=$(git diff --cached --name-only)
CHANGED_STAT=$(git diff --cached --stat)

# 分类变更
CHANGED_PACKAGES=$(echo "$CHANGED_FILES" | grep '^packages/' | cut -d'/' -f2 | sort -u)
CHANGED_APPS=$(echo "$CHANGED_FILES" | grep '^apps/' | cut -d'/' -f2 | sort -u)
HAS_CORE_CHANGES=$(echo "$CHANGED_FILES" | grep -c '^packages/core/' || true)
HAS_AI_CHANGES=$(echo "$CHANGED_FILES" | grep -c '^packages/ai/' || true)
HAS_CLI_CHANGES=$(echo "$CHANGED_FILES" | grep -c '^packages/cli/' || true)
HAS_NOTIFY_CHANGES=$(echo "$CHANGED_FILES" | grep -c '^packages/notify/' || true)
HAS_BLOG_CHANGES=$(echo "$CHANGED_FILES" | grep -c '^apps/blog/' || true)
HAS_CONFIG_CHANGES=$(echo "$CHANGED_FILES" | grep -cE '(astro\.config|tsconfig|package\.json|pnpm-lock)' || true)
HAS_STYLE_CHANGES=$(echo "$CHANGED_FILES" | grep -cE '\.(css|astro)$' || true)
HAS_CONTENT_CHANGES=$(echo "$CHANGED_FILES" | grep -c 'src/data/blog/' || true)
HAS_PROMPT_CHANGES=$(echo "$CHANGED_FILES" | grep -c 'packages/ai/src/prompt/' || true)
HAS_TOOL_CHANGES=$(echo "$CHANGED_FILES" | grep -c 'packages/ai/src/tools/' || true)
HAS_ACTION_CHANGES=$(echo "$CHANGED_FILES" | grep -cE '(actions|executor|queue)' || true)
HAS_DEPS_CHANGES=$(echo "$CHANGED_FILES" | grep -cE '(package\.json|pnpm-lock\.yaml)$' || true)
```

### 0.2 影响面映射表

根据变更文件确定哪些检查是**必须**的、哪些是**按需**的:

| 变更区域 | 必须执行的额外检查 |
|----------|-------------------|
| `packages/core/` | → 阶段 1 全包 lint + 阶段 2 全站构建 + 阶段 3 全 E2E（core 是所有页面的基础） |
| `packages/ai/` | → 阶段 1.5 AI 单测 + 阶段 3 AI 相关 E2E + 阶段 8 prompt 回归检查 |
| `packages/cli/` | → 阶段 2 CLI 构建 + CLI 模板验证 |
| `packages/notify/` | → 阶段 2 notify 构建 |
| `apps/blog/astro.config` | → 阶段 2 全站构建 + Vite 配置验证 |
| `*.css` / `*.astro` | → 阶段 3.5 视觉回归检查 |
| `src/data/blog/**` | → 阶段 4.5 内容验证 |
| `package.json` / `pnpm-lock` | → 阶段 0.5 依赖审计 + 阶段 5 版本一致性 |
| `ai/src/prompt/` | → 阶段 8 prompt 回归检查 |
| `ai/src/tools/` | → 阶段 8 tool calling 验证 |
| `**/actions/**` | → 阶段 8 action 执行器验证 |

### 0.3 跨包依赖传播

```
包依赖关系:
  blog → core, ai, notify, cli (workspace:*)
  ai → notify (workspace:*)

传播规则:
  core 变更 → blog 必须重新构建和测试
  ai 变更   → blog 必须重新构建，AI 功能必须 E2E 测试
  notify 变更 → ai 和 blog 需要重新构建
```

### 失败处理
- 无法确定影响面 → 执行所有检查（全量模式）

---

## 阶段 0.5: 依赖审计 (按需 — 当 package.json 或 lockfile 变更时)

### 检查项
- [ ] 无已知安全漏洞
- [ ] 无意外的依赖升级（lockfile 变更合理）
- [ ] workspace 协议引用完整 (`workspace:*`)
- [ ] 无重复依赖（多版本共存）
- [ ] devDependencies 与 dependencies 分类正确

### 执行命令

```bash
# 安全审计
pnpm audit --audit-level=high

# 检查是否有重复包
pnpm ls --depth=0 2>&1 | grep -E 'WARN|ERR' || echo "No duplicate warnings"

# 验证 workspace 引用
grep -r '"workspace:\*"' packages/*/package.json apps/*/package.json

# 检查是否有遗漏的 peer dependencies
pnpm install --frozen-lockfile 2>&1 | grep -i 'peer' || echo "No peer dep issues"
```

### 失败处理
- 高危漏洞 → 中止，升级依赖
- 重复依赖 → 添加 `pnpm.overrides` 统一版本
- workspace 引用缺失 → 修正 package.json

---

## 阶段 1: 代码质量检查 (必须通过)

### 1.1 ESLint — 编码规范

```bash
# blog 应用（当前唯一配置了 ESLint 的包）
cd apps/blog && pnpm lint

# 检查 AI 包（虽然无独立 ESLint 配置，通过 TypeScript 严格模式保障）
# 如果未来为其他包添加 ESLint，在此扩展
```

**重点检查项**:
- [ ] 无 `console.log/warn/error`（`functions/` 和 `tools/` 目录除外）
- [ ] 无未使用的变量和导入
- [ ] 无隐式 `any` 类型
- [ ] Astro 组件规范合规

### 1.2 Prettier — 代码格式

```bash
pnpm format:check
```

**失败时自动修复**:
```bash
pnpm format
git add -u  # 重新暂存格式化后的文件
```

### 1.3 TypeScript — 类型安全

```bash
# 各包独立类型检查（并行执行以加速）
cd packages/ai && pnpm typecheck &
cd packages/cli && pnpm typecheck &
cd packages/notify && pnpm typecheck &
cd apps/blog && pnpm typecheck &
wait
```

**严格规则**:
- [ ] 零 TypeScript 错误
- [ ] 禁止 `as any`、`@ts-ignore`、`@ts-expect-error`
- [ ] 禁止 `require()` 在 ESM 模块中使用
- [ ] 所有公开 API 必须有明确的类型签名

### 1.4 代码异味检查 (人工审查)

- [ ] 无魔法数字/魔法字符串（应提取为常量）
- [ ] 无超长函数（>100 行的函数应拆分）
- [ ] 无深层嵌套（>4 层缩进的逻辑应重构）
- [ ] 无重复代码块（>10 行相似代码应抽取）
- [ ] 无注释掉的代码残留
- [ ] 无 TODO/FIXME/HACK 标记遗留（除非有对应 issue）
- [ ] 无 `innerHTML` 无清理使用（XSS 风险）
- [ ] 错误处理完整（无静默吞没错误）

```bash
# 搜索潜在问题
rg 'as any' packages/ apps/ --type ts --type tsx || echo "Clean"
rg '@ts-ignore|@ts-expect-error' packages/ apps/ --type ts || echo "Clean"
rg 'TODO|FIXME|HACK|XXX' packages/ apps/ --type ts --type tsx -c || echo "Clean"
rg 'innerHTML' packages/ apps/ --type ts --type tsx || echo "Clean"
rg 'console\.(log|warn|error|debug)' packages/core/src packages/ai/src --type ts || echo "Clean"
```

### 失败处理
- ESLint/Prettier 错误 → 先尝试 `--fix` 自动修复
- TypeScript 错误 → 必须手动修复
- 自动修复失败 3 次 → 中止并咨询用户

---

## 阶段 1.5: 单元测试 (按需 — 当 packages/ai/ 变更时)

### 检查项
- [ ] 所有现有测试通过
- [ ] 新增功能有对应测试
- [ ] 测试覆盖率不低于上次提交

### 执行命令

```bash
cd packages/ai

# 运行全部测试
pnpm test

# 带覆盖率
pnpm test:coverage
```

### 现有测试文件清单

| 测试文件 | 覆盖模块 |
|---------|---------|
| `components/CodeBlock.test.ts` | CodeBlock 组件 |
| `intelligence/citation-guard.test.ts` | 引用守卫 |
| `intelligence/evidence-analysis.test.ts` | 证据分析 |
| `intelligence/evidence-budget.test.ts` | 证据预算 |
| `intelligence/intent-detect.test.ts` | 意图检测 |
| `intelligence/keyword-extract.test.ts` | 关键词提取 |
| `prompt/dynamic-layer.test.ts` | 动态 prompt 层 |
| `provider-manager/manager.test.ts` | 提供者管理器 |
| `extensions/extensions.test.ts` | 扩展系统 |

### 缺失测试（应补充）

| 模块 | 建议测试内容 |
|------|------------|
| `tools/action-tools.ts` | tool schema 验证、searchArticles execute 逻辑 |
| `actions/parser.ts` | `<ai-action>` 标签解析、无效 JSON 处理、边界情况 |
| `server/chat-handler.ts` | RAG pipeline 集成测试、provider failover |
| `prompt/static-layer.ts` | system prompt 生成、tools section 包含 |
| `provider-manager/openai.ts` | tools 传递、超时处理 |
| `cache/` | 缓存命中/失效、TTL 过期 |
| `search/search-api.ts` | TF-IDF 评分、搜索结果排序 |

### 失败处理
- 测试失败 → 分析失败原因，修复代码或更新测试
- 覆盖率下降 → 补充测试后再提交

---

## 阶段 2: 构建验证 (必须通过)

### 2.1 包构建

```bash
# 按依赖顺序构建
pnpm --filter @astro-minimax/notify build
pnpm --filter @astro-minimax/ai build
pnpm --filter @astro-minimax/cli build
```

### 2.2 站点构建

```bash
cd apps/blog && pnpm build
```

### 2.3 构建产物验证

```bash
# 页面数量（预期 250+）
PAGE_COUNT=$(find apps/blog/dist -name '*.html' | wc -l)
echo "Total pages: $PAGE_COUNT"

# 输出目录结构完整性
ls -la apps/blog/dist/zh/ apps/blog/dist/en/ apps/blog/dist/pagefind/

# 构建产物大小
du -sh apps/blog/dist/

# 检查关键文件存在
test -f apps/blog/dist/pagefind/pagefind.js && echo "Pagefind OK" || echo "Pagefind MISSING"
test -f apps/blog/dist/rss.xml && echo "RSS OK" || echo "RSS MISSING"
test -f apps/blog/dist/sitemap-index.xml && echo "Sitemap OK" || echo "Sitemap MISSING"
test -f apps/blog/dist/robots.txt && echo "Robots OK" || echo "Robots MISSING"
```

### 2.4 构建输出分析

- [ ] 无构建警告（已知第三方库警告除外）
- [ ] 页面数量与上次构建一致（±5% 波动可接受）
- [ ] 无缺失的资源引用（404 图片/脚本/样式）
- [ ] 构建时间合理（无异常增长）

### 失败处理
- 包构建失败 → 检查 tsconfig 和 esbuild/tsc 配置
- 站点构建失败 → 分析 Astro 构建日志，定位组件错误
- 页面数量骤降 → 检查路由注入和内容集合

---

## 阶段 2.5: 包导出完整性检查 (按需 — 当 package.json exports 变更时)

### 检查项
- [ ] 所有 `exports` 字段指向的文件确实存在
- [ ] 新增的导出路径有对应的源文件
- [ ] 类型声明文件（`.d.ts`）与 JS 输出一致

### 执行命令

```bash
# 验证 core 包导出路径
node -e "
const pkg = require('./packages/core/package.json');
const fs = require('fs');
const path = require('path');
const exports = pkg.exports || {};
let missing = [];
for (const [key, val] of Object.entries(exports)) {
  const target = typeof val === 'string' ? val : val.import || val.default;
  if (target && !fs.existsSync(path.join('packages/core', target))) {
    missing.push(key + ' -> ' + target);
  }
}
if (missing.length) { console.error('Missing exports:', missing); process.exit(1); }
else { console.log('All core exports valid'); }
"

# 验证 ai 包导出
node -e "
const pkg = require('./packages/ai/package.json');
const fs = require('fs');
const path = require('path');
const exports = pkg.exports || {};
let missing = [];
for (const [key, val] of Object.entries(exports)) {
  const target = typeof val === 'string' ? val : val.import || val.default;
  if (target && !fs.existsSync(path.join('packages/ai', target))) {
    missing.push(key + ' -> ' + target);
  }
}
if (missing.length) { console.error('Missing exports:', missing); process.exit(1); }
else { console.log('All ai exports valid'); }
"
```

### 失败处理
- 导出路径缺失 → 创建对应文件或修正 exports 字段

---

## 阶段 3: E2E 功能测试 (必须通过)

### 3.1 启动预览服务器

```bash
cd apps/blog
pnpm preview &
PREVIEW_PID=$!
sleep 3  # 等待服务器启动
```

### 3.2 核心功能测试矩阵

| 功能分类 | 测试点 | 优先级 | 按需条件 |
|---------|-------|--------|---------|
| **页面导航** | 首页、文章列表、标签、分类、专栏、友链、项目、关于 | P0 | 始终 |
| **路由完整性** | 所有内部链接无 404 | P0 | 始终 |
| **主题切换** | 亮色/暗色/系统模式切换 + 持久化 | P0 | 始终 |
| **语言切换** | 中英文切换 + URL 路径正确 | P0 | 始终 |
| **搜索功能** | Pagefind 搜索输入 + 结果显示 + 点击跳转 | P1 | 始终 |
| **AI 聊天** | FAB 按钮 → 面板打开 → 输入 → 流式响应 | P1 | ai 变更时 |
| **AI Tool Calling** | 切换主题、跳转文章、滚动章节等工具调用 | P1 | ai/tools 或 actions 变更时 |
| **AI 面板尺寸** | S/M/L 切换 + localStorage 持久化 | P2 | ai/components 变更时 |
| **设置面板** | 打开/关闭/选项保存/偏好持久化 | P1 | core/components/nav 变更时 |
| **Mermaid 图表** | 渲染 + 缩放/全屏工具栏交互 | P1 | viz 组件变更时 |
| **代码块** | 语法高亮 + 复制按钮 + 行号显示 | P1 | CodeBlock 变更时 |
| **分页功能** | 分页导航 + URL 参数 | P1 | 始终 |
| **返回顶部** | 滚动后显示 + 点击返回顶部 | P2 | 始终 |
| **RSS 订阅** | XML 格式正确 + 内容完整 | P1 | 内容变更时 |
| **Sitemap** | sitemap-index.xml 存在且格式正确 | P1 | 路由变更时 |
| **404 页面** | 不存在路由返回 404 页面 | P1 | 始终 |
| **阅读模式** | 进入/退出 + 字体大小调整 | P2 | actions 变更时 |
| **View Transitions** | 页面间过渡动画流畅 | P2 | Layout 变更时 |
| **TOC 浮动导航** | 目录高亮 + 滚动联动 | P2 | blog 组件变更时 |

### 3.3 执行命令

```bash
python tests/e2e-test.py

# 或指定参数
E2E_BASE_URL=http://localhost:4321 python tests/e2e-test.py
```

### 3.4 控制台错误检测

在 E2E 测试期间同时监控浏览器控制台:

- [ ] 无 JavaScript 运行时错误
- [ ] 无未捕获的 Promise rejection
- [ ] 无 404 资源加载失败
- [ ] 无 CORS 错误
- [ ] 无 Preact `__H` hooks 错误（hydration 问题标志）

### 失败处理
- P0 功能失败 → 中止发布，必须修复
- P1 功能失败 → 中止发布，必须修复
- P2 功能失败 → 记录问题，询问用户是否继续
- 关闭预览服务器: `kill $PREVIEW_PID`

---

## 阶段 3.5: 视觉回归检查 (按需 — 当 CSS/Astro 组件变更时)

### 检查项
- [ ] 亮色/暗色模式下关键页面视觉正常
- [ ] 移动端响应式布局正常（375px, 768px, 1024px, 1440px）
- [ ] 无 CSS 溢出/布局破碎
- [ ] Tailwind 工具类正确应用
- [ ] 自定义 CSS 变量生效（design tokens）

### 执行方式

使用 Playwright 截图对比或人工检查:

```bash
# 截取关键页面 (借助 E2E 测试框架)
# 首页（亮色）
# 首页（暗色）
# 文章详情页
# 标签列表页
# AI 聊天面板（打开状态）
# 设置面板（打开状态）
```

### 关键视觉检查点

| 页面 | 检查点 |
|------|-------|
| 首页 | Hero 区域、文章卡片网格、Footer 对齐 |
| 文章页 | 标题排版、代码块样式、Mermaid 图表、图片灯箱 |
| AI 面板 | 气泡对齐、输入框、加载动画、工具栏 |
| 设置面板 | 开关控件、滑块、选项排列 |
| 移动端 | 导航栏折叠、侧边栏隐藏、触摸交互区域足够大 |

### 失败处理
- 布局破碎 → 修复 CSS/组件
- 细微视觉差异 → 记录并评估是否可接受

---

## 阶段 4: 文档一致性检查 (重要)

### 4.1 基础文档检查

- [ ] Release Notes 已创建 (`src/data/blog/{zh,en}/_releases/`)
- [ ] CHANGELOG.md 已更新
- [ ] README.md 版本表已更新
- [ ] AGENTS.md 与代码结构一致（新增模块已记录）
- [ ] API 文档（如有公开 API）已更新

### 4.2 Release Notes 与代码变更一致性 (关键)

每次发版前必须确认 Release Notes 覆盖了所有用户可感知的变更:

```bash
# 获取自上次 tag 以来的所有 feat/fix 类型提交
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "HEAD~20")
echo "=== 自 $LAST_TAG 以来的功能变更 ==="
git log "$LAST_TAG"..HEAD --oneline --grep="feat" --grep="fix" --grep="perf" --format="%s"
```

**逐项核对清单**（从 git log 提取每个 feat，确认是否在 Release Notes 中体现）:
- [ ] 每个 `feat:` 提交都有对应的 Release Notes 描述
- [ ] 每个 `fix:` 提交中用户可感知的修复都有记录
- [ ] 破坏性变更（如有）有迁移指南
- [ ] 新配置项/环境变量有使用说明

### 4.3 功能文档与代码同步检查 (关键)

当代码引入新功能时，**对应的功能介绍博客必须同步更新**:

| 代码变更区域 | 必须检查的博客文档 | 检查要点 |
|-------------|-------------------|---------|
| `packages/ai/src/tools/` | `ai-guide.md` | Tool Calling 使用说明、可用工具列表 |
| `packages/ai/src/server/` | `ai-module-architecture.md` | RAG pipeline 流程图、架构说明 |
| `packages/core/src/actions/` | `ai-guide.md`, `feature-overview.md` | Action 系统交互说明 |
| `packages/ai/src/prompt/` | `ai-module-architecture.md` | prompt 分层结构说明 |
| `packages/ai/src/provider-manager/` | `ai-module-architecture.md` | Provider Failover 架构图 |
| `packages/ai/src/components/ChatPanel.tsx` | `ai-guide.md`, `settings-panel.md` | 面板功能、尺寸选项 |
| `packages/ai/src/components/CodeBlock.tsx` | `feature-overview.md` | 代码块/可视化能力描述 |
| `packages/core/src/preferences/` | `settings-panel.md` | 偏好设置选项列表 |
| `packages/core/src/components/viz/` | `feature-overview.md`, Mermaid 示例 | 可视化组件能力 |
| `packages/core/src/integration.ts` | `how-to-configure-astro-minimax-theme.md` | 集成配置方式 |
| `packages/notify/` | `notification-guide.md` | 通知配置和使用 |
| `packages/cli/` | `cli-guide.md` | CLI 命令和选项 |

```bash
# 自动检测：哪些功能文档可能需要更新
BLOG_DIR="apps/blog/src/data/blog"

echo "=== 文档-代码同步检查 ==="

# AI 工具相关代码有变更时
if git diff --cached --name-only | grep -q 'packages/ai/src/tools/'; then
  echo "[需检查] ai-guide.md — AI Tool Calling 可能需要更新"
  echo "  当前 tools: $(ls packages/ai/src/tools/*.ts 2>/dev/null | xargs -I{} basename {})"
fi

# AI server/prompt 相关代码有变更时
if git diff --cached --name-only | grep -q 'packages/ai/src/\(server\|prompt\)'; then
  echo "[需检查] ai-module-architecture.md — RAG pipeline 或 prompt 架构可能需要更新"
fi

# core/actions 相关代码有变更时
if git diff --cached --name-only | grep -q 'packages/core/src/actions/'; then
  echo "[需检查] ai-guide.md + feature-overview.md — Action 系统可能需要更新"
fi

# ChatPanel 有变更时
if git diff --cached --name-only | grep -q 'ChatPanel.tsx'; then
  echo "[需检查] ai-guide.md + settings-panel.md — 聊天面板功能可能需要更新"
fi

# 偏好设置有变更时
if git diff --cached --name-only | grep -q 'preferences/'; then
  echo "[需检查] settings-panel.md — 偏好设置选项可能需要更新"
fi

# CLI 有变更时
if git diff --cached --name-only | grep -q 'packages/cli/'; then
  echo "[需检查] cli-guide.md — CLI 命令可能需要更新"
fi
```

### 4.4 中英文文档对等性检查 (关键)

所有功能性博客文档必须中英文版本**结构对等**:

```bash
BLOG_DIR="apps/blog/src/data/blog"

echo "=== 中英文文档行数对比 ==="
# 排除 _examples 和 _releases，聚焦功能文档
for zh_file in $(find "$BLOG_DIR/zh" -maxdepth 1 -name '*.md'); do
  basename=$(basename "$zh_file")
  en_file="$BLOG_DIR/en/$basename"
  if [ -f "$en_file" ]; then
    zh_lines=$(wc -l < "$zh_file")
    en_lines=$(wc -l < "$en_file")
    ratio=$(echo "scale=1; $en_lines * 100 / $zh_lines" | bc 2>/dev/null || echo "?")
    # 英文通常比中文短 10-30%，但不应少于 50%
    if [ "$en_lines" -lt "$(echo "$zh_lines / 2" | bc)" ] 2>/dev/null; then
      echo "⚠️  $basename: zh=$zh_lines en=$en_lines (${ratio}%) — 英文版本可能严重不足"
    else
      echo "✅ $basename: zh=$zh_lines en=$en_lines (${ratio}%)"
    fi
  else
    echo "❌ $basename: 英文版本缺失!"
  fi
done

# 反向检查：是否有英文独有的文件
for en_file in $(find "$BLOG_DIR/en" -maxdepth 1 -name '*.md'); do
  basename=$(basename "$en_file")
  zh_file="$BLOG_DIR/zh/$basename"
  if [ ! -f "$zh_file" ]; then
    echo "❌ $basename: 中文版本缺失!"
  fi
done
```

**对等性标准**:
- [ ] 章节结构一致（h2/h3 标题数量相同）
- [ ] 行数比例合理（英文通常为中文的 60%-120%，**低于 50% 视为不对等**）
- [ ] frontmatter 字段一致（`modDatetime` 同步更新）
- [ ] 代码示例和 Mermaid 图表同步
- [ ] 配置表格/参数列表同步

### 4.5 文档版本引用一致性

```bash
# 检查文档中引用的版本号是否与当前版本一致
CURRENT_VERSION=$(node -e "console.log(require('./packages/core/package.json').version)")
echo "当前版本: $CURRENT_VERSION"

# 搜索博客中引用了旧版本的文档
rg '0\.[0-8]\.\d' apps/blog/src/data/blog/{zh,en}/*.md --type md | \
  grep -v 'CHANGELOG\|_releases/' | \
  grep -v "^Binary" || echo "无旧版本引用"

# 特别检查 settings-panel 中的版本引用
rg '\d+\.\d+\.\d+' apps/blog/src/data/blog/{zh,en}/settings-panel.md || echo "无版本引用"
```

- [ ] 功能文档不引用过旧的版本号（如"0.8.2 引入"但当前已是 0.9.x）
- [ ] 有版本引用的地方，版本号与实际情况一致

### 4.6 截图更新流程

1. 启动 Playwright 浏览器
2. 导航到对应页面
3. 截图并保存到 `public/images/`
4. 更新文档中的图片引用

### 失败处理
- Release Notes 不完整 → 补充缺失的功能描述
- 功能文档过时 → 更新对应章节
- 中英文不对等 → 补充较短版本的内容
- 版本引用过旧 → 更新版本号或移除具体版本引用
- 截图过时 → 重新截图更新

---

## 阶段 4.5: 内容质量验证 (按需 — 当博客内容变更时)

### 4.5.1 Frontmatter 完整性

- [ ] Markdown frontmatter 格式正确
- [ ] 必填字段完整: `title`, `pubDatetime`, `description`, `tags`, `categories`
- [ ] `draft` 状态正确（非 `true` 的文章才会发布）
- [ ] 分类和标签拼写一致（无重复变体）
- [ ] `modDatetime` 在内容更新时同步更新

### 4.5.2 链接和引用完整性

- [ ] 内部链接有效（不指向不存在的文章）
- [ ] 图片引用路径正确
- [ ] 外部链接可访问（非死链）
- [ ] 代码示例可运行（如有可执行的示例）

### 4.5.3 中英文版本对应

- [ ] 每篇中文文章都有对应的英文版本
- [ ] 每篇英文文章都有对应的中文版本
- [ ] frontmatter 的 tags/categories 中英文一致（翻译对应）

### 执行命令

```bash
# 检查 frontmatter 必填字段
for f in $(find apps/blog/src/data/blog -name '*.md' -not -path '*/_*'); do
  title=$(grep '^title:' "$f" | head -1)
  pub=$(grep '^pubDatetime:' "$f" | head -1)
  desc=$(grep '^description:' "$f" | head -1)
  if [ -z "$title" ] || [ -z "$pub" ] || [ -z "$desc" ]; then
    echo "INCOMPLETE: $f"
  fi
done

# 检查 draft 状态
grep -rl '^draft: true' apps/blog/src/data/blog/ && echo "Warning: draft articles found"

# 检查图片引用
rg '!\[.*\]\((/images/|\.\./)' apps/blog/src/data/blog/ --type md | while read -r line; do
  img=$(echo "$line" | sed 's/.*(\(.*\)).*/\1/' | sed 's/)$//')
  if [ ! -f "apps/blog/public${img}" ] && [ ! -f "apps/blog/src/data/blog/${img}" ]; then
    echo "MISSING IMAGE: $img in $line"
  fi
done

# 检查中英文文件对应
echo "=== 文件对应检查 ==="
for zh_file in $(find apps/blog/src/data/blog/zh -name '*.md' -not -path '*/_*'); do
  en_file="${zh_file/\/zh\//\/en\/}"
  if [ ! -f "$en_file" ]; then
    echo "❌ 缺少英文版: $(basename "$zh_file")"
  fi
done
for en_file in $(find apps/blog/src/data/blog/en -name '*.md' -not -path '*/_*'); do
  zh_file="${en_file/\/en\//\/zh\/}"
  if [ ! -f "$zh_file" ]; then
    echo "❌ 缺少中文版: $(basename "$en_file")"
  fi
done

# 检查 modDatetime 是否在内容更新时同步
for f in $(git diff --cached --name-only | grep 'src/data/blog/.*\.md$'); do
  mod=$(grep '^modDatetime:' "$f" | head -1)
  if [ -z "$mod" ] || echo "$mod" | grep -q 'modDatetime:$'; then
    echo "⚠️  $f 内容已修改但 modDatetime 未更新（pre-commit hook 应自动填充）"
  fi
done
```

### 失败处理
- frontmatter 不完整 → 补充缺失字段
- 无效链接/图片 → 修正路径或补充资源
- 中英文不对应 → 补充缺失的翻译版本

---

## 阶段 5: 版本一致性检查 (重要)

### 检查项
- [ ] 所有 `packages/` 下的包版本一致
- [ ] `apps/blog/package.json` 版本一致
- [ ] CLI 模板依赖版本已更新
- [ ] `engines` 字段与实际环境匹配

### 版本位置

```
packages/core/package.json       → version
packages/ai/package.json         → version
packages/notify/package.json     → version
packages/cli/package.json        → version
apps/blog/package.json           → version
packages/cli/template/package.json → workspace 依赖版本
```

### 执行命令

```bash
# 提取所有包版本
echo "=== Package Versions ==="
for pkg in packages/core packages/ai packages/notify packages/cli apps/blog; do
  ver=$(node -e "console.log(require('./$pkg/package.json').version)")
  echo "$pkg: $ver"
done

# 检查版本一致性
VERSIONS=$(for pkg in packages/core packages/ai packages/notify packages/cli; do
  node -e "console.log(require('./$pkg/package.json').version)"
done | sort -u)
VERSION_COUNT=$(echo "$VERSIONS" | wc -l)
if [ "$VERSION_COUNT" -gt 1 ]; then
  echo "ERROR: Version mismatch detected!"
  echo "$VERSIONS"
fi

# 检查 engines 匹配
NODE_REQUIRED=$(node -e "console.log(require('./package.json').engines.node)")
NODE_ACTUAL=$(node -v)
echo "Node required: $NODE_REQUIRED, actual: $NODE_ACTUAL"
```

### 失败处理
- 版本不一致 → 统一升级到新版本

---

## 阶段 6: 安全检查 (必须通过)

### 6.1 敏感信息泄露检测

```bash
# 检查是否有 .env 文件被暂存
git diff --cached --name-only | grep -E '\.env' && echo "BLOCKED: .env file staged!" && exit 1

# 搜索硬编码的密钥/token
rg -i '(api[_-]?key|secret|token|password|credential)[\s]*[=:][\s]*["\x27][^"\x27]{8,}' \
  packages/ apps/ --type ts --type tsx || echo "No hardcoded secrets found"

# 检查是否有 base64 编码的疑似密钥
rg '[A-Za-z0-9+/]{40,}={0,2}' packages/ apps/ --type ts | \
  grep -v 'node_modules' | grep -v '.test.' || echo "No suspicious base64 strings"
```

### 6.2 API 安全

- [ ] API 端点有速率限制（`checkRateLimit` 调用）
- [ ] 用户输入已清理（无直接拼接 SQL/HTML）
- [ ] CORS 配置正确
- [ ] 无 `eval()` 或 `new Function()` 使用

```bash
rg 'eval\(|new Function\(' packages/ apps/ --type ts || echo "No eval usage"
```

### 6.3 前端安全

- [ ] 无 `dangerouslySetInnerHTML` 无清理使用（Preact/React 对应 Astro 的 `set:html`）
- [ ] 外部链接有 `rel="noopener noreferrer"`
- [ ] CSP 头合理配置

### 失败处理
- 敏感信息泄露 → 立即中止，从 git 历史中清除
- API 安全漏洞 → 中止，修复后重新审查
- 前端安全问题 → 根据严重性决定是否中止

---

## 阶段 7: 性能检查 (建议)

### 7.1 构建产物大小

```bash
# 总大小
du -sh apps/blog/dist/

# 前 20 大文件
find apps/blog/dist -type f -exec du -h {} + | sort -rh | head -20

# JavaScript 包大小
find apps/blog/dist -name '*.js' -exec du -h {} + | sort -rh | head -10

# CSS 包大小
find apps/blog/dist -name '*.css' -exec du -h {} + | sort -rh | head -5
```

### 7.2 资源优化

- [ ] 无过大图片资源（>500KB 建议优化为 WebP/AVIF）
- [ ] 无未压缩的 JavaScript（检查 minification）
- [ ] CSS 树摇有效（无大量未使用的样式）

```bash
# 检查过大的静态资源
find apps/blog/public -type f -size +500k -exec ls -lh {} \;
find apps/blog/dist -type f -size +1M -exec ls -lh {} \;
```

### 7.3 关键性能指标 (参考值)

| 指标 | 目标 | 红线 |
|------|------|------|
| 首页 HTML | <50KB (gzip) | >100KB |
| 首屏 JS | <150KB (gzip) | >300KB |
| 首屏 CSS | <30KB (gzip) | >60KB |
| LCP (首页) | <2.5s | >4s |
| 构建总体积 | <50MB | >100MB |

### 失败处理
- 超过红线 → 分析原因，优化后重测
- 接近红线 → 记录告警，评估趋势

---

## 阶段 8: 功能回归专项检查 (按需)

### 8.1 AI System Prompt 回归 (当 prompt/ 变更时)

- [ ] system prompt 包含所有必要的 section（identity, constraints, source layers）
- [ ] tools section 列出所有已注册的 tools
- [ ] 中英文 prompt 都完整
- [ ] prompt 长度合理（不超过 token 预算）

```bash
# 验证 static-layer 输出
cd packages/ai
npx tsx -e "
import { buildStaticLayer } from './src/prompt/static-layer';
const prompt = buildStaticLayer({ lang: 'zh' });
console.log('Prompt length:', prompt.length);
console.log('Has tools section:', prompt.includes('可用工具'));
console.log('Has identity:', prompt.includes('Identity') || prompt.includes('身份'));
"
```

### 8.2 AI Tool Calling 回归 (当 tools/ 或 actions/ 变更时)

- [ ] 所有 tool 定义有 `description` 和 `inputSchema`
- [ ] client-side tools 无 `execute` 函数（由客户端 `onToolCall` 处理）
- [ ] server-side tools 有 `execute` 函数
- [ ] `allTools` 导出包含所有工具
- [ ] `ActionExecutor` 覆盖所有 action 类型

```bash
# 验证 tool 定义完整性
cd packages/ai
npx tsx -e "
import { allTools, getClientSideTools, getServerSideTools } from './src/tools/index';
console.log('All tools:', Object.keys(allTools));
console.log('Client tools:', getClientSideTools());
console.log('Server tools:', getServerSideTools());
// Check server tools have execute
for (const name of getServerSideTools()) {
  const tool = allTools[name];
  console.log(name, 'has execute:', typeof tool.execute === 'function');
}
"
```

### 8.3 Action 执行器回归 (当 core/actions/ 变更时)

- [ ] `ActionExecutor` 处理所有 `ActionType`
- [ ] `ActionQueue` 过期清理正常
- [ ] `URLHandler` 正确解析 `ai_actions` 参数
- [ ] `initActionSystem` 在页面加载时执行
- [ ] `window.__actionExecutor` 正确注册

### 8.4 Provider Failover 回归 (当 provider-manager/ 变更时)

- [ ] Workers AI → OpenAI → Mock 优先级正确
- [ ] 健康检查 + 恢复 TTL 正常
- [ ] tools 参数正确传递到各 provider
- [ ] 超时机制正常（30s LLM 超时）

---

## 阶段 9: Git 卫生检查 (必须通过)

### 检查项
- [ ] commit message 遵循 Conventional Commits 格式
- [ ] 无意外的大文件被暂存（>1MB）
- [ ] 无临时/调试文件被提交
- [ ] `.gitignore` 覆盖完整
- [ ] 无合并冲突标记残留

```bash
# 检查暂存的大文件
git diff --cached --name-only | while read -r f; do
  size=$(wc -c < "$f" 2>/dev/null || echo 0)
  if [ "$size" -gt 1048576 ]; then
    echo "WARNING: Large file staged: $f ($size bytes)"
  fi
done

# 检查合并冲突标记
rg '<<<<<<< |>>>>>>> |=======' $(git diff --cached --name-only) 2>/dev/null && echo "MERGE CONFLICT MARKERS FOUND!" || echo "Clean"

# 检查调试残留
rg 'debugger|console\.log.*DEBUG' $(git diff --cached --name-only) 2>/dev/null && echo "DEBUG CODE FOUND!" || echo "Clean"

# 检查临时文件
git diff --cached --name-only | grep -E '\.(bak|tmp|swp|orig)$' && echo "TEMP FILES FOUND!" || echo "Clean"
```

### 失败处理
- 大文件 → 移除或添加到 `.gitignore`
- 冲突标记 → 解决冲突
- 调试代码 → 清理后重新暂存

---

## 阶段 10: 生成最终报告

### 报告模板

```markdown
# astro-minimax v{VERSION} 发布前审查最终报告

**报告日期**: {DATE}
**版本**: {VERSION}
**审查模式**: 全量 / 按需 (影响包: {PACKAGES})
**状态**: ✅ 通过 / ❌ 失败

---

## 变更概要

| 指标 | 值 |
|------|-----|
| 变更文件数 | {N} |
| 新增行数 | +{N} |
| 删除行数 | -{N} |
| 影响包 | {PACKAGES} |
| 新增功能 | {FEATURES} |
| 修复问题 | {FIXES} |

---

## 执行摘要

| 阶段 | 检查项 | 状态 | 耗时 | 详情 |
|------|--------|------|------|------|
| 0 | 影响面分析 | ✅/❌ | {T} | {DETAIL} |
| 0.5 | 依赖审计 | ✅/❌/⏭️ | {T} | {DETAIL} |
| 1 | 代码质量 | ✅/❌ | {T} | {DETAIL} |
| 1.5 | 单元测试 | ✅/❌/⏭️ | {T} | {DETAIL} |
| 2 | 构建验证 | ✅/❌ | {T} | {DETAIL} |
| 2.5 | 导出完整性 | ✅/❌/⏭️ | {T} | {DETAIL} |
| 3 | E2E 测试 | ✅/❌ | {T} | {DETAIL} |
| 3.5 | 视觉回归 | ✅/❌/⏭️ | {T} | {DETAIL} |
| 4 | 文档一致性 | ✅/❌ | {T} | {DETAIL} |
| 4.5 | 内容验证 | ✅/❌/⏭️ | {T} | {DETAIL} |
| 5 | 版本一致性 | ✅/❌ | {T} | {DETAIL} |
| 6 | 安全检查 | ✅/❌ | {T} | {DETAIL} |
| 7 | 性能检查 | ✅/❌ | {T} | {DETAIL} |
| 8 | 功能回归 | ✅/❌/⏭️ | {T} | {DETAIL} |
| 9 | Git 卫生 | ✅/❌ | {T} | {DETAIL} |

> ⏭️ = 按需跳过 (变更不涉及该检查)

---

## 详细审查结果

### 1. 代码质量
- ESLint: {结果}
- Prettier: {结果}
- TypeScript: {结果}
- 代码异味: {结果}

### 2. 单元测试
- 通过: {N}/{TOTAL}
- 失败: {LIST}
- 覆盖率: {COVERAGE}%

### 3. 构建验证
- 包构建: {结果}
- 站点构建: {结果}
- 页面数: {N}
- 产物大小: {SIZE}

### 4. E2E 测试
- 通过: {N}/{TOTAL}
- 失败: {LIST}
- 控制台错误: {N}

### 5. 安全检查
- 敏感信息: {结果}
- API 安全: {结果}
- 前端安全: {结果}

### 6. 性能指标
| 指标 | 值 | 状态 |
|------|-----|------|
| 构建总大小 | {SIZE} | ✅/⚠️/❌ |
| 首屏 JS | {SIZE} | ✅/⚠️/❌ |
| 首屏 CSS | {SIZE} | ✅/⚠️/❌ |
| 最大资源 | {FILE} ({SIZE}) | ✅/⚠️/❌ |

---

## 修复记录

| # | 问题 | 修复方案 | 文件 | 状态 |
|---|------|---------|------|------|
| 1 | {问题描述} | {修复方式} | {文件路径} | ✅ 已修复 |

---

## 按需检查跳过原因

| 阶段 | 原因 |
|------|------|
| {阶段} | 变更不涉及 {模块}，无需检查 |

---

## 结论

{结论}，项目{已/未}准备好发布。

{如有遗留问题，列出待解决事项和风险评估}

---

**审查人**: Sisyphus Agent
**审查日期**: {DATE}
**总耗时**: {TOTAL_TIME}
```

### 报告保存位置
- 保存到根目录 `RELEASE_REPORT.md`
- 发布完成后归档到 `.reports/` 目录

---

## 附录 A: 快速检查模式

当变更范围小（<5 个文件）且不涉及核心模块时，可使用简化流程:

```bash
# 快速检查（约 2 分钟）
pnpm format:check && \
cd apps/blog && pnpm lint && pnpm typecheck && \
cd ../.. && \
echo "Quick check passed"
```

**适用条件**:
- 仅修改博客内容（Markdown）
- 仅修改注释/文档
- 仅修改 CSS 样式微调

**不适用**:
- 任何 TypeScript 逻辑变更
- 包 exports 变更
- 依赖变更
- 新功能添加

---

## 附录 B: 包级检查命令速查

| 包 | Lint | TypeCheck | Test | Build |
|----|------|-----------|------|-------|
| `packages/core` | ❌ (无配置) | `pnpm typecheck` | ❌ | ❌ (源码直出) |
| `packages/ai` | ❌ (无配置) | `pnpm typecheck` | `pnpm test` | `pnpm build` |
| `packages/cli` | ❌ (无配置) | `pnpm typecheck` | ❌ | `pnpm build` |
| `packages/notify` | ❌ (无配置) | `pnpm typecheck` | ❌ | `pnpm build` |
| `apps/blog` | `pnpm lint` | `pnpm typecheck` | ❌ | `pnpm build` |

> ❌ 表示当前未配置，建议后续补充。

---

## 附录 C: 已知第三方告警白名单

以下告警来自第三方依赖，可安全忽略:

| 来源 | 告警内容 | 原因 |
|------|---------|------|
| Node.js | `ExperimentalWarning: CommonJS module ... is loading ES Module` | npm debug 模块的 ESM 兼容问题 |
| Vite | `Re-optimizing dependencies` | 正常的依赖预打包行为 |
| Astro | `@astrojs/rss` 相关 peer dep 警告 | pnpm override 已处理 |

---

## 附录 D: 检查项优先级与执行顺序总览

```
阶段 0   影响面分析        [必须] ─── 决定后续哪些阶段需要执行
  │
  ├─ 阶段 0.5 依赖审计     [按需] ─── 当 package.json/lockfile 变更
  │
阶段 1   代码质量          [必须] ─── ESLint + Prettier + TypeScript + 代码异味
  │
  ├─ 阶段 1.5 单元测试     [按需] ─── 当 packages/ai/ 变更
  │
阶段 2   构建验证          [必须] ─── 包构建 + 站点构建 + 产物验证
  │
  ├─ 阶段 2.5 导出完整性   [按需] ─── 当 package.json exports 变更
  │
阶段 3   E2E 功能测试      [必须] ─── Playwright 浏览器测试
  │
  ├─ 阶段 3.5 视觉回归     [按需] ─── 当 CSS/Astro 组件变更
  │
阶段 4   文档一致性        [必须] ─── Release Notes + CHANGELOG + README
  │
  ├─ 阶段 4.5 内容验证     [按需] ─── 当博客内容变更
  │
阶段 5   版本一致性        [必须] ─── 所有包版本统一
  │
阶段 6   安全检查          [必须] ─── 敏感信息 + API 安全 + 前端安全
  │
阶段 7   性能检查          [建议] ─── 产物大小 + 资源优化 + 性能指标
  │
  ├─ 阶段 8 功能回归       [按需] ─── prompt/tools/actions/provider 专项
  │
阶段 9   Git 卫生          [必须] ─── 大文件 + 冲突标记 + 调试代码
  │
阶段 10  生成报告          [必须] ─── 完整审查报告
```

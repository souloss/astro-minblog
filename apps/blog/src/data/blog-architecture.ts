export interface ModalDetail {
  what: string;
  why: string;
  how: string;
  tools?: string;
  tips?: string;
}

export interface ArchItem {
  id: string;
  name: string;
  brief: string;
  ai?: boolean;
  detail?: ModalDetail;
}

export interface ArchTable {
  headers: string[];
  rows: string[][];
}

export interface ArchSection {
  title: string;
  items?: ArchItem[];
  table?: ArchTable;
  callout?: string;
}

export interface ArchLayer {
  code: string;
  name: string;
  icon: string;
  color: string;
  tagline: string;
  overview: string;
  ai?: boolean;
  sections: ArchSection[];
}

export const layers: ArchLayer[] = [
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // L1 · 内容模型层
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    code: "L1",
    name: "内容模型层",
    icon: "📐",
    color: "#2563eb",
    tagline: "内容是什么、如何组织与分类、元信息如何管理",
    overview:
      "定义博客的核心内容结构。包括内容实体类型（文章、系列、笔记等）、分类与标签体系、Frontmatter 元信息规范、以及内容质量校验规则。这是整个博客系统的数据模型基础。",
    sections: [
      {
        title: "内容实体类型",
        items: [
          {
            id: "l1-post",
            name: "普通文章 Post",
            brief:
              "主要内容单元。包含标题、正文（Markdown/MDX）、封面图、元信息。适合教程、深度分析、观点类内容。",
            detail: {
              what: "普通文章是博客的核心内容单元，每篇文章是一个独立的 Markdown 或 MDX 文件，包含 Frontmatter 元信息和正文内容。它是技术博客最常见也最重要的内容形式。",
              why: "文章是博客 SEO 流量的主要来源，也是建立作者专业度的核心载体。一篇深度技术文章的长尾流量可以持续数年。文章质量直接决定博客的读者留存率和口碑传播效果。",
              how: "在 <code>src/data/blog/</code> 目录下创建 <code>.md</code> 或 <code>.mdx</code> 文件。Frontmatter 必须包含 title、description、pubDatetime、tags。正文使用 Markdown 语法，MDX 允许嵌入 React/Astro 组件。建议字数 2000-5000 字，结构清晰，有代码示例。",
              tools:
                "Astro Content Collections 管理内容 · MDX 支持组件嵌入 · Zod 校验 Frontmatter · VS Code + MDX 插件辅助编辑",
              tips: "避免标题党——读者因标题点进来但内容质量不匹配会严重损害信任。每篇文章应有明确的目标读者和要解决的问题。slug 一经发布不可修改。",
            },
          },
          {
            id: "l1-series",
            name: "系列文章 Series",
            brief:
              "多篇有序文章构成的集合，有明确的阅读路径。如「React 深入系列」。系列页面应有完整的进度导航与学习路线图。",
            detail: {
              what: "系列文章是多篇按顺序组织的文章集合，围绕一个主题展开，具有递进的学习路径。在 Frontmatter 中通过 <code>series: { name: '系列名', order: 1 }</code> 关联。",
              why: "系列文章是技术博客的杀手级功能：提升读者粘性（读完一篇想看下一篇），增加页面浏览量（系列内互链），强化 SEO 权重（主题集中度高），并且能系统展示作者对某领域的深度理解。",
              how: "1. 规划系列大纲（5-10 篇为宜）<br>2. 每篇文章 Frontmatter 添加 series 字段<br>3. 创建系列索引页，展示目录和进度<br>4. 文章页面底部显示上一篇/下一篇导航<br>5. 每篇可独立阅读，但串联后价值更大",
              tools:
                "Astro Content Collections 的 reference 功能 · 自定义 series 组件显示进度条",
              tips: "不要在系列未完成时就承诺具体篇数。建议先完成 3 篇再发布，保持每 1-2 周更新一篇的节奏。废弃的系列比没有系列更损害信任。",
            },
          },
          {
            id: "l1-interactive",
            name: "交互式文章 Interactive Post",
            brief:
              "嵌入可交互的组件（代码沙盒、实时 Demo、可调参数的图表、动画演示）。使用 MDX 插入组件。技术博客差异化的重要手段。",
            detail: {
              what: "交互式文章利用 MDX 的组件嵌入能力，在 Markdown 正文中穿插可交互的 UI 组件：代码沙盒（读者可修改运行）、可调参数图表、算法动画、实时 Demo 等。",
              why: "这是技术博客与传统文档最大的差异化竞争点。静态文字+截图的时代已过去，读者期望「可以动手试」的内容。一个好的交互式 Demo 胜过千字说明，能大幅降低理解门槛。",
              how: "1. 使用 MDX 格式（<code>.mdx</code> 文件）<br>2. 创建交互组件（React/Svelte/Vue island）<br>3. 在 MDX 中 import 并嵌入：<code>&lt;CodePlayground code={example} /&gt;</code><br>4. 使用 Astro Islands 实现按需水合——交互组件只在可见时加载 JS<br>5. 提供非交互的静态降级方案（截图+说明文字），确保 RSS 和搜索引擎可读",
              tools:
                "MDX · Astro Islands（client:visible）· StackBlitz WebContainers · CodeSandbox Sandpack · Shiki 代码高亮",
              tips: "交互组件必须懒加载（<code>client:visible</code>），否则严重影响首屏性能。使用截图作为占位符，用户滚动到位时再加载实际组件。移动端需要适配触控交互。",
            },
          },
          {
            id: "l1-til",
            name: "TIL / 短笔记",
            brief:
              "Today I Learned，记录碎片知识点。字数少、频率高。避免大文章门槛，形成持续输出节奏。",
            detail: {
              what: "TIL（Today I Learned）是一种轻量级内容形态，通常 200-500 字，记录一个具体的知识点、技巧或发现。不需要完整的文章结构，重点是快速、准确、有用。",
              why: "TIL 解决了技术博客最大的障碍——「完美主义导致不写」。降低写作门槛，让作者保持持续输出的节奏。碎片知识积累后可以整合成深度文章。TIL 对 SEO 的贡献在于覆盖长尾关键词（具体问题的搜索词）。",
              how: "1. 创建 TIL 类别或标签<br>2. 使用简化的 Frontmatter 模板（仅 title、tags、date）<br>3. 内容格式：问题 → 解决方案 → 一句话原理<br>4. 可以用脚本自动生成模板：<code>pnpm run new:til</code><br>5. 列表页按时间倒序展示，支持按标签筛选",
              tips: "TIL 不是「随手记」——它仍然需要准确性和可读性。写给「3 个月后忘记这个知识点的自己」。每条 TIL 应该能通过搜索引擎独立被找到。",
            },
          },
          {
            id: "l1-showcase",
            name: "项目展示 Showcase",
            brief:
              "展示个人项目、开源贡献。包含技术栈、解决的问题、演示链接、仓库链接、开发历程。",
            detail: {
              what: "项目展示页面以结构化方式呈现个人作品：项目名称、截图/GIF、技术栈标签、解决的核心问题、在线 Demo 链接、GitHub 仓库链接、开发背景故事。",
              why: "技术博客是最好的简历。项目展示直接证明「能做出东西」，与文章的「能想清楚」互补。招聘方、潜在合作者、开源社区都会通过项目展示评估你的技术实力。",
              how: "1. 创建 <code>/projects</code> 或 <code>/showcase</code> 页面<br>2. 每个项目可以是独立 Markdown 文件或数据文件<br>3. 包含字段：title、description、techStack[]、demoUrl、repoUrl、coverImage、status（active/archived）<br>4. 按时间或重要度排序<br>5. 链接到相关的技术文章（如「我如何构建这个项目」）",
              tips: "只展示你引以为豪的项目。3 个高质量项目 > 20 个半成品。每个项目应有清晰的「这解决了什么问题」描述，而不只是技术栈罗列。",
            },
          },
          {
            id: "l1-booknotes",
            name: "读书笔记 / 书摘",
            brief:
              "对书籍、论文、报告的结构化摘录与评论。引用规范参考学术写作，注明来源。",
            detail: {
              what: "结构化的阅读记录，包含书籍基本信息、核心观点摘要、个人评注、推荐指数。引用格式参考学术标准，标注页码和章节。",
              why: "读书笔记展示知识广度和学习态度。高质量的书评本身就有搜索需求（读者在购书前会搜索书评）。它也帮助作者系统化消化所学知识。",
              how: "创建读书笔记模板 Frontmatter：bookTitle、author、isbn、rating、tags。正文结构：一句话总结 → 3-5 个核心观点 → 详细笔记 → 个人评价 → 推荐人群。",
              tips: "读书笔记不是照搬目录。最有价值的是你的个人理解和与实际工作的关联。注意版权——引用原文不超过合理使用范围。",
            },
          },
          {
            id: "l1-curated",
            name: "外链内容 Curated Links",
            brief:
              "精选外部链接合集（Weekly Picks 等）。提供简短评注，体现选题视角。",
            detail: {
              what: "定期发布的精选链接集合，每条包含标题、链接、一句话评注。类似 Weekly Newsletter 的博客版本，展示作者的信息筛选能力和技术视野。",
              why: "低创作成本但高价值——读者关注你不仅因为你写的内容，也因为你「看到了什么」。精选链接建立作者在某领域的「信息筛选者」身份。",
              how: "1. 建立日常信息收集习惯（RSS 订阅、Twitter Lists）<br>2. 使用 Raindrop.io 或 Omnivore 收集和标注<br>3. 每周/双周整理为一篇文章<br>4. 每条链接附 1-2 句评注，说明为什么值得看<br>5. 分类整理（前端/后端/AI/工具等）",
              tips: "评注质量比链接数量更重要。读者想知道「为什么你觉得这个值得看」，而不只是一堆链接堆砌。每期控制在 5-10 条。",
            },
          },
          {
            id: "l1-faq",
            name: "FAQ / 知识库",
            brief:
              "对读者高频问题的结构化整理。可由评论沉淀而来，也可主动构建。对 SEO 有显著价值（FAQPage Schema）。",
            detail: {
              what: "以问答形式组织的结构化知识库。每个 FAQ 条目包含一个明确的问题和简洁的回答。支持 FAQPage Schema 结构化标记。",
              why: "FAQ 内容直接匹配用户搜索意图（用户经常以问句搜索）。Google 会在搜索结果中直接展示 FAQ 富结果，显著提升点击率。FAQ 也减轻评论区重复提问的负担。",
              how: "1. 从评论区、Issue 收集高频问题<br>2. 创建 FAQ 页面或在文章末尾添加 FAQ 模块<br>3. 添加 FAQPage Schema JSON-LD 结构化标记<br>4. 每个答案简洁直接（50-200 字）<br>5. 定期更新，删除过时的问答",
              tools:
                "Schema.org FAQPage 标记 · Google Rich Results Test 验证 · 评论系统的问题收集",
              tips: "FAQ 答案要直接回答问题，不要绕弯子。确保标记的 FAQ 内容与页面上可见的内容一致，否则 Google 会惩罚。",
            },
          },
          {
            id: "l1-notice",
            name: "通知 / 公告",
            brief:
              "博客更新说明、停更公告、重大变更通知。独立于文章流，不影响内容 Feed。",
            detail: {
              what: "与文章流分离的通知内容，用于博客本身的更新说明、技术迁移公告、停更/复更通知等。不出现在 RSS Feed 和文章列表中。",
              why: "让读者了解博客动态，管理预期。迁移域名、评论系统更换、重大改版等信息需要明确传达。放在文章流中会污染内容质量。",
              how: "创建独立的公告区域（首页 Banner 或专用公告页面）。使用 Frontmatter 的 type: notice 区分。设置过期时间，到期自动隐藏。",
              tips: "公告应简洁明了，包含时间、内容、影响范围。不要频繁发公告——只有真正影响读者体验的变更才需要公告。",
            },
          },
        ],
      },
      {
        title: "内容分类与组织",
        items: [
          {
            id: "l1-tag",
            name: "标签 Tag",
            brief:
              "扁平化分类，一篇文章可有多个标签。标签页需有聚合列表，避免孤立标签。标签命名规范：全小写、连字符分隔。",
            detail: {
              what: "标签是扁平化的内容分类方式，每篇文章可以关联多个标签。标签名应全小写、连字符分隔（如 <code>react-hooks</code>、<code>css-grid</code>），保持一致性。",
              why: "标签是读者发现相关内容的重要入口，也是 SEO 的长尾关键词载体。标签聚合页汇集同主题内容，帮助搜索引擎理解站点的主题结构。",
              how: "1. 在 Frontmatter 中使用 <code>tags: [react, typescript, performance]</code><br>2. 构建时自动生成 <code>/tags/[tag]</code> 聚合页<br>3. 标签数量控制在 2-5 个/篇<br>4. 维护一个「标签词典」，避免同义标签（如 js 和 javascript）<br>5. 无文章的标签不应出现在标签云中",
              tips: "标签是给读者看的分类，不是给自己看的备忘。每个标签至少应有 3 篇文章，否则合并或删除。定期审查标签体系，合并低频标签。",
            },
          },
          {
            id: "l1-category",
            name: "专题 Topic / 分类 Category",
            brief:
              "层级化分类，粒度比标签粗。适合按技术领域（Frontend / Backend / DevOps）组织。",
            detail: {
              what: "分类是树状的层级分类体系，粒度比标签更粗。一篇文章通常只属于一个分类。支持层级：<code>教程/配置</code>、<code>前端/React</code>。",
              why: "分类提供宏观的内容导航结构，让读者快速找到感兴趣的领域。与标签互补——分类回答「这是关于什么领域的」，标签回答「涉及哪些具体技术」。",
              how: "1. 设计 2 层分类体系（大类 + 子类），不超过 3 层<br>2. Frontmatter 中使用 <code>category: \"教程/配置\"</code><br>3. 生成分类索引页和子分类页面<br>4. 顶部导航或侧边栏展示主要分类<br>5. 面包屑导航展示当前文章的分类路径",
              tips: "分类不宜过细——每个分类至少应有 5 篇文章。宁可分类少而内容充实，也不要分类多而稀疏。分类体系确定后尽量稳定，频繁调整分类会导致 URL 变动。",
            },
          },
          {
            id: "l1-relations",
            name: "内容关系图",
            brief:
              "文章间的语义关系：belongs_to、references、related_to、supersedes 等。驱动「相关文章」和系列导航。",
            detail: {
              what: "定义文章之间的语义关系类型：<code>belongs_to</code>（属于系列）、<code>references</code>（引用来源）、<code>derived_from</code>（基于讨论衍生）、<code>related_to</code>（相关推荐）、<code>supersedes</code>（替代旧文章）、<code>updates</code>（追更记录）。",
              why: "内容关系图是实现智能推荐的基础。「相关文章」不再是简单的标签匹配，而是基于语义关系的精准推荐。系列导航、版本替代提示、延伸阅读都依赖关系图。",
              how: "1. Frontmatter 中定义关系字段：<code>relatedPosts: [slug1, slug2]</code><br>2. 构建时解析关系，生成关系图数据<br>3. 文章底部展示「相关推荐」模块<br>4. 过期文章顶部展示「本文已有更新版本」链接<br>5. 可选：结合 AI Embedding 自动发现关系",
              tips: "手动维护关系的成本很高，建议只维护 supersedes（替代）和 belongs_to（系列）关系，其余由算法自动推荐。",
            },
          },
          {
            id: "l1-status",
            name: "内容状态",
            brief:
              "草稿 Draft / 已发布 Published / 已归档 Archived / 已废弃 Deprecated。废弃文章保留并展示替代链接。",
            detail: {
              what: "内容生命周期状态管理：<code>draft</code>（写作中，不公开）→ <code>published</code>（已发布）→ <code>archived</code>（归档，不再推荐但可访问）→ <code>deprecated</code>（已过时，展示替代链接）。",
              why: "状态管理防止过时内容误导读者。废弃但不删除的策略既保留了 SEO 历史权重，又通过替代链接引导读者到最新内容。删除文章会产生 404，损害 SEO 和用户体验。",
              how: "1. Frontmatter 中使用 <code>draft: true/false</code> 控制发布<br>2. 添加 <code>status</code> 字段管理归档和废弃<br>3. 废弃文章顶部展示醒目的 Banner + 替代链接<br>4. 归档文章从首页和推荐中移除，但保留访问<br>5. 构建时过滤 draft 文章",
              tips: "不要频繁标记文章为废弃——读者会质疑博客内容的持久价值。只有技术栈发生根本性变化时才使用 deprecated。",
            },
          },
        ],
      },
      {
        title: "元信息规范 Frontmatter",
        items: [
          {
            id: "l1-identity",
            name: "身份元数据",
            brief:
              "slug、title、subtitle、description（150字内，用于 SEO 和 OG）。slug 命名含关键词和年份。",
            detail: {
              what: "每篇文章的唯一标识和展示信息：<code>slug</code>（URL 路径，发布后不可修改）、<code>title</code>（标题）、<code>subtitle</code>（副标题，可选）、<code>description</code>（150 字以内的摘要，用于 SEO meta description 和 OG 卡片）。",
              why: "这些字段直接决定文章在搜索结果和社交分享中的展示效果。好的 title + description 可以将点击率提升 2-3 倍。slug 是永久标识符，错误的 slug 设计会导致后续 URL 迁移的巨大成本。",
              how: "slug 规范：<code>react-server-components-2025</code>（技术关键词+年份）。title 控制在 60 字符内（Google 截断长度）。description 100-150 字，包含核心关键词，首句回答「这篇文章讲什么」。",
              tips: "slug 一旦发布绝不修改。如果必须修改，做 301 永久重定向。description 不要以「本文介绍了...」开头，直接陈述核心价值。",
            },
          },
          {
            id: "l1-time",
            name: "时间元数据",
            brief:
              "publishedAt、updatedAt。区分「小修正」与「实质性更新」。",
            detail: {
              what: "<code>publishedAt</code>：首次发布时间，不可修改。<code>updatedAt</code>：最后一次实质性内容更新时间。两者都以 ISO 8601 格式存储，携带时区信息。",
              why: "时间元数据影响 SEO（Google 倾向展示最新内容）、RSS 排序、以及读者对内容时效性的判断。正确区分「小修正」和「实质性更新」避免滥用 updatedAt 欺骗搜索引擎。",
              how: "Frontmatter 格式：<code>pubDatetime: 2025-06-01T10:00:00+08:00</code>。修错别字不更新 updatedAt。新增章节、更新代码示例版本才更新。配合 <code>timezone</code> 字段确保时间显示正确。",
              tips: "不要为了 SEO 频繁更新 updatedAt 而不实际修改内容——Google 会检测到这种行为并降权。构建脚本可自动检测 git diff 判断是否为实质性更新。",
            },
          },
          {
            id: "l1-taxonomy",
            name: "分类元数据",
            brief: "tags、series、category、status 的定义与校验。",
            detail: {
              what: "分类相关字段：<code>tags: string[]</code>（标签数组）、<code>series: { name, order }</code>（系列信息）、<code>category: string</code>（分类路径）、<code>status: string</code>（内容状态）。",
              why: "分类元数据是内容组织和发现的基础。正确的分类让博客从「文章堆」变成「结构化知识库」，提升读者浏览效率和 SEO 效果。",
              how: "使用 Zod Schema 严格校验：tags 至少 1 个最多 5 个、series.order 必须为正整数、category 必须在预定义列表中。构建时校验不通过则报错。",
              tips: "避免过度分类。一个合理的博客通常有 3-5 个分类、20-50 个标签。新建标签前先看看是否有已存在的同义标签。",
            },
          },
          {
            id: "l1-reader",
            name: "读者元数据",
            brief:
              "difficulty（初/中/高级）、readingTime、audience。降低读者决策成本。",
            detail: {
              what: "面向读者的辅助信息：<code>difficulty</code>（beginner/intermediate/advanced）、<code>readingTime</code>（预估阅读时间，可自动计算）、<code>audience</code>（目标读者描述）。",
              why: "这些信息帮助读者在点击之前判断「这篇文章适不适合我」，降低决策成本。高级文章标注为 advanced 可以避免初学者点进来后困惑退出，也能吸引目标读者。",
              how: "difficulty 在 Frontmatter 手动设置。readingTime 使用 reading-time 包自动计算（中文按 300 字/分钟，英文按 200 词/分钟）。在文章列表卡片和文章头部展示这些信息。",
              tips: "阅读时间会影响读者的心理预期——5 分钟和 30 分钟的文章，读者的准备状态完全不同。如实标注比低估更好。",
            },
          },
          {
            id: "l1-copyright",
            name: "版权与声明",
            brief:
              "license、aiUsage、canonicalUrl 跨平台发布时的规范。",
            detail: {
              what: "<code>license</code>（内容许可协议，如 CC BY 4.0）、<code>aiUsage</code>（是否使用 AI 及如何使用）、<code>canonicalUrl</code>（跨平台发布时指向原始 URL，防止 SEO 分散）。",
              why: "明确的许可协议保护作者权益，也让读者知道如何合法引用。canonicalUrl 在多平台发布时防止搜索引擎将流量分散到副本页面。AI 声明在 2026 年是建立信任的重要手段。",
              how: "Frontmatter 中设置 <code>license: 'CC BY-NC-SA 4.0'</code>。在其他平台发布时设置 <code>canonicalUrl</code> 指向博客原文。文章页脚展示版权信息和许可协议链接。",
              tips: "推荐 CC BY-NC-SA 4.0：允许非商业转载但需署名和相同方式共享。canonicalUrl 必须在其他平台的文章中也设置（如掘金支持自定义 canonical）。",
            },
          },
          {
            id: "l1-ai-meta",
            name: "AI 生成元数据",
            brief:
              "autoTags、aiSummary、coverImagePrompt、embeddings 标记。由构建流水线自动填充。",
            ai: true,
            detail: {
              what: "由 AI 在构建时自动生成的元数据字段：<code>autoTags</code>（AI 推荐标签）、<code>aiSummary</code>（AI 生成摘要）、<code>coverImagePrompt</code>（AI 配图使用的 Prompt）、<code>embeddings</code>（向量化状态标记）。",
              why: "AI 元数据自动化减轻作者负担（不用手动写摘要、选标签），同时提升一致性。记录 AI Prompt 确保生成结果可复现、风格可调整。",
              how: "构建脚本中集成 AI 调用：检测空字段 → 调用 LLM API → 写入 Frontmatter。使用 <code>autoTags</code> 与手动 <code>tags</code> 分开存储，人工可覆盖 AI 推荐。",
              tools:
                "Claude/GPT API · 构建脚本（Node.js/Python）· Frontmatter 解析库（gray-matter）",
              tips: "AI 生成的元数据应标记为「AI 生成」，便于后续审计。始终保留人工覆盖的能力——AI 推荐仅供参考。",
            },
          },
        ],
      },
      {
        title: "内容质量规则",
        items: [
          {
            id: "l1-schema",
            name: "Schema 校验",
            brief:
              "使用 Zod / JSON Schema 对 Frontmatter 进行类型校验。CI 中强制检查，必填字段缺失则构建失败。",
            detail: {
              what: "使用 Zod 或 JSON Schema 定义 Frontmatter 的类型约束，在构建时自动校验每篇文章的元信息完整性和正确性。Astro v5 的 Content Collections 原生支持 Zod Schema。",
              why: "防止人为疏忽导致的元信息缺失（如忘记写 description 导致 SEO 受损，tags 格式错误导致聚合页异常）。Schema 校验是「写作纪律」的自动化执行。",
              how: "在 <code>src/content.config.ts</code> 中定义 Zod Schema。关键校验规则：title 不超过 60 字符、description 100-160 字符、tags 1-5 个、pubDatetime 为有效日期。构建失败时明确提示哪篇文章哪个字段有问题。",
              tips: "Schema 规则从宽开始，逐步收紧。一开始不要设太多必填字段，否则会抑制写作动力。随着内容增多再逐步规范化。",
            },
          },
          {
            id: "l1-version",
            name: "版本过期管理",
            brief:
              "文章标注 techVersions，构建时检测版本是否过时，自动展示提示 Banner 并创建 Issue。",
            detail: {
              what: "在 Frontmatter 中记录文章涉及的技术版本（如 <code>techVersions: { react: '18', node: '20' }</code>），构建时自动对比最新版本，超期文章展示警告 Banner。",
              why: "技术文章的最大问题是「过期而不自知」。读者按照 React 17 的教程操作 React 19 项目会遇到各种问题。自动过期检测保护读者免受过时信息的影响。",
              how: "1. Frontmatter 添加 <code>techVersions</code> 字段<br>2. 构建脚本查询 npm registry / GitHub releases 获取最新版本<br>3. 版本差距超过 2 个大版本则标记为过期<br>4. 过期文章顶部自动注入警告 Banner<br>5. 同时创建 GitHub Issue 提醒作者更新",
              tools:
                "npm registry API · GitHub Releases API · GitHub Actions 定时任务",
              tips: "不是所有技术都需要跟踪版本——只跟踪文章核心依赖的技术。CSS 技巧类文章通常不需要版本跟踪。设置合理的过期阈值，避免频繁误报。",
            },
          },
        ],
      },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // L2 · 创作与生产层
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    code: "L2",
    name: "创作与生产层",
    icon: "✍️",
    color: "#7c3aed",
    tagline: "内容如何产生、工具链、AI 辅助写作",
    overview:
      "覆盖从灵感到成文的完整创作链路。包括内容格式选型（MDX vs Markdown）、编辑器与 CMS 选择、内容模板系统、AI 辅助写作集成、以及写作质量保证工具链。",
    sections: [
      {
        title: "创作工具链",
        items: [
          {
            id: "l2-format",
            name: "内容格式",
            brief:
              "MDX：Markdown + 组件插入。适合技术博客嵌入交互 Demo、代码块、数学公式。",
            detail: {
              what: "MDX 是 Markdown 的超集，允许在 Markdown 中导入和使用 React/Astro 组件。纯 Markdown 适合简单内容，MDX 适合需要交互组件的技术文章。",
              why: "MDX 让技术博客突破纯文本的限制——嵌入代码沙盒、可交互图表、动画演示。这是静态博客与 Medium 等平台的核心差异化优势。",
              how: "1. Astro 原生支持 MDX（<code>@astrojs/mdx</code>）<br>2. 在 <code>.mdx</code> 文件中 import 组件<br>3. 配置 MDX 插件：remark-math（数学公式）、rehype-mermaid（流程图）<br>4. 创建自定义 MDX 组件库（CodeBlock、Callout、Tabs 等）<br>5. 在 <code>mdx-components.ts</code> 中统一配置默认组件映射",
              tools:
                "Astro MDX 集成 · remark/rehype 插件生态 · KaTeX 数学公式 · Mermaid 图表 · Shiki 代码高亮",
              tips: "不是所有文章都需要 MDX——简单的文字文章用 .md 即可。MDX 的组件导入语法对非程序员不友好。组件接口要简洁，降低使用门槛。",
            },
          },
          {
            id: "l2-editor",
            name: "本地编辑器",
            brief:
              "Obsidian（双链笔记→博客）或 VSCode + MDX 插件。两种写作驱动模式。",
            detail: {
              what: "两种主流本地编辑方案：Obsidian（笔记优先，双向链接，所见即所得）和 VSCode（工程优先，MDX 插件，版本控制集成）。",
              why: "本地编辑保证写作不依赖网络服务，数据完全自主。选择哪个编辑器取决于写作习惯——Obsidian 适合「先记后写」，VSCode 适合「直接写成文章」。",
              how: "Obsidian 方案：在 Obsidian vault 中写作 → 使用 obsidian-git 同步到博客仓库 → 需要处理 Obsidian 语法与 MDX 的差异。VSCode 方案：直接在博客仓库中编辑 → MDX 插件提供语法高亮和预览 → 与 Git 无缝集成。",
              tools:
                "Obsidian + obsidian-git 插件 · VS Code + MDX 扩展 + Markdown Preview Enhanced · Typora（简洁 Markdown 编辑器）",
              tips: "无论选哪个，都要配置拼写检查（Code Spell Checker）和 Markdown 格式化（Prettier）。建议在 VS Code 中安装 Front Matter CMS 扩展，提供可视化的 Frontmatter 编辑体验。",
            },
          },
          {
            id: "l2-cms",
            name: "Git-based CMS",
            brief:
              "Tina CMS / Keystatic / Contentlayer：内容存在 Git 仓库，提供可视化编辑界面。",
            detail: {
              what: "基于 Git 的内容管理系统，内容文件仍然存储在 Git 仓库中（不是数据库），但提供 Web 可视化编辑界面。代表方案：Tina CMS、Keystatic、Decap CMS（原 Netlify CMS）。",
              why: "降低非技术贡献者的写作门槛（不需要了解 Git 和 Markdown），同时保留 Git 作为 single source of truth 的优势。适合团队博客或需要非开发者参与内容编辑的场景。",
              how: "以 Tina CMS 为例：<br>1. <code>npx @tinacms/cli init</code> 初始化<br>2. 配置 Content Schema（映射到 Frontmatter）<br>3. 部署 Tina Cloud 或自建后端<br>4. 通过 <code>/admin</code> 路径访问可视化编辑器<br>5. 编辑后自动创建 Git commit",
              tools:
                "Tina CMS（功能最丰富）· Keystatic（Astro 原生集成）· Decap CMS（最简单）· Contentlayer（类型安全内容层）",
              tips: "个人博客通常不需要 CMS——直接编辑 Markdown 文件更快。只有多人协作或有非技术编辑参与时才值得引入 CMS 的额外复杂度。",
            },
          },
          {
            id: "l2-template",
            name: "内容模板",
            brief:
              "预置 Frontmatter 模板，脚本生成新文件。npm run new:post 避免手动填写。",
            detail: {
              what: "通过脚手架脚本自动生成新文章的模板文件，预填 Frontmatter 字段（时间戳、作者、默认标签等），放置到正确的目录位置。",
              why: "消除创作的启动摩擦。每次新建文章不用手动复制粘贴 Frontmatter、不用记忆字段格式、不用纠结文件放在哪个目录。一条命令即可进入写作状态。",
              how: "1. 创建模板脚本（Node.js 或使用 plop.js）<br>2. 注册 npm script：<code>\"new:post\": \"node scripts/new-post.js\"</code><br>3. 脚本交互式询问：标题、分类、标签、难度<br>4. 自动生成文件到 <code>src/data/blog/zh/</code><br>5. 预填时间戳、作者、默认模板内容",
              tools:
                "plop.js · inquirer.js · 自定义 Node.js 脚本 · VS Code snippets 作为轻量替代",
              tips: "模板应包含写作提示（如「在此处写摘要」），帮助作者记住每个字段的用途。为不同内容类型准备不同模板（post、til、showcase）。",
            },
          },
        ],
      },
      {
        title: "AI 辅助写作",
        items: [
          {
            id: "l2-auto-tags",
            name: "自动标签生成",
            brief:
              "构建时调用 LLM API 分析文章内容，从已有标签集中推荐标签。人工审核后写入。",
            ai: true,
            detail: {
              what: "在构建流水线中调用 LLM API（Claude/GPT），将文章内容作为输入，从博客已有的标签列表中推荐最匹配的标签。结果写入 Frontmatter 的 <code>autoTags</code> 字段。",
              why: "标签选择是耗时且容易遗漏的工作。AI 可以从文章语义层面推荐标签，发现作者可能忽略的关联。限定在已有标签集中避免标签膨胀。",
              how: "1. 构建脚本读取所有已有标签列表<br>2. 对每篇文章调用 LLM：「从以下标签中选择最匹配的 3-5 个：[tag1, tag2, ...]。文章内容：[content]」<br>3. 解析 LLM 输出，写入 autoTags 字段<br>4. 人工审核：在 CMS 或编辑器中查看并确认/修改<br>5. 最终发布的 tags 由人工决定",
              tools:
                "Claude API / OpenAI API · gray-matter 解析 Frontmatter · 构建脚本集成",
              tips: "Prompt 中明确要求「只从提供的标签列表中选择，不要创造新标签」。设置 temperature 为 0 以确保结果稳定可复现。成本约 $0.001/篇。",
            },
          },
          {
            id: "l2-ai-summary",
            name: "AI 摘要生成",
            brief:
              "自动生成文章 description，供 SEO 和列表页展示。支持自动/手动/混合模式。",
            ai: true,
            detail: {
              what: "针对 description 字段为空的文章，构建时自动调用 LLM 生成 150 字以内的 SEO 友好摘要。支持三种模式：全自动、手动输入、混合（AI 草稿+人工润色）。",
              why: "好的 description 直接影响搜索结果点击率。手写每篇文章的摘要耗时，AI 可以快速生成高质量初稿。摘要质量对 SEO 排名有间接影响（影响 CTR，CTR 影响排名）。",
              how: "Prompt 设计要点：「为以下技术文章生成 SEO 摘要，100-150 字，包含核心关键词，语言简洁直接，避免'本文将介绍'等空话。文章内容：[content]」",
              tools: "Claude API（摘要质量优秀）· GPT-4 · 构建脚本 · gray-matter",
              tips: "AI 摘要仅作初稿，发布前务必人工审核。特别注意 AI 可能编造不存在的功能或错误的技术细节。摘要中不要包含时间相关表述（如「最新」「近期」）。",
            },
          },
          {
            id: "l2-ai-cover",
            name: "AI 配图生成",
            brief:
              "根据文章标题和内容调用图像生成 API，自动生成封面图和 OG 图。记录 Prompt 到 Frontmatter。",
            ai: true,
            detail: {
              what: "使用 AI 图像生成工具（DALL-E 3、Ideogram、Stable Diffusion）根据文章内容自动生成封面图和社交分享 OG 图。将生成 Prompt 记录到 Frontmatter 确保风格一致性和可复现性。",
              why: "专业的封面图显著提升社交分享的点击率（有图 vs 无图的 CTR 差距可达 3-5 倍）。手动设计每篇文章的封面图成本太高，AI 生成提供了高效替代方案。",
              how: "1. 设计一套统一的 Prompt 模板（固定风格前缀 + 文章标题变量）<br>2. 构建脚本调用图像 API<br>3. 生成的图片存储到 <code>public/images/covers/</code><br>4. Prompt 写入 Frontmatter <code>coverImagePrompt</code> 字段<br>5. 支持手动替换（上传自定义封面图覆盖 AI 生成的）",
              tools:
                "DALL-E 3 · Ideogram（文字渲染最好）· Stable Diffusion XL · Midjourney（需手动操作）",
              tips: "建立统一的视觉风格指南（如「极简线条插画，深色背景，科技感」），写入 Prompt 前缀。AI 生成的图片注意版权——不同工具的商用许可不同。",
            },
          },
          {
            id: "l2-writing-assist",
            name: "写作辅助（本地）",
            brief:
              "VSCode 插件辅助技术内容写作：代码补全、术语建议、语法检查。",
            ai: true,
            detail: {
              what: "在编辑器中使用 AI 辅助写作工具：GitHub Copilot（代码+文本补全）、Codeium（免费替代）、Grammarly（英文语法）。这些工具辅助写作过程，与最终发布内容没有直接绑定。",
              why: "AI 辅助让写作更高效——不是替代思考，而是减少机械劳动。代码示例的补全、技术术语的拼写检查、段落结构的建议都能显著加速写作过程。",
              how: "1. 安装 GitHub Copilot / Codeium VS Code 扩展<br>2. 为 Markdown/MDX 文件启用建议<br>3. 配合 Vale 检查写作风格一致性<br>4. 使用 AI 辅助翻译（中英双语文章）<br>5. 提交前关闭 AI 建议，人工通读全文",
              tips: "AI 辅助写作最大的风险是「听起来对但实际上错」。技术文章中 AI 生成的代码示例务必实际运行验证。写作过程中 AI 辅助，发布前人工把关。",
            },
          },
          {
            id: "l2-seo-keywords",
            name: "SEO 关键词建议",
            brief: "构建前调用 AI 分析文章，推荐可优化的关键词布局。",
            ai: true,
            detail: {
              what: "使用 AI 分析文章内容，检查标题、摘要、H2 标题是否包含目标关键词，推荐可优化的关键词布局策略。",
              why: "技术文章的关键词优化不是堆砌关键词，而是确保目标关键词自然出现在关键位置（标题、首段、H2、description）。AI 可以快速检查这些位置是否覆盖到目标关键词。",
              how: "1. 确定文章目标关键词（如 react-server-components）<br>2. AI 检查：标题是否包含关键词、H2 是否覆盖相关长尾词、description 是否包含关键词<br>3. 生成优化建议报告<br>4. 人工决定是否采纳建议",
              tips: "关键词优化是「自然地在正确位置出现」，不是「在每段都强行塞入」。过度优化（keyword stuffing）会被搜索引擎惩罚。",
            },
          },
        ],
      },
      {
        title: "内容质量保证",
        items: [
          {
            id: "l2-vale",
            name: "文章写作风格检查",
            brief:
              "Vale：可配置规则的散文检查工具。检查主动语态、术语一致性、避免过度使用的词汇。",
            detail: {
              what: "Vale 是一个类似代码 Lint 的散文质量检查工具。可配置规则检查：主动语态比例、术语一致性（如统一使用「前端」而非混用「前端开发」）、避免过度使用的词汇、段落长度限制等。",
              why: "技术文章的可读性和一致性直接影响读者体验。术语不一致让读者困惑，被动语态让文章沉闷，过长的段落让读者失去耐心。Vale 自动化地维护写作质量。",
              how: "1. 安装 Vale：<code>brew install vale</code><br>2. 创建 <code>.vale.ini</code> 配置文件<br>3. 添加中文写作规则包或自定义规则<br>4. CI 中集成 <code>vale src/data/blog/</code><br>5. VS Code 安装 Vale 扩展获得实时反馈",
              tools:
                "Vale CLI · vale-vscode 扩展 · 自定义规则包 · GitHub Actions 集成",
              tips: "不要一开始就启用所有规则——先从最基本的规则开始（如段落长度限制），逐步添加。中文 Vale 规则需要自定义，英文有现成的 Google/Microsoft 写作风格规则包。",
            },
          },
          {
            id: "l2-mdlint",
            name: "Markdown 格式规范",
            brief:
              "markdownlint 检查语法规范，配合 Prettier 统一格式。CI 中执行。",
            detail: {
              what: "markdownlint 检查 Markdown 文件是否符合编码规范：标题层级是否跳级、列表缩进是否一致、代码块是否有语言标注等。配合 Prettier 自动格式化。",
              why: "统一的 Markdown 格式确保所有文章的排版一致性。不一致的格式不仅影响阅读，还可能导致渲染异常（如某些 Markdown 解析器对缩进敏感）。",
              how: "1. 安装：<code>pnpm add -D markdownlint-cli2</code><br>2. 创建 <code>.markdownlint.yaml</code> 配置<br>3. 在 <code>package.json</code> 添加 lint 脚本<br>4. CI 中作为合并前检查<br>5. VS Code 安装 markdownlint 扩展获得实时提示",
              tips: "关闭与 MDX 冲突的规则（如 MD033 no-inline-html，MDX 需要内联 HTML/组件）。配置 .markdownlintignore 排除生成文件。",
            },
          },
          {
            id: "l2-code-test",
            name: "代码示例验证",
            brief:
              "文章中的代码示例通过测试文件引用，构建时运行测试确保代码不会过期报错。",
            detail: {
              what: "文章中的代码示例不是直接内联文本，而是引用自实际可运行的测试文件。构建时运行这些测试，确保代码示例始终有效。如果某个依赖升级导致示例代码失效，构建会报错提醒。",
              why: "过期的代码示例是技术博客最大的信誉杀手。读者照着代码操作却报错，会立即失去信任。自动化验证是防止代码腐烂的唯一可靠手段。",
              how: "1. 代码示例存放在 <code>examples/</code> 目录<br>2. MDX 中引用：<code>import example from '../../examples/react-memo.tsx?raw'</code><br>3. 为每个示例编写简单测试（至少能编译通过）<br>4. CI 中运行测试：<code>vitest run examples/</code><br>5. 测试失败时标记相关文章为需要更新",
              tools: "Vitest / Jest · MDX import raw · GitHub Actions · Renovate/Dependabot 检测依赖更新",
              tips: "不需要为每个代码片段都写完整测试——至少确保能编译通过。对于关键的教程代码，写完整的 E2E 测试。成本-收益权衡：核心教程严格测试，碎片代码松散检查。",
            },
          },
        ],
      },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // L3 · 呈现与体验层
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    code: "L3",
    name: "呈现与体验层",
    icon: "👁",
    color: "#059669",
    tagline: "读者如何阅读内容、性能、无障碍、交互式体验",
    overview:
      "决定读者的直接体验。涵盖 Web 性能指标（Core Web Vitals）、阅读增强功能（TOC、代码块、主题切换）、交互式内容组件（代码沙盒、图表、动画）、无障碍标准、以及媒体优化策略。",
    sections: [
      {
        title: "性能指标目标",
        table: {
          headers: ["指标", "目标值", "说明"],
          rows: [
            [
              "LCP",
              "< 2.5s",
              "最大内容元素渲染时间，通常是封面图或首屏标题",
            ],
            ["INP", "< 200ms", "交互响应时间，替代原 FID 指标（2024 起）"],
            ["CLS", "< 0.1", "布局偏移，图片未设宽高是主要原因"],
            ["TTFB", "< 800ms", "服务器响应时间，CDN 边缘节点是关键"],
            ["FCP", "< 1.8s", "首次内容渲染，字体加载策略影响此指标"],
          ],
        },
        callout:
          "Core Web Vitals 是 Google 排名因素之一。静态博客天然具备性能优势——关注图片优化和字体加载即可达标。",
      },
      {
        title: "阅读功能",
        items: [
          {
            id: "l3-toc",
            name: "目录 TOC",
            brief:
              "2000 字以上文章必须提供。浮动侧边栏或顶部展开。滚动时高亮当前章节。",
            detail: {
              what: "Table of Contents（目录），自动从文章的 H2/H3 标题生成层级目录。宽屏设备显示为浮动侧边栏，移动端为可折叠的顶部目录。滚动时高亮当前阅读的章节。",
              why: "长文章（2000+ 字）没有 TOC 会让读者迷失。TOC 提供文章结构概览，帮助读者决定是否值得阅读，也方便快速跳转到感兴趣的章节。TOC 对 SEO 也有正面影响（Google 可能直接在搜索结果中展示跳转链接）。",
              how: "1. 使用 remark 插件自动提取标题生成 TOC 数据<br>2. 宽屏（>1280px）：右侧 sticky 侧边栏<br>3. 窄屏：文章顶部可折叠的目录区域<br>4. 使用 IntersectionObserver 监听标题元素进入视口<br>5. 滚动时动态高亮对应的 TOC 条目<br>6. 点击 TOC 条目平滑滚动到对应标题",
              tools:
                "remark-toc · rehype-slug（为标题添加 id）· IntersectionObserver API",
              tips: "TOC 只显示 H2 和 H3 层级，更深层级会让 TOC 过于冗长。在移动端默认折叠 TOC，减少对正文阅读区域的占用。",
            },
          },
          {
            id: "l3-codeblock",
            name: "代码块增强",
            brief:
              "语法高亮（Shiki，零 JS）、行号、复制按钮、diff 视图。技术博客的核心 UI 组件。",
            detail: {
              what: "技术博客的代码块需要远超默认 Markdown 的功能：语法高亮、行号显示、一键复制按钮、文件名标注、diff 视图（+/- 行标色）、行高亮、语言标识徽章。",
              why: "代码块是技术博客最频繁使用的 UI 组件，其质量直接影响读者对博客专业度的判断。好的代码块让教程易于跟随，差的代码块（如无高亮、无复制按钮）让读者抓狂。",
              how: "1. 使用 Shiki 进行语法高亮（服务端渲染，零运行时 JS）<br>2. 配置 Shiki 的 transformers：添加行号、diff 标记、行高亮<br>3. 为每个代码块添加复制按钮（客户端 JS）<br>4. 支持文件名标注：<code>```tsx title=\"App.tsx\"</code><br>5. 浅色/深色主题分别配置代码高亮主题<br>6. 长代码块可折叠，默认显示前 20 行",
              tools:
                "Shiki（Astro 内置支持）· @shikijs/transformers · 自定义复制按钮组件",
              tips: "避免使用客户端高亮库（如 Prism.js），Shiki 在构建时渲染无运行时成本。代码块内的文本应支持选择复制。移动端代码块需要横向滚动支持。",
            },
          },
          {
            id: "l3-theme",
            name: "深浅色主题",
            brief:
              "三模式：浅色/深色/跟随系统。避免首次加载闪烁（FOUC）。",
            detail: {
              what: "三档主题切换：浅色模式、深色模式、跟随系统（prefers-color-scheme）。用户选择存储在 localStorage。代码高亮主题随之切换。",
              why: "深色模式是技术博客的标配需求——开发者通常使用深色 IDE，切换到浅色博客页面会感到不适。跟随系统选项尊重用户的系统级偏好设置。",
              how: "1. 在 <code>&lt;head&gt;</code> 中注入主题检测脚本（阻塞渲染，防止 FOUC）<br>2. 使用 CSS 变量管理所有颜色值<br>3. <code>html[data-theme='dark']</code> 选择器切换变量<br>4. localStorage 存储用户选择<br>5. Shiki 配置双主题：<code>themes: { light: 'github-light', dark: 'github-dark' }</code>",
              tips: "主题切换脚本必须在 <code>&lt;head&gt;</code> 中同步执行，不能 defer/async，否则会出现首次加载闪烁（先白后黑或先黑后白）。图片也要考虑深浅色适配（SVG 图标在深色背景上可能不可见）。",
            },
          },
          {
            id: "l3-progress",
            name: "阅读进度与统计",
            brief:
              "顶部进度条、预计阅读时间、可选阅读完成率统计。",
            detail: {
              what: "页面顶部的细线进度条显示阅读进度（基于滚动位置），文章头部显示预计阅读时间。可选：匿名记录阅读完成率数据用于内容分析。",
              why: "进度条给读者心理预期——知道「还剩多少」。阅读时间帮助读者决定是否现在阅读还是稍后收藏。阅读完成率数据帮助作者了解文章的哪个部分导致读者流失。",
              how: "进度条：监听 scroll 事件计算 <code>scrollTop / (scrollHeight - clientHeight)</code>，渲染为顶部 2px 高的固定定位彩色条。阅读时间：使用 reading-time 库，中文 300 字/分钟。",
              tips: "进度条不要太粗（2px 足够），不要使用醒目的颜色——它是辅助信息，不应干扰阅读。阅读完成率统计需要隐私友好的实现方式（匿名、不跟踪用户身份）。",
            },
          },
          {
            id: "l3-outdated-banner",
            name: "版本过期 Banner",
            brief:
              "文章过期或技术版本过时时，顶部展示警告 Banner 和替代链接。",
            detail: {
              what: "当文章 updatedAt 超过 18 个月，或 techVersions 中有过期版本时，在文章顶部自动展示醒目的警告 Banner：「本文写于 X 年，部分内容可能已过期，请参考最新文档」。",
              why: "过期内容是技术博客的最大信誉风险。主动标注过期比让读者自己发现过期更好——这表明博客在认真对待内容质量。",
              how: "构建时判断 updatedAt 与当前日期的差值，超过阈值则自动注入 Banner 组件。Banner 包含：过期提示、最后更新日期、如果有更新版本则链接到新文章。",
              tips: "Banner 应该是警告而非阻断——不要阻止读者阅读过期内容，有些信息仍然有参考价值。样式使用黄色/橙色背景，与正文明确区分。",
            },
          },
          {
            id: "l3-footnote",
            name: "脚注与引用",
            brief:
              "学术式脚注、引用块带来源标注、外链安全属性。",
            detail: {
              what: "支持学术式脚注（<code>[^1]</code>）、带来源标注的引用块（blockquote + 出处）。外部链接自动添加 <code>rel=\"noopener noreferrer\"</code> 和 <code>target=\"_blank\"</code>。",
              why: "脚注让正文流畅——补充信息放在页面底部，不打断阅读节奏。引用标注来源提升可信度。外链安全属性防止安全漏洞和 referrer 泄露。",
              how: "使用 remark-footnotes 插件支持脚注语法。rehype-external-links 自动处理外部链接属性。自定义 blockquote 组件支持来源标注。",
              tips: "脚注不宜过多——如果一段话需要 3 个以上脚注，考虑直接在正文中说明。移动端脚注的跳转体验需要特别注意（来回跳转很影响阅读体验）。",
            },
          },
        ],
      },
      {
        title: "交互式内容组件",
        items: [
          {
            id: "l3-sandbox",
            name: "代码沙盒 Sandbox",
            brief:
              "嵌入 CodeSandbox / StackBlitz，读者可在文章内直接运行和修改代码。",
            detail: {
              what: "在文章中嵌入完整的代码编辑和运行环境，读者可以直接修改代码并看到结果。StackBlitz WebContainers 甚至可以在浏览器中运行 Node.js。",
              why: "「可以动手试」是技术教程最强大的功能。读者不需要切换到本地环境就能验证代码，大幅降低学习门槛。这是技术博客与文档平台竞争的差异化优势。",
              how: "1. 使用 StackBlitz SDK 或 CodeSandbox Sandpack<br>2. 创建 MDX 组件 <code>&lt;CodePlayground /&gt;</code><br>3. 懒加载：先显示代码截图，滚动到可见区域时加载沙盒<br>4. 使用 <code>client:visible</code> 实现 Astro Island 按需水合<br>5. 移动端提供「在新标签页打开」的降级方案",
              tools:
                "StackBlitz WebContainers · CodeSandbox Sandpack · Astro Islands",
              tips: "代码沙盒是页面性能杀手——务必懒加载。一篇文章中不要嵌入超过 3 个沙盒。提供简洁的初始代码和明确的操作说明。",
            },
          },
          {
            id: "l3-chart",
            name: "可交互图表",
            brief:
              "D3.js / Observable Plot 驱动的可调参数图表，读者可拖动、切换数据。",
            detail: {
              what: "嵌入可交互的数据可视化图表——读者可以拖动滑块调整参数、切换数据集、悬停查看详细数据点。比静态截图图表信息密度高数倍。",
              why: "数据驱动的技术文章（性能对比、算法复杂度分析、API 响应时间）用交互图表展示效果远超静态图片。读者可以自己探索数据，获得更深的理解。",
              how: "使用 Observable Plot 或 Recharts 创建 React 组件，通过 MDX 嵌入。数据可以内联或从 JSON 文件加载。添加交互控件（滑块、下拉选择、复选框）控制图表参数。",
              tools:
                "Observable Plot（简洁的数据可视化库）· D3.js · Recharts（React 生态）· Chart.js",
              tips: "图表应有清晰的标题和轴标签。提供静态截图作为降级方案（RSS、搜索引擎无法渲染交互图表）。深色模式需要单独适配图表颜色。",
            },
          },
          {
            id: "l3-animation",
            name: "动画演示",
            brief:
              "算法可视化、架构图动画。减少读者对抽象概念的理解成本。",
            detail: {
              what: "使用动画方式展示抽象概念：排序算法的交换过程、树遍历的路径、网络请求的时序图、架构图的数据流动。比文字描述直观 10 倍。",
              why: "人类视觉系统天然擅长理解运动和变化。复杂的并发模型、递归过程、状态机转换等概念，用动画 5 秒能说清楚的事，文字可能需要 500 字。",
              how: "1. 使用 Framer Motion / GSAP 创建动画组件<br>2. 提供播放/暂停/步进控制<br>3. 支持速度调节<br>4. 用 CSS Animation 实现简单效果，复杂动画用 JS 库<br>5. 移动端注意性能——降低动画帧率或提供静态降级",
              tools:
                "Framer Motion · GSAP · CSS @keyframes · Lottie（设计师制作的动画）",
              tips: "动画应该是可控的——读者应该能暂停、回放、步进。自动播放的动画容易分散阅读注意力。确保动画在 prefers-reduced-motion 设置下降级为静态展示。",
            },
          },
          {
            id: "l3-terminal",
            name: "终端模拟器",
            brief:
              "嵌入静态终端模拟器，展示命令行交互过程。读者可复制命令。",
            detail: {
              what: "在文章中嵌入终端模拟器组件，展示命令行交互过程（输入命令→输出结果）。比截图更生动，比普通代码块更有终端的视觉体验，且读者可以复制命令。",
              why: "DevOps、CLI 工具、系统管理类文章大量涉及终端操作。终端模拟器让读者一目了然地看到命令和输出的对应关系，比截图更易读，比纯文本更直观。",
              how: "使用 xterm.js 或自制简单实现（CSS 模拟终端外观 + 预录制的输入/输出序列）。提供逐行播放效果模拟真实终端操作过程。",
              tools:
                "xterm.js · asciinema（终端录制）· 自定义 Terminal 组件",
              tips: "终端模拟器的主要目的是展示，不需要真正可交互（那就变成代码沙盒了）。关键功能：命令可复制、输出可选择。使用等宽字体，模拟真实终端外观。",
            },
          },
        ],
      },
      {
        title: "无障碍 WCAG 2.2",
        items: [
          {
            id: "l3-contrast",
            name: "对比度与颜色",
            brief:
              "正文对比度 ≥ 4.5:1（AA 级）。不以颜色为唯一信息传达方式。",
            detail: {
              what: "确保所有文本与背景色的对比度达到 WCAG 2.2 AA 级标准：正文文字 ≥ 4.5:1，大文字 ≥ 3:1。不使用颜色作为唯一的信息区分方式（如代码 diff 同时使用 +/- 符号和颜色标识增删行）。",
              why: "约 8% 的男性有某种程度的色觉缺陷。低对比度文本在阳光下的移动设备上几乎不可读。无障碍设计不仅是道德要求，也是法律合规要求（多个国家已有相关立法）。",
              how: "1. 使用在线工具检查所有颜色组合的对比度<br>2. 设计系统中的颜色变量需通过对比度测试<br>3. 代码 diff 使用 + / - 前缀 + 背景色双重标识<br>4. 链接不仅用颜色区分，还要加下划线<br>5. 定期使用 Lighthouse 无障碍审计",
              tools:
                "WebAIM Contrast Checker · Chrome DevTools 对比度检查器 · Lighthouse Accessibility 审计",
              tips: "深色模式的对比度尤其容易不达标——深灰文字在纯黑背景上对比度可能不够。设计时两种模式都要验证。",
            },
          },
          {
            id: "l3-keyboard",
            name: "键盘导航",
            brief:
              "全站 Tab 键导航。焦点状态可见。弹窗管理焦点陷阱。",
            detail: {
              what: "全站所有交互元素（链接、按钮、表单、菜单）都可以通过键盘 Tab 键按序导航。焦点状态有明显的视觉样式。模态框/弹窗实现焦点陷阱（Tab 循环在弹窗内部）。",
              why: "部分用户无法使用鼠标（运动障碍、屏幕阅读器用户）。即使是普通用户，在桌面环境也经常使用键盘快捷键。没有键盘导航的网站对这些用户来说完全不可用。",
              how: "1. 不要使用 <code>outline: none</code> 去除焦点样式<br>2. 使用 <code>:focus-visible</code> 只在键盘导航时显示焦点样式<br>3. 模态框打开时将焦点移入，关闭时恢复<br>4. 使用 <code>tabindex</code> 管理自定义组件的焦点顺序<br>5. ESC 键关闭弹窗/菜单",
              tips: "使用 <code>:focus-visible</code> 而非 <code>:focus</code>——前者只在键盘导航时显示焦点环，鼠标点击不显示，兼顾无障碍和视觉美观。",
            },
          },
          {
            id: "l3-semantic",
            name: "语义化 HTML",
            brief:
              "正确使用 article、nav、main、aside 等语义标签。图片提供有意义的 alt 文本。",
            detail: {
              what: "使用 HTML5 语义化标签表达页面结构：<code>&lt;article&gt;</code>（文章）、<code>&lt;nav&gt;</code>（导航）、<code>&lt;main&gt;</code>（主内容）、<code>&lt;aside&gt;</code>（侧边栏）、<code>&lt;header&gt;</code>/<code>&lt;footer&gt;</code>。图片提供描述性 alt 属性。",
              why: "语义化 HTML 让屏幕阅读器正确理解页面结构——盲人用户可以快速跳转到主内容、导航、文章列表。同时也有 SEO 价值——搜索引擎能更好地理解页面结构和内容层级。",
              how: "文章页面结构：<code>&lt;main&gt; &gt; &lt;article&gt; &gt; &lt;header&gt;(标题) + &lt;section&gt;(正文)</code>。代码块用 <code>&lt;pre&gt;&lt;code&gt;</code>。装饰性图片 <code>alt=\"\"</code>（空但保留属性）。",
              tips: "不要滥用 div——它是没有语义的容器，只在没有更合适的语义标签时才使用。每个页面只应有一个 <code>&lt;main&gt;</code> 元素。",
            },
          },
          {
            id: "l3-skiplink",
            name: "跳转链接",
            brief:
              "页面顶部「跳到主要内容」链接。屏幕阅读器友好。",
            detail: {
              what: "在页面 HTML 最开头放置一个「跳到主要内容」链接，默认视觉隐藏（visually-hidden），当用户按 Tab 键时显示。点击后焦点直接跳转到 <code>&lt;main&gt;</code> 内容区域。",
              why: "键盘用户和屏幕阅读器用户不需要每次都 Tab 过整个导航栏才能到达正文。跳转链接提供了一条快速通道直达主要内容。",
              how: "在 <code>&lt;body&gt;</code> 最开头添加：<code>&lt;a href=\"#main-content\" class=\"sr-only focus:not-sr-only\"&gt;跳到主要内容&lt;/a&gt;</code>。确保 <code>&lt;main id=\"main-content\"&gt;</code> 接收焦点。",
              tips: "跳转链接是 WCAG 2.2 Level A 要求（最基本的无障碍要求）。非常容易实现但经常被遗忘。聚焦时的样式应足够醒目。",
            },
          },
        ],
      },
      {
        title: "媒体优化",
        items: [
          {
            id: "l3-image",
            name: "图片管道",
            brief:
              "WebP/AVIF 格式优先、响应式 srcset、懒加载、模糊占位。CDN 自动转换。",
            detail: {
              what: "完整的图片优化管道：格式选择（AVIF > WebP > JPEG 按浏览器支持降级）、响应式图片（srcset + sizes 按设备宽度加载不同尺寸）、懒加载（loading=\"lazy\"）、模糊占位（blur-up 防止布局偏移）。",
              why: "图片通常占页面总大小的 60-80%。优化图片是性能提升 ROI 最高的手段——AVIF 比 JPEG 体积小 50%，响应式图片在移动端节省 70% 带宽。Astro 的 <code>&lt;Image /&gt;</code> 组件内置了大部分优化。",
              how: "1. 使用 Astro 内置 <code>&lt;Image /&gt;</code> 组件（自动优化）<br>2. 设置图片宽高比（width/height 属性防止 CLS）<br>3. 首屏图片不使用 lazy（影响 LCP）<br>4. 配置 Cloudflare Images 或 imgix 进行 CDN 端转换<br>5. 封面图预生成多种尺寸：640w/960w/1280w",
              tools:
                "Astro <Image /> · sharp（Node.js 图片处理）· Cloudflare Images · imgix · Squoosh",
              tips: "一定要设置图片的 width 和 height 属性——这是避免 CLS 的关键。首屏大图不要 lazy load，直接加载。使用 <code>fetchpriority=\"high\"</code> 提升首屏图片加载优先级。",
            },
          },
          {
            id: "l3-font",
            name: "字体策略",
            brief:
              "中文字体子集化减少 90% 体积。font-display: swap 避免 FOIT。",
            detail: {
              what: "字体优化策略：中文字体子集化（只保留博客实际使用的字形，从 10MB+ 降到几百 KB）、<code>font-display: swap</code>（先用系统字体渲染，自定义字体加载完成后替换）、英文代码字体单独加载。",
              why: "中文字体文件巨大（完整的思源黑体约 15MB），直接加载会严重影响首屏渲染。字体子集化可以将体积减少 90%+。font-display: swap 确保文字内容不被字体加载阻塞。",
              how: "1. 使用 pyftsubset 工具提取博客用到的字形子集<br>2. 转换为 WOFF2 格式（最佳压缩率）<br>3. 在 CSS 中设置 <code>font-display: swap</code><br>4. 使用 <code>&lt;link rel=\"preload\"&gt;</code> 预加载关键字体<br>5. 代码字体（JetBrains Mono）延迟加载，不影响正文渲染",
              tools:
                "pyftsubset（fonttools Python 包）· Google Fonts（已优化中文子集化）· Font Squirrel Webfont Generator",
              tips: "如果使用 Google Fonts 的中文字体，它已经自动做了子集化分片（按 Unicode 范围分割成多个小文件按需加载）。自托管字体需要自己处理子集化。",
            },
          },
          {
            id: "l3-og-image",
            name: "OG 图动态生成",
            brief:
              "使用 Satori / @vercel/og 在边缘函数中动态生成包含文章标题的社交分享图。",
            detail: {
              what: "使用 Satori（Vercel 开源的 JSX 转 SVG 库）或 @vercel/og 在构建时或边缘函数中动态生成每篇文章的 Open Graph 分享图，包含文章标题、作者、日期等信息。",
              why: "社交平台分享时带自定义 OG 图的链接点击率比默认图高 2-3 倍。手动为每篇文章设计分享图成本太高，动态生成是最佳平衡方案。",
              how: "1. 创建 OG 图模板（JSX 布局：标题+作者+Logo+背景）<br>2. 在 Astro 中使用 <code>[...slug]/og.png.ts</code> 端点<br>3. 使用 satori 将 JSX 渲染为 SVG<br>4. 使用 sharp 将 SVG 转为 PNG<br>5. 在 HTML head 中引用：<code>&lt;meta property=\"og:image\" content=\"/posts/slug/og.png\"&gt;</code>",
              tools:
                "Satori · @vercel/og · sharp · Astro 端点（.ts 文件）· 自定义 JSX 模板",
              tips: "OG 图推荐尺寸 1200×630px。文字不要太小——在社交平台的预览缩略图中也要清晰可读。中文字体需要在 Satori 中注册（加载 WOFF2 文件）。",
            },
          },
        ],
      },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // L4 · 发现与分发层
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    code: "L4",
    name: "发现与分发层",
    icon: "📡",
    color: "#d97706",
    tagline: "内容如何被搜索引擎收录、如何到达读者",
    overview:
      "解决「写了没人看」的核心问题。涵盖技术 SEO 基础（URL 规范化、Sitemap）、结构化数据标记（Schema.org）、以及多渠道内容分发策略（RSS、Newsletter、社交平台、聚合平台）。",
    sections: [
      {
        title: "SEO 技术基础",
        items: [
          {
            id: "l4-url",
            name: "URL 规范化",
            brief:
              "统一 www/非www、trailing slash，canonical 标签防重复内容。301 重定向强制。",
            detail: {
              what: "URL 规范化确保每个页面只有一个权威 URL。选定方案后（如 non-www、无 trailing slash），通过 301 重定向将所有变体指向规范形式。每个页面添加 <code>&lt;link rel=\"canonical\"&gt;</code> 标签。",
              why: "同一内容有多个 URL 会分散 SEO 权重。搜索引擎会将 <code>example.com/post</code> 和 <code>www.example.com/post/</code> 视为不同页面，各自只获得部分排名权重。",
              how: "1. 选定 URL 格式：non-www + 无 trailing slash（推荐）<br>2. 在 CDN 层（Cloudflare/Vercel）配置 301 重定向规则<br>3. 每个页面 head 中添加 canonical 标签<br>4. sitemap.xml 中使用规范化后的 URL<br>5. 内部链接统一使用规范形式",
              tips: "一旦选定 URL 格式就不要更改——URL 迁移会暂时影响 SEO 排名。分页页面（/posts/page/2）的 canonical 应指向自己而非第一页。",
            },
          },
          {
            id: "l4-semantic-url",
            name: "语义化 URL",
            brief:
              "格式：/blog/[slug]。Slug 含核心关键词+年份。一经发布不可修改。",
            detail: {
              what: "URL 路径应包含有意义的关键词而非随机 ID。推荐格式：<code>/posts/react-server-components-2025</code>。技术文章建议包含年份（读者和搜索引擎据此判断内容时效性）。",
              why: "语义化 URL 提升搜索结果的点击率（用户能从 URL 判断内容相关性），也是 SEO 信号之一。包含年份帮助读者判断内容是否过时，避免误读。",
              how: "在 Frontmatter 中定义 slug，或由文件名自动生成。命名规则：全小写、连字符分隔、包含核心关键词、技术文章加年份。示例：<code>typescript-pattern-matching-2025</code>。",
              tips: "slug 一经发布绝不修改。如需修改（如修正拼写），使用 301 重定向。不要在 slug 中包含分类路径（如 /frontend/react-hooks），分类可能会变但 slug 不能变。",
            },
          },
          {
            id: "l4-sitemap",
            name: "Sitemap 与爬取控制",
            brief:
              "sitemap.xml 自动生成，robots.txt 控制爬取。发布后主动 ping 加速收录。",
            detail: {
              what: "sitemap.xml 列出站点所有需要被收录的页面，包含 lastmod、priority、changefreq 属性。robots.txt 控制搜索引擎不应爬取的路径。发布后通过 API 主动通知搜索引擎。",
              why: "Sitemap 帮助搜索引擎发现所有页面（尤其是内链较少的新页面）。主动 ping 可以将新文章的收录时间从数天缩短到数小时。robots.txt 防止草稿和管理页面被意外收录。",
              how: "1. Astro 使用 <code>@astrojs/sitemap</code> 自动生成<br>2. robots.txt 排除：/admin、/draft、/api<br>3. 发布后调用 Google Indexing API 或 Search Console URL Inspection API<br>4. 同时 ping Bing Webmaster 的 URL 提交 API<br>5. GitHub Actions 自动化：合并到 main 后触发 ping",
              tools:
                "@astrojs/sitemap · Google Search Console API · Bing Webmaster URL Submission API · GitHub Actions",
              tips: "不要在 sitemap 中包含 noindex 页面——这会发送矛盾信号。sitemap 中的 lastmod 应准确反映内容最后修改时间，不要全部设为当前日期。",
            },
          },
          {
            id: "l4-internal-link",
            name: "内链策略",
            brief:
              "每篇文章至少被 2 篇其他文章引用。标签聚合页作为中间层汇聚分散内链。",
            detail: {
              what: "有意识地在文章之间创建内部链接：每篇新文章应在相关旧文章中被引用，标签/分类聚合页汇集同主题内容。目标是每篇文章至少有 2 条来自其他文章的内链。",
              why: "内链是搜索引擎理解站点结构的核心信号。孤岛文章（无内链指向）的 SEO 权重显著低于被广泛引用的文章。内链也引导读者发现更多相关内容，提升页面浏览量。",
              how: "1. 每次发布新文章后，在 2-3 篇相关旧文章中添加指向新文章的链接<br>2. 使用标签聚合页作为内链中间层<br>3. 文章底部「相关推荐」模块提供自动内链<br>4. 系列文章相互链接<br>5. 定期使用工具检查孤岛页面",
              tips: "内链应自然融入上下文，不要为了 SEO 强行插入不相关的链接。链接锚文本应描述性（「React 性能优化指南」而非「点击这里」）。不要过度内链——每 500 字 1-2 个内链为宜。",
            },
          },
        ],
      },
      {
        title: "结构化数据 Schema.org",
        items: [
          {
            id: "l4-blogposting",
            name: "BlogPosting / TechArticle",
            brief:
              "文章结构化标记：headline、datePublished、author、image。TechArticle 额外含技术难度。",
            detail: {
              what: "使用 JSON-LD 格式在页面 <code>&lt;head&gt;</code> 中嵌入 Schema.org BlogPosting 或 TechArticle 结构化数据。包含：headline、datePublished、dateModified、author（Person）、description、image、keywords 等字段。",
              why: "结构化数据帮助搜索引擎精确理解页面内容。正确标记的文章可能出现为富结果（Rich Result），显示作者头像、发布日期、评分等额外信息，显著提升搜索结果的视觉吸引力和点击率。",
              how: "在 Layout 组件中根据页面类型动态生成 JSON-LD 脚本。BlogPosting 必填：headline、datePublished、author、image。TechArticle 额外：proficiencyLevel（beginner/expert）、dependencies。使用 Google Rich Results Test 验证。",
              tools:
                "Schema.org 文档 · Google Rich Results Test · Schema Markup Validator · JSON-LD Playground",
              tips: "确保结构化数据中的信息与页面可见内容一致——不一致会被 Google 视为欺骗。image 字段推荐至少 1200px 宽。作者信息链接到 ProfilePage。",
            },
          },
          {
            id: "l4-breadcrumb",
            name: "BreadcrumbList",
            brief:
              "面包屑导航结构化标记，提升搜索结果展示层级路径。",
            detail: {
              what: "为页面的面包屑导航添加 BreadcrumbList 结构化数据。搜索结果中 URL 部分会替换为面包屑路径（如「首页 > 前端 > React」），更直观地展示内容层级。",
              why: "面包屑在搜索结果中提供额外的上下文信息，帮助用户判断内容的分类归属。有面包屑的搜索结果视觉上更丰富，可能获得更高的点击率。",
              how: "在面包屑组件中输出 JSON-LD：每个层级是一个 ListItem，包含 name 和 item（URL）。示例路径：首页 → 分类 → 文章标题。",
              tips: "面包屑的最后一级（当前页面）可以省略 item URL（Google 允许）。确保面包屑与页面上可见的面包屑导航一致。",
            },
          },
          {
            id: "l4-faqpage",
            name: "FAQPage",
            brief:
              "FAQ 标记后可在 Google 搜索中展开显示问答，显著提升 CTR。",
            detail: {
              what: "为 FAQ 内容添加 FAQPage Schema 结构化标记。Google 可能在搜索结果中直接展示问答折叠面板，用户无需点击即可看到答案。",
              why: "FAQ 富结果占据更大的搜索结果面积（SERP real estate），即使排名不变也能获得更多视觉关注和点击。特别适合「How to」和「What is」类搜索查询。",
              how: "在 FAQ 页面或文章末尾 FAQ 模块中添加 FAQPage JSON-LD。每个问答对包含 Question（name）和 AcceptedAnswer（text）。",
              tips: "仅标记真正的常见问题——不要为了富结果而编造问题。答案应简洁准确。Google 可能随时改变富结果的显示策略。不要在答案中包含广告性内容。",
            },
          },
          {
            id: "l4-profilepage",
            name: "ProfilePage / Person",
            brief:
              "作者页结构化标记，关联 sameAs 社交链接，强化 E-E-A-T 信号。",
            detail: {
              what: "在 About 页面添加 ProfilePage 和 Person 结构化数据。sameAs 字段关联 GitHub、Twitter、LinkedIn 等社交账号 URL。帮助 Google 建立统一的作者知识图谱。",
              why: "E-E-A-T（Experience, Expertise, Authoritativeness, Trustworthiness）是 Google 评估内容质量的重要框架。ProfilePage 标记帮助 Google 将博客作者与其他平台上的活动关联，增强作者的权威度信号。",
              how: "JSON-LD 包含：@type: ProfilePage 和 mainEntity: { @type: Person, name, url, sameAs: [GitHub URL, Twitter URL, LinkedIn URL], image, jobTitle }。",
              tips: "sameAs 中只包含你实际活跃的平台账号。确保各平台的个人资料信息一致（头像、姓名、简介）。这是建立「数字身份」的基础。",
            },
          },
        ],
      },
      {
        title: "内容分发渠道",
        items: [
          {
            id: "l4-rss",
            name: "RSS / Atom Feed",
            brief:
              "输出全文。技术博客读者 RSS 使用率远高于其他领域。不受平台算法影响。",
            detail: {
              what: "RSS（Really Simple Syndication）是标准化的内容订阅协议。输出 XML 格式的文章列表，读者通过 RSS 阅读器订阅并接收更新。建议输出全文而非摘要。",
              why: "RSS 是技术读者最重要的内容获取渠道之一。技术社区的 RSS 使用率远高于其他领域。RSS 完全不受平台算法控制——你发布的内容 100% 送达每个订阅者。这是最抗平台风险的分发方式。",
              how: "1. Astro 使用 <code>@astrojs/rss</code> 集成<br>2. 在 <code>src/pages/rss.xml.ts</code> 中定义 feed<br>3. 输出全文内容（<code>content</code> 字段）<br>4. 在页面 head 中添加：<code>&lt;link rel=\"alternate\" type=\"application/rss+xml\" href=\"/rss.xml\"&gt;</code><br>5. About 页面展示 RSS 订阅入口",
              tools:
                "@astrojs/rss · Feedly · NetNewsWire · Inoreader（验证 feed 是否正常）",
              tips: "输出全文而非摘要——尊重读者在阅读器中阅读的选择。RSS feed 中不要包含 draft 文章。确保 feed 的 XML 格式合法（使用 W3C Feed Validation Service 验证）。",
            },
          },
          {
            id: "l4-newsletter",
            name: "Newsletter 邮件列表",
            brief:
              "最抗平台风险的私域渠道。Resend / Buttondown / Listmonk 方案对比。",
            detail: {
              what: "通过邮件列表直接触达订阅者。读者在博客页面输入邮箱订阅，新文章发布时发送邮件通知。这是你真正「拥有」的读者渠道——不依赖任何第三方平台。",
              why: "邮件列表是唯一不受算法控制、不受平台政策变化影响的分发渠道。Twitter 可能限流、RSS 阅读器可能关停，但邮件地址始终有效。对于变现（付费 Newsletter）也是基础设施。",
              how: "1. 选择邮件服务：Resend（自建，免费 3k/月）或 Buttondown（托管，简单）<br>2. 在博客中添加订阅表单（文章末尾 + 侧边栏）<br>3. 内容与博文同步——不需要单独写 Newsletter 内容<br>4. 设置 double opt-in（双重确认）<br>5. 发送频率与文章频率一致，不额外打扰",
              tools:
                "Resend（API 优先，开发者友好）· Buttondown（极简）· Listmonk（完全自建开源）· Ghost（集成 Newsletter 功能）",
              tips: "起步阶段不要过度投入 Newsletter——先确保有稳定的内容输出。订阅表单不要太突兀（避免全屏弹窗）。遵守反垃圾邮件法律（CAN-SPAM/GDPR），每封邮件都要有退订链接。",
            },
          },
          {
            id: "l4-social",
            name: "社交平台同步",
            brief:
              "半自动同步到 Twitter/X、Mastodon。保留人工审核窗口，各平台适配格式。",
            detail: {
              what: "文章发布后半自动同步到社交平台（Twitter/X、Mastodon、微博等）。使用 GitHub Actions 实现：合并到 main 后延迟 N 小时触发，保留人工审核窗口。各平台适配格式（字数限制、话题标签规范）。",
              why: "社交平台是文章初始流量的重要来源。新文章发布后的前 48 小时是社交传播的黄金窗口。自动化减少运营负担，但保留审核窗口防止自动发布错误内容。",
              how: "1. GitHub Actions workflow：on push to main<br>2. 延迟 2-4 小时（人工确认窗口）<br>3. 调用 Twitter API / Mastodon API 发布<br>4. 生成平台适配的文案：标题 + 摘要 + 链接 + 标签<br>5. 附带 OG 图（自动抓取）",
              tips: "不要在所有平台发完全相同的内容——每个平台的用户期望不同。Twitter 适合精炼观点，Mastodon 适合技术细节。不要同时在 5+ 平台发布——选择 2-3 个核心平台深耕。",
            },
          },
          {
            id: "l4-aggregator",
            name: "内容聚合平台",
            brief:
              "少数派、DEV.to、掘金：发布副本并设置 canonical 指向原博客。冷启动期重要。",
            detail: {
              what: "在内容聚合平台（少数派、DEV.to、掘金、InfoQ）发布文章副本，同时设置 canonical URL 指向你的博客原文，防止 SEO 被分散到副本页面。",
              why: "聚合平台已有活跃社区和流量，冷启动期（博客 SEO 权重低、没有读者基础时）是重要的流量来源。canonical 标签确保搜索引擎将原博客视为内容源头。",
              how: "1. 选择 1-2 个核心平台（中文：掘金/少数派，英文：DEV.to）<br>2. 发布时设置 canonical URL<br>3. 在平台个人页面放置博客链接<br>4. 不需要每篇都同步——选择最有潜力的文章<br>5. 在聚合平台的文章末尾引导读者访问原博客",
              tips: "canonical URL 只在搜索引擎层面生效——平台本身的推荐算法不受影响。部分平台不支持 canonical 设置（如微信公众号），需要权衡是否发布。发布时间与原博客间隔 24-48 小时，让原博客先被收录。",
            },
          },
          {
            id: "l4-i18n",
            name: "多语言与国际化",
            brief:
              "hreflang 标签关联多语言版本。AI 机器翻译初稿+人工润色控制成本。",
            detail: {
              what: "为博客提供多语言版本（如中英双语）。使用 hreflang 标签告诉搜索引擎不同语言版本的对应关系。内容翻译采用「AI 初稿 + 人工润色」的高效流程。",
              why: "多语言内容可以触达更广泛的读者群。中英双语对 SEO 有显著价值——英文内容能获取全球流量。hreflang 确保搜索引擎为对应语言的用户展示正确的版本。",
              how: "1. URL 结构：<code>/zh/posts/slug</code> 和 <code>/en/posts/slug</code><br>2. 每个页面的 head 中添加 hreflang 标签<br>3. 使用 DeepL/Claude 生成翻译初稿<br>4. 人工审核技术术语和代码示例<br>5. 优先翻译 Search Console 数据显示流量最高的文章",
              tools:
                "Astro i18n 路由 · DeepL API · Claude 翻译 · hreflang 标签生成",
              tips: "不要机翻所有文章——先翻译 10-20 篇最有价值的文章，根据流量数据决定是否继续。技术术语通常保留英文原文不翻译。代码示例和注释需要单独处理。",
            },
          },
        ],
      },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // L5 · 互动与社区层
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    code: "L5",
    name: "互动与社区层",
    icon: "💬",
    color: "#e11d48",
    tagline: "读者如何参与、反馈如何回流到内容",
    overview:
      "将博客从单向输出变为双向互动。包括评论系统选型、多种互动形态（表情反馈、段落评论、分享）、以及知识回流机制（评论→FAQ、纠错→勘误、讨论→衍生文章）。",
    sections: [
      {
        title: "评论系统选型",
        table: {
          headers: ["方案", "适用场景", "优势", "限制"],
          rows: [
            [
              "giscus",
              "技术博客（首选）",
              "免费、基于 GitHub Discussions、表情回应",
              "需 GitHub 账号",
            ],
            [
              "utterances",
              "轻量技术博客",
              "极简、基于 GitHub Issues、嵌入简单",
              "无嵌套回复、功能有限",
            ],
            [
              "Waline",
              "面向大众的技术博客",
              "支持匿名评论、表情、后台管理",
              "需自建服务端",
            ],
            [
              "Artalk",
              "自建完整控制",
              "完全自建、功能丰富、数据自主",
              "运维成本最高",
            ],
          ],
        },
        callout:
          "建议：流量起步阶段可不开评论（冷清感比没有评论更差）。等单篇稳定有 100+ UV 后再开启 giscus。",
      },
      {
        title: "互动形态",
        items: [
          {
            id: "l5-comments",
            name: "文章评论",
            brief:
              "常规评论区，支持 Markdown。展示评论数量但不作为质量指标。",
            detail: {
              what: "文章底部的评论区，读者可以提问、讨论、反馈。支持 Markdown 格式（代码块、链接、列表）。显示评论数量供参考，但不将评论数作为文章质量排序依据。",
              why: "评论区是读者与作者最直接的互动渠道。高质量的评论讨论可以补充文章遗漏的知识点，纠正错误，提供不同视角。评论也是选题灵感的重要来源。",
              how: "使用 giscus（GitHub Discussions 驱动）或 Waline（独立服务端）。在文章详情页底部嵌入评论组件。配置评论通知——新评论通过邮件/GitHub 提醒作者回复。",
              tips: "作者应尽量回复每一条认真的评论——这是建立社区感的关键。但不必回复低质量评论（水评、无意义的赞美、垃圾信息）。设置评论排序为「最新优先」而非「最热优先」。",
            },
          },
          {
            id: "l5-inline-feedback",
            name: "段落级别反馈",
            brief:
              "类似 Medium 的段落高亮+评论。对特定段落提问或纠错，比全文评论更精准。",
            detail: {
              what: "读者可以选中文章中的某个段落，对该特定段落添加评论或标注。类似 Medium 的段落高亮功能，让反馈精准地关联到具体内容位置。",
              why: "全文评论区的反馈缺乏上下文——读者说「第三段有误」，作者可能不确定指的是哪里。段落级反馈让纠错和提问直接关联到具体位置，大幅提升沟通效率。",
              how: "实现复杂度较高。方案一：使用 Hypothesis（开源注释工具）嵌入。方案二：自建实现——监听文本选择事件，显示评论入口浮窗，评论关联到 DOM 路径或内容 hash。需要解决：内容更新后评论位置偏移的问题。",
              tips: "这是进阶功能，建议在基础评论系统稳定运行后再考虑。技术实现上，使用内容 hash（而非 DOM 位置）来锚定评论位置，这样文章更新后评论仍然能正确定位。",
            },
          },
          {
            id: "l5-reaction",
            name: "表情 Reaction",
            brief:
              "👍🎉😕 等低门槛互动。减少空评论区的心理压力。",
            detail: {
              what: "文章底部或段落旁的表情反应按钮（如 👍 有帮助、🎉 很赞、😕 有疑问、❤️ 喜欢）。一键点击，无需登录或输入文字。",
              why: "大多数读者不会写评论，但愿意点一个表情。Reaction 提供了最低门槛的互动方式，让文章不至于显得无人问津。数据也帮助作者了解读者的态度倾向。",
              how: "giscus 内置支持 GitHub Discussions 的 Reaction。Waline 支持自定义 Reaction 表情。也可以自建简单的计数器（Cloudflare Workers + KV 存储，或 Upstash Redis）。",
              tips: "不要提供太多选项——3-5 个表情足够。「有帮助」和「有疑问」是最有信息量的两个选项。避免纯负面选项（如 👎），不利于社区氛围。",
            },
          },
          {
            id: "l5-share",
            name: "Web Share API",
            brief:
              "移动端原生分享弹窗，简洁无第三方 JS。回退到复制链接。",
            detail: {
              what: "使用 Web Share API（<code>navigator.share()</code>）调用移动端原生分享弹窗，替代传统的社交分享按钮矩阵（微博、微信、Twitter 等独立图标）。不支持的浏览器降级为复制链接按钮。",
              why: "传统社交分享按钮需要加载第三方 JS（跟踪脚本），影响性能和隐私。Web Share API 是浏览器原生功能，零依赖、零隐私顾虑。移动端体验更自然。",
              how: "1. 检测 <code>navigator.share</code> 是否存在<br>2. 存在则调用：<code>navigator.share({ title, text, url })</code><br>3. 不存在则显示「复制链接」按钮<br>4. 复制成功后显示 Toast 提示<br>5. 桌面端可补充 Twitter/Mastodon 分享链接",
              tips: "Web Share API 在桌面端 Chrome/Edge 也已支持（Windows/macOS）。分享按钮的位置：文章顶部（分享标题）和底部（读完后分享）各一个。不要使用浮动分享栏——干扰阅读。",
            },
          },
          {
            id: "l5-subscribe-post",
            name: "单篇文章订阅",
            brief:
              "订阅特定文章的更新通知。适合长期维护的参考手册类文章。",
            detail: {
              what: "读者可以订阅特定文章的更新通知。当文章发生实质性更新时，订阅者收到邮件或推送通知。giscus 天然支持（Watch Discussion）。",
              why: "部分文章是「活文档」——如工具配置指南、框架升级指南，会持续更新。让感兴趣的读者订阅更新，比期望他们定期回访更有效。",
              how: "使用 giscus 的 GitHub Discussions Watch 功能（读者需要 GitHub 账号）。自建方案：文章级邮件订阅 + 更新时触发通知（复杂度高，低优先级）。",
              tips: "只对确实会持续更新的文章开放此功能。大多数普通文章不需要——发布后不再变更的文章提供订阅是多余的。",
            },
          },
        ],
      },
      {
        title: "知识回流机制",
        items: [
          {
            id: "l5-comment-faq",
            name: "评论 → FAQ",
            brief:
              "定期整理评论区高质量问答，提炼为文章 FAQ 模块，同步更新 Schema。",
            detail: {
              what: "定期审查评论区，将高质量的问答对提炼为文章末尾的 FAQ 模块。同时更新 FAQPage Schema 结构化标记。形成「评论提问 → FAQ 沉淀 → 搜索引擎收录 → 更多读者受益」的正向循环。",
              why: "评论区中的好问题往往代表了读者的共性困惑。将其提炼为 FAQ 既回馈了提问者（问题被正式记录），又帮助了未来的读者（直接在文章中找到答案），还提升了 SEO 效果。",
              how: "1. 每月审查一次评论区<br>2. 识别有价值的问答（被多人点赞的问题、普遍性困惑）<br>3. 提炼为简洁的 FAQ 格式<br>4. 添加到文章末尾 FAQ 区域<br>5. 更新 FAQPage JSON-LD 标记<br>6. 在原评论中回复「已添加到文章 FAQ」",
              tips: "FAQ 的回答要独立于评论上下文——直接回答问题，不要依赖评论的前因后果。",
            },
          },
          {
            id: "l5-errata",
            name: "纠错 → 勘误追更",
            brief:
              "读者指出错误后添加勘误块，记录 changelog，感谢纠错读者。",
            detail: {
              what: "当读者在评论区指出内容错误时，在文章中添加醒目的勘误块（标注原文和修正内容），在 changelog 中记录修改原因，并在致谢列表中感谢纠错读者。",
              why: "透明的错误处理是建立读者信任的最有效手段。承认错误并公开修正，比悄悄改掉更能赢得尊重。致谢纠错读者鼓励更多读者参与质量改进。",
              how: "1. 在文章中添加勘误区域（醒目样式，如红色左边框）<br>2. 说明：原文内容 → 修正内容 → 感谢 @reader<br>3. 更新 updatedAt 时间戳<br>4. 在 changelog 中记录修改<br>5. 回复评论确认修正",
              tips: "勘误块放在文章开头（重大错误）或相关段落旁（局部错误）。不要删除原文——展示「原来写的 vs 实际应该是」对比，这本身也有教育价值。",
            },
          },
          {
            id: "l5-derived",
            name: "讨论 → 衍生文章",
            brief:
              "评论区热点讨论是最好的选题来源。新文章通过 derived_from 关联原文。",
            detail: {
              what: "将评论区中引发深入讨论的话题提炼为新的独立文章。新文章通过 <code>derived_from</code> 关系链接到触发它的原文，形成内容图谱。",
              why: "评论区的热点讨论代表了读者的真实需求——这是最有价值的选题来源。由讨论衍生的文章天然有受众基础（参与讨论的读者一定关注后续内容）。",
              how: "1. 在评论区中识别深入讨论的话题<br>2. 将讨论要点整理为新文章大纲<br>3. 新文章 Frontmatter 中添加：<code>derivedFrom: 'original-article-slug'</code><br>4. 在原文评论区中链接到新文章<br>5. 新文章开头说明：「本文源自 [原文标题] 的读者讨论」",
              tips: "不要等讨论冷却了再写衍生文章——趁热打铁，在讨论活跃期（1-2 周内）发布。确保衍生文章有独立价值，不仅仅是评论内容的整理。",
            },
          },
        ],
      },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // L6 · AI 能力层
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    code: "L6",
    name: "AI 能力层",
    icon: "🤖",
    color: "#7c3aed",
    tagline: "AI 在技术博客中的系统性集成——从内容生产到读者交互",
    overview:
      "2026 年技术博客的核心差异化能力。涵盖构建时 AI（离线处理：自动标签、摘要生成、向量化索引）、运行时 AI（用户交互：数字分身对话、语义搜索、AI 解释器）、以及 AI 使用的边界与声明。",
    ai: true,
    sections: [
      {
        title: "构建时 AI（离线处理）",
        items: [
          {
            id: "l6-auto-classify",
            name: "自动标签与分类",
            brief:
              "构建流水线中调用 LLM，从已有标签集中推荐匹配标签。RAG 限制输出范围。",
            ai: true,
            detail: {
              what: "在构建流水线中使用 RAG（检索增强生成）模式：先检索博客已有的标签列表，再让 LLM 从中选择最匹配当前文章的标签。输出写入 Frontmatter 的 autoTags 字段。",
              why: "手动标签选择耗时且容易遗漏。RAG 模式确保 AI 推荐的标签在已有集合中（不会创造新标签导致标签膨胀），比纯生成更可控。",
              how: "1. 提取所有已有标签列表<br>2. Prompt：「从以下标签中选择 3-5 个最匹配的：[tags]。文章：[content]。输出 JSON 数组。」<br>3. 使用 structured output（JSON mode）确保输出格式<br>4. 写入 autoTags，不覆盖手动 tags<br>5. 仅对 autoTags 为空的文章执行",
              tips: "使用 temperature=0 确保结果稳定。每次构建只处理新增/修改的文章（增量处理），避免重复调用浪费成本。",
            },
          },
          {
            id: "l6-auto-summary",
            name: "摘要自动生成",
            brief:
              "对 description 为空的文章自动生成 SEO 摘要。150 字以内，人工可审核。",
            ai: true,
            detail: {
              what: "构建时检测 description 字段为空的文章，自动调用 LLM 生成 SEO 友好的摘要（100-150 字）。摘要要求包含核心关键词、语言简洁、首句回答「这篇文章讲什么」。",
              why: "description 是 SEO 最重要的元信息之一，直接出现在 Google 搜索结果中。手写每篇文章的完美摘要耗时，AI 可以快速生成高质量初稿。",
              how: "Prompt 模板：「为以下技术文章生成 SEO 摘要。要求：100-150 字中文，包含核心关键词 [keywords]，首句直接说明文章主题，不使用'本文介绍了'等开头。文章内容：[content]」",
              tips: "AI 生成的摘要必须人工审核——AI 可能遗漏关键信息或添加不准确的描述。批量生成后统一审核比逐篇生成更高效。",
            },
          },
          {
            id: "l6-auto-cover",
            name: "封面图 AI 生成",
            brief:
              "根据文章标题+内容生成符合博客视觉风格的封面图。记录 Prompt 确保可复现。",
            ai: true,
            detail: {
              what: "使用 AI 图像生成工具根据文章内容自动生成封面图和 OG 图。建立统一的 Prompt 模板（固定风格前缀 + 动态内容），记录每次使用的 Prompt 到 Frontmatter。",
              why: "统一风格的封面图让博客在社交分享和搜索结果中视觉一致且专业。手动设计成本高，AI 生成提供了高效且风格统一的替代方案。",
              how: "Prompt 模板：「[固定风格前缀: minimal tech illustration, dark background, geometric shapes] + [动态部分: 文章主题关键词]」。生成后存储到 public/images/covers/，Frontmatter 记录 coverImagePrompt。",
              tools:
                "DALL-E 3 · Ideogram 2.0（文字渲染最好）· Stable Diffusion XL · Midjourney",
              tips: "固定风格前缀是关键——确保所有封面图风格统一。定期审核 AI 生成的图片质量，不合格的手动替换。注意各工具的商用许可条款。",
            },
          },
          {
            id: "l6-embedding",
            name: "内容向量化与索引",
            brief:
              "文章内容切片后生成 Embedding，存入向量数据库。用于语义搜索和相关推荐。构建时触发。",
            ai: true,
            detail: {
              what: "将文章内容（标题+摘要+全文）分割为语义完整的文本块（chunk），使用 Embedding 模型（如 text-embedding-3-small）生成向量表示，存入向量数据库。用于后续的语义搜索和相关文章推荐。",
              why: "向量化是实现语义搜索（不依赖关键词匹配）和智能推荐（基于内容相似度而非标签重叠）的基础。传统的关键词搜索无法理解「React 渲染优化」和「memo 使用指南」之间的语义关系。",
              how: "1. 文章分割：按段落或 500 字一块，保留重叠区域<br>2. 调用 Embedding API 生成向量（1536 维）<br>3. 存入向量数据库：Upstash Vector（Serverless）/ Supabase pgvector / 本地 sqlite-vss<br>4. 构建时增量更新（只处理新增/修改的文章）<br>5. 元数据关联：每个向量块关联回文章 slug 和段落位置",
              tools:
                "OpenAI text-embedding-3-small · Upstash Vector · Supabase pgvector · sqlite-vss（本地开发）",
              tips: "分块策略影响搜索质量——太小会丢失上下文，太大会降低精度。500-1000 字一块 + 100 字重叠是常用配置。中文分块注意不要在句子中间切割。",
            },
          },
          {
            id: "l6-related",
            name: "相关文章推荐优化",
            brief:
              "基于 Embedding 向量相似度计算相关文章，比标签匹配更精准。结果预计算写入静态文件。",
            ai: true,
            detail: {
              what: "使用 Embedding 向量之间的余弦相似度计算文章间的语义相似性，生成每篇文章的「相关推荐」列表。结果在构建时预计算并写入静态 JSON 文件，运行时无需 API 调用。",
              why: "基于标签的推荐会遗漏「标签不同但内容相关」的文章。向量相似度能发现更深层的语义关系，推荐质量显著提升。预计算方式零运行时成本。",
              how: "1. 构建时计算所有文章对的向量相似度<br>2. 每篇文章取 Top 5 最相似的文章<br>3. 结果写入 <code>src/data/related-posts.json</code><br>4. 文章详情页读取 JSON 展示推荐列表<br>5. 增量更新：只重新计算新增/修改文章的相似度",
              tips: "设置相似度阈值（如 > 0.75），低于阈值不推荐——宁可少推荐也不要推荐不相关的文章。定期审核推荐质量。",
            },
          },
        ],
      },
      {
        title: "运行时 AI（用户交互）",
        items: [
          {
            id: "l6-avatar",
            name: "数字分身对话（核心功能）",
            brief:
              "基于博主全量文章和信息源构建 RAG 知识库，读者可「和博主对话」。",
            ai: true,
            detail: {
              what: "基于博主的全量文章和指定信息源（GitHub README、演讲文稿等）构建知识库，通过 RAG（检索增强生成）实现：读者提问 → 向量检索相关内容 → LLM 组织回答 + 引用来源。让读者可以「和博主的数字分身对话」。",
              why: "这是 2026 年技术博客最具差异化的功能。读者不再被动阅读，而是主动提问获取定制化答案。对话基于博主已有内容，既保证了回答质量，又引导读者深入阅读相关文章。",
              how: "架构：<br>1. 前端：聊天组件（流式输出）<br>2. API：Cloudflare Worker / Vercel Edge Function<br>3. 检索：Upstash Vector 语义搜索<br>4. 生成：Claude/GPT API + System Prompt（设定为博主人格）<br>5. 回答中引用来源文章链接<br>6. 设置 Rate Limiting 控制 API 成本",
              tools:
                "Upstash Vector + Redis · Claude/GPT API · Cloudflare Workers · Vercel AI SDK",
              tips: "System Prompt 中明确告知 AI：只基于提供的知识库内容回答，不确定的说「我没写过这方面的文章」。设置每用户每天的对话限制（如 10 轮）控制成本。",
            },
          },
          {
            id: "l6-semantic-search",
            name: "文章内语义搜索",
            brief:
              "站内搜索升级为语义搜索，不依赖关键词精确匹配。基于预构建 Embedding 索引。",
            ai: true,
            detail: {
              what: "将传统的关键词搜索升级为语义搜索——用户输入自然语言问题（如「怎么优化 React 渲染性能」），系统能找到标题为「memo 和 useMemo 深度解析」的文章，即使两者没有共同关键词。",
              why: "关键词搜索的最大问题是「搜不到同义词」。用户搜「JS 性能优化」找不到标题是「JavaScript 运行时调优」的文章。语义搜索理解意图，大幅提升搜索体验。",
              how: "1. 搜索输入 → 调用 Embedding API 转为向量<br>2. 在 Upstash Vector 中查询最相似的文章块<br>3. 返回匹配的文章列表 + 相关段落摘要<br>4. API 部署在边缘函数中（低延迟）<br>5. 可与 Pagefind（全文搜索）互补：先语义搜索，无结果时降级到关键词搜索",
              tools:
                "Upstash Vector · OpenAI Embedding API · Edge Function · Pagefind（降级方案）",
              tips: "语义搜索的延迟（约 200-500ms）比本地全文搜索（Pagefind，约 50ms）高。建议作为增强功能并行提供，不替代基础搜索。",
            },
          },
          {
            id: "l6-personalized",
            name: "个性化内容推荐",
            brief:
              "基于当前阅读文章实时推荐相关内容。可扩展为基于阅读历史的个性化推荐。",
            ai: true,
            detail: {
              what: "根据读者当前正在阅读的文章，实时计算并展示最相关的推荐内容。进阶版本：基于读者的阅读历史（需用户授权）提供个性化推荐。",
              why: "精准的推荐直接提升页面浏览量和读者停留时间。从「猜你喜欢」到「你可能需要」，推荐质量决定了读者是否继续探索博客内容。",
              how: "基础版：使用构建时预计算的相关文章列表（零运行时成本）。进阶版：客户端记录匿名阅读历史（localStorage），计算兴趣向量，调用推荐 API 返回个性化列表。",
              tips: "基于阅读历史的推荐必须让用户知情并可控制（隐私敏感）。个人博客的内容量通常不够支撑复杂的推荐算法——预计算的相关文章列表已经足够好。",
            },
          },
          {
            id: "l6-explainer",
            name: "AI 解释器",
            brief:
              "代码块/术语旁「Ask AI」按钮，读者点击后针对特定内容提问。降低阅读门槛。",
            ai: true,
            detail: {
              what: "在文章的代码块或专业术语旁添加「Ask AI」按钮。读者点击后弹出对话框，可以针对该特定代码片段或术语提问。AI 的回答上下文包含：当前代码/术语 + 所在段落 + 文章标题。",
              why: "技术文章的读者水平差异大——同一篇文章对高级开发者是复习，对初学者可能有理解障碍。AI 解释器让每个读者都能获得适合自己水平的解释，大幅降低阅读门槛。",
              how: "1. 为代码块和术语标签添加 AI 触发按钮<br>2. 点击后弹出对话框，预填上下文<br>3. 读者可追问（多轮对话）<br>4. API：Edge Function + LLM<br>5. 上下文管理：代码块内容 + 前后段落 + 文章标题",
              tips: "限制上下文长度（避免 Token 成本过高）。预设常见问题快捷按钮（如「这段代码做了什么」「为什么这样写」）。设置使用限制防止滥用。",
            },
          },
        ],
      },
      {
        title: "AI 使用的边界与声明",
        items: [
          {
            id: "l6-transparency",
            name: "透明度声明",
            brief:
              "Frontmatter 中记录 aiUsage 字段。主动声明建立信任而非损害。",
            ai: false,
            detail: {
              what: "在文章 Frontmatter 中记录 <code>aiUsage</code> 字段（none / assisted / generated），说明 AI 在该文章中的参与程度。在页面上以适当方式展示（如脚标或标签）。",
              why: "2026 年读者对 AI 生成内容的信任度存疑。主动声明「AI 辅助了什么」比隐瞒更能建立信任。透明度是技术博客的核心价值观之一。",
              how: "aiUsage 取值：<code>none</code>（未使用 AI）、<code>assisted</code>（AI 辅助配图/摘要/翻译，核心内容人工原创）、<code>generated</code>（AI 生成初稿，人工审核修改）。About 页面说明整体 AI 使用策略。",
              tips: "绝大多数技术文章应标记为 none 或 assisted。核心技术观点和代码示例必须是人工原创。AI generated 的文章需要特别谨慎——读者对此类内容的信任阈值更高。",
            },
          },
          {
            id: "l6-quality-gate",
            name: "质量把关原则",
            brief:
              "AI 生成内容必须有人工审核环节。「AI 草稿+人工确认」优于「全自动发布」。",
            detail: {
              what: "所有 AI 生成的内容（摘要、标签、配图、翻译）都必须经过人工审核后才能发布。建立「AI 生成 → 人工审核 → 确认/修改 → 发布」的标准流程。",
              why: "AI 的事实性错误（hallucination）在技术领域代价极高——一个错误的 API 调用方式、不存在的配置选项、过时的代码示例，都会直接损害读者信任。人工审核是最后的质量防线。",
              how: "1. AI 生成的内容写入 draft 字段，不直接覆盖正式字段<br>2. 构建时标记待审核项（如 autoTags 已生成但未确认）<br>3. 使用 CMS 或 CLI 工具提供审核界面<br>4. 审核通过后移入正式字段<br>5. 定期抽样检查已发布内容的 AI 生成部分",
              tips: "最危险的场景是「AI 看起来对但实际上错」。建立核查清单：技术术语是否准确？API/命令是否存在？版本号是否正确？链接是否有效？",
            },
          },
          {
            id: "l6-cost",
            name: "成本控制",
            brief:
              "构建时批量处理成本可控。运行时需 Rate Limiting。按量计费控制存储成本。",
            detail: {
              what: "AI 功能的成本管理策略：构建时操作（批量 Embedding、摘要生成）成本低且可预测；运行时操作（对话、搜索）需要 Rate Limiting 防止成本失控。",
              why: "AI API 调用成本虽然不断下降，但不受控的使用仍可能产生意外高额账单。个人博客需要在功能和成本之间找到平衡点。",
              how: "构建时成本：Embedding 约 $0.001/篇，摘要 $0.005/篇，全站 100 篇约 $0.6/次构建。运行时成本：对话约 $0.01-0.05/轮。控制方式：Upstash Rate Limiting（按 IP/用户限制），每用户每天 10 轮对话上限。向量存储：Upstash Vector 免费层 10k 向量足够。",
              tips: "使用 Upstash Redis 的 Rate Limiting 功能控制 API 调用频率。监控月度 API 成本趋势。在流量激增时（如文章上热门）考虑临时关闭高成本功能。低流量博客的 AI 功能成本几乎可以忽略（<$5/月）。",
            },
          },
        ],
      },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // L7 · 信任与品牌层
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    code: "L7",
    name: "信任与品牌层",
    icon: "🛡",
    color: "#0891b2",
    tagline: "作者身份、内容透明度、社区治理",
    overview:
      "建立读者信任和个人品牌。包括作者身份建立（About 页面、社交认证、Portfolio）、内容透明度（引用规范、更新日志、AI 声明）、以及隐私与社区治理。",
    sections: [
      {
        title: "作者身份建立",
        items: [
          {
            id: "l7-about",
            name: "About 页面",
            brief:
              "技术背景、博客定位、联系方式。真实、具体，是读者建立信任的第一入口。",
            detail: {
              what: "About 页面是博客的「名片」——介绍作者的技术背景（经历、专长领域）、博客定位（写给谁看、关注什么主题）、联系方式和社交链接。",
              why: "About 页面是新读者建立信任感的第一入口。一个写得好的 About 页面能让读者在 30 秒内决定是否值得关注这个博客。它也是 E-E-A-T 信号的重要载体。",
              how: "内容结构：<br>1. 一句话定位（「我是谁 + 做什么」）<br>2. 技术背景（经验年限、专长领域、工作经历简述）<br>3. 博客主题和写作动机<br>4. 近期关注的技术方向<br>5. 联系方式（邮箱、Twitter/GitHub/LinkedIn）<br>6. 专业照片或插画头像",
              tips: "写作风格要真实——读者能分辨出模板化的自我介绍。避免空洞的形容词（「热爱技术」），用具体的事实说话（「5 年 React 开发经验，给 XX 项目贡献过 PR」）。定期更新，不要让 About 页面比最新文章还旧。",
            },
          },
          {
            id: "l7-rel-me",
            name: "rel=me 互认证",
            brief:
              "链接各平台账号，Mastodon 等联邦平台验证显示。防冒充，提升 E-E-A-T。",
            detail: {
              what: "在博客中使用 <code>&lt;a rel=\"me\" href=\"https://github.com/xxx\"&gt;</code> 链接到各社交平台，同时在各平台个人资料中放置博客链接。形成双向验证。",
              why: "rel=me 是 IndieWeb 社区推广的身份验证标准。Mastodon 等联邦平台会验证此链接并显示「已验证」标识。Google 也可能利用此信号关联作者身份，增强 E-E-A-T。",
              how: "1. 博客中：每个社交链接添加 <code>rel=\"me\"</code> 属性<br>2. GitHub 个人资料的 Website 字段设为博客 URL<br>3. Mastodon 个人资料中添加博客 URL（自动验证 rel=me）<br>4. LinkedIn 个人简介中放博客链接",
              tips: "确保双向链接——光在博客中链接到 GitHub 不够，GitHub 也需要链接回博客。这是一种简单但有效的防冒充机制。",
            },
          },
          {
            id: "l7-profile-schema",
            name: "ProfilePage Schema",
            brief:
              "结构化标记作者信息，搜索引擎建立统一的作者知识图谱。",
            detail: {
              what: "在 About 页面添加 ProfilePage 和 Person Schema 结构化数据。包含 name、url、sameAs（社交账号 URL 数组）、image（头像）、jobTitle 等字段。",
              why: "帮助 Google 建立统一的作者知识图谱——将博客、GitHub、LinkedIn 上的同一个人关联起来。这是 Google 评估作者权威度的重要信号来源。",
              how: "在 About 页面 head 中添加 JSON-LD：<code>{ \"@type\": \"ProfilePage\", \"mainEntity\": { \"@type\": \"Person\", \"name\": \"...\", \"sameAs\": [...] } }</code>",
              tips: "sameAs 数组中只放你实际活跃的平台。长期不更新的社交账号不要放——空白的社交页面比没有更糟。",
            },
          },
          {
            id: "l7-portfolio",
            name: "作品集 / Portfolio",
            brief:
              "个人项目、开源贡献、演讲。与文章互补：文章展示「能想清楚」，作品展示「能做出来」。",
            detail: {
              what: "展示个人项目、开源贡献、演讲记录、课程教学等。每个项目包含：截图/GIF、技术栈、解决的问题、Demo 链接、仓库链接。",
              why: "技术博客 + 作品集是最强的个人品牌组合。文章证明「能想清楚」，作品证明「能做出来」。两者结合对职业发展和社区影响力有显著的正面作用。",
              how: "1. 创建 /projects 页面<br>2. 每个项目一个卡片：标题、简介、技术栈标签、截图、链接<br>3. 按重要度排序（不一定按时间）<br>4. 项目关联到相关的技术文章<br>5. 开源贡献单独展示（PR、Issue、维护的项目）",
              tips: "质量重于数量——3 个完整的项目 > 20 个半成品。每个项目应有清晰的「为什么做」和「学到了什么」。定期更新，移除已过时的项目。",
            },
          },
        ],
      },
      {
        title: "内容透明度",
        items: [
          {
            id: "l7-citation",
            name: "引用来源规范",
            brief:
              "明确标注信息来源。外链区分：官方文档/参考资料/延伸阅读。",
            detail: {
              what: "技术文章中的事实性陈述需标注来源。外部链接分类：官方文档（权威来源）、参考资料（支撑论点）、延伸阅读（拓展知识面）。避免无来源的断言。",
              why: "引用来源是学术诚信和技术准确性的基础。读者可以追溯原始资料验证信息，这比「相信我说的」更可信。标注来源也尊重原作者的贡献。",
              how: "正文中使用行内链接或脚注引用。文章末尾添加「参考资料」区域列出所有引用。区分来源类型便于读者判断权威性。使用 rehype-external-links 自动为外链添加安全属性。",
              tips: "不要引用过时的来源——链接到最新版本的文档。避免引用二手来源（其他博客的转述），尽量引用一手资料（官方文档、RFC、论文）。定期检查外链是否存活。",
            },
          },
          {
            id: "l7-changelog",
            name: "更新日志 Changelog",
            brief:
              "重大内容更新附 changelog，说明 what changed 和 why。可链接到 Git commit。",
            detail: {
              what: "对文章的重大更新（新增章节、修正错误、更新代码示例）附带 changelog 记录。每条记录包含：日期、变更内容、原因。可链接到对应的 Git commit。",
              why: "changelog 让长期关注文章的读者了解内容演变。透明的更新记录传递一个信号：「这篇文章在被认真维护」。也是读者判断内容时效性的依据。",
              how: "在文章末尾添加 Changelog 区域。格式：<code>[2025-06-15] 更新了 React 19 的 API 变更章节</code>。轻微修正（错别字）无需记录。链接到 GitHub commit 方便读者查看具体变更。",
              tips: "只记录实质性更新——错别字修正、格式调整不需要记 changelog。保持记录简洁，不要比正文还长。",
            },
          },
          {
            id: "l7-ai-disclosure",
            name: "AI 使用声明",
            brief:
              "About 页+文章 Frontmatter 说明 AI 使用方式。2026 年建立信任的主动手段。",
            detail: {
              what: "在 About 页面说明博客整体的 AI 使用策略（哪些环节使用 AI、人工审核机制），在单篇文章的 Frontmatter 中标记 aiUsage 字段。",
              why: "AI 生成内容的泛滥让读者更加重视内容的真实来源。主动声明 AI 使用方式是差异化竞争——大多数博客不会说明，你说明了就是优势。",
              how: "About 页面：「本博客使用 AI 辅助以下环节：封面图生成、翻译初稿、摘要建议。所有技术内容和核心观点为人工原创。详情参见每篇文章的 AI 使用标记。」",
              tips: "措辞要自然——不要像免责声明一样防御性的。用积极的语气说明 AI 如何帮助提升内容质量。",
            },
          },
          {
            id: "l7-errata-policy",
            name: "勘误机制",
            brief:
              "「发现错误？」入口链接到 GitHub Issue。公开处理，致谢指正者。",
            detail: {
              what: "文章中提供醒目的「发现错误？」入口（链接到 GitHub Issue 模板或邮件），建立正式的纠错流程。收到勘误后公开处理，在致谢列表中感谢指正者。",
              why: "开放的勘误通道传递的信息是：「我在乎内容准确性，欢迎指正」。这比闭门造车更值得信赖。致谢指正者形成正向激励，鼓励更多读者参与质量改进。",
              how: "1. 文章页面添加「Edit on GitHub」按钮<br>2. 提供 Issue 模板（预填文章标题和 URL）<br>3. 收到勘误后：验证 → 修正 → 添加勘误块 → 更新 changelog → 致谢<br>4. 维护致谢列表：<code>## 致谢：感谢 @user1, @user2 指正本文错误</code>",
              tips: "回应勘误要及时——24 小时内确认，72 小时内修正。即使勘误不成立也应礼貌回复解释原因。",
            },
          },
        ],
      },
      {
        title: "隐私与治理",
        items: [
          {
            id: "l7-privacy",
            name: "隐私政策",
            brief:
              "说明数据收集、使用方式、第三方服务。使用隐私友好分析工具简化合规。",
            detail: {
              what: "隐私政策页面说明：收集哪些数据（访问日志、评论信息、邮件地址）、如何使用、第三方服务列表（评论系统、分析工具、Newsletter 服务）、数据保留期限、联系方式。",
              why: "隐私政策是法律要求（GDPR、中国个人信息保护法）。使用隐私友好的工具（如 Umami/Plausible 替代 Google Analytics）可以大幅简化隐私政策——你不收集的数据不需要声明。",
              how: "创建 /privacy 页面。列明每个第三方服务及其数据处理方式。如果使用 Umami/Plausible（无 Cookie），可以明确声明「本站不使用 Cookie 跟踪用户」。",
              tips: "隐私政策不需要很长——简洁明了比法律措辞堆砌更好。关键是诚实——声明你实际做了什么，不要复制粘贴通用模板。",
            },
          },
          {
            id: "l7-coc",
            name: "社区准则",
            brief:
              "评论区行为规范：可接受行为、不可接受行为、违规处理。",
            detail: {
              what: "如果开放了评论区，需要制定社区准则：什么样的讨论是受欢迎的、什么行为不可接受（人身攻击、垃圾广告、歧视性言论）、违规的处理方式（警告/删除/封禁）。",
              why: "即使是个人博客也需要最低限度的社区规范。一条恶意评论就可能破坏整个评论区的氛围，吓跑善意的读者。明确的规则让执行有据可依。",
              how: "参考 Contributor Covenant 或其他成熟的 Code of Conduct 模板，适配博客评论场景。简洁版本：「欢迎技术讨论和友善反馈。不容忍：人身攻击、垃圾广告、歧视性言论。违规评论将被删除。」",
              tips: "社区准则不需要很长——3-5 条核心原则足够。关键是执行一致性。如果极少收到恶意评论，社区准则可以简化为评论区上方的一行提示文字。",
            },
          },
          {
            id: "l7-antispam",
            name: "反垃圾评论",
            brief:
              "GitHub OAuth 天然过滤（giscus）。Waline 支持 Turnstile 无感验证。",
            detail: {
              what: "根据评论系统选型配置反垃圾措施。giscus/utterances 通过 GitHub OAuth 天然过滤（垃圾评论者不太可能有 GitHub 账号）。Waline 支持 Cloudflare Turnstile（无感人机验证）和 Akismet 内容过滤。",
              why: "垃圾评论（SEO spam、广告链接、机器人留言）会严重降低博客的专业度。未处理的垃圾评论也可能影响 SEO（Google 会考虑页面上的所有内容，包括评论区）。",
              how: "giscus：GitHub OAuth 天然过滤，几乎无垃圾。Waline：启用 Turnstile（免费无感验证）+ Akismet（内容分析过滤）。手动：设置评论审核（新用户首次评论需审核通过后才显示）。",
              tips: "不要使用 Google reCAPTCHA——隐私问题大且用户体验差。Cloudflare Turnstile 是最好的替代品（免费、无感、隐私友好）。",
            },
          },
        ],
      },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // L8 · 工程与部署层
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    code: "L8",
    name: "工程与部署层",
    icon: "⚙️",
    color: "#4f46e5",
    tagline: "框架选型、CI/CD 工程链路、基础设施配置",
    overview:
      "博客的技术基础设施。涵盖框架选型决策（Astro vs Next.js vs Hugo）、托管平台选型、渲染模式决策（SSG vs 边缘函数 vs SSR）、CI/CD 工程链路、以及安全基础配置。",
    sections: [
      {
        title: "框架选型决策",
        table: {
          headers: ["框架", "适用场景", "优势", "注意"],
          rows: [
            [
              "Astro",
              "博客首选（2026）",
              "Islands 架构，零 JS 默认，原生 MDX，Shiki 集成",
              "生态相对 Next.js 小",
            ],
            [
              "Next.js",
              "有大量交互功能",
              "App Router + RSC，生态最成熟",
              "较重，过度工程化风险",
            ],
            [
              "Hugo",
              "极简静态博客",
              "Go 原生，构建毫秒级，无 JS 依赖",
              "模板语言学习曲线，无 MDX",
            ],
            [
              "Zola",
              "极简静态博客",
              "Rust 原生，单二进制文件",
              "生态更小，适合个人偏好",
            ],
          ],
        },
        callout:
          "2026 年 Astro 是技术博客的最佳选择：默认零 JS、原生 MDX 支持、Islands 架构按需水合交互组件、Shiki 服务端代码高亮、构建极快。",
      },
      {
        title: "托管平台选型",
        table: {
          headers: ["平台", "推荐度", "特点", "适用场景"],
          rows: [
            [
              "Cloudflare Pages",
              "★★★★★",
              "全球 CDN，免费无限带宽，Workers 边缘扩展",
              "首选，几乎无成本",
            ],
            [
              "Vercel",
              "★★★★☆",
              "Next.js 生态最佳，Edge Functions",
              "使用 Next.js 时优先",
            ],
            [
              "Netlify",
              "★★★☆☆",
              "插件生态丰富，表单处理",
              "需要插件扩展时",
            ],
            [
              "GitHub Pages",
              "★★★☆☆",
              "最简单，GitHub 原生集成",
              "纯静态，无特殊需求",
            ],
          ],
        },
      },
      {
        title: "渲染模式决策",
        items: [
          {
            id: "l8-ssg",
            name: "SSG 静态生成（优先）",
            brief:
              "博客 99% 场景首选。构建时生成 HTML 部署到 CDN。速度最快、安全性最高、零成本。",
            detail: {
              what: "Static Site Generation——在构建时将所有页面预渲染为 HTML 文件，部署到 CDN 边缘节点。用户请求直接返回静态文件，无需服务端运算。",
              why: "SSG 是博客的最佳渲染模式：性能（CDN 直接返回，TTFB < 100ms）、安全性（无服务端代码执行，攻击面极小）、成本（CDN 托管免费或极低）、可靠性（无服务器宕机风险）。",
              how: "Astro 默认就是 SSG 模式。<code>astro build</code> 生成 <code>dist/</code> 目录，包含所有 HTML/CSS/JS 文件。部署到 Cloudflare Pages/Vercel/Netlify 即可。",
              tips: "SSG 的唯一限制是「构建时数据」——内容更新需要重新构建部署。Astro 构建速度极快（100 篇文章 < 10 秒），这个限制几乎可以忽略。",
            },
          },
          {
            id: "l8-edge",
            name: "边缘函数（增强）",
            brief:
              "轻量动态功能的最佳方案：OG 图生成、搜索 API、AI 对话。CDN 边缘执行，延迟低。",
            detail: {
              what: "Edge Functions 在 CDN 边缘节点上执行的轻量级函数。比传统 Serverless Function（在中心数据中心执行）延迟更低。用于需要动态能力的场景。",
              why: "SSG 无法处理动态请求（如搜索 API、AI 对话）。边缘函数在不引入完整服务器的情况下提供必要的动态能力，延迟与静态文件相当（在离用户最近的边缘节点执行）。",
              how: "Cloudflare Workers / Vercel Edge Functions。用途：<br>1. OG 图动态生成<br>2. 语义搜索 API<br>3. AI 对话 API<br>4. AB 测试<br>5. 地理重定向",
              tools:
                "Cloudflare Workers · Vercel Edge Functions · Deno Deploy · Bun Edge Runtime",
              tips: "边缘函数有执行时间限制（Cloudflare: 30s, Vercel: 30s）和内存限制。不适合重计算任务。使用 Cloudflare KV / Upstash Redis 在边缘存储数据。",
            },
          },
          {
            id: "l8-ssr",
            name: "全动态 SSR（慎用）",
            brief:
              "除非有明确的实时数据需求，否则不引入。增加运维复杂度和成本。",
            detail: {
              what: "Server-Side Rendering——每个请求都在服务端实时渲染 HTML。需要运行一个 Node.js 服务器。Astro 支持通过适配器启用 SSR。",
              why: "个人博客几乎没有需要全动态 SSR 的场景。SSG + 边缘函数能覆盖 99.9% 的需求。SSR 引入了服务器运维、冷启动延迟、宕机风险、更高的成本——对博客来说得不偿失。",
              how: "如果确实需要：Astro 使用 <code>@astrojs/node</code> 适配器启用 SSR 模式。部署到 Railway / Fly.io / DigitalOcean App Platform 等 PaaS 平台。",
              tips: "在引入 SSR 之前三思：这个功能真的不能用 SSG + 客户端 JS + 边缘函数实现吗？通常答案是「可以」。",
            },
          },
        ],
      },
      {
        title: "CI/CD 工程链路",
        items: [
          {
            id: "l8-quality-gate",
            name: "质量门禁（合并前）",
            brief:
              "PR 触发：Schema 校验 + Lint + Lighthouse CI + 死链检查 + 类型检查。全部通过才合并。",
            detail: {
              what: "在 Pull Request 阶段自动执行一系列质量检查，全部通过才允许合并到 main 分支。包括：Frontmatter Schema 校验、markdownlint、TypeScript 类型检查、Lighthouse CI、死链检查。",
              why: "质量门禁是「写作纪律」的自动化执行。防止元信息缺失、格式不规范、性能回退、死链等问题进入生产环境。自动化检查比人工审查更可靠、更快速。",
              how: "GitHub Actions workflow：<br>1. <code>pnpm run astro check</code>（TypeScript）<br>2. <code>markdownlint-cli2</code>（Markdown 格式）<br>3. Lighthouse CI（性能评分阈值 90）<br>4. <code>lychee</code>（链接检查）<br>5. 自定义脚本校验 Frontmatter<br>6. 所有 check 绿色才允许 merge",
              tools:
                "GitHub Actions · Lighthouse CI · markdownlint-cli2 · lychee（链接检查）· Zod Schema 校验",
              tips: "刚开始不要设太多检查——从 TypeScript 和构建成功两个基本检查开始，逐步添加更多门禁。过多检查会让每次提交变得繁琐。",
            },
          },
          {
            id: "l8-preview",
            name: "Preview 部署",
            brief:
              "每个 PR 自动生成 Preview URL，预览文章渲染效果。链接自动回帖到 PR 评论。",
            detail: {
              what: "每个 Pull Request 自动触发构建和部署到临时 URL（如 <code>pr-123.blog.pages.dev</code>），在 PR 评论中自动回帖 Preview 链接。合并后临时部署自动清理。",
              why: "Preview 部署让你在合并前就能看到文章的最终渲染效果——排版、代码高亮、图片展示、OG 图预览。这比本地开发服务器更接近真实环境。",
              how: "Cloudflare Pages 和 Vercel 原生支持 PR Preview——推送分支后自动构建部署，无需额外配置。部署链接自动出现在 PR 评论中。",
              tips: "Preview 部署是免费的（Cloudflare Pages 无限，Vercel 免费层 100 次/天）。善用 Preview 让非技术人员也能参与内容审核——发给朋友看看排版效果。",
            },
          },
          {
            id: "l8-hooks",
            name: "发布钩子",
            brief:
              "合并到 main 后：构建部署 → ping 搜索引擎 → 更新索引 → 触发通知。",
            detail: {
              what: "合并到 main 分支后自动触发一系列发布流程：① 构建+部署 ② 主动 ping Google/Bing 请求收录 ③ 更新 AI 向量化索引 ④ 触发 Newsletter 草稿 ⑤ 延迟触发社交媒体发布。",
              why: "自动化发布钩子确保每次发布的一致性——不会遗忘 ping 搜索引擎或更新索引。减少手动操作，让作者专注于写作。",
              how: "GitHub Actions：on push to main → 并行执行多个 job：deploy（构建部署）、seo-ping（Search Console API）、ai-index（更新 Embedding）、notify（Newsletter 草稿）、social（延迟 4 小时后发 Twitter）。",
              tips: "社交媒体发布设置延迟（4-8 小时），预留人工检查窗口。可以通过在 commit message 中添加 [skip-social] 标记跳过社交发布。",
            },
          },
          {
            id: "l8-rollback",
            name: "回滚机制",
            brief:
              "一键回滚到任意历史版本。Git tag 标记重要版本。1 分钟内可回滚。",
            detail: {
              what: "CDN 托管平台（Cloudflare Pages/Vercel）保留所有历史部署版本，支持在管理面板中一键切换到任意历史版本。Git tag 标记重要版本便于追溯。",
              why: "发布后发现严重问题（页面崩溃、内容错误、安全漏洞）时，需要在最短时间内恢复。一键回滚比「修复→提交→构建→部署」快得多。",
              how: "Cloudflare Pages：Dashboard → Deployments → 选择历史版本 → Rollback。Vercel 类似。Git 层面：<code>git revert</code> 或 <code>git tag v1.2.3</code> 标记稳定版本。",
              tips: "每次重要更新后打 Git tag。回滚后立即修复问题并重新部署，不要在回滚状态停留太久。建立 Runbook 文档记录回滚流程。",
            },
          },
        ],
      },
      {
        title: "安全基础配置",
        items: [
          {
            id: "l8-headers",
            name: "HTTP 安全头",
            brief:
              "HSTS、CSP、X-Frame-Options、Permissions-Policy。CDN 配置文件统一设置。",
            detail: {
              what: "在 HTTP 响应头中设置安全策略：HSTS（强制 HTTPS）、CSP（内容安全策略，防 XSS）、X-Frame-Options（防点击劫持）、Permissions-Policy（限制浏览器 API 访问如摄像头、地理位置）。",
              why: "安全头是零成本的安全加固——一次配置永久生效。HSTS 防止 SSL 降级攻击，CSP 防止 XSS 注入，X-Frame-Options 防止网站被嵌入 iframe 进行钓鱼。",
              how: "在 Cloudflare 的 <code>_headers</code> 文件或 Vercel 的 <code>vercel.json</code> 中配置：<br><code>Strict-Transport-Security: max-age=31536000; includeSubDomains</code><br><code>X-Frame-Options: DENY</code><br><code>X-Content-Type-Options: nosniff</code><br><code>Permissions-Policy: camera=(), microphone=()</code>",
              tools:
                "SecurityHeaders.com（检测评分）· Mozilla Observatory · Cloudflare _headers 文件",
              tips: "CSP 配置最复杂——需要允许博客使用的所有第三方资源（字体 CDN、评论系统、分析脚本）。建议从 report-only 模式开始，观察哪些资源会被阻断，再逐步收紧。",
            },
          },
          {
            id: "l8-deps",
            name: "依赖安全",
            brief:
              "Dependabot 自动更新 PR。npm audit 在 CI 中阻断高危漏洞发布。",
            detail: {
              what: "自动化依赖安全管理：Dependabot 自动创建依赖更新 PR、npm audit 在 CI 中检测已知漏洞、OSSF Scorecard 评估供应链安全评分。",
              why: "前端项目的依赖链很深——一个间接依赖的漏洞可能影响你的博客。自动化检测和更新是管理依赖安全的唯一可扩展方式。",
              how: "1. 启用 GitHub Dependabot（<code>.github/dependabot.yml</code>）<br>2. CI 中添加 <code>npm audit --audit-level=high</code><br>3. 定期审查第三方脚本（评论系统、分析工具）<br>4. 使用 <code>pnpm audit</code> 获得更精确的审计结果",
              tips: "不要忽略 Dependabot 的 PR——及时合并安全更新。对于 breaking change 的大版本更新，在 Preview 部署中验证后再合并。",
            },
          },
          {
            id: "l8-dns",
            name: "域名与 DNS",
            brief:
              "DNSSEC 启用，CAA 记录限制证书颁发，HTTPS 自动续期。",
            detail: {
              what: "域名安全配置：DNSSEC（DNS 安全扩展，防止 DNS 劫持）、CAA 记录（限制哪些 CA 可以为你的域名颁发证书）、HTTPS 证书自动续期。",
              why: "域名是博客的入口——DNS 被劫持意味着读者访问到的不是你的博客。DNSSEC 和 CAA 是低成本高回报的安全措施。HTTPS 证书过期会导致浏览器显示不安全警告。",
              how: "1. Cloudflare 一键启用 DNSSEC<br>2. 添加 CAA 记录：<code>0 issue \"letsencrypt.org\"</code>（仅允许 Let's Encrypt 颁发证书）<br>3. 使用 Cloudflare / Let's Encrypt 自动管理证书续期<br>4. 域名注册商启用域名锁定（防止未授权转移）",
              tips: "域名是博客最有价值的资产——选择可靠的注册商（Cloudflare Registrar 或 Namesilo，透明定价无套路）。启用双因素认证保护注册商账号。",
            },
          },
        ],
      },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // L9 · 监控与运营层
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    code: "L9",
    name: "监控与运营层",
    icon: "📊",
    color: "#16a34a",
    tagline: "可观测性、内容健康度、自动化运维",
    overview:
      "确保博客长期健康运行。涵盖搜索健康监控（GSC、Bing、Lighthouse CI）、隐私友好流量分析（Umami vs Plausible）、可靠性监控（可用性、前端错误）、以及内容运维自动化（死链检查、过期提醒、备份）。",
    sections: [
      {
        title: "搜索健康监控",
        items: [
          {
            id: "l9-gsc",
            name: "Google Search Console",
            brief:
              "索引状态、覆盖率错误、CWV 真实数据、关键词排名。每周检查。",
            detail: {
              what: "Google Search Console（GSC）是监控博客在 Google 搜索中表现的核心工具。监控：索引状态、覆盖率错误（noindex/404/重定向异常）、Core Web Vitals 真实用户数据、关键词排名和点击率。",
              why: "GSC 提供的是真实的搜索数据——哪些关键词带来了流量、哪些页面有索引问题、CWV 在真实用户设备上的表现。这些数据是 SEO 决策的基础。",
              how: "1. 验证站点所有权（DNS TXT 记录）<br>2. 提交 sitemap.xml<br>3. 每周检查：Coverage 报告（索引错误）、Performance 报告（关键词和流量趋势）<br>4. 新文章发布后手动请求索引（URL Inspection → Request Indexing）<br>5. 关注 CWV 报告中的问题页面并修复",
              tips: "不要每天查看 GSC——数据有 2-3 天延迟，频繁查看容易焦虑。每周固定时间检查一次，关注趋势而非单日数据。",
            },
          },
          {
            id: "l9-bing",
            name: "Bing Webmaster Tools",
            brief:
              "Bing 占全球搜索约 7%，企业用户比例更高。提交 sitemap 监控索引。",
            detail: {
              what: "Bing Webmaster Tools 是 Bing 搜索引擎的站点管理工具。功能与 Google Search Console 类似：提交 sitemap、监控索引状态、查看搜索表现。",
              why: "Bing 搜索份额约 7%（在 Edge 浏览器默认搜索引擎和企业环境中占比更高）。这部分流量不容忽视。配置成本极低——几分钟即可完成。",
              how: "1. 访问 bing.com/webmaster<br>2. 可以直接从 GSC 导入配置<br>3. 提交 sitemap.xml<br>4. 新文章发布后使用 URL Submission API 主动提交",
              tips: "配置一次后基本不需要频繁查看——每月检查一次索引状态即可。Bing 的 URL Submission API 比 Google 更宽松，可以在 GitHub Actions 中自动提交新页面。",
            },
          },
          {
            id: "l9-lighthouse-ci",
            name: "Lighthouse CI",
            brief:
              "每次部署自动运行 Lighthouse，设置阈值防止性能回退。趋势可视化。",
            detail: {
              what: "在 CI/CD 流程中自动运行 Lighthouse 审计，输出 Performance/SEO/Accessibility/Best Practices 四项评分。设置分数阈值（如 Performance < 90 则构建失败），防止性能回退。",
              why: "性能问题通常是渐进恶化的——每次添加一点 JS、多加载一张未优化的图片。Lighthouse CI 作为持续监控手段，在性能回退的瞬间就发出警告。",
              how: "1. 安装 <code>@lhci/cli</code><br>2. 配置 <code>lighthouserc.js</code>：设置 Performance ≥ 90, SEO ≥ 95, Accessibility ≥ 90<br>3. GitHub Actions 中在 build 后运行 <code>lhci autorun</code><br>4. 结果上传到 Lighthouse CI Server 或 GitHub Status Check<br>5. 低于阈值则标记 PR 为 failed",
              tools:
                "@lhci/cli · Lighthouse CI Server · GitHub Actions · PageSpeed Insights API",
              tips: "不要追求 100 分——90+ 已经非常好了。某些第三方嵌入（评论系统、分析脚本）会拉低分数，这是合理的权衡。关注趋势变化而非绝对值。",
            },
          },
        ],
      },
      {
        title: "隐私友好流量分析",
        table: {
          headers: ["工具", "部署方式", "成本", "特点"],
          rows: [
            [
              "Umami",
              "自建",
              "免费(自建) / $9/月(托管)",
              "开源，数据自主，无 GDPR 问题",
            ],
            [
              "Plausible",
              "托管",
              "$9/月起",
              "最易用，报告直观，无 Cookie",
            ],
            [
              "Cloudflare Analytics",
              "Cloudflare 原生",
              "免费",
              "零配置，功能较简单",
            ],
            [
              "Fathom",
              "托管",
              "$14/月起",
              "隐私最严格，GDPR 合规",
            ],
          ],
        },
        callout:
          "核心原则：不使用 Google Analytics（隐私问题 + GDPR 合规成本 + 数据过载）。隐私友好工具数据更简洁，反而更易做出决策。",
      },
      {
        title: "可靠性监控",
        items: [
          {
            id: "l9-uptime",
            name: "站点可用性监控",
            brief:
              "UptimeRobot（免费层每 5 分钟）或 Better Stack。宕机告警+公开状态页。",
            detail: {
              what: "使用外部监控服务定期检测博客是否可正常访问。监控主域名 HTTP 状态码和关键页面（首页、最新文章）。宕机时邮件/推送告警。可选：公开状态页面（status.yourdomain.com）。",
              why: "静态博客的宕机概率很低（CDN 天然高可用），但 CDN 配置错误、域名过期、DNS 问题等仍可能导致不可用。及时发现问题比读者告诉你更好。",
              how: "1. UptimeRobot 免费注册，添加监控目标（博客 URL）<br>2. 设置监控间隔（免费层 5 分钟）<br>3. 配置告警方式（邮件/Telegram/Webhook）<br>4. 可选：配置公开状态页面<br>5. 监控多个关键路径（首页 + 文章页 + RSS）",
              tools:
                "UptimeRobot（免费层够用）· Better Stack（更丰富的告警）· Freshping（免费替代）",
              tips: "免费层的 5 分钟间隔足够个人博客使用。不要监控太多路径——3-5 个关键 URL 即可。确保告警通知到你真正会看到的渠道。",
            },
          },
          {
            id: "l9-sentry",
            name: "前端错误监控",
            brief:
              "Sentry 免费层捕获 JS 运行时错误。重点关注交互组件的错误率。",
            detail: {
              what: "使用 Sentry 捕获前端 JavaScript 运行时错误、Promise 未捕获异常。上传 Source Map 提供可读的错误堆栈。重点监控交互式组件（代码沙盒、图表、搜索）的错误率。",
              why: "静态博客的前端错误通常来自交互组件——如果 AI 聊天组件 JS 报错，你可能不知道直到读者抱怨。Sentry 的实时错误报告让你第一时间发现和修复问题。",
              how: "1. <code>pnpm add @sentry/browser</code><br>2. 在 Layout 中初始化 Sentry<br>3. 构建时上传 Source Map 到 Sentry<br>4. 构建后删除本地 Source Map（不暴露源码）<br>5. Sentry Dashboard 监控错误趋势",
              tips: "Sentry 免费层每月 5k 错误事件，对个人博客绰绰有余。配置采样率（如 10%）进一步减少使用量。不要忽略错误告警——一个持续报错的组件比功能缺失更糟。",
            },
          },
        ],
      },
      {
        title: "内容运维自动化",
        items: [
          {
            id: "l9-deadlink",
            name: "死链检查",
            brief:
              "lychee / broken-link-checker 每周扫描。发现死链自动创建 GitHub Issue。",
            detail: {
              what: "使用链接检查工具（lychee 或 broken-link-checker）定期扫描全站所有链接——内部链接和外部链接。发现失效链接后自动创建 GitHub Issue，标注具体文章和链接位置。",
              why: "死链是 SEO 负面信号，也直接影响读者体验。外部链接死亡是不可控的（外部站点关停、URL 变更），只有定期检查才能发现。内部死链通常是 slug 修改或文章删除导致的。",
              how: "GitHub Actions 定时任务（每周日）：<br>1. 构建站点<br>2. 运行 <code>lychee ./dist --format json</code><br>3. 解析结果，对每个死链创建 Issue<br>4. 标注：文章路径、死链 URL、HTTP 状态码",
              tools:
                "lychee（Rust，极快）· broken-link-checker · GitHub Actions · htmltest",
              tips: "外部链接检查可能有误报（对方服务器临时不可用）——设置重试机制。排除已知的特殊链接（如需要登录的链接、localhost）。内部链接死掉是 P0 问题，外部链接死掉可以排队处理。",
            },
          },
          {
            id: "l9-stale",
            name: "过期内容提醒",
            brief:
              "定时扫描 updatedAt > 18 个月的文章，创建 Issue。检测 techVersions 过期。",
            detail: {
              what: "GitHub Actions 每月运行脚本：扫描所有文章的 updatedAt 和 techVersions 字段。updatedAt 超过 18 个月或 techVersions 大版本落后 ≥ 2 版的文章，自动创建审查 Issue。",
              why: "过期内容是技术博客最大的信誉风险，但作者通常不会主动检查已发布的文章。自动化提醒确保过期内容被及时发现和处理。",
              how: "1. 脚本遍历所有文章 Frontmatter<br>2. 检查 updatedAt 与当前日期差值<br>3. 查询 npm registry 获取技术栈最新版本<br>4. 对比 techVersions 字段<br>5. 创建 Issue 并分配标签 <code>content-review</code>",
              tips: "不是所有过期提醒都需要更新——有些文章讨论的是原理性知识，不受版本影响。Issue 中应包含具体建议：「React 18 → 19 更新了 X、Y、Z，需要检查这些点」。",
            },
          },
          {
            id: "l9-backup",
            name: "内容备份",
            brief:
              "Git 仓库是主备份。额外：每日同步到 R2/S3。媒体资源单独备份。",
            detail: {
              what: "备份策略：Git 仓库本身是主要备份（代码+内容）。额外：每日将构建产物同步到 Cloudflare R2 / AWS S3。媒体资源（图片、字体）单独备份。定期测试恢复流程。",
              why: "虽然 Git 仓库在 GitHub 上有多份副本，但仍需考虑：GitHub 账号被封、仓库被误删、大文件（图片）不在 Git 中管理等情况。3-2-1 备份策略（3 份副本、2 种介质、1 份异地）。",
              how: "1. GitHub 仓库 = 主备份<br>2. 本地克隆 = 第二份副本<br>3. GitHub Actions 每日同步到 Cloudflare R2（$0.015/GB/月）<br>4. 图片资源用 rclone 同步到 S3 兼容存储<br>5. 每季度执行一次恢复演练",
              tips: "最重要的备份是你不需要备份的——把所有内容都放在 Git 仓库里（包括图片，使用 Git LFS 管理大文件）。定期验证备份可恢复——未测试的备份等于没有备份。",
            },
          },
          {
            id: "l9-build-perf",
            name: "构建性能监控",
            brief:
              "记录每次构建时长，超阈值告警。内容增多后评估增量构建策略。",
            detail: {
              what: "监控每次构建的耗时，记录趋势。当构建时间超过阈值（如 60 秒）时触发告警。评估是否需要启用增量构建或优化构建配置。",
              why: "内容数量增长后构建时间可能显著增加（图片处理、Markdown 解析、Embedding 生成）。构建时间过长影响发布效率和开发体验。及时发现性能问题，在问题变严重前优化。",
              how: "1. 在 CI 中记录构建开始/结束时间<br>2. 输出到 GitHub Actions 日志或第三方监控<br>3. 设置告警阈值（如构建 > 60s）<br>4. 分析耗时瓶颈（图片处理？Markdown 解析？AI API 调用？）<br>5. 优化策略：构建缓存、增量构建、并行处理",
              tips: "Astro 的构建速度本身很快——100 篇文章通常 < 10 秒。如果构建变慢，首先检查图片处理（sharp）和外部 API 调用（AI 功能）。使用构建缓存可以将增量构建时间降到 1-2 秒。",
            },
          },
        ],
      },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // L10 · 可持续发展层
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    code: "L10",
    name: "可持续发展层",
    icon: "🌱",
    color: "#65a30d",
    tagline: "成本控制、内容节奏、价值变现",
    overview:
      "确保博客的长期可持续性。涵盖成本控制（全栈 < ¥200/年的参考方案）、内容运营节奏（质量 vs 频率、常青内容策略）、以及价值变现路径（赞助、Newsletter、数字产品、咨询）。",
    sections: [
      {
        title: "参考成本清单",
        table: {
          headers: ["项目", "工具选择", "年成本"],
          rows: [
            ["域名", "Cloudflare Registrar / Namesilo", "¥80-120"],
            ["CDN + 托管", "Cloudflare Pages（免费层）", "¥0"],
            ["评论系统", "giscus（免费）", "¥0"],
            ["流量分析", "Umami 自建（免费层）", "¥0"],
            ["邮件发送", "Resend（免费 3k/月）", "¥0"],
            ["可用性监控", "UptimeRobot（免费层）", "¥0"],
            ["错误监控", "Sentry（免费层）", "¥0"],
            ["AI 能力", "Claude/GPT API（按量）", "¥50-200"],
            ["总计（不含 AI）", "—", "< ¥200/年"],
          ],
        },
        callout:
          "个人技术博客全栈运行成本可控制在 ¥200/年以内（仅域名费）。AI 功能按需开启，低流量阶段成本可忽略。",
      },
      {
        title: "内容运营节奏",
        items: [
          {
            id: "l10-quality-freq",
            name: "质量 vs 频率权衡",
            brief:
              "1 篇深度文章 > 10 篇浅薄内容。建议：深度 2-4 篇/月，TIL 不限。",
            detail: {
              what: "技术博客的核心策略是「质量优先」：一篇 3000+ 字的深度文章（有独特见解、代码示例、实际经验）的长期价值远超 10 篇浅薄内容。建议频率：深度文章 2-4 篇/月，TIL/短笔记不限。",
              why: "深度文章是长尾 SEO 流量和口碑传播的核心驱动力——一篇好文章可以带来持续数年的流量。浅薄内容消耗读者信任而无回报。但 TIL 等轻量内容能保持输出节奏，防止因追求完美而停止写作。",
              how: "1. 每月计划 2 篇深度文章（提前列好选题）<br>2. TIL/短笔记随时写，不设数量目标<br>3. 深度文章每篇投入 4-8 小时（包括研究、写作、校对）<br>4. 不要为了「周更」而降低质量<br>5. 宁可少写也不乱写",
              tips: "写作效率的关键是「选题→大纲→初稿」流程化。不要坐下来从零开始写——应该在日常中积累选题和素材，写作时只是「组装」。",
            },
          },
          {
            id: "l10-evergreen",
            name: "常青内容策略",
            brief:
              "常青内容（不依赖时效性）占比建议 > 70%。维护常青内容比持续产出新内容更高效。",
            detail: {
              what: "常青内容（Evergreen Content）是不依赖时效性、长期有搜索需求的内容。如「React 性能优化最佳实践」「Git 常用命令速查」。时效性内容如「2025 前端框架对比」有即时流量但快速贬值。",
              why: "常青内容的 ROI 远高于时效性内容——一篇好的常青文章每年带来稳定的搜索流量。维护 10 篇常青文章的成本和收益远超每月写 10 篇时效性文章。",
              how: "1. 新文章创作前评估：这篇文章 1 年后还有人搜索吗？<br>2. 常青文章选题：原理性知识、最佳实践、工具使用指南<br>3. 定期更新常青文章（代码示例、工具版本）<br>4. 时效性文章明确标注年份<br>5. 目标：常青内容占比 > 70%",
              tips: "最好的常青内容是「写给 3 年后的读者也适用」的内容。将时效性文章改造为常青文章的方法：提取其中的永恒原理，单独成文。",
            },
          },
          {
            id: "l10-repurpose",
            name: "内容再利用",
            brief:
              "一篇深度文章 → 推文串 → Newsletter → 演讲 → 视频。一次创作，多渠道分发。",
            detail: {
              what: "单篇深度文章的多渠道延伸路径：拆解为 3-5 条推文/微博串 → Newsletter 精华版 → 演讲/分享 PPT → 视频教程 → 完整课程。一次创作，多次分发。",
              why: "内容创作的最大成本是研究和思考，而非排版和分发。同一个核心观点用不同形式触达不同渠道的受众，边际成本极低。这是内容创作者的杠杆。",
              how: "发布文章后：<br>1. 提取 3-5 个核心观点 → Twitter 串<br>2. 精简为 Newsletter 摘要<br>3. 扩展为 15 分钟演讲大纲<br>4. 录制 5 分钟讲解视频（可选）<br>5. 多篇文章积累后 → 电子书/课程",
              tips: "不同渠道的内容形式不同——推文要精炼、Newsletter 要有独家洞察、演讲要有故事性。不要简单复制粘贴，要针对每个渠道的受众特点调整。",
            },
          },
          {
            id: "l10-topics",
            name: "选题来源管理",
            brief:
              "维护选题清单（GitHub Projects/Notion）。来源：评论、Search Console、自身经验。",
            detail: {
              what: "系统化管理博客选题：维护一个选题清单，记录灵感来源、优先级、预期价值。选题来源包括：评论区问题、Search Console 关键词机会、自己遇到的问题（最真实的素材）、行业热点。",
              why: "「不知道写什么」是博客停更的主要原因之一。系统化的选题管理确保你随时有题可写。基于数据（搜索关键词）的选题比拍脑袋的选题更可能获得流量。",
              how: "1. 使用 GitHub Projects 或 Notion 维护选题看板<br>2. 列：Inbox（灵感）→ Planned（计划中）→ Writing（写作中）→ Published<br>3. 每条选题附：来源、目标关键词、预期难度、优先级<br>4. 每月从 Search Console 发掘关键词机会<br>5. 按 ROI（流量潜力 × 写作难度倒数）排序",
              tips: "最好的选题是「你刚刚解决的问题」——你有第一手经验，文章最真实也最有价值。不要追热点——除非你有独特见解，否则热点文章很快被淹没。",
            },
          },
        ],
      },
      {
        title: "价值变现路径",
        items: [
          {
            id: "l10-sponsor",
            name: "赞助 / 打赏",
            brief:
              "GitHub Sponsors、Ko-fi、爱发电。高价值文章末尾放置，转化率最高。",
            detail: {
              what: "读者自愿的经济支持。渠道：GitHub Sponsors（最适合技术博客）、Ko-fi（一次性支持）、爱发电（中文平台）。放置位置：高价值文章末尾（阅读完有获得感时转化率最高）+ About 页面。",
              why: "赞助/打赏是最自然的变现方式——不需要改变内容策略，不需要强制付费。有稳定月收入 10-50 美元后可覆盖全部服务器成本，实现「博客自给自足」。",
              how: "1. 注册 GitHub Sponsors（审核约 1 周）<br>2. 创建赞助等级（$1/月起）<br>3. 在高价值文章末尾添加简洁的赞助入口<br>4. About 页面说明赞助用途（透明度）<br>5. 对赞助者表示感谢（Sponsors 列表）",
              tips: "赞助入口不要太突兀——一段简短的话 + 按钮就够了。不要反复提醒——过于频繁的赞助请求比没有更差。",
            },
          },
          {
            id: "l10-paid-newsletter",
            name: "付费 Newsletter",
            brief:
              "免费订阅者 > 500 人后考虑。更深度分析、早期访问。Ghost / Substack / Buttondown。",
            detail: {
              what: "将部分高价值内容设为付费订阅才可阅读。通常在免费 Newsletter 建立了一定订阅基础后（> 500 人）开始。付费内容提供更深度的分析、早期访问、原始资料等。",
              why: "付费 Newsletter 是最可持续的创作者收入模式——recurring revenue（定期收入）。100 个 $5/月的付费订阅者 = $500/月 = $6000/年。这足以让博客写作成为有回报的事业。",
              how: "工具：Ghost（自建，最完整）/ Substack（零成本启动但抽成 10%）/ Buttondown（轻量）。策略：80% 免费内容建立信任 + 20% 付费内容提供额外价值。不要把免费变付费——新增付费专属内容。",
              tips: "过早收费会赶走读者——等有稳定的免费内容读者群后再考虑。付费内容必须有明确的差异化价值——不是简单地把文章加个付费墙。",
            },
          },
          {
            id: "l10-digital-products",
            name: "数字产品",
            brief:
              "电子书、模板、代码库、在线课程。一次创作，长尾收入。",
            detail: {
              what: "基于博客积累的内容和专业知识，创建可售卖的数字产品：电子书（系列文章精编版）、项目模板（Next.js Starter、Astro 博客模板）、代码库、在线课程。",
              why: "数字产品是「一次创作，持续收入」的模式。一本写得好的电子书或一个解决痛点的模板可以持续数年产生销售。与赞助不同，数字产品是基于价值交换的正式商业模式。",
              how: "1. 从博客最受欢迎的系列文章出发<br>2. 扩展为完整的电子书或课程<br>3. 使用 Gumroad / Lemon Squeezy 处理支付（支持国内支付方式）<br>4. 在博客中自然推荐（相关文章末尾）<br>5. 提供免费试读/预览",
              tools:
                "Gumroad · Lemon Squeezy · Stripe · Teachable（课程平台）",
              tips: "数字产品的前提是足够的受众基础——没有读者的博客卖不出产品。先用免费内容建立信任和流量，再自然转化为付费产品。定价参考：电子书 $10-30，课程 $50-200。",
            },
          },
          {
            id: "l10-consulting",
            name: "咨询 / 写作合作",
            brief:
              "技术博客是最好的简历。技术咨询、付费约稿、演讲邀请。间接价值 > 广告收入。",
            detail: {
              what: "技术博客建立的专业度和影响力可以带来：技术咨询机会、付费技术写作邀约（InfoQ/掘金等平台约稿）、会议演讲邀请、开源项目赞助。这些间接价值往往远大于直接的广告收入。",
              why: "技术博客是证明专业能力最有说服力的方式——比简历、Portfolio 更有深度和广度。招聘方、潜在客户、社区组织者都会通过博客评估你的技术实力和表达能力。",
              how: "1. 在 About 页面明确说明「可接受咨询/写作合作」<br>2. 提供联系邮箱（专用邮箱，非个人邮箱）<br>3. 列出过去的合作案例（如有）<br>4. 保持博客活跃度——沉寂的博客没有说服力<br>5. 在社交媒体上分享博客内容，扩大影响力",
              tips: "咨询定价不要太低——低价会降低专业形象。间接价值是博客最大的回报——一篇好文章可能带来一份好工作机会或一个有价值的合作关系。",
            },
          },
        ],
      },
    ],
  },
];

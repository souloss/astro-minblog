import { SITE } from "virtual:astro-minimax/config";

export type TranslationKey =
  | "nav.home"
  | "nav.posts"
  | "nav.tags"
  | "nav.categories"
  | "nav.about"
  | "nav.friends"
  | "nav.archives"
  | "nav.search"
  | "nav.projects"
  | "projects.title"
  | "projects.desc"
  | "post.featured"
  | "post.recentPosts"
  | "post.allPosts"
  | "post.prev"
  | "post.next"
  | "post.share"
  | "post.series"
  | "post.editPage"
  | "post.readingMode"
  | "search.title"
  | "search.placeholder"
  | "search.filters"
  | "search.resetFilters"
  | "search.category"
  | "search.language"
  | "search.sortBy"
  | "search.tags"
  | "search.allCategories"
  | "search.allLanguages"
  | "pagination.prev"
  | "pagination.next"
  | "footer.running"
  | "footer.days"
  | "common.backToTop"
  | "common.goBack"
  | "common.notFound"
  | "hero.greeting"
  | "hero.desc"
  | "hero.readMore"
  | "hero.socialLinks"
  | "footer.hi"
  | "footer.copyright"
  | "footer.sitemap"
  | "archives.posts"
  | "archives.years"
  | "tags.tags"
  | "tags.taggedPosts"
  | "tags.sizeLegend"
  | "tags.less"
  | "tags.more"
  | "main.allArticles"
  | "main.allTags"
  | "main.allArchived"
  | "main.tagDesc"
  | "main.categoryDesc"
  | "main.noCategories"
  | "main.searchDesc"
  | "friends.title"
  | "friends.desc"
  | "nav.series"
  | "series.title"
  | "series.desc"
  | "series.articles"
  | "series.latestUpdate"
  | "series.noSeries"
  | "series.seriesDesc"
  | "series.currentReading"
  | "series.progress"
  | "post.updated"
  | "post.updatedBadge"
  | "post.updatedTooltip"
  | "post.readingTime"
  | "post.wordCount"
  | "common.notFoundDesc"
  | "common.goHome"
  | "ai.assistantName"
  | "ai.statusLive"
  | "ai.statusDemo"
  | "ai.clearConversation"
  | "ai.closeChat"
  | "ai.close"
  | "ai.welcomeGlobal"
  | "ai.placeholder"
  | "ai.thinking"
  | "ai.error.api"
  | "ai.error.noResponse"
  | "ai.error.connection"
  | "settings.title"
  | "settings.close"
  | "settings.tabTheme"
  | "settings.tabAppearance"
  | "settings.tabLayout"
  | "settings.tabGeneral"
  | "settings.colorScheme"
  | "settings.borderRadius"
  | "settings.fontSize"
  | "settings.fontSizeDesc"
  | "settings.postsLayout"
  | "settings.widgets"
  | "settings.showBackToTop"
  | "settings.showThemeToggle"
  | "settings.showReadingTime"
  | "settings.animations"
  | "settings.animationsDesc"
  | "settings.cardHover"
  | "settings.cardHoverDesc"
  | "settings.smoothScroll"
  | "settings.reset"
  | "settings.small"
  | "settings.medium"
  | "settings.large"
  | "settings.xl"
  | "settings.gridCards"
  | "settings.magazine"
  | "settings.list"
  | "settings.compact"
  | "settings.timeline"
  | "categories.count"
  | "categories.posts"
  | "categories.subcategories"
  | "categories.more"
  | "series.count"
  | "series.totalPosts"
  | "series.articlesShort"
  | "series.moreArticles"
  | "series.read"
  | "friends.count"
  | "friends.noFriends"
  | "archives.readingTime"
  | "archives.page"
  | "unit.minutes"
  | "unit.articles"
  | "unit.posts"
  | "unit.friends"
  | "unit.series"
  | "unit.categories"
  | "unit.subcategories"
  | "unit.more"
  | "settings.tabReading"
  | "settings.readingFontSize"
  | "settings.readingLineHeight"
  | "settings.readingWidth"
  | "settings.readingTheme"
  | "settings.readingFontFamily"
  | "settings.focusMode"
  | "settings.focusModeDesc"
  | "settings.share"
  | "settings.shareCopied"
  | "settings.narrow"
  | "settings.wide"
  | "settings.comfortable"
  | "settings.relaxed"
  | "settings.serif"
  | "settings.sans"
  | "settings.mono"
  | "settings.system"
  | "settings.fontCode"
  | "settings.fontLxgw"
  | "settings.fontZcool"
  | "settings.fontReadable"
  | "settings.fontClassic"
  | "settings.readingThemeDefault"
  | "settings.readingThemeEyecare"
  | "settings.readingThemeParchment"
  | "settings.readingThemeNight"
  | "settings.readingThemeOled"
  | "settings.readingMode"
  | "settings.readingModeDesc"
  | "settings.immersiveMode"
  | "settings.immersiveModeDesc"
  | "settings.hue"
  | "nav.immersiveMode"
  | "immersive.title"
  | "immersive.description"
  | "immersive.backToSite"
  | "immersive.backToList"
  | "immersive.all"
  | "immersive.empty"
  | "immersive.updated";

const translations: Record<string, Record<TranslationKey, string>> = {
  en: {
    "nav.home": "Home",
    "nav.posts": "Posts",
    "nav.tags": "Tags",
    "nav.categories": "Categories",
    "nav.about": "About",
    "nav.friends": "Friends",
    "nav.archives": "Archives",
    "nav.search": "Search",
    "nav.projects": "Projects",
    "projects.title": "Projects",
    "projects.desc": "Open source projects and tools.",
    "post.featured": "Featured",
    "post.recentPosts": "Recent Posts",
    "post.allPosts": "All Posts",
    "post.prev": "Previous Post",
    "post.next": "Next Post",
    "post.share": "Share this post on:",
    "post.series": "Series",
    "post.editPage": "Edit page",
    "post.readingMode": "Reading Mode",
    "search.title": "Search",
    "search.placeholder": "Search any article...",
    "search.filters": "Advanced Filters",
    "search.resetFilters": "Reset Filters",
    "search.category": "Category",
    "search.language": "Language",
    "search.sortBy": "Sort By",
    "search.tags": "Tags",
    "search.allCategories": "All Categories",
    "search.allLanguages": "All Languages",
    "pagination.prev": "Prev",
    "pagination.next": "Next",
    "footer.running": "Running for",
    "footer.days": "days",
    "common.backToTop": "Back to Top",
    "common.goBack": "Go back",
    "common.notFound": "Page Not Found",
    "hero.greeting": "Hello",
    "hero.desc":
      "astro-minimax is a minimal, responsive, accessible and SEO-friendly Astro blog theme. This theme follows best practices and provides accessibility out of the box. Light and dark mode are supported by default. Moreover, additional color schemes can also be configured.",
    "hero.readMore": "Read the blog posts or check",
    "hero.socialLinks": "Social Links:",
    "footer.hi": "Hi",
    "footer.copyright": "© {year} {author}. All rights reserved.",
    "footer.sitemap": "Sitemap",
    "archives.posts": "posts",
    "archives.years": "years",
    "tags.tags": "tags",
    "tags.taggedPosts": "tagged posts",
    "tags.sizeLegend": "Size indicates popularity:",
    "tags.less": "Less",
    "tags.more": "More",
    "main.allArticles": "All the articles I've posted.",
    "main.allTags": "All the tags used in posts.",
    "main.allArchived": "All the articles I've archived.",
    "main.tagDesc": 'All the articles with the tag "{tag}".',
    "main.categoryDesc": 'All the articles in the category "{category}".',
    "main.noCategories": "No categories found.",
    "main.searchDesc": "Search any article with advanced filters ...",
    "friends.title": "Friends",
    "friends.desc": "Friendship links, welcome to exchange.",
    "nav.series": "Series",
    "series.title": "Series",
    "series.desc": "Curated article series for deep-diving into topics.",
    "series.articles": "{count} articles",
    "series.latestUpdate": "Last updated",
    "series.noSeries": "No series found.",
    "series.seriesDesc": 'All articles in the series "{name}".',
    "series.currentReading": "Currently reading",
    "series.progress": "Article {current} of {total}",
    "post.updated": "Updated:",
    "post.updatedBadge": "Updated",
    "post.updatedTooltip": "Updated: {date}",
    "post.readingTime": "{min} min read",
    "post.wordCount": "{count} words",
    "common.notFoundDesc": "The page you are looking for doesn't exist.",
    "common.goHome": "Go back home",
    "ai.assistantName": "Blog Avatar",
    "ai.statusLive": "Live",
    "ai.statusDemo": "Demo",
    "ai.clearConversation": "Clear conversation",
    "ai.closeChat": "Close chat",
    "ai.close": "Close",
    "ai.welcomeGlobal": "Hi! I'm the Blog Avatar. I can help you explore the blog content. Try asking me about articles, tech topics, or anything you're curious about!",
    "ai.placeholder": "Type your question...",
    "ai.thinking": "Thinking...",
    "ai.error.api": "API Error: {status}",
    "ai.error.noResponse": "No response received",
    "ai.error.connection": "Connection failed: {error}",
    "settings.title": "Preferences",
    "settings.close": "Close",
    "settings.tabTheme": "Theme",
    "settings.tabAppearance": "Appearance",
    "settings.tabLayout": "Layout",
    "settings.tabGeneral": "General",
    "settings.colorScheme": "Color Scheme",
    "settings.borderRadius": "Border Radius",
    "settings.fontSize": "Global Font Size",
    "settings.fontSizeDesc": "Adjust overall font size",
    "settings.postsLayout": "Posts Layout",
    "settings.widgets": "Widgets",
    "settings.showBackToTop": "Back to Top Button",
    "settings.showThemeToggle": "Theme Toggle Button",
    "settings.showReadingTime": "Reading Time Display",
    "settings.animations": "Animations",
    "settings.animationsDesc": "Page transitions and interactions",
    "settings.cardHover": "Card Hover Effect",
    "settings.cardHoverDesc": "Lift and shadow on hover",
    "settings.smoothScroll": "Smooth Scrolling",
    "settings.reset": "Reset to Defaults",
    "settings.small": "S",
    "settings.medium": "M",
    "settings.large": "L",
    "settings.xl": "XL",
    "settings.gridCards": "Grid Cards",
    "settings.magazine": "Magazine",
    "settings.list": "List",
    "settings.compact": "Compact",
    "settings.timeline": "Timeline",
    "categories.count": "categories",
    "categories.posts": "posts",
    "categories.subcategories": "subcategories",
    "categories.more": "more",
    "series.count": "series",
    "series.totalPosts": "posts",
    "series.articlesShort": "articles",
    "series.moreArticles": "more",
    "series.read": "read",
    "friends.count": "friends",
    "friends.noFriends": "No friends yet",
    "archives.readingTime": "min",
    "archives.page": "Page {current} of {total}",
    "unit.minutes": "min",
    "unit.articles": "articles",
    "unit.posts": "posts",
    "unit.friends": "friends",
    "unit.series": "series",
    "unit.categories": "categories",
    "unit.subcategories": "subcategories",
    "unit.more": "more",
    "settings.tabReading": "Reading",
    "settings.readingFontSize": "Font Size",
    "settings.readingLineHeight": "Line Height",
    "settings.readingWidth": "Content Width",
    "settings.readingTheme": "Reading Theme",
    "settings.readingFontFamily": "Font Family",
    "settings.focusMode": "Focus Mode",
    "settings.focusModeDesc": "Highlight current paragraph",
    "settings.share": "Share Config",
    "settings.shareCopied": "Copied!",
    "settings.narrow": "Narrow",
    "settings.wide": "Wide",
    "settings.comfortable": "Comfortable",
    "settings.relaxed": "Relaxed",
    "settings.serif": "Serif",
    "settings.sans": "Sans",
    "settings.mono": "Mono",
    "settings.system": "System",
    "settings.fontCode": "Code",
    "settings.fontLxgw": "霞鹜文楷",
    "settings.fontZcool": "酷乐体",
    "settings.fontReadable": "Literata",
    "settings.fontClassic": "思源宋体",
    "settings.readingThemeDefault": "Default",
    "settings.readingThemeEyecare": "Eyecare",
    "settings.readingThemeParchment": "Parchment",
    "settings.readingThemeNight": "Night",
    "settings.readingThemeOled": "OLED",
    "settings.readingMode": "Reading Mode",
    "settings.readingModeDesc": "Hide navigation and apply reading settings",
    "settings.immersiveMode": "Immersive Mode",
    "settings.immersiveModeDesc": "Hide all navigation for distraction-free reading",
    "settings.hue": "Hue",
    "nav.immersiveMode": "Immersive Mode",
    "immersive.title": "Immersive Reading",
    "immersive.description": "Minimal distraction-free reading experience",
    "immersive.backToSite": "Back to site",
    "immersive.backToList": "Back to list",
    "immersive.all": "All",
    "immersive.empty": "No content yet",
    "immersive.updated": "Updated",
  },
  zh: {
    "nav.home": "首页",
    "nav.posts": "文章",
    "nav.tags": "标签",
    "nav.categories": "分类",
    "nav.about": "关于",
    "nav.friends": "友链",
    "nav.archives": "归档",
    "nav.search": "搜索",
    "nav.projects": "项目",
    "projects.title": "项目",
    "projects.desc": "开源项目与工具展示。",
    "post.featured": "精选文章",
    "post.recentPosts": "最近文章",
    "post.allPosts": "全部文章",
    "post.prev": "上一篇",
    "post.next": "下一篇",
    "post.share": "分享到：",
    "post.series": "系列",
    "post.editPage": "编辑此页",
    "post.readingMode": "沉浸式阅读",
    "search.title": "搜索",
    "search.placeholder": "搜索文章...",
    "search.filters": "高级筛选",
    "search.resetFilters": "重置筛选",
    "search.category": "分类",
    "search.language": "语言",
    "search.sortBy": "排序方式",
    "search.tags": "标签",
    "search.allCategories": "全部分类",
    "search.allLanguages": "全部语言",
    "pagination.prev": "上一页",
    "pagination.next": "下一页",
    "footer.running": "已运行",
    "footer.days": "天",
    "common.backToTop": "回到顶部",
    "common.goBack": "返回",
    "common.notFound": "页面未找到",
    "hero.greeting": "你好",
    "hero.desc":
      "astro-minimax 是一个极简、响应式、无障碍且 SEO 友好的 Astro 博客主题。本主题遵循最佳实践，开箱即用提供无障碍支持。默认支持亮色和暗色模式，还可配置更多配色方案。",
    "hero.readMore": "阅读博客文章或查看",
    "hero.socialLinks": "社交链接：",
    "footer.hi": "你好",
    "footer.copyright": "© {year} {author}，版权所有，禁止转载，转发需注明出处",
    "footer.sitemap": "站点地图",
    "archives.posts": "篇文章",
    "archives.years": "年",
    "tags.tags": "个标签",
    "tags.taggedPosts": "篇已标记文章",
    "tags.sizeLegend": "大小表示使用频率：",
    "tags.less": "少",
    "tags.more": "多",
    "main.allArticles": "我发布的所有文章。",
    "main.allTags": "文章中使用的所有标签。",
    "main.allArchived": "我归档的所有文章。",
    "main.tagDesc": "标签「{tag}」下的所有文章。",
    "main.categoryDesc": "分类「{category}」下的所有文章。",
    "main.noCategories": "暂无分类。",
    "main.searchDesc": "使用高级筛选搜索文章...",
    "friends.title": "友链",
    "friends.desc": "友情链接，欢迎交换",
    "nav.series": "专栏",
    "series.title": "专栏",
    "series.desc": "精心策划的系列文章，深入探索各个主题。",
    "series.articles": "{count} 篇文章",
    "series.latestUpdate": "最近更新",
    "series.noSeries": "暂无系列文章。",
    "series.seriesDesc": "系列「{name}」中的所有文章。",
    "series.currentReading": "正在阅读",
    "series.progress": "第 {current} 篇，共 {total} 篇",
    "post.updated": "更新于：",
    "post.updatedBadge": "已更新",
    "post.updatedTooltip": "更新于 {date}",
    "post.readingTime": "{min} 分钟阅读",
    "post.wordCount": "{count} 字",
    "common.notFoundDesc": "你访问的页面不存在。",
    "common.goHome": "返回首页",
    "ai.assistantName": "博客分身",
    "ai.statusLive": "在线",
    "ai.statusDemo": "演示",
    "ai.clearConversation": "清除对话",
    "ai.closeChat": "关闭聊天",
    "ai.close": "关闭",
    "ai.welcomeGlobal": "你好！我是博客分身，可以帮你了解这个博客的内容。试试问我关于文章、技术或任何你感兴趣的话题吧！",
    "ai.placeholder": "输入你的问题...",
    "ai.thinking": "正在思考...",
    "ai.error.api": "API 错误: {status}",
    "ai.error.noResponse": "未收到回复",
    "ai.error.connection": "连接失败: {error}",
    "settings.title": "偏好设置",
    "settings.close": "关闭",
    "settings.tabTheme": "主题",
    "settings.tabAppearance": "外观",
    "settings.tabLayout": "布局",
    "settings.tabGeneral": "通用",
    "settings.colorScheme": "色彩主题",
    "settings.borderRadius": "圆角大小",
    "settings.fontSize": "全局字体大小",
    "settings.fontSizeDesc": "调整网站整体字体大小",
    "settings.postsLayout": "文章布局",
    "settings.widgets": "小部件",
    "settings.showBackToTop": "返回顶部按钮",
    "settings.showThemeToggle": "主题切换按钮",
    "settings.showReadingTime": "阅读时间显示",
    "settings.animations": "动画效果",
    "settings.animationsDesc": "页面过渡和交互动画",
    "settings.cardHover": "卡片悬停效果",
    "settings.cardHoverDesc": "悬停时抬升和阴影效果",
    "settings.smoothScroll": "平滑滚动",
    "settings.reset": "恢复默认设置",
    "settings.small": "小",
    "settings.medium": "中",
    "settings.large": "大",
    "settings.xl": "超大",
    "settings.gridCards": "网格卡片",
    "settings.magazine": "杂志",
    "settings.list": "列表",
    "settings.compact": "紧凑",
    "settings.timeline": "时间线",
    "categories.count": "个分类",
    "categories.posts": "篇文章",
    "categories.subcategories": "个子分类",
    "categories.more": "更多",
    "series.count": "个系列",
    "series.totalPosts": "篇文章",
    "series.articlesShort": "篇文章",
    "series.moreArticles": "篇更多",
    "series.read": "已读",
    "friends.count": "位好友",
    "friends.noFriends": "暂无友链",
    "archives.readingTime": "分钟",
    "archives.page": "第 {current} / {total} 页",
    "unit.minutes": "分钟",
    "unit.articles": "篇文章",
    "unit.posts": "篇文章",
    "unit.friends": "位好友",
    "unit.series": "个系列",
    "unit.categories": "个分类",
    "unit.subcategories": "个子分类",
    "unit.more": "更多",
    "settings.tabReading": "阅读",
    "settings.readingFontSize": "字体大小",
    "settings.readingLineHeight": "行间距",
    "settings.readingWidth": "页面宽度",
    "settings.readingTheme": "阅读主题",
    "settings.readingFontFamily": "字体风格",
    "settings.focusMode": "专注模式",
    "settings.focusModeDesc": "高亮当前段落",
    "settings.share": "分享配置",
    "settings.shareCopied": "已复制！",
    "settings.narrow": "窄",
    "settings.wide": "宽",
    "settings.comfortable": "舒适",
    "settings.relaxed": "宽松",
    "settings.serif": "宋体",
    "settings.sans": "黑体",
    "settings.mono": "等宽",
    "settings.system": "系统",
    "settings.fontCode": "编程字体",
    "settings.fontLxgw": "霞鹜文楷",
    "settings.fontZcool": "酷乐体",
    "settings.fontReadable": "Literata",
    "settings.fontClassic": "思源宋体",
    "settings.readingThemeDefault": "默认",
    "settings.readingThemeEyecare": "护眼",
    "settings.readingThemeParchment": "羊皮纸",
    "settings.readingThemeNight": "夜间",
    "settings.readingThemeOled": "纯黑",
    "settings.readingMode": "阅读模式",
    "settings.readingModeDesc": "隐藏导航并应用阅读设置",
    "settings.immersiveMode": "沉浸模式",
    "settings.immersiveModeDesc": "隐藏所有导航，专注阅读",
    "settings.hue": "色相",
    "nav.immersiveMode": "沉浸模式",
    "immersive.title": "沉浸阅读",
    "immersive.description": "极简沉浸式阅读体验",
    "immersive.backToSite": "返回主页",
    "immersive.backToList": "返回列表",
    "immersive.all": "全部",
    "immersive.empty": "暂无内容",
    "immersive.updated": "更新于",
  },
};

export function t(key: TranslationKey, lang?: string): string {
  const l = lang ?? (SITE.lang === "zh" ? "zh" : "en");
  return translations[l]?.[key] ?? translations["en"][key] ?? key;
}

export function getLang(lang?: string): string {
  return lang ?? (SITE.lang === "zh" ? "zh" : "en");
}

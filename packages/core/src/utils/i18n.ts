import { SITE } from "@/config";

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
  | "post.like"
  | "post.bookmark"
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
  | "post.readingTime"
  | "post.wordCount"
  | "common.notFoundDesc"
  | "common.goHome";

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
    "post.like": "Like",
    "post.bookmark": "Bookmark",
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
    "hero.greeting": "Mingalaba",
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
    "post.readingTime": "{min} min read",
    "post.wordCount": "{count} words",
    "common.notFoundDesc": "The page you are looking for doesn't exist.",
    "common.goHome": "Go back home",
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
    "post.like": "喜欢",
    "post.bookmark": "收藏",
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
    "post.readingTime": "{min} 分钟阅读",
    "post.wordCount": "{count} 字",
    "common.notFoundDesc": "你访问的页面不存在。",
    "common.goHome": "返回首页",
  },
};

export function t(key: TranslationKey, lang?: string): string {
  const l = lang ?? (SITE.lang === "zh" ? "zh" : "en");
  return translations[l]?.[key] ?? translations["en"][key] ?? key;
}

export function getLang(lang?: string): string {
  return lang ?? (SITE.lang === "zh" ? "zh" : "en");
}

/**
 * AI Package Internationalization
 * Follows the same pattern as packages/core/src/utils/i18n.ts
 */

export type AITranslationKey =
  // Reasoning UI
  | "ai.reasoning.thinking"
  | "ai.reasoning.viewReasoning"
  | "ai.reasoning.waiting"
  // Error messages
  | "ai.error.network"
  | "ai.error.aborted"
  | "ai.error.rateLimit"
  | "ai.error.unavailable"
  | "ai.error.generic"
  | "ai.error.format"
  | "ai.error.noOutput"
  // UI labels
  | "ai.placeholder"
  | "ai.clear"
  | "ai.clearConversation"
  | "ai.close"
  | "ai.closeChat"
  | "ai.retry"
  | "ai.status.searching"
  | "ai.status.generating"
  | "ai.status.found"
  | "ai.status.citation"
  | "ai.status.fallback"
  // Quick prompts
  | "ai.prompt.techStack"
  | "ai.prompt.recommend"
  | "ai.prompt.build"
  | "ai.prompt.summarize"
  | "ai.prompt.explain"
  | "ai.prompt.related"
  // Welcome messages
  | "ai.welcome.reading"
  | "ai.welcome.canHelp"
  | "ai.welcome.greeting"
  | "ai.welcome.demo"
  | "ai.welcome.demoHint"
  | "ai.welcome.demoPrompt"
  // Header
  | "ai.header.reading"
  | "ai.header.mode"
  // Assistant branding
  | "ai.assistantName"
  | "ai.status.live"
  // Additional error messages
  | "ai.error.emptyMessage"
  | "ai.error.emptyContent"
  | "ai.error.inputTooLong"
  | "ai.error.timeout"
  // Rate limit messages
  | "ai.error.rateLimit.burst"
  | "ai.error.rateLimit.sustained"
  | "ai.error.rateLimit.daily"
  // Prompt section titles
  | "ai.prompt.section.responsibilities"
  | "ai.prompt.section.format"
  | "ai.prompt.section.principles"
  | "ai.prompt.section.constraints"
  | "ai.prompt.section.sourceLayers"
  | "ai.prompt.section.privacy"
  | "ai.prompt.section.answerModes"
  | "ai.prompt.section.preOutputChecks"
  // Semi-static layer labels
  | "ai.semiStatic.blogOverview"
  | "ai.semiStatic.totalPosts"
  | "ai.semiStatic.mainCategories"
  | "ai.semiStatic.latestArticles";

const translations: Record<string, Record<AITranslationKey, string>> = {
  en: {
    // Reasoning UI
    "ai.reasoning.thinking": "Thinking...",
    "ai.reasoning.viewReasoning": "View reasoning",
    "ai.reasoning.waiting": "Waiting for thoughts...",
    // Error messages
    "ai.error.network":
      "Network connection failed. Please check your connection.",
    "ai.error.aborted": "Request was cancelled.",
    "ai.error.rateLimit": "Too many requests. Please try again later.",
    "ai.error.unavailable": "AI service is temporarily unavailable.",
    "ai.error.generic": "Something went wrong. Please try again later.",
    "ai.error.format": "Invalid request format.",
    // UI labels
    "ai.placeholder": "Ask a question...",
    "ai.clear": "Clear",
    "ai.clearConversation": "Clear conversation",
    "ai.close": "Close",
    "ai.closeChat": "Close chat",
    "ai.retry": "Retry",
    "ai.status.searching": "Searching...",
    "ai.status.generating": "Generating response...",
    "ai.status.found": "Found {count} related items",
    "ai.status.citation": "Answered from public records",
    "ai.status.fallback": "AI service unavailable, using demo mode",
    // Quick prompts
    "ai.prompt.techStack": "What tech stack is used?",
    "ai.prompt.recommend": "Recommend some articles?",
    "ai.prompt.build": "How to build a similar blog?",
    "ai.prompt.summarize": 'Summarize the key points of "{title}"',
    "ai.prompt.explain": 'Explain "{point}"',
    "ai.prompt.related": "What related content should I read next?",
    // Welcome messages
    "ai.welcome.reading":
      'I\'m reading "{title}" with you.\nAsk me to summarize, explain a concept, or explore related topics.',
    "ai.welcome.canHelp":
      "Hi! I'm the blog AI assistant. Ask me anything and I'll help you find related articles.",
    "ai.welcome.greeting": "Hi! I'm the blog AI assistant.",
    "ai.welcome.demo":
      "I'm running in demo mode. I can recommend blog articles and external resources.",
    "ai.welcome.demoHint":
      "For full AI features (RAG search), configure AI_BASE_URL and AI_API_KEY.",
    "ai.welcome.demoPrompt":
      'Try: "Recommend articles?" or "How to build this blog?"',
    // Header
    "ai.header.reading": "Reading:",
    "ai.header.mode": "Demo",
    // Assistant branding
    "ai.assistantName": "Blog Avatar",
    "ai.status.live": "Live",
    // Additional error messages
    "ai.error.emptyMessage": "Message cannot be empty.",
    "ai.error.emptyContent": "Message content cannot be empty.",
    "ai.error.inputTooLong": "Message too long, max {max} characters.",
    "ai.error.timeout":
      "Response timeout, please retry or simplify your question.",
    // Rate limit messages
    "ai.error.rateLimit.burst": "Too many requests, please try again later.",
    "ai.error.rateLimit.sustained": "Too many requests, please wait a minute.",
    "ai.error.rateLimit.daily":
      "Daily limit reached, please come back tomorrow.",
    "ai.error.noOutput":
      "Sorry, I could not generate a valid response. Please try rephrasing your question.",
    "ai.prompt.section.responsibilities": "Your Responsibilities",
    "ai.prompt.section.format": "Response Format",
    "ai.prompt.section.principles": "Recommendation Principles",
    "ai.prompt.section.constraints": "Constraints",
    "ai.prompt.section.sourceLayers": "Source Priority Protocol (must follow)",
    "ai.prompt.section.privacy": "Privacy Protection",
    "ai.prompt.section.answerModes": "Answer Mode Guide (follow detected mode)",
    "ai.prompt.section.preOutputChecks":
      "Pre-Output Checks (execute mentally, do not output steps)",
    "ai.semiStatic.blogOverview": "Blog Overview",
    "ai.semiStatic.totalPosts": "{count} posts total",
    "ai.semiStatic.mainCategories": "Main categories: {categories}",
    "ai.semiStatic.latestArticles": "Latest Posts",
  },
  zh: {
    // Reasoning UI
    "ai.reasoning.thinking": "思考中...",
    "ai.reasoning.viewReasoning": "查看思考过程",
    "ai.reasoning.waiting": "等待思考...",
    // Error messages
    "ai.error.network": "网络连接失败，请检查网络",
    "ai.error.aborted": "请求已取消",
    "ai.error.rateLimit": "请求太频繁，请稍后再试",
    "ai.error.unavailable": "AI 服务暂时不可用",
    "ai.error.generic": "出了点问题，请稍后再试",
    "ai.error.format": "请求格式错误",
    // UI labels
    "ai.placeholder": "输入你的问题...",
    "ai.clear": "清除",
    "ai.clearConversation": "清除对话",
    "ai.close": "关闭",
    "ai.closeChat": "关闭聊天",
    "ai.retry": "重试",
    "ai.status.searching": "搜索中...",
    "ai.status.generating": "正在生成回答...",
    "ai.status.found": "找到 {count} 篇相关内容",
    "ai.status.citation": "已基于公开记录直接给出回答",
    "ai.status.fallback": "AI 服务不可用，使用演示模式回复",
    // Quick prompts
    "ai.prompt.techStack": "这个博客用了什么技术？",
    "ai.prompt.recommend": "有哪些文章推荐？",
    "ai.prompt.build": "怎么搭建类似的博客？",
    "ai.prompt.summarize": "总结一下《{title}》的核心观点",
    "ai.prompt.explain": "解释一下「{point}」",
    "ai.prompt.related": "这篇文章和哪些内容相关？",
    // Welcome messages
    "ai.welcome.reading":
      "我在结合《{title}》陪你阅读。\n你可以让我总结这篇文章、解释某个观点，或者顺着这篇文章继续延伸到相关主题。",
    "ai.welcome.canHelp":
      "你好！我是博客 AI 助手，问我任何关于博客内容的问题，我可以帮你找到相关文章。",
    "ai.welcome.greeting": "你好！我是博客 AI 助手。",
    "ai.welcome.demo": "我目前在 Demo 模式下，可以推荐博客文章和外部资源。",
    "ai.welcome.demoHint":
      "启用完整 AI 功能（RAG 搜索增强）需要配置 AI_BASE_URL 和 AI_API_KEY 环境变量。",
    "ai.welcome.demoPrompt":
      "试试：「有哪些文章推荐？」或「怎么搭建类似的博客？」",
    // Header
    "ai.header.reading": "正在阅读：",
    "ai.header.mode": "演示",
    // Assistant branding
    "ai.assistantName": "博客分身",
    "ai.status.live": "在线",
    // Additional error messages
    "ai.error.emptyMessage": "消息不能为空。",
    "ai.error.emptyContent": "消息内容不能为空。",
    "ai.error.inputTooLong": "消息过长，最多 {max} 字。",
    "ai.error.timeout": "响应超时，请重试或简化问题。",
    // Rate limit messages
    "ai.error.rateLimit.burst": "请求太频繁，请稍后再试。",
    "ai.error.rateLimit.sustained": "请求次数过多，请一分钟后再试。",
    "ai.error.rateLimit.daily": "今日对话次数已达上限，请明天再来。",
    "ai.error.noOutput": "抱歉，我无法生成有效的回答。请尝试换一种方式提问。",
    "ai.prompt.section.responsibilities": "你的职责",
    "ai.prompt.section.format": "回答格式",
    "ai.prompt.section.principles": "推荐原则",
    "ai.prompt.section.constraints": "约束",
    "ai.prompt.section.sourceLayers": "来源分层协议（必须遵守）",
    "ai.prompt.section.privacy": "隐私保护",
    "ai.prompt.section.answerModes": "回答模式指导（按检测到的模式执行）",
    "ai.prompt.section.preOutputChecks": "输出前检查（在心里执行，不输出步骤）",
    "ai.semiStatic.blogOverview": "博客概况",
    "ai.semiStatic.totalPosts": "共有 {count} 篇文章",
    "ai.semiStatic.mainCategories": "主要分类：{categories}",
    "ai.semiStatic.latestArticles": "最新文章",
  },
};

/**
 * Get translation by key.
 * @param key - Translation key (type-safe)
 * @param lang - Language code ('zh' or 'en')
 * @param vars - Optional variables for interpolation (e.g., { count: 5 })
 */
export function t(
  key: AITranslationKey,
  lang: string = "zh",
  vars?: Record<string, string | number>
): string {
  const l = getLang(lang);
  let text = translations[l]?.[key] ?? translations["en"][key] ?? key;

  // Interpolate variables like {count}, {title}, etc.
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }

  return text;
}

/**
 * Get normalized language code.
 * Returns 'zh' for Chinese, 'en' for everything else.
 */
export function getLang(lang?: string): "zh" | "en" {
  return lang === "zh" ? "zh" : "en";
}

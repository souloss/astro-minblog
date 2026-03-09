export const SITE = {
  website: "https://demo-astromin.souloss.cn/", // replace this with your deployed domain
  author: "Souloss",
  profile: "https://souloss.cn/",
  desc: "A minimal, responsive and SEO-friendly Astro blog theme.",
  title: "Souloss",
  ogImage: "astro-minblog-og.jpg",
  lightAndDarkMode: true,
  postPerIndex: 4,
  postPerPage: 4,
  scheduledPostMargin: 15 * 60 * 1000, // 15 minutes
  showArchives: true,
  showBackButton: true, // show back button in post detail
  startDate: "2020-01-01", // site start date for calculating running days
  editPost: {
    enabled: true,
    text: "Edit page",
    url: "https://github.com/souloss/astro-minblog/edit/main/",
  },
  dynamicOgImage: true,
  dir: "ltr", // "rtl" | "auto"
  lang: "zh" as string, // html lang code. Default "zh" (Chinese)
  timezone: "Asia/Shanghai", // Default global timezone (IANA format) https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
  umami: {
    enabled: false,
    websiteId: "",
    src: "https://umami.souloss.cn/",
  },
  waline: {
    enabled: true,
    serverURL: "https://walinejs.souloss.cn/", // Enter your Waline server URL here (e.g. https://your-waline-server.vercel.app)
    emoji: [
      "https://unpkg.com/@waline/emojis@1.2.0/weibo",
      "https://unpkg.com/@waline/emojis@1.2.0/bilibili",
      "https://unpkg.com/@waline/emojis@1.2.0/tieba",
    ],
    lang: "zh-CN",
    pageview: true, // Enable page view count
    reaction: true, // Enable reaction
    // Advanced configuration options
    login: "enable", // "enable" | "disable" | "force"
    wordLimit: [0, 1000], // Comment word limit [min, max]
    imageUploader: false, // Disable image upload for security
    requiredMeta: ["nick", "mail"], // Required fields
    copyright: true, // Show copyright notice
    recaptchaV3Key: "", // reCAPTCHA v3 key (optional)
    turnstileKey: "", // Cloudflare Turnstile key (optional)
  },
  ai: {
    enabled: true,
    apiEndpoint: "", // OpenAI-compatible API endpoint (e.g. "https://api.openai.com/v1/chat/completions")
    apiKey: "", // API key — set here or via AI_API_KEY env var at build time
    model: "gpt-4o-mini", // Model name for the chat endpoint
    maxTokens: 1024,
    systemPrompt:
      "你是一个技术博客的 AI 助手，帮助读者了解博客内容、技术主题。回答简洁、准确，使用与用户相同的语言。",
    mockMode: true, // Falls back to mock when apiEndpoint is empty
    vectorSearch: true, // Enable vector-based context retrieval from local index
  },
  sponsor: {
    enabled: true,
    methods: [
      { name: "微信支付", icon: "wechat", image: "/images/wechat-pay.svg" },
      { name: "支付宝", icon: "alipay", image: "/images/alipay.svg" },
    ] as { name: string; icon: string; image: string }[],
    sponsors: [] as {
      name: string;
      platform?: string;
      amount: number;
      date: string;
    }[],
  },
  copyright: {
    license: "CC BY-NC-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
  },
} as const;

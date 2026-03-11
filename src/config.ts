export const SITE = {
  website: "https://demo-astromin.souloss.cn/",
  author: "Souloss",
  profile: "https://souloss.cn/",
  desc: "A minimal, responsive and SEO-friendly Astro blog theme.",
  title: "Souloss",
  ogImage: "astro-minblog-og.jpg",
  postPerIndex: 4,
  postPerPage: 4,
  scheduledPostMargin: 15 * 60 * 1000,
  showBackButton: true,
  startDate: "2020-01-01",
  editPost: {
    enabled: true,
    text: "Edit page",
    url: "https://github.com/souloss/astro-minblog/edit/main/",
  },
  dynamicOgImage: true,
  dir: "ltr" as const,
  lang: "zh" as string,
  timezone: "Asia/Shanghai",

  features: {
    tags: true,
    categories: true,
    series: true,
    archives: true,
    friends: true,
    projects: true,
    search: true,
    darkMode: true,
    ai: true,
    waline: true,
    sponsor: true,
  },

  nav: {
    items: [
      { key: "home", enabled: true },
      { key: "posts", enabled: true },
      { key: "tags", enabled: true },
      { key: "categories", enabled: true },
      { key: "series", enabled: true },
      { key: "projects", enabled: true },
      { key: "about", enabled: true },
      { key: "friends", enabled: true },
      { key: "archives", enabled: true },
    ] as { key: string; enabled: boolean }[],
  },

  projects: [
    { repo: "souloss/astro-minblog", featured: true },
    { repo: "withastro/astro" },
  ] as { repo: string; featured?: boolean; description?: string }[],

  umami: {
    enabled: false,
    websiteId: "",
    src: "https://umami.souloss.cn/",
  },
  waline: {
    enabled: true,
    serverURL: "https://walinejs.souloss.cn/",
    emoji: [
      "https://unpkg.com/@waline/emojis@1.2.0/weibo",
      "https://unpkg.com/@waline/emojis@1.2.0/bilibili",
      "https://unpkg.com/@waline/emojis@1.2.0/tieba",
    ],
    lang: "zh-CN",
    pageview: true,
    reaction: true,
    login: "enable",
    wordLimit: [0, 1000],
    imageUploader: false,
    requiredMeta: ["nick", "mail"],
    copyright: true,
    recaptchaV3Key: "",
    turnstileKey: "",
  },
  ai: {
    enabled: true,
    apiEndpoint: "",
    apiKey: "",
    model: "gpt-4o-mini",
    maxTokens: 1024,
    systemPrompt:
      "你是一个技术博客的 AI 助手，帮助读者了解博客内容、技术主题。回答简洁、准确，使用与用户相同的语言。",
    mockMode: true,
    vectorSearch: true,
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

  // Backward-compatible aliases
  get lightAndDarkMode() {
    return this.features.darkMode;
  },
  get showArchives() {
    return this.features.archives;
  },
} as const;

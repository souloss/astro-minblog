import type { SiteConfig } from "@astro-minimax/core/types";

export const SITE: SiteConfig = {
  website: "https://your-blog.example.com/",
  title: "My Blog",
  author: "Author",
  desc: "A blog powered by astro-minimax.",

  profile: "https://your-profile.com/",
  ogImage: "og-image.jpg",
  startDate: "2024-01-01",

  lang: "zh",
  timezone: "Asia/Shanghai",
  dir: "ltr",

  postPerIndex: 4,
  postPerPage: 4,
  scheduledPostMargin: 15 * 60 * 1000,
  showBackButton: true,
  dynamicOgImage: true,

  features: {
    tags: true,
    categories: true,
    series: true,
    archives: true,
    search: true,
    friends: true,
    projects: true,
  },

  darkMode: true,

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
    ],
  },

  editPost: {
    enabled: false,
    text: "Edit this page",
    url: "https://github.com/your-username/your-repo/edit/main/",
  },

  projects: [
    { repo: "souloss/astro-minimax", featured: true },
    { repo: "withastro/astro" },
  ],

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

  // waline: {
  //   enabled: true,
  //   serverURL: "https://your-waline-instance.example.com/",
  //   emoji: [
  //     "https://unpkg.com/@waline/emojis@1.2.0/weibo",
  //     "https://unpkg.com/@waline/emojis@1.2.0/bilibili",
  //   ],
  //   lang: "zh-CN",
  //   pageview: true,
  //   reaction: true,
  //   login: "enable",
  //   wordLimit: [0, 1000],
  //   imageUploader: false,
  //   requiredMeta: ["nick", "mail"],
  //   copyright: true,
  //   recaptchaV3Key: "",
  //   turnstileKey: "",
  // },

  // sponsor: {
  //   enabled: true,
  //   methods: [
  //     { name: "WeChat Pay", icon: "wechat", image: "/images/wechat-pay.svg" },
  //     { name: "Alipay", icon: "alipay", image: "/images/alipay.svg" },
  //   ],
  //   sponsors: [],
  // },

  // umami: {
  //   enabled: true,
  //   websiteId: "your-website-id",
  //   src: "https://your-umami-instance.com/script.js",
  // },

  // Search provider: 'pagefind' (default, static) or 'docsearch' (Algolia)
  // search: {
  //   provider: 'docsearch',
  //   docsearch: {
  //     appId: 'YOUR_ALGOLIA_APP_ID',
  //     apiKey: 'YOUR_ALGOLIA_SEARCH_API_KEY',
  //     indexName: 'YOUR_INDEX_NAME',
  //     placeholder: 'Search docs...',
  //   },
  // },

  copyright: {
    license: "CC BY-NC-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
  },

  ai: {
    enabled: true,
    mockMode: true,
    apiEndpoint: "/api/chat",
    // welcomeMessage: "Welcome! How can I help you?",
    // placeholder: "Ask me anything...",
  },

  get showArchives() {
    return this.features?.archives ?? true;
  },
};

import type { SiteConfig } from "@astro-minimax/core/types";

const navItems: NonNullable<SiteConfig["nav"]>["items"] = [
  { key: "home", enabled: true },
  { key: "posts", enabled: true },
  { key: "tags", enabled: true },
  { key: "categories", enabled: true },
  { key: "series", enabled: true },
  { key: "projects", enabled: true },
  { key: "reposts", enabled: true },
  { key: "about", enabled: true },
  { key: "friends", enabled: true },
  { key: "archives", enabled: true },
];

const projects: NonNullable<SiteConfig["projects"]> = [
  { repo: "souloss/astro-minimax", featured: true },
  { repo: "withastro/astro" },
];

const sponsorMethods: NonNullable<
  NonNullable<SiteConfig["sponsor"]>["methods"]
> = [
  { name: "微信支付", icon: "wechat", image: "/images/wechat-pay.svg" },
  { name: "支付宝", icon: "alipay", image: "/images/alipay.svg" },
];

const sponsors: NonNullable<NonNullable<SiteConfig["sponsor"]>["sponsors"]> =
  [];

const reposts: NonNullable<SiteConfig["reposts"]> = [
  {
    slug: "how-llms-work",
    title: "How LLMs Actually Work",
    titleZh: "LLM 是如何工作的",
    description:
      "A visual, interactive guide to how large language models are built — from raw internet text to a conversational assistant. Based on Andrej Karpathy's technical deep dive.",
    author: "ynarwal",
    sourceUrl: "https://ynarwal.github.io/how-llms-work/",
    sourceRepo: "ynarwal/how-llms-work",
    basedOn: "Andrej Karpathy's Intro to Large Language Models",
    date: "2026-04",
    tags: ["AI", "LLM", "Deep Learning"],
    parts: [
      {
        slug: "part-1",
        title: "How LLMs Actually Work",
        titleZh: "LLM 是如何工作的",
        description:
          "A complete walkthrough from raw internet text to a conversational assistant — data collection, tokenization, training, inference, base model, post-training, psychology, RAG, and security.",
      },
      {
        slug: "part-2",
        title: "How to Use LLMs",
        titleZh: "如何使用 LLM",
        description:
          "A practical guide to using large language models — models, thinking, search, deep research, docs, code, agents, voice, vision, and memory.",
      },
      {
        slug: "part-3",
        title: "Neural Networks from Scratch",
        titleZh: "从零开始的神经网络",
        description:
          "The math, intuition, and code behind how neural networks actually learn — from a single neuron to a working training loop.",
      },
    ],
    license: "All Rights Reserved",
    licenseNote: "翻译转载，版权归原作者所有",
  },
];

export const SITE: SiteConfig = {
  website: "https://demo-astro-minimax.souloss.cn/",
  author: "Souloss",
  profile: "https://souloss.cn/",
  desc: "A minimal, responsive and SEO-friendly Astro blog theme.",
  title: "Souloss",
  ogImage: "astro-minimax-og.jpg",
  postPerIndex: 4,
  postPerPage: 4,
  scheduledPostMargin: 15 * 60 * 1000,
  showBackButton: true,
  startDate: "2020-01-01",
  editPost: {
    enabled: true,
    text: "Edit page",
    url: "https://github.com/souloss/astro-minimax/edit/main/",
  },
  dynamicOgImage: true,
  dir: "ltr" as const,
  lang: "zh",
  timezone: "Asia/Shanghai",

  features: {
    tags: true,
    categories: true,
    series: true,
    archives: true,
    friends: true,
    projects: true,
    reposts: true,
    search: true,
  },

  darkMode: true,

  nav: {
    items: navItems,
  },

  projects,

  reposts,

  umami: {
    enabled: true,
    websiteId: "1419a8ae-a14b-4bb7-8c39-ee5fe00a8a88",
    src: "https://umami.souloss.cn/script.js",
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
    mockMode: false,
    apiEndpoint: "/api/chat",
    cache: {
      enabled: false,
      ttl: 3600,
    },
    timeouts: {
      request: 45000,
      keywordExtraction: 5000,
      evidenceAnalysis: 8000,
      llmStreaming: 30000,
    },
    health: {
      unhealthyThreshold: 3,
      recoveryTtl: 60000,
    },
  },
  sponsor: {
    enabled: true,
    methods: sponsorMethods,
    sponsors,
  },
  copyright: {
    license: "CC BY-NC-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
  },

  get showArchives() {
    return this.features?.archives;
  },
};

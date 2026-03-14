import type { SiteConfig } from "@astro-minimax/core/types";

export const SITE: SiteConfig = {
  // ── 必填 ────────────────────────────────────────────────
  website: "https://your-blog.example.com/", // 你的网站地址
  title: "My Blog",                          // 博客名称
  author: "Author",                          // 你的名字
  desc: "A blog powered by astro-minimax.",  // 博客描述

  // ── 语言与地区 ──────────────────────────────────────────
  lang: "zh",
  timezone: "Asia/Shanghai",
  dir: "ltr",

  // ── 分页 ────────────────────────────────────────────────
  postPerIndex: 4,
  postPerPage: 8,

  // ── 功能开关 ────────────────────────────────────────────
  features: {
    tags: true,
    categories: true,
    series: true,
    archives: true,
    search: true,
    darkMode: true,
    // friends: false,
    // projects: false,
    // ai: false,
    // waline: false,
    // sponsor: false,
  },

  nav: {
    items: [
      { key: "home", enabled: true },
      { key: "posts", enabled: true },
      { key: "tags", enabled: true },
      { key: "categories", enabled: true },
      { key: "archives", enabled: true },
      { key: "about", enabled: true },
    ],
  },
};

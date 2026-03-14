---
author: Souloss
pubDatetime: 2022-09-23T04:58:53Z
modDatetime: 2026-03-14T00:00:00.000Z
title: How to configure astro-minimax theme
slug: how-to-configure-astro-minimax-theme
featured: true
draft: false
category: Blog/Configuration
tags:
  - configuration
  - docs
description: How you can make astro-minimax theme absolutely yours.
---

astro-minimax is a highly customizable Astro blog theme. With astro-minimax, you can customize everything according to your personal taste. This article will explain how you can make some customizations easily in the config file.

> **Path note:** If you're using the GitHub Template method, the config file is at `apps/blog/src/config.ts`. For NPM package integration, it's at `src/config.ts` in your project root.

## Table of contents

## Configuring SITE

The main configuration resides in the `SITE` object in `src/config.ts`. Here's the full configuration example:

```js file=src/config.ts
export const SITE = {
  website: "https://your-domain.com/",
  author: "Your Name",
  profile: "https://your-portfolio.com/",
  desc: "A minimal, responsive and SEO-friendly Astro blog theme.",
  title: "My Blog",
  ogImage: "astro-minimax-og.jpg",
  postPerIndex: 4,
  postPerPage: 4,
  scheduledPostMargin: 15 * 60 * 1000,
  showBackButton: true,
  startDate: "2020-01-01",
  editPost: {
    enabled: true,
    text: "Edit page",
    url: "https://github.com/your-user/your-repo/edit/main/",
  },
  dynamicOgImage: true,
  dir: "ltr",
  lang: "en",
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
    ai: false,
    waline: false,
    sponsor: false,
  },
};
```

### Basic Configuration

| Option | Description |
|--------|-------------|
| `website` | Your deployed website URL. Critical for SEO, canonical URLs, and social cards |
| `author` | Your name |
| `profile` | Your personal/portfolio website URL for better SEO. Set to `""` if you don't have one |
| `desc` | Site description for SEO and social media sharing |
| `title` | Your site name |
| `ogImage` | Default OG image (place in `public/` directory or use an external URL) |
| `postPerIndex` | Number of posts shown in the "Recent Posts" section on the home page |
| `postPerPage` | Number of posts displayed per page in paginated lists |
| `scheduledPostMargin` | Grace period for scheduled posts (in milliseconds), default 15 minutes |
| `showBackButton` | Whether to show a back button in post detail pages |
| `startDate` | Blog start date, used for the archives timeline |
| `dynamicOgImage` | Whether to auto-generate dynamic OG images for posts without an `ogImage` |
| `dir` | Text direction: `ltr` (left-to-right) / `rtl` (right-to-left) / `auto` |
| `lang` | Default language code (`en`, `zh`, etc.) |
| `timezone` | Timezone in IANA format, ensures consistent timestamps across environments |

### Edit Link Configuration

```js
editPost: {
  enabled: true,
  text: "Edit page",
  url: "https://github.com/your-user/your-repo/edit/main/",
},
```

| Option | Description |
|--------|-------------|
| `enabled` | Whether to show an edit link below the post title |
| `text` | Display text for the edit link |
| `url` | Base URL for the edit link (file path will be appended) |

## Configuring Feature Toggles

The `features` object controls which feature modules are enabled or disabled:

```js
features: {
  tags: true,        // Tag system
  categories: true,  // Category system
  series: true,      // Series posts
  archives: true,    // Archives page
  friends: true,     // Friends page
  projects: true,    // Projects showcase page
  search: true,      // Full-text search (Pagefind)
  darkMode: true,    // Light/dark theme toggle
  ai: true,          // AI chat assistant
  waline: true,      // Waline comment system
  sponsor: true,     // Sponsorship/donation feature
},
```

Disabling a feature will automatically hide the corresponding menu item and page.

## Configuring Navigation Menu

The `nav` object controls which menu items appear in the navigation bar:

```js
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
```

Set `enabled: false` to hide specific menu items. Menu visibility is also affected by `features` toggles — if a feature is disabled, its menu item is automatically hidden too.

## Configuring Projects

List your GitHub projects in `SITE.projects`:

```js
projects: [
  { repo: "souloss/astro-minimax", featured: true },
  { repo: "withastro/astro" },
  { repo: "your-user/your-project", description: "Custom description" },
],
```

| Option | Description |
|--------|-------------|
| `repo` | GitHub repository name in `owner/name` format |
| `featured` | Whether to highlight as a featured project |
| `description` | Custom description (auto-fetches from GitHub if omitted) |

## Update layout width

The default `max-width` for the entire blog is `768px` (`max-w-3xl`). If you'd like to change it, update the `max-w-app` utility in `global.css`:

```css file=src/styles/global.css
@utility max-w-app {
  /* [!code --:1] */
  @apply max-w-3xl;
  /* [!code ++:1] */
  @apply max-w-4xl xl:max-w-5xl;
}
```

You can explore more `max-width` values in the [Tailwind CSS docs](https://tailwindcss.com/docs/max-width).

## Configuring logo or title

### Option 1: SITE title text

The easiest option. Just update `SITE.title`.

### Option 2: Astro's SVG component

For SVG logos:

- Add an SVG file in `src/assets` directory
- Import and replace the title text in `Header.astro`

```astro
---
import DummyLogo from "@/assets/dummy-logo.svg";
---

<a href="/" class="...">
  <DummyLogo class="scale-75 dark:invert" />
</a>
```

### Option 3: Astro's Image component

For bitmap logos (non-SVG):

```astro
---
import { Image } from "astro:assets";
import dummyLogo from "@/assets/dummy-logo.png";
---

<a href="/" class="...">
  <Image src={dummyLogo} alt="My Blog" class="dark:invert" />
</a>
```

## Configuring social links

![An arrow pointing at social link icons](https://github.com/user-attachments/assets/8b895400-d088-442f-881b-02d2443e00cf)

Configure social links in `SOCIALS` inside `src/constants.ts`:

```ts file=src/constants.ts
import IconGitHub from "@/assets/icons/IconGitHub.svg";
import IconBrandX from "@/assets/icons/IconBrandX.svg";
import IconMail from "@/assets/icons/IconMail.svg";

export const SOCIALS = [
  {
    name: "GitHub",
    href: "https://github.com/your-username",
    linkTitle: "My Blog on GitHub",
    icon: IconGitHub,
  },
  {
    name: "X",
    href: "https://x.com/your-username",
    linkTitle: "My Blog on X",
    icon: IconBrandX,
  },
  {
    name: "Mail",
    href: "mailto:your@email.com",
    linkTitle: "Send me an email",
    icon: IconMail,
  },
];
```

Available built-in icons: `IconGitHub`, `IconBrandX`, `IconLinkedin`, `IconFacebook`, `IconTelegram`, `IconMail`, `IconWhatsapp`, `IconPinterest`, `IconRss`.

## Configuring share links

Configure post share buttons in `SHARE_LINKS` inside `src/constants.ts`:

![An arrow pointing at share link icons](https://github.com/user-attachments/assets/4f930b68-b625-45df-8c41-e076dd2b838e)

```ts
export const SHARE_LINKS = [
  {
    name: "X",
    href: "https://x.com/intent/post?url=",
    linkTitle: "Share on X",
    icon: IconBrandX,
  },
  // ...
];
```

## Configuring Waline Comments

astro-minimax comes with a built-in [Waline](https://waline.js.org/) comment system. Configure it in `SITE.waline`:

```js file=src/config.ts
waline: {
  enabled: true,
  serverURL: "https://your-waline-server.vercel.app/",
  emoji: [
    "https://unpkg.com/@waline/emojis@1.2.0/weibo",
    "https://unpkg.com/@waline/emojis@1.2.0/bilibili",
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
```

| Option | Description |
|--------|-------------|
| `enabled` | Enable or disable the comment system |
| `serverURL` | Waline server URL (requires self-hosting) |
| `emoji` | Emoji pack configuration |
| `lang` | Comment widget language |
| `pageview` | Show page view counter |
| `reaction` | Enable emoji reactions |
| `login` | Login mode: `enable` / `disable` / `force` |
| `wordLimit` | Comment word limit `[min, max]` |
| `imageUploader` | Allow image uploads |
| `requiredMeta` | Required fields |
| `copyright` | Show Waline copyright |
| `recaptchaV3Key` | Google reCAPTCHA v3 key (optional) |
| `turnstileKey` | Cloudflare Turnstile key (optional) |

> You need to deploy a Waline server first. See the [Waline documentation](https://waline.js.org/en/guide/get-started/).

## Configuring AI Chat

astro-minimax includes a built-in AI chat assistant powered by `@astro-minimax/ai`. Configure it in `SITE.ai`:

```js file=src/config.ts
ai: {
  enabled: true,
  mockMode: true,
  apiEndpoint: "/api/chat",
  model: "@cf/zai-org/glm-4.7-flash",
  welcomeMessage: undefined,
  placeholder: undefined,
},
```

| Option | Description |
|--------|-------------|
| `enabled` | Enable AI chat (also requires `features.ai` to be `true`) |
| `mockMode` | Returns preset responses without calling a real API, useful for development |
| `apiEndpoint` | API endpoint URL. Use `/api/chat` for Cloudflare Pages Functions |
| `model` | Model ID. Defaults to Cloudflare Workers AI GLM-4.7 Flash |
| `welcomeMessage` | Custom welcome message |
| `placeholder` | Custom input placeholder text |

> The AI chat feature uses Cloudflare Pages Functions as the backend. Deployment on Cloudflare with AI Binding configuration is required. See the `apps/blog/functions/` directory and `wrangler.toml` for details.

## Configuring Sponsorship

Configure donation/tip features in `SITE.sponsor`:

```js file=src/config.ts
sponsor: {
  enabled: true,
  methods: [
    { name: "WeChat Pay", icon: "wechat", image: "/images/wechat-pay.svg" },
    { name: "Alipay", icon: "alipay", image: "/images/alipay.svg" },
  ],
  sponsors: [
    { name: "John", amount: 50, date: "2026-01-15" },
  ],
},
```

| Option | Description |
|--------|-------------|
| `enabled` | Enable sponsorship (also requires `features.sponsor` to be `true`) |
| `methods` | Payment methods: `name`, `icon` (identifier), `image` (QR code image path) |
| `sponsors` | Sponsors list: `name`, `amount`, `date`, `platform` (optional) |

Place payment QR code images in the `public/images/` directory.

## Configuring Copyright

Configure the copyright license in `SITE.copyright`:

```js file=src/config.ts
copyright: {
  license: "CC BY-NC-SA 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
},
```

## Configuring Umami Analytics

Configure [Umami](https://umami.is/) privacy-friendly analytics in `SITE.umami`:

```js file=src/config.ts
umami: {
  enabled: false,
  websiteId: "your-website-id",
  src: "https://your-umami-instance.com/script.js",
},
```

| Option | Description |
|--------|-------------|
| `enabled` | Enable Umami analytics |
| `websiteId` | Website ID in your Umami instance |
| `src` | Umami tracking script URL |

> You need to deploy a Umami instance first. See the [Umami documentation](https://umami.is/docs).

## Configuring fonts

astro-minimax uses Astro's [experimental fonts API](https://docs.astro.build/en/reference/experimental-flags/fonts/) with [Google Sans Code](https://fonts.google.com/specimen/Google+Sans+Code) as the default font.

### Customizing the font

To use a different font, update three places:

1. **Font configuration in `astro.config.ts`:**

```ts file=astro.config.ts
import { defineConfig, fontProviders } from "astro/config";

export default defineConfig({
  experimental: {
    fonts: [
      {
        name: "Your Font Name",
        cssVariable: "--font-your-font",
        provider: fontProviders.google(),
        fallbacks: ["monospace"],
        weights: [300, 400, 500, 600, 700],
        styles: ["normal", "italic"],
      },
    ],
  },
});
```

2. **Font component in `Layout.astro`:**

```astro file=src/layouts/Layout.astro
---
import { Font } from "astro:assets";
---

<head>
  <Font
    cssVariable="--font-your-font"
    preload={[{ subset: "latin", weight: 400, style: "normal" }]}
  />
</head>
```

3. **CSS variable in `global.css`:**

```css file=src/styles/global.css
@theme inline {
  --font-app: var(--font-your-font);
}
```

The `--font-app` variable is used throughout the theme via the `font-app` Tailwind utility class.

## Conclusion

This is the full specification of how to customize this theme. For customizing styles, please read [Customizing Color Schemes](/en/posts/customizing-astro-minimax-theme-color-schemes/). For a complete feature overview, see the [Feature Overview](/en/posts/feature-overview/).

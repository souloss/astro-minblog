import type { SocialLink } from "@astro-minimax/core/types";
import { SITE } from "./config";

export const SOCIALS: SocialLink[] = [
  {
    name: "GitHub",
    href: "https://github.com/souloss/astro-minimax",
    linkTitle: `${SITE.title} on GitHub`,
    icon: "github",
  },
  {
    name: "X",
    href: "https://x.com/username",
    linkTitle: `${SITE.title} on X`,
    icon: "x",
  },
  {
    name: "LinkedIn",
    href: "https://www.linkedin.com/in/username/",
    linkTitle: `${SITE.title} on LinkedIn`,
    icon: "linkedin",
  },
  {
    name: "Mail",
    href: "mailto:yourmail@gmail.com",
    linkTitle: `Send an email to ${SITE.title}`,
    icon: "mail",
  },
];

export const SHARE_LINKS: SocialLink[] = [
  {
    name: "X",
    href: "https://x.com/intent/post?url=",
    linkTitle: "Share this post on X",
    icon: "x",
  },
  {
    name: "Facebook",
    href: "https://www.facebook.com/sharer.php?u=",
    linkTitle: "Share this post on Facebook",
    icon: "facebook",
  },
  {
    name: "Telegram",
    href: "https://t.me/share/url?url=",
    linkTitle: "Share this post via Telegram",
    icon: "telegram",
  },
  {
    name: "LinkedIn",
    href: "https://www.linkedin.com/sharing/share-offsite/?url=",
    linkTitle: "Share this post on LinkedIn",
    icon: "linkedin",
  },
  {
    name: "Mail",
    href: "mailto:?subject=See%20this%20post&body=",
    linkTitle: "Share this post via email",
    icon: "mail",
  },
];

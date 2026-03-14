import type { SocialLink } from "@astro-minimax/core/types";

export const SOCIALS: SocialLink[] = [
  {
    name: "GitHub",
    href: "https://github.com/your-username",
    linkTitle: "GitHub",
    icon: "github",
  },
];

export const SHARE_LINKS: SocialLink[] = [
  {
    name: "X",
    href: "https://x.com/intent/post?url=",
    linkTitle: "Share on X",
    icon: "x",
  },
  {
    name: "Mail",
    href: "mailto:?subject=See%20this%20post&body=",
    linkTitle: "Share via email",
    icon: "mail",
  },
];

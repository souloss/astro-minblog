/**
 * Type declarations for astro-minimax virtual modules and Astro env.
 * Used when IDE type-checks core/ai packages in isolation (e.g. in monorepo).
 * The integration also injects virtual modules via injectTypes in the consuming app.
 */
declare module "astro:env/client" {
  export const PUBLIC_GOOGLE_SITE_VERIFICATION: string | undefined;
}

declare module "virtual:astro-minimax/config" {
  import type { SiteConfig } from "@astro-minimax/core/types";
  export const SITE: SiteConfig;
  export const BLOG_PATH: string;
}
declare module "virtual:astro-minimax/constants" {
  import type { SocialLink } from "@astro-minimax/core/types";
  export const SOCIALS: SocialLink[];
  export const SHARE_LINKS: SocialLink[];
}
declare module "virtual:astro-minimax/user-data" {
  import type { FriendLink } from "@astro-minimax/core/types";
  export const FRIENDS: FriendLink[];
}
declare module "virtual:astro-minimax/styles" {}
declare module "virtual:astro-minimax/ai-widget" {
  const AIChatWidget: import("astro").AstroComponentFactory;
  export default AIChatWidget;
}

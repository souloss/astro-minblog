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
declare module "virtual:astro-minimax/preferences-defaults" {
  import type { DeepPartial, Preferences } from "@astro-minimax/core/preferences/types";
  export const userDefaults: DeepPartial<Preferences>;
}
declare module "virtual:astro-minimax/preferences-client-init" {
  const init: null;
  export default init;
}

declare module "astro:content" {
  export type CollectionEntry<TCollection extends string> = {
    id: string;
    filePath?: string;
    data: Record<string, any>;
    body: string;
    slug?: string;
    collection?: TCollection;
  };

  export function getCollection<TCollection extends string>(
    collection: TCollection,
    filter?: (entry: CollectionEntry<TCollection>) => boolean | Promise<boolean>
  ): Promise<CollectionEntry<TCollection>[]>;
}

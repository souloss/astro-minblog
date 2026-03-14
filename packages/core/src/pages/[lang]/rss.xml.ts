import type { GetStaticPaths } from "astro";
import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { getLocalizedPostPath } from "../../utils/getPath";
import { getPostsByLang } from "../../utils/getPostsByLang";
import getSortedPosts from "../../utils/getSortedPosts";
import { SITE } from "virtual:astro-minimax/config";

export const getStaticPaths = (() => [
  { params: { lang: "zh" } },
  { params: { lang: "en" } },
]) satisfies GetStaticPaths;

export async function GET({ params }: { params: { lang: string } }) {
  const lang = params.lang as "zh" | "en";
  const posts = await getCollection("blog");
  const langPosts = getPostsByLang(posts, lang);
  const sortedPosts = getSortedPosts(langPosts);

  const titleSuffix = lang === "zh" ? " - 中文" : " - English";

  return rss({
    title: SITE.title + titleSuffix,
    description: SITE.desc,
    site: SITE.website,
    items: sortedPosts.map(post => ({
      link: getLocalizedPostPath(lang, post.id),
      title: post.data.title,
      description: post.data.description,
      pubDate: new Date(post.data.modDatetime ?? post.data.pubDatetime),
    })),
  });
}

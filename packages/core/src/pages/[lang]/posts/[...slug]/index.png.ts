import type { APIRoute } from "astro";
import { getCollection, type CollectionEntry } from "astro:content";
import { getPostSlug } from "../../../../utils/getPath";
import { getPostLang } from "../../../../utils/getPostsByLang";
import { generateOgImageForPost } from "../../../../utils/generateOgImages";
import { SITE } from "virtual:astro-minimax/config";

// Prerender to avoid native module issues in Cloudflare Workers
export const prerender = true;

export async function getStaticPaths() {
  if (!SITE.dynamicOgImage) {
    return [];
  }

  const posts = await getCollection("blog").then(p =>
    p.filter(({ data }) => !data.draft && !data.ogImage)
  );

  return posts.map(post => ({
    params: { lang: getPostLang(post), slug: getPostSlug(post.id) },
    props: post,
  }));
}

export const GET: APIRoute = async ({ props }) => {
  if (!SITE.dynamicOgImage) {
    return new Response(null, {
      status: 404,
      statusText: "Not found",
    });
  }

  const buffer = await generateOgImageForPost(props as CollectionEntry<"blog">);
  return new Response(new Uint8Array(buffer), {
    headers: { "Content-Type": "image/png" },
  });
};

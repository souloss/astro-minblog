import type { APIRoute } from "astro";
import { getCollection, type CollectionEntry } from "astro:content";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getPostSlug } from "../../../../utils/getPath";
import { getPostLang } from "../../../../utils/getPostsByLang";
import { generateOgImageForPost } from "../../../../utils/generateOgImages";
import { SITE } from "virtual:astro-minimax/config";

interface AiSeoArticleData {
  metaDescription: string;
  keywords: string[];
  ogDescription: string;
}

interface AiSeoData {
  articles: Record<string, { data: AiSeoArticleData }>;
}

// Load ai-seo.json at build time
function loadAiSeoData(): AiSeoData | null {
  try {
    const projectRoot = resolve(process.cwd());
    const seoPath = resolve(projectRoot, "datas", "ai-seo.json");
    if (existsSync(seoPath)) {
      return JSON.parse(readFileSync(seoPath, "utf-8"));
    }
  } catch {
    // Ignore errors
  }
  return null;
}

// Prerender to avoid native module issues in Cloudflare Workers
export const prerender = true;

export async function getStaticPaths() {
  if (!SITE.dynamicOgImage) {
    return [];
  }

  const posts = await getCollection("blog").then((p: CollectionEntry<"blog">[]) =>
    p.filter(({ data }: CollectionEntry<"blog">) => !data.draft && !data.ogImage)
  );

  return posts.map((post: CollectionEntry<"blog">) => ({
    params: { lang: getPostLang(post), slug: getPostSlug(post.id) },
    props: post,
  }));
}

export const GET: APIRoute = async ({ props, params }) => {
  if (!SITE.dynamicOgImage) {
    return new Response(null, {
      status: 404,
      statusText: "Not found",
    });
  }

  const post = props as CollectionEntry<"blog">;
  const lang = params.lang as string;
  const slug = getPostSlug(post.id);

  // Load ai-seo data for ogDescription
  const aiSeo = loadAiSeoData();
  const aiSeoKey = `${lang}/${slug}`;
  const ogDescription = aiSeo?.articles?.[aiSeoKey]?.data?.ogDescription;

  const buffer = await generateOgImageForPost(post, ogDescription);
  return new Response(new Uint8Array(buffer), {
    headers: { "Content-Type": "image/png" },
  });
};

import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";
import { SITE } from "@/config";

export const BLOG_PATH = "src/data/blog";

const blog = defineCollection({
  loader: glob({
    pattern: "**/[^_]*.{md,mdx}",
    base: `./${BLOG_PATH}`,
    generateId: ({ entry }) => {
      // 自动从文件路径生成唯一 ID：目录/文件名（无扩展名）
      // 例如: zh/dynamic-og-images.md -> zh/dynamic-og-images
      return entry.replace(/\.(md|mdx)$/, "");
    },
  }),
  schema: ({ image }) =>
    z.object({
      author: z.string().default(SITE.author),
      pubDatetime: z.date(),
      modDatetime: z.date().optional().nullable(),
      title: z.string(),
      featured: z.boolean().optional(),
  pin: z.boolean().optional(),
      draft: z.boolean().optional(),
      tags: z.array(z.string()).default(["others"]),
      category: z.string().optional(),
      series: z
        .object({
          name: z.string(),
          order: z.number(),
        })
        .optional(),
      /** 封面图片：用于卡片和文章页展示，支持本地图片或网络 URL */
      cover: image().or(z.string()).optional(),
      /** OG 图片：用于社交媒体分享，如未设置则自动生成 */
      ogImage: image().or(z.string()).optional(),
      description: z.string(),
      canonicalURL: z.string().optional(),
      hideEditPost: z.boolean().optional(),
      timezone: z.string().optional(),
    }),
});

export const collections = { blog };

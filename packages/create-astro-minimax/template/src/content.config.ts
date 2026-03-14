import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const blog = defineCollection({
  loader: glob({
    pattern: "**/[^_]*.{md,mdx}",
    base: "./src/data/blog",
    generateId: ({ entry }) => entry.replace(/\.(md|mdx)$/, ""),
  }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDatetime: z.date(),
    modDatetime: z.date().optional().nullable(),
    author: z.string().optional(),
    tags: z.array(z.string()).default(["others"]),
    category: z.string().optional(),
    series: z.object({ name: z.string(), order: z.number() }).optional(),
    featured: z.boolean().optional(),
    draft: z.boolean().optional(),
    ogImage: z.string().optional(),
    canonicalURL: z.string().optional(),
  }),
});

export const collections = { blog };

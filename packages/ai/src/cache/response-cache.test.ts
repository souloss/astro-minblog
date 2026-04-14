import { describe, expect, it } from "vitest";
import {
  buildResponseCacheKey,
  getResponseCache,
  setResponseCache,
} from "./response-cache.js";
import { MemoryCacheAdapter } from "./memory-adapter.js";

describe("buildResponseCacheKey", () => {
  it("isolates response cache keys by articleSlug and lang", () => {
    expect(
      buildResponseCacheKey("summary", {
        articleSlug: "post-a",
        lang: "zh",
        queryKey: "q1",
      })
    ).toBe("response:summary:post-a:zh:q1");
    expect(
      buildResponseCacheKey("summary", {
        articleSlug: "post-b",
        lang: "zh",
        queryKey: "q1",
      })
    ).toBe("response:summary:post-b:zh:q1");
    expect(
      buildResponseCacheKey("summary", {
        articleSlug: "post-a",
        lang: "en",
        queryKey: "q1",
      })
    ).toBe("response:summary:post-a:en:q1");
  });

  it("isolates response cache keys by query within the same type", () => {
    expect(
      buildResponseCacheKey("recommend", { lang: "zh", queryKey: "astro" })
    ).not.toBe(
      buildResponseCacheKey("recommend", { lang: "zh", queryKey: "vue" })
    );
  });
});

describe("response cache round-trip isolation", () => {
  it("does not cross-hit different queryKey values within the same type", async () => {
    const cache = new MemoryCacheAdapter();

    await setResponseCache(
      cache,
      "recommend",
      {
        query: "astro",
        response: "astro-response",
        articles: [],
        projects: [],
        sources: [{ title: "A", url: "/a", reason: "chunk" }],
        lang: "zh",
        updatedAt: Date.now(),
      },
      60,
      { lang: "zh", queryKey: "astro" }
    );

    const astro = await getResponseCache(cache, "recommend", {
      lang: "zh",
      queryKey: "astro",
    });
    const vue = await getResponseCache(cache, "recommend", {
      lang: "zh",
      queryKey: "vue",
    });

    expect(astro?.query).toBe("astro");
    expect(vue).toBeNull();
  });

  it("does not cross-hit different articleSlug contexts", async () => {
    const cache = new MemoryCacheAdapter();

    await setResponseCache(
      cache,
      "summary",
      {
        query: "post-a",
        response: "summary-a",
        articles: [],
        projects: [],
        sources: [{ title: "A", url: "/a", reason: "article-context" }],
        lang: "zh",
        updatedAt: Date.now(),
      },
      60,
      { articleSlug: "post-a", lang: "zh", queryKey: "summary" }
    );

    const postA = await getResponseCache(cache, "summary", {
      articleSlug: "post-a",
      lang: "zh",
      queryKey: "summary",
    });
    const postB = await getResponseCache(cache, "summary", {
      articleSlug: "post-b",
      lang: "zh",
      queryKey: "summary",
    });

    expect(postA?.query).toBe("post-a");
    expect(postB).toBeNull();
  });
});

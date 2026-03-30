import { describe, expect, it } from 'vitest';
import { buildGlobalCacheKey, detectPublicQuestion, getGlobalSearchCache, normalizePublicCacheQuery, setGlobalSearchCache } from './global-cache.js';
import { MemoryCacheAdapter } from './memory-adapter.js';

describe('buildGlobalCacheKey', () => {
  it('isolates cache keys by articleSlug and lang', () => {
    expect(buildGlobalCacheKey('summary', { articleSlug: 'post-a', lang: 'zh', queryKey: 'q1' }))
      .toBe('global:summary:post-a:zh:q1');
    expect(buildGlobalCacheKey('summary', { articleSlug: 'post-b', lang: 'zh', queryKey: 'q1' }))
      .toBe('global:summary:post-b:zh:q1');
    expect(buildGlobalCacheKey('summary', { articleSlug: 'post-a', lang: 'en', queryKey: 'q1' }))
      .toBe('global:summary:post-a:en:q1');
  });

  it('isolates cache keys by normalized query within the same type', () => {
    const q1 = normalizePublicCacheQuery('推荐一些 Astro 文章');
    const q2 = normalizePublicCacheQuery('推荐一些 Vue 文章');

    expect(buildGlobalCacheKey('recommend', { lang: 'zh', queryKey: q1 }))
      .not.toBe(buildGlobalCacheKey('recommend', { lang: 'zh', queryKey: q2 }));
  });
});

describe('detectPublicQuestion', () => {
  it('marks summary questions as needing article context', () => {
    const result = detectPublicQuestion('总结一下这篇文章');

    expect(result?.type).toBe('summary');
    expect(result?.needsContext).toBe(true);
  });
});

describe('global cache round-trip isolation', () => {
  it('does not cross-hit different queryKey values within the same type', async () => {
    const cache = new MemoryCacheAdapter();

    await setGlobalSearchCache(
      cache,
      'recommend',
      { query: 'astro', articles: [], projects: [], updatedAt: Date.now() },
      60,
      { lang: 'zh', queryKey: 'astro' }
    );

    const astro = await getGlobalSearchCache(cache, 'recommend', { lang: 'zh', queryKey: 'astro' });
    const vue = await getGlobalSearchCache(cache, 'recommend', { lang: 'zh', queryKey: 'vue' });

    expect(astro?.query).toBe('astro');
    expect(vue).toBeNull();
  });

  it('does not cross-hit different articleSlug contexts', async () => {
    const cache = new MemoryCacheAdapter();

    await setGlobalSearchCache(
      cache,
      'summary',
      { query: 'post-a', articles: [], projects: [], updatedAt: Date.now() },
      60,
      { articleSlug: 'post-a', lang: 'zh', queryKey: 'summary' }
    );

    const postA = await getGlobalSearchCache(cache, 'summary', {
      articleSlug: 'post-a',
      lang: 'zh',
      queryKey: 'summary',
    });
    const postB = await getGlobalSearchCache(cache, 'summary', {
      articleSlug: 'post-b',
      lang: 'zh',
      queryKey: 'summary',
    });

    expect(postA?.query).toBe('post-a');
    expect(postB).toBeNull();
  });
});

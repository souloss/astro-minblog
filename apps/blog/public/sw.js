// Service Worker
const CACHE_VERSION = "v2"; // 部署时递增此版本号以强制刷新所有缓存
const CACHE_NAME = `astro-minblog-${CACHE_VERSION}`;
const OFFLINE_URL = "/404";

const PRECACHE_URLS = ["/", "/zh/", "/favicon.ico"];

// ─── Install ────────────────────────────────────────────────────────────────

self.addEventListener("install", event => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      // 修复：确保预缓存完成后再 skipWaiting，避免新 SW 接管时资源还没就绪
      .then(() => self.skipWaiting())
  );
});

// ─── Activate ───────────────────────────────────────────────────────────────

self.addEventListener("activate", event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(
          keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ─── Fetch ──────────────────────────────────────────────────────────────────

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // 只处理同源请求，跨域资源（CDN、第三方）不干预
  if (url.origin !== self.location.origin) return;

  // 1. 静态资源：缓存优先，缓存未命中时回源并存储
  if (STATIC_ASSET_RE.test(url.pathname)) {
    event.respondWith(handleStaticAsset(event.request));
    return;
  }

  // 2. HTML 页面导航：使用 request.mode === "navigate" 而非 accept header
  //    这样可以同时覆盖：直接访问、Astro ClientRouter prefetch、浏览器前进/后退
  if (event.request.mode === "navigate") {
    event.respondWith(handleNavigation(event.request));
    return;
  }

  // 3. Astro prefetch 发出的非 navigate 模式页面请求（accept 包含 text/html）
  //    作为兜底，防止穿透 SW 直接拿到 503
  const accept = event.request.headers.get("accept") ?? "";
  if (accept.includes("text/html")) {
    event.respondWith(handleNavigation(event.request));
    return;
  }

  // 其余请求（fetch API、XHR 等）不干预，直接走网络
});

// ─── 静态资源处理（缓存优先）────────────────────────────────────────────────

const STATIC_ASSET_RE = /\.(js|css|woff2?|png|jpg|jpeg|gif|svg|ico|webp)$/;

async function handleStaticAsset(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    // 只缓存成功的 2xx 响应，绝不缓存 4xx/5xx
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // 静态资源离线时静默失败，不影响页面主流程
    return Response.error();
  }
}

// ─── HTML 导航处理（网络优先）────────────────────────────────────────────────

async function handleNavigation(request) {
  try {
    const response = await fetch(request);

    if (response.ok) {
      // 成功响应：更新缓存并返回
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
      return response;
    }

    // 修复核心：服务器返回 4xx/5xx（包括 503）时，
    // 尝试返回缓存版本，缓存也没有则降级到离线页
    if (response.status >= 400) {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) return cached;

      const offline = await cache.match(OFFLINE_URL);
      if (offline) return offline;

      // 实在没有缓存，原样返回错误响应（不要吞掉，让页面能感知）
      return response;
    }

    // 3xx 重定向等：直接透传，不干预
    return response;
  } catch {
    // 真正的网络错误（断网、DNS 失败等）：走缓存兜底
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;

    const offline = await cache.match(OFFLINE_URL);
    if (offline) return offline;

    return new Response("离线状态，页面不可用", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
// Service Worker — offline caching for astro-minimax blog
const CACHE_VERSION = "__SW_CACHE_VERSION__";
const CACHE_NAME = `astro-blog-${CACHE_VERSION}`;
const OFFLINE_URL = "/404";
const PRECACHE_URLS = ["/", "/favicon.ico"];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const STATIC_RE = /\.(js|css|woff2?|png|jpg|jpeg|gif|svg|ico|webp)$/;

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (STATIC_RE.test(url.pathname)) {
    event.respondWith(cacheFirst(event.request));
  } else if (event.request.mode === "navigate" || (event.request.headers.get("accept") ?? "").includes("text/html")) {
    event.respondWith(networkFirst(event.request));
  }
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch { return Response.error(); }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cache = await caches.open(CACHE_NAME);
    return (await cache.match(request)) || (await cache.match(OFFLINE_URL)) ||
      new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
  }
}

// The build supplies a content-addressed list of the complete application
// shell. Audio remains optional and is cached only after it is requested.
const CONFIG = __FC_WORKER_CONFIG__;
const PREFIX = `fruit-cigs:${CONFIG.base}:`;
const CACHE = PREFIX + CONFIG.revision;
const INDEX = CONFIG.base + "index.html";

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(CONFIG.assets.map(url => new Request(url, { cache: "reload" })));
  })());
  // Do not skipWaiting: replacing the controller mid-career would mix
  // revisions. The installed update activates after old clients close.
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(PREFIX) && name !== CACHE).map(name => caches.delete(name)));
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || !url.pathname.startsWith(CONFIG.base)) return;
  // Browser range requests must reach the network unchanged, rather than
  // being cached as if a partial audio response were the whole file.
  if (request.headers.has("range")) return;
  const isShell = CONFIG.assets.includes(url.pathname);
  const isAudio = CONFIG.audio.includes(url.pathname);
  if (request.mode !== "navigate" && !isShell && !isAudio) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(request.mode === "navigate" ? INDEX : url.pathname);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (isAudio && response.ok && response.status === 200) {
        event.waitUntil(cache.put(url.pathname, response.clone()).catch(() => {}));
      }
      return response;
    } catch {
      return new Response("Unavailable offline", { status: 503 });
    }
  })());
});

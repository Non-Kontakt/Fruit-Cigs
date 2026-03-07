// Service worker — full offline PWA support
const CACHE_NAME = "jfg-v3";

// MP3 tracks to precache (fetched after critical assets)
const AUDIO_URLS = [
  "/Home.mp3",
  "/Training.mp3",
  "/Gone_Up_One.mp3",
  "/Chairmans_Office.mp3",
  "/Takeover_Bid.mp3",
  "/Shootout.mp3",
  "/Forgot_Kit.mp3",
  "/Ice_Bath.mp3",
  "/Clubman_Cup.mp3",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Critical: index.html must be cached for offline navigation
      await cache.addAll(["/"]);
      // Audio: cache each individually so one failure doesn't block install
      await Promise.allSettled(AUDIO_URLS.map((url) => cache.add(url)));
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;

  e.respondWith(
    caches.match(e.request).then((cached) => {
      // Cache-first: serve from cache immediately if available
      if (cached) return cached;

      // Not in cache: fetch from network and cache the response
      return fetch(e.request)
        .then((response) => {
          // Cache any successful response (including cross-origin like Google Fonts)
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          }
          return response;
        })
        .catch(() => {
          // Network failed and cache missed — for navigation, serve cached index
          if (e.request.mode === "navigate") {
            return caches.match("/");
          }
          // For other resources, return a basic offline response
          return new Response("", { status: 503, statusText: "Offline" });
        });
    })
  );
});

const CACHE = "borderhaul-v3";
const SHELL = ["/", "/index.html", "/manifest.json", "/icon.svg"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;

  // Navigations — opening the installed app, following a link, hitting refresh —
  // ALWAYS resolve to a real Response. This is what prevents ERR_FAILED: we never
  // let respondWith() receive undefined, even if both the network and cache miss.
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put("/index.html", copy));
          return res;
        })
        .catch(() =>
          caches.match("/index.html").then(
            (cached) => cached || caches.match("/") || Response.error()
          )
        )
    );
    return;
  }

  // Everything else (css/js/icons/manifest): cache-first, network fallback,
  // and always fall back to a real Response object rather than undefined.
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(e.request, copy));
          return res;
        })
        .catch(() => cached || new Response("Offline", { status: 503, statusText: "Offline" }));
    })
  );
});

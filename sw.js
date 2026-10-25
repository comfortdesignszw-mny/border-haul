/* BorderHaul service worker
 * Cache-first: once installed, the app opens with zero network requests.
 * To ship an update, bump VERSION below — browsers re-download sw.js,
 * install the new cache, and drop the old one.
 */
const VERSION = "bh-2.0.0";
const CACHE = VERSION;

// "./" is the app shell (index.html). Everything is relative so the same
// files work at a domain root (Cloudflare) or a sub-path (GitHub Pages).
const SHELL = "./";
const ASSETS = [
  "./manifest.json",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png"
];

// A response that followed a redirect (e.g. Cloudflare turning /index.html into /)
// must never be handed to a navigation request — the browser rejects it, and the
// installed app shows "This site can't be reached / ERR_FAILED". Re-wrap it first.
async function clean(res) {
  if (!res || !res.redirected) return res;
  const body = await res.blob();
  return new Response(body, { status: res.status, statusText: res.statusText, headers: res.headers });
}

async function precache() {
  const cache = await caches.open(CACHE);
  const shell = await fetch(new Request(SHELL, { cache: "reload" }));
  if (!shell.ok) throw new Error("Shell fetch failed: " + shell.status);
  await cache.put(SHELL, await clean(shell));
  await Promise.all(
    ASSETS.map(async (url) => {
      try {
        const r = await fetch(new Request(url, { cache: "reload" }));
        if (r.ok) await cache.put(url, await clean(r));
      } catch (_) { /* optional asset — never block install */ }
    })
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const OFFLINE_FALLBACK = () =>
  new Response(
    "<!doctype html><meta name=viewport content='width=device-width,initial-scale=1'><body style='font-family:system-ui;background:#12161F;color:#ECE9E0;padding:32px'><h2>BorderHaul</h2><p>Open the app once while online so it can save itself for offline use.</p>",
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // app makes no cross-origin requests

  // Page loads (launching the installed app, refresh, /index.html, shared links):
  // always answer from the cached shell — no network round-trip at all.
  if (req.mode === "navigate") {
    event.respondWith(
      caches.match(SHELL, { ignoreSearch: true }).then(
        (hit) => hit || fetch(req).then(clean).catch(OFFLINE_FALLBACK)
      )
    );
    return;
  }

  // Static assets: cache first, network only if somehow missing.
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(req)
        .then(async (res) => {
          if (res.ok) {
            const copy = await clean(res.clone());
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => new Response("", { status: 504, statusText: "Offline" }));
    })
  );
});

// Tapping a device notification focuses the app (or opens it).
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) if ("focus" in c) return c.focus();
      return self.clients.openWindow("./");
    })
  );
});

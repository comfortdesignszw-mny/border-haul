# BorderHaul — Cloudflare Workers deployment

## Why the app broke

Your installed PWA was opening `/index.html` and getting `ERR_FAILED`. Two things caused it:

1. **Relative paths.** `manifest.json` had `start_url: "./index.html"`, and the icon/manifest/service-worker
   links in `index.html` were relative too. Relative paths resolve differently depending on exactly how a
   host routes requests, which is fragile.
2. **The service worker could respond with nothing.** Its offline fallback did `caches.match(...)` with no
   guaranteed result — if that lookup missed, `respondWith()` received `undefined`, and Chrome reports that
   as `ERR_FAILED`, not a normal 404.
3. **Hosting mismatch.** Your URL is `*.workers.dev`, meaning this is a plain **Cloudflare Worker**, not
   **Cloudflare Pages**. A bare Worker doesn't serve a static folder unless you explicitly wire that up —
   which is why this project is now structured as a proper Workers *static assets* project.

## What changed

- `manifest.json`: `start_url` and `scope` are now `"/"` (absolute), icon is `"/icon.svg"`.
- `index.html`: manifest/icon links and the service-worker registration all use absolute root paths (`/manifest.json`, `/icon.svg`, `/sw.js`).
- `sw.js`: rewritten so navigation requests (opening the installed app) **always** resolve to a real
  `Response` — never `undefined` — even if both cache and network fail.
- `wrangler.toml`: configures this as a Workers **static assets** project pointing at `./public`, with
  `not_found_handling = "single-page-application"` so any navigation request that doesn't match a file
  falls back to `index.html` instead of erroring.
- `src/index.js`: a one-line Worker that hands every request to the static asset binding.
- `public/_headers`: stops `sw.js` and `manifest.json` from being edge-cached, so updates reach devices
  promptly.

## Project structure

```
border-haul/
├── wrangler.toml
├── src/
│   └── index.js
└── public/
    ├── index.html
    ├── manifest.json
    ├── sw.js
    ├── icon.svg
    └── _headers
```

## Deploy

```bash
npm install -g wrangler        # if not already installed
wrangler login
cd border-haul
wrangler deploy
```

This deploys to the same Worker name (`border-haul`), so it will update
`border-haul.comfort-designszw.workers.dev` in place.

## After deploying

Browsers and installed PWAs can hang on to an old, broken service worker even after you fix it server-side.
Do this once on your test device:

1. Open the site in Chrome, go to **DevTools → Application → Service Workers**, and click **Unregister**
   (or **Application → Storage → Clear site data**).
2. If you'd already installed the broken app, uninstall it from your home screen / app list.
3. Reload the page fresh, then reinstall.

## If you'd rather use Cloudflare Pages instead

Pages serves a static folder correctly out of the box with no `wrangler.toml` needed — just point a Pages
project at the `public/` folder as the build output directory (no build command required, since there's
nothing to compile). Either hosting choice works with these files; Workers just needed the extra config
this README adds.

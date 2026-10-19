# BorderHaul — Cloudflare Workers deployment

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

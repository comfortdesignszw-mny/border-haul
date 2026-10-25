# BorderHaul

Offline-first freight board connecting truckers and shippers across Southern Africa.
A static PWA: no server, no build step, no external requests.

```
border-haul/
├── public/                 ← everything that gets deployed
│   ├── index.html          ← the whole app (HTML + CSS + JS)
│   ├── manifest.json       ← install metadata
│   ├── sw.js               ← offline caching (cache-first)
│   ├── icon.svg            ← truck icon (also inlined in the header)
│   ├── icon-192.png  icon-512.png  icon-maskable-512.png  apple-touch-icon.png
│   └── _headers            ← Cloudflare security + cache headers
├── wrangler.jsonc          ← Cloudflare Workers static-assets config
├── package.json
└── README.md
```

## Run locally

Service workers need `http://localhost` or `https`, not `file://`.

```bash
npx wrangler dev          # or: python3 -m http.server 8080 -d public
```

## Deploy: GitHub → Cloudflare

1. Push this folder to a GitHub repo.
2. Cloudflare dashboard → **Workers & Pages → Create → Import a repository**.
3. Settings: **Project/Worker name `border-haul`** (must match `wrangler.jsonc`),
   build command *empty*, deploy command `npx wrangler deploy`.

Prefer Cloudflare Pages? Create a Pages project from the repo with build command *empty*
and **build output directory `public`**. No other config is needed.

Or deploy by hand: `npm install && npx wrangler deploy`.

## Shipping an update

Edit the files, then **bump `VERSION` in `public/sw.js`** (e.g. `bh-2.0.1`) and push.
Devices pick up the new version the next time they open the app while online.

## If an older broken install is on a device

Uninstall the app, then in the browser open site settings → **Clear data** (or DevTools →
Application → Service Workers → Unregister), reload once online, and reinstall.

## How it works

- **Offline start:** the first visit caches the app. After that, launching it makes zero
  network requests. All data is stored on the device (localStorage).
- **Profiles:** separate Shipper and Trucker profiles, each with an optional password
  (PBKDF2 where available). The password gates the app UI; data on the device is not encrypted.
- **Ownership:** only a listing's owner can edit, delete or change its status. Everyone else
  (and guests) gets read-only access.
- **Alerts:** requests, replies, messages and matching hauls create in-app alerts, plus device
  notifications if the user allows them.
- **Matching:** truck type, capacity, distance (adjustable radius), corridor, price and dates.
  Strong matches (score of at least 70, no hard mismatch) alert both owners.
- **Sharing:** listings share as links that carry the listing inside them, so another phone
  receives a read-only copy with no server. Conversations share as text.

## Limits to know about

There is no backend, so data does not sync between phones on its own. Requests, alerts and chats
reach people who use profiles **on the same device**; across devices, listings travel by
share link and contact happens via WhatsApp/phone. Real-time sync between devices would need a
small backend (for example Cloudflare Workers + D1 or Durable Objects).

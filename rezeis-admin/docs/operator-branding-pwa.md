# Operator Branding & PWA White-Label

How a white-label operator replaces the "Reiwa" identity end-to-end: the logo on
the cabinet auth screens and the icon + name used when a user installs the
cabinet as a PWA on their phone home screen.

## What an operator configures

In **Branding** (admin panel → `/web-reiwa`), the Identity + "App icon (PWA)"
cards:

- **Brand logo** (`logoUrl`) — header / auth-screen mark. May be SVG,
  transparent, non-square, an external `https://` URL, a `data:` URI, or an
  uploaded `/uploads/branding/...` file. Used by `<BrandLogo>` on sign-in,
  web-home, TMA-bootstrap, claim, change-password, dashboard, and the side nav.
- **PWA / install icon** (`pwaIconUrl`) — a square PNG (512×512 recommended,
  1024 ok), opaque background, ~10% safe padding for Android's maskable mask.
  Used only for PWA install (manifest icons + iOS apple-touch-icon). Falls back
  to `logoUrl`, then the default Reiwa icons.

Both are uploaded via `POST /admin/settings/branding/logo-upload`
(`BrandingAssetUploadService`), stored on the admin disk under
`<BRANDING_UPLOADS_DIR or data/uploads/branding>/<hash>.<ext>`, and the
returned relative URL is saved into `Settings.brandingSettings`
(`logoUrl` / `pwaIconUrl`). SVG uploads are sanitised before hitting disk.

## How it reaches the cabinet (and survives an admin outage)

```
admin upload → /uploads/branding/<hash>.png (admin disk)
            → brandingSettings.{logoUrl|pwaIconUrl}
            → GET /internal/branding/public-config  (admin)
            → reiwa GET /api/v1/public-config       (60s cache + SWR + webhook)
            → cabinet BrandingProvider / dynamic manifest
```

- **Dynamic manifest** — reiwa serves `GET /manifest.webmanifest` built from the
  operator branding (`name`/`short_name` = brandName, theme from the palette,
  icons from `pwaIconUrl`→`logoUrl`→default). Registered before the static SPA
  handler so it overrides the baked `web/dist/manifest.webmanifest`. Never
  5xx — a default Reiwa manifest is served on any cache error so installability
  is preserved.
- **Resilient asset delivery** — reiwa serves `GET /uploads/branding/:file` from
  a local disk cache (`BRANDING_CACHE_DIR`, default `<cwd>/.cache/branding`,
  mounted as the `reiwa-branding-cache` docker volume). On first request it
  fetches the file once from the admin host and caches it. If the admin host is
  down and the file is cached, the cached copy is served; if it's not cached, the
  route redirects to the default Reiwa icon (never a broken image). The
  `reiwa.branding.invalidate` webhook (fired on every branding save) evicts the
  cache so a re-uploaded asset is re-fetched fresh.
- **iOS** — `BrandingProvider` updates `<link rel="apple-touch-icon">` at runtime
  to the operator icon, since iOS reads it from the DOM at "Add to Home Screen"
  time (the dynamic manifest covers Android/Chromium).

## Install prompt

The cabinet Settings page shows an **"Install app"** item:

- **Android / Chromium** — captures `beforeinstallprompt` and triggers the
  native install prompt.
- **iOS Safari** — shows a branded "Share → Add to Home Screen" instruction
  sheet (no programmatic prompt exists on iOS).
- Hidden when already running standalone (installed) or inside the Telegram Mini
  App (neither signal fires there).

## Env

No new required env for the core. Optional overrides:

- rezeis: `BRANDING_UPLOADS_DIR` (where branding files are stored; defaults to
  `data/uploads/branding`, served under `/uploads`).
- reiwa: `BRANDING_CACHE_DIR` (disk mirror dir; set to `/data/branding-cache`
  with the `reiwa-branding-cache` volume in docker).

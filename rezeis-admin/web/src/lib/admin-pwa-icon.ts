/**
 * Applies the operator-configured PWA install icon to the ADMIN panel at
 * runtime (distinct from the reiwa cabinet's icon). The admin ships a static
 * `public/manifest.webmanifest` + `<link rel="apple-touch-icon">`; when the
 * operator sets a custom icon we:
 *   1. point `apple-touch-icon` at it (iOS "Add to Home Screen"), and
 *   2. swap the manifest link to a blob manifest whose `icons` use the custom
 *      art (Android/Chrome install).
 * Passing `null` restores nothing (keeps whatever is currently set) — we only
 * override when a URL is provided, so the shipped default stays the fallback.
 */
let manifestObjectUrl: string | null = null

/** Resolve a stored icon value to an absolute src the manifest can reference. */
function toAbsolute(url: string): string {
  if (url.startsWith('data:') || /^https?:\/\//i.test(url)) return url
  try {
    return new URL(url, window.location.origin).href
  } catch {
    return url
  }
}

export function applyAdminPwaIcon(url: string | null | undefined): void {
  if (typeof document === 'undefined' || !url) return
  const iconSrc = toAbsolute(url)

  const appleIcon = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]')
  if (appleIcon) appleIcon.href = iconSrc

  const manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')
  if (!manifestLink) return

  void fetch('/manifest.webmanifest')
    .then((res) => res.json() as Promise<Record<string, unknown>>)
    .then((base) => {
      const manifest = {
        ...base,
        icons: [
          { src: iconSrc, sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: iconSrc, sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      }
      const blob = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' })
      if (manifestObjectUrl) URL.revokeObjectURL(manifestObjectUrl)
      manifestObjectUrl = URL.createObjectURL(blob)
      manifestLink.href = manifestObjectUrl
    })
    .catch(() => {
      // Keep the static manifest on any failure — the icon still applies to
      // apple-touch-icon above.
    })
}

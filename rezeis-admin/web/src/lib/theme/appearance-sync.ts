/**
 * Appearance sync — persists the admin's ACTIVE look (theme, presets, glass,
 * effects, density) to the server per-admin, so it follows them across devices
 * and browsers instead of resetting to defaults from empty localStorage.
 *
 * Strategy: the four appearance stores already persist to localStorage under
 * stable keys. We treat those persisted blobs as the sync unit — on login we
 * pull the server copy into localStorage and `rehydrate()` the stores; on any
 * change we debounce-push the current localStorage blobs back. This avoids
 * duplicating each store's partialize logic and keeps instant first paint from
 * localStorage.
 */
import { useEffect, useRef } from 'react'

import { api } from '@/lib/api'
import { useThemeStore } from './theme-store'
import { useGlassStore } from './glass-store'
import { useEffectsStore } from './effects-store'
import { useAppearanceStore } from './appearance-store'

const STORE_KEYS = [
  'rezeis-admin-theme',
  'rezeis-admin-glass',
  'rezeis-admin-effects',
  'rezeis-admin-appearance',
] as const

const SAVE_DEBOUNCE_MS = 1000
const SETTLE_MS = 400

type PersistApi = { persist: { rehydrate: () => void | Promise<void> } }

function rehydrateAll(): void {
  void (useThemeStore as unknown as PersistApi).persist.rehydrate()
  void (useGlassStore as unknown as PersistApi).persist.rehydrate()
  void (useEffectsStore as unknown as PersistApi).persist.rehydrate()
  void (useAppearanceStore as unknown as PersistApi).persist.rehydrate()
}

function readLocalPrefs(): Record<string, unknown> {
  const prefs: Record<string, unknown> = {}
  for (const key of STORE_KEYS) {
    const raw = localStorage.getItem(key)
    if (raw === null) continue
    try {
      prefs[key] = JSON.parse(raw)
    } catch {
      // Skip a malformed entry rather than corrupt the whole payload.
    }
  }
  return prefs
}

/**
 * Mount once inside the authenticated shell. `enabled` guards it to the
 * signed-in area so it never fires on the public login screen.
 */
export function useAppearanceSync(enabled: boolean): void {
  // Suspend pushes until the initial server load has settled, so applying the
  // server copy doesn't immediately echo back as a "change".
  const suspended = useRef(true)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    let settleTimer: ReturnType<typeof setTimeout> | undefined

    void api
      .get<{ prefs: Record<string, unknown> | null }>('/admin/theme-presets/active-prefs')
      .then((res) => {
        if (cancelled) return
        const prefs = res.data?.prefs ?? null
        if (!prefs) return
        let applied = false
        for (const key of STORE_KEYS) {
          const value = prefs[key]
          if (value === undefined) continue
          try {
            localStorage.setItem(key, JSON.stringify(value))
            applied = true
          } catch {
            // localStorage unavailable — skip; the in-memory default stays.
          }
        }
        if (applied) rehydrateAll()
      })
      .catch(() => {
        // First run / offline / no prefs yet — keep whatever localStorage has.
      })
      .finally(() => {
        settleTimer = setTimeout(() => {
          if (!cancelled) suspended.current = false
        }, SETTLE_MS)
      })

    return () => {
      cancelled = true
      if (settleTimer) clearTimeout(settleTimer)
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const trigger = (): void => {
      if (suspended.current) return
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        void api.put('/admin/theme-presets/active-prefs', { prefs: readLocalPrefs() })
      }, SAVE_DEBOUNCE_MS)
    }
    const unsubscribers = [
      useThemeStore.subscribe(trigger),
      useGlassStore.subscribe(trigger),
      useEffectsStore.subscribe(trigger),
      useAppearanceStore.subscribe(trigger),
    ]
    return () => {
      if (timer) clearTimeout(timer)
      for (const unsub of unsubscribers) unsub()
    }
  }, [enabled])
}

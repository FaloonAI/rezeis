/**
 * useCustomGradients
 * ──────────────────
 * A small browser-local palette of operator-saved card gradients. Lets the
 * operator stash a gradient they built (or pasted) and reuse it with one click
 * from the same swatch grid as the built-in presets. Persisted in
 * `localStorage` (per browser) — it's an editor convenience, not part of the
 * reiwa-facing branding config, so it deliberately stays client-side.
 */
import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'rezeis.branding.customCardGradients'
const MAX_CUSTOM = 24

function readStored(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
      .map((v) => v.trim())
      .slice(0, MAX_CUSTOM)
  } catch {
    return []
  }
}

export function useCustomGradients() {
  const [custom, setCustom] = useState<string[]>(() => readStored())

  // Persist on every change; best-effort (private mode / quota).
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(custom))
    } catch {
      /* ignore storage failures */
    }
  }, [custom])

  const add = useCallback((css: string) => {
    const value = (css ?? '').trim()
    if (value.length === 0) return
    setCustom((prev) => {
      if (prev.some((g) => g.toLowerCase() === value.toLowerCase())) return prev
      return [value, ...prev].slice(0, MAX_CUSTOM)
    })
  }, [])

  const remove = useCallback((css: string) => {
    const value = (css ?? '').trim().toLowerCase()
    setCustom((prev) => prev.filter((g) => g.toLowerCase() !== value))
  }, [])

  return { custom, add, remove }
}

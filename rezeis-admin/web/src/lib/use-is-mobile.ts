import { useEffect, useState } from 'react'

/** Viewport width (px) below which the admin panel switches to mobile layouts. */
export const MOBILE_BREAKPOINT_PX = 768

/**
 * Reactive "is this a narrow (mobile/phone) viewport?" check, matched to the
 * Tailwind `md` breakpoint (768px) the shell/sidebar/topbar already key off.
 *
 * Returns `true` when the viewport is narrower than `MOBILE_BREAKPOINT_PX`.
 * SSR-safe and deterministic in tests: defaults to `false` (desktop layout)
 * until the first client effect resolves the real media query.
 */
export function useIsMobile(breakpointPx: number = MOBILE_BREAKPOINT_PX): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpointPx - 1}px)`)
    const apply = (): void => setIsMobile(mql.matches)
    apply()
    mql.addEventListener('change', apply)
    return () => mql.removeEventListener('change', apply)
  }, [breakpointPx])

  return isMobile
}

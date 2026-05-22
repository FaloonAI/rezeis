/**
 * SpotlightCard — a card wrapper that renders a radial gradient spotlight
 * following the user's cursor. Inspired by React Bits SpotlightCard.
 *
 * Uses CSS custom properties + useRef to avoid re-renders on every
 * mousemove event — the gradient position is updated via DOM directly.
 */
import { useRef, useCallback, type ReactNode, type MouseEvent } from 'react'
import { useAppearanceStore } from '@/lib/theme/appearance-store'
import { cn } from '@/lib/utils'

interface SpotlightCardProps {
  children: ReactNode
  className?: string
  /** Spotlight color — defaults to primary with low opacity */
  spotlightColor?: string
  /** Spotlight radius in px */
  radius?: number
}

export function SpotlightCard({
  children,
  className,
  spotlightColor = 'oklch(0.546 0.245 262.881 / 15%)',
  radius = 200,
}: SpotlightCardProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const visualEffects = useAppearanceStore((s) => s.visualEffects)

  const handleMouseMove = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (!containerRef.current || !overlayRef.current || !visualEffects) return
      const rect = containerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      overlayRef.current.style.background = `radial-gradient(${radius}px circle at ${x}px ${y}px, ${spotlightColor}, transparent 80%)`
    },
    [visualEffects, radius, spotlightColor],
  )

  const handleMouseEnter = useCallback(() => {
    if (overlayRef.current) overlayRef.current.style.opacity = '1'
  }, [])

  const handleMouseLeave = useCallback(() => {
    if (overlayRef.current) overlayRef.current.style.opacity = '0'
  }, [])

  return (
    <div
      ref={containerRef}
      className={cn('spotlight-effect relative overflow-hidden', className)}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {visualEffects && (
        <div
          ref={overlayRef}
          className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-300"
        />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  )
}

/**
 * GlareHover — adds a glare/shine effect on hover that follows the cursor.
 * Inspired by React Bits GlareHover component.
 *
 * Uses refs + direct DOM manipulation for the gradient position to avoid
 * re-renders on every mousemove.
 */
import { useRef, useCallback, type ReactNode, type MouseEvent } from 'react'
import { useAppearanceStore } from '@/lib/theme/appearance-store'
import { cn } from '@/lib/utils'

interface GlareHoverProps {
  children: ReactNode
  className?: string
  /** Glare color */
  glareColor?: string
}

export function GlareHover({
  children,
  className,
  glareColor = 'oklch(1 0 0 / 20%)',
}: GlareHoverProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const glareRef = useRef<HTMLDivElement>(null)
  const visualEffects = useAppearanceStore((s) => s.visualEffects)

  const handleMouseMove = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (!containerRef.current || !glareRef.current || !visualEffects) return
      const rect = containerRef.current.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      glareRef.current.style.background = `radial-gradient(circle at ${x}% ${y}%, ${glareColor}, transparent 60%)`
    },
    [visualEffects, glareColor],
  )

  const handleMouseEnter = useCallback(() => {
    if (glareRef.current) glareRef.current.style.opacity = '1'
  }, [])

  const handleMouseLeave = useCallback(() => {
    if (glareRef.current) glareRef.current.style.opacity = '0'
  }, [])

  return (
    <div
      ref={containerRef}
      className={cn('glare-hover-effect relative overflow-hidden', className)}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {visualEffects && (
        <div
          ref={glareRef}
          className="pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-200"
        />
      )}
    </div>
  )
}

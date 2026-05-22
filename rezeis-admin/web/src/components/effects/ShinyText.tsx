/**
 * ShinyText — renders text with a metallic shimmer animation that sweeps
 * across the characters. Inspired by React Bits ShinyText.
 *
 * The effect uses `background-clip: text` with a moving gradient.
 * Text color becomes transparent so the gradient shows through.
 */
import { type ReactNode } from 'react'
import { useAppearanceStore } from '@/lib/theme/appearance-store'
import { cn } from '@/lib/utils'

interface ShinyTextProps {
  children: ReactNode
  className?: string
  /** Animation duration in seconds */
  duration?: number
  /** Whether to disable the effect regardless of global toggle */
  disabled?: boolean
}

export function ShinyText({
  children,
  className,
  duration = 3,
  disabled = false,
}: ShinyTextProps) {
  const visualEffects = useAppearanceStore((s) => s.visualEffects)
  const isActive = visualEffects && !disabled

  if (!isActive) {
    return <span className={className}>{children}</span>
  }

  return (
    <span
      className={cn(
        'shiny-text-effect inline-block animate-shiny-text bg-size-[200%_100%] bg-clip-text',
        className,
      )}
      style={{
        backgroundImage:
          'linear-gradient(90deg, currentColor 40%, oklch(0.8 0.1 260 / 80%) 50%, currentColor 60%)',
        WebkitTextFillColor: 'transparent',
        animationDuration: `${duration}s`,
      }}
    >
      {children}
    </span>
  )
}

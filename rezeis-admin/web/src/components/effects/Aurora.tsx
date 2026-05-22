/**
 * Aurora — animated gradient background with flowing color blobs.
 * Inspired by React Bits Aurora component.
 */
import { useAppearanceStore } from '@/lib/theme/appearance-store'
import { cn } from '@/lib/utils'

interface AuroraProps {
  className?: string
}

export function Aurora({ className }: AuroraProps) {
  const visualEffects = useAppearanceStore((s) => s.visualEffects)

  if (!visualEffects) return null

  return (
    <div
      className={cn(
        'aurora-bg pointer-events-none absolute inset-0 -z-10 overflow-hidden',
        className,
      )}
      aria-hidden="true"
    >
      <div className="absolute inset-[-10%] animate-aurora-1 rounded-full bg-[oklch(0.7_0.2_260/30%)] blur-[80px]" />
      <div className="absolute inset-[-10%] animate-aurora-2 rounded-full bg-[oklch(0.6_0.18_300/25%)] blur-[100px]" />
      <div className="absolute inset-[-10%] animate-aurora-3 rounded-full bg-[oklch(0.65_0.15_200/20%)] blur-[90px]" />
    </div>
  )
}

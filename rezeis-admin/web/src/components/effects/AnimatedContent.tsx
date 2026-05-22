/**
 * AnimatedContent — fade-in + slide-up when the element enters the viewport.
 * Inspired by React Bits AnimatedContent component.
 * Uses Motion (framer-motion) `whileInView` for scroll-triggered animation.
 */
import { type ReactNode } from 'react'
import { motion } from 'motion/react'
import { useAppearanceStore } from '@/lib/theme/appearance-store'
import { cn } from '@/lib/utils'

interface AnimatedContentProps {
  children: ReactNode
  className?: string
  /** Delay before animation starts (seconds) */
  delay?: number
  /** Direction of entrance */
  direction?: 'up' | 'down' | 'left' | 'right'
  /** Distance in px */
  distance?: number
}

export function AnimatedContent({
  children,
  className,
  delay = 0,
  direction = 'up',
  distance = 20,
}: AnimatedContentProps) {
  const visualEffects = useAppearanceStore((s) => s.visualEffects)

  if (!visualEffects) {
    return <div className={className}>{children}</div>
  }

  const directionMap = {
    up: { y: distance, x: 0 },
    down: { y: -distance, x: 0 },
    left: { x: distance, y: 0 },
    right: { x: -distance, y: 0 },
  }

  const offset = directionMap[direction]

  return (
    <motion.div
      className={cn('animated-content-effect', className)}
      initial={{ opacity: 0, ...offset }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    >
      {children}
    </motion.div>
  )
}

import { useEffect, useRef, useState } from 'react'
import type { AnimationItem } from 'lottie-web'

import { cn } from '@/lib/utils'

interface EmojiPreviewProps {
  readonly imageUrl: string
  readonly lottieUrl: string | null
  readonly alt: string
  readonly className?: string
}

/**
 * EmojiPreview
 * ────────────
 * Shows a custom emoji in the admin manager. Animated emojis (with a
 * `lottieUrl`) play their Lottie animation; static ones render the image.
 * Mounting is deferred until the element scrolls into view so a 100-emoji pack
 * doesn't spin up 100 players at once. A muted rounded background keeps
 * transparent / outline-style emojis visible on the dark theme.
 */
export function EmojiPreview({ imageUrl, lottieUrl, alt, className }: EmojiPreviewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [visible, setVisible] = useState(false)
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    const node = containerRef.current
    if (!node || typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setVisible(true)
      },
      { rootMargin: '150px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!visible || !lottieUrl) return
    const node = containerRef.current
    if (!node) return
    let anim: AnimationItem | null = null
    let cancelled = false
    void import('lottie-web/build/player/lottie_light').then((mod) => {
      if (cancelled || !containerRef.current) return
      anim = (mod.default ?? mod).loadAnimation({
        container: containerRef.current,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: lottieUrl,
      })
      anim.addEventListener('DOMLoaded', () => setAnimated(true))
    })
    return () => {
      cancelled = true
      anim?.destroy()
    }
  }, [visible, lottieUrl])

  return (
    <div
      ref={containerRef}
      className={cn('relative flex items-center justify-center rounded bg-muted', className)}
      title={alt}
    >
      {!animated && (
        <img src={imageUrl} alt={alt} className="h-full w-full rounded object-contain p-0.5" />
      )}
    </div>
  )
}

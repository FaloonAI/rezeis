import { useDeferredValue, useEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'

import type { LandingConfig } from '../landing-builder-api'
import { PREVIEW_SECTIONS } from './preview-sections'

/**
 * LandingPreview — Option B live preview.
 *
 * Renders the VENDORED preview renderer (`preview-sections.tsx`) into an
 * isolated same-origin iframe via a React portal into the iframe's
 * `document.body`. Isolation means the admin's global CSS does not leak into
 * the preview and device media queries evaluate against the simulated width.
 * This avoids a cross-origin iframe into reiwa (blocked by reiwa's CSP
 * `frame-ancestors`). Renders the DRAFT config, debounced via `useDeferredValue`.
 */
const WIDTHS = { mobile: 390, tablet: 768, desktop: 1100 } as const
export type PreviewWidth = keyof typeof WIDTHS

interface Props {
  config: LandingConfig
  locale: string
  width: PreviewWidth
}

function PreviewBody({ config, locale }: { config: LandingConfig; locale: string }) {
  const primaryColor = config.theme.inherit === false && config.theme.colors?.primary
    ? config.theme.colors.primary
    : '#22c55e'
  const bg = config.theme.inherit === false && config.theme.colors?.bg ? config.theme.colors.bg : '#0a0a0a'
  const visible = config.sections.filter((s) => s.visible)
  const rootStyle: CSSProperties = {
    minHeight: '100%',
    background: bg,
    color: '#fff',
    fontFamily: 'Inter, system-ui, sans-serif',
  }
  return (
    <div style={rootStyle} lang={locale}>
      {visible.map((section) => {
        const Component = PREVIEW_SECTIONS[section.type]
        if (!Component) return null
        return (
          <Component
            key={section.id}
            section={section}
            locale={locale}
            defaultLocale={config.defaultLocale}
            primaryColor={primaryColor}
          />
        )
      })}
    </div>
  )
}

export function LandingPreview({ config, locale, width }: Props) {
  const deferredConfig = useDeferredValue(config)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null)

  // Establish the iframe document body as the portal target once loaded.
  useEffect(() => {
    const iframe = iframeRef.current
    if (iframe === null) return
    const attach = (): void => {
      const doc = iframe.contentDocument
      if (doc === null) return
      doc.body.style.margin = '0'
      doc.documentElement.style.height = '100%'
      doc.body.style.height = '100%'
      setMountNode(doc.body)
    }
    // srcdoc gives us a fresh, isolated same-origin document.
    if (iframe.contentDocument?.readyState === 'complete') {
      attach()
    } else {
      iframe.addEventListener('load', attach)
      return () => iframe.removeEventListener('load', attach)
    }
    return undefined
  }, [])

  return (
    <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
      <iframe
        ref={iframeRef}
        title="landing-preview"
        srcDoc="<!doctype html><html><head><meta charset='utf-8'></head><body></body></html>"
        style={{
          width: WIDTHS[width],
          maxWidth: '100%',
          height: 640,
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12,
          background: '#0a0a0a',
        }}
      />
      {mountNode !== null && createPortal(<PreviewBody config={deferredConfig} locale={locale} />, mountNode)}
    </div>
  )
}

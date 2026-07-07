/**
 * Vendored preview section renderer — Option B (see design.md "Where the
 * preview components live").
 *
 * A dependency-light mirror of the reiwa/web section renderer
 * (`reiwa/web/src/features/landing/`), re-implemented here so the admin
 * preview never needs a cross-origin iframe into reiwa (blocked by reiwa's
 * CSP `frame-ancestors`). Same 10 section types, same field shapes. Styled
 * with inline styles (no Tailwind dependency) so it renders correctly inside
 * the isolated preview iframe regardless of stylesheet injection timing.
 *
 * A lockstep PARITY TEST (`landing-preview.parity.test.ts`) asserts this
 * registry covers exactly the same section types as the canonical
 * `LANDING_SECTION_TYPES` catalog, so the two copies cannot silently drift.
 */
import type { ComponentType } from 'react'

import type { LandingSection, LandingSectionType, LocalizedText } from '../landing-builder-api'

export function pickLocalized(value: unknown, locale: string, defaultLocale: string): string {
  if (value === null || typeof value !== 'object') return ''
  const map = value as LocalizedText
  const primary = map[locale]
  if (typeof primary === 'string' && primary.length > 0) return primary
  const fallback = map[defaultLocale]
  if (typeof fallback === 'string' && fallback.length > 0) return fallback
  for (const v of Object.values(map)) {
    if (typeof v === 'string' && v.length > 0) return v
  }
  return ''
}

export function safeUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (trimmed.length === 0) return null
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed
  if (/^https:\/\/[^\s]+$/i.test(trimmed)) return trimmed
  return null
}

interface SectionProps {
  section: LandingSection
  locale: string
  defaultLocale: string
  primaryColor: string
}

const cardStyle: React.CSSProperties = {
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.05)',
  borderRadius: 16,
  padding: 20,
  color: '#fff',
}

function CtaButton({
  label,
  href,
  primaryColor,
  variant,
}: {
  label: string
  href: string | null
  primaryColor: string
  variant: 'primary' | 'secondary'
}) {
  if (!href || label.length === 0) return null
  const style: React.CSSProperties =
    variant === 'primary'
      ? {
          display: 'inline-flex',
          height: 44,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 999,
          background: primaryColor,
          color: '#0a0a0a',
          padding: '0 24px',
          fontWeight: 600,
          fontSize: 14,
          textDecoration: 'none',
        }
      : {
          display: 'inline-flex',
          height: 44,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 999,
          border: '1px solid rgba(255,255,255,0.2)',
          color: '#fff',
          padding: '0 24px',
          fontWeight: 500,
          fontSize: 14,
          textDecoration: 'none',
        }
  return (
    <a href={href} style={style}>
      {label}
    </a>
  )
}

function resolveCtaHref(action: unknown, url: unknown): string | null {
  if (action === 'register') return '#register'
  if (action === 'login') return '#login'
  if (action === 'url') return safeUrl(url)
  return null
}

function Hero({ section, locale, defaultLocale, primaryColor }: SectionProps) {
  const data = section.data as {
    eyebrow?: unknown
    heading?: unknown
    subheading?: unknown
    primaryCta?: { label?: unknown; action?: unknown; url?: unknown }
    secondaryCta?: { label?: unknown; action?: unknown; url?: unknown }
    align?: unknown
  }
  const heading = pickLocalized(data.heading, locale, defaultLocale)
  if (heading.length === 0) return null
  const eyebrow = pickLocalized(data.eyebrow, locale, defaultLocale)
  const subheading = pickLocalized(data.subheading, locale, defaultLocale)
  const align = data.align === 'left' ? 'flex-start' : 'center'
  return (
    <section
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: align,
        textAlign: align === 'center' ? 'center' : 'left',
        gap: 16,
        padding: '48px 24px',
      }}
    >
      {eyebrow && (
        <p style={{ fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', color: primaryColor }}>
          {eyebrow}
        </p>
      )}
      <h1 style={{ fontSize: 36, fontWeight: 600, color: '#fff', maxWidth: 640 }}>{heading}</h1>
      {subheading && <p style={{ fontSize: 16, color: '#d4d4d8', maxWidth: 560 }}>{subheading}</p>}
      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        <CtaButton
          label={pickLocalized(data.primaryCta?.label, locale, defaultLocale)}
          href={resolveCtaHref(data.primaryCta?.action, data.primaryCta?.url)}
          primaryColor={primaryColor}
          variant="primary"
        />
        <CtaButton
          label={pickLocalized(data.secondaryCta?.label, locale, defaultLocale)}
          href={resolveCtaHref(data.secondaryCta?.action, data.secondaryCta?.url)}
          primaryColor={primaryColor}
          variant="secondary"
        />
      </div>
    </section>
  )
}

function FeaturesGrid({ section, locale, defaultLocale, primaryColor }: SectionProps) {
  const data = section.data as { heading?: unknown; items?: Array<{ title?: unknown; body?: unknown }> }
  const heading = pickLocalized(data.heading, locale, defaultLocale)
  const items = Array.isArray(data.items) ? data.items : []
  if (items.length === 0) return null
  return (
    <section style={{ padding: '32px 24px' }}>
      {heading.length > 0 && (
        <h2 style={{ textAlign: 'center', fontSize: 26, color: '#fff', marginBottom: 24 }}>{heading}</h2>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
        {items.map((item, i) => {
          const title = pickLocalized(item.title, locale, defaultLocale)
          const body = pickLocalized(item.body, locale, defaultLocale)
          if (title.length === 0) return null
          return (
            <div key={i} style={{ ...cardStyle, flex: '1 1 220px', maxWidth: 280 }}>
              <span
                style={{
                  display: 'inline-flex',
                  height: 40,
                  width: 40,
                  borderRadius: 12,
                  background: `${primaryColor}26`,
                  color: primaryColor,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                }}
              >
                ●
              </span>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>{title}</h3>
              {body.length > 0 && <p style={{ fontSize: 13, color: '#d4d4d8', marginTop: 6 }}>{body}</p>}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function HowItWorks({ section, locale, defaultLocale, primaryColor }: SectionProps) {
  const data = section.data as { heading?: unknown; steps?: Array<{ title?: unknown; body?: unknown }> }
  const heading = pickLocalized(data.heading, locale, defaultLocale)
  const steps = Array.isArray(data.steps) ? data.steps : []
  if (steps.length === 0) return null
  return (
    <section style={{ padding: '32px 24px' }}>
      {heading.length > 0 && (
        <h2 style={{ textAlign: 'center', fontSize: 26, color: '#fff', marginBottom: 24 }}>{heading}</h2>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
        {steps.map((step, i) => {
          const title = pickLocalized(step.title, locale, defaultLocale)
          const body = pickLocalized(step.body, locale, defaultLocale)
          if (title.length === 0) return null
          return (
            <div key={i} style={{ ...cardStyle, flex: '1 1 200px', maxWidth: 260 }}>
              <span
                style={{
                  display: 'inline-flex',
                  height: 32,
                  width: 32,
                  borderRadius: 999,
                  background: primaryColor,
                  color: '#0a0a0a',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600,
                  marginBottom: 12,
                }}
              >
                {i + 1}
              </span>
              <h3 style={{ fontSize: 15, fontWeight: 600 }}>{title}</h3>
              {body.length > 0 && <p style={{ fontSize: 13, color: '#d4d4d8', marginTop: 6 }}>{body}</p>}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function Pricing({ section, locale, defaultLocale, primaryColor }: SectionProps) {
  const data = section.data as {
    heading?: unknown
    source?: unknown
    staticPlans?: Array<{
      name?: unknown
      priceMonthly?: unknown
      currency?: unknown
      cta?: { label?: unknown }
      highlighted?: unknown
    }>
  }
  const heading = pickLocalized(data.heading, locale, defaultLocale)
  const source = data.source === 'static' ? 'static' : 'catalog'
  const plans = source === 'static' && Array.isArray(data.staticPlans) ? data.staticPlans : []
  return (
    <section style={{ padding: '32px 24px' }}>
      {heading.length > 0 && (
        <h2 style={{ textAlign: 'center', fontSize: 26, color: '#fff', marginBottom: 24 }}>{heading}</h2>
      )}
      {source === 'catalog' ? (
        <p style={{ textAlign: 'center', fontSize: 13, color: '#a1a1aa' }}>
          (live plan catalog — shown at runtime on the public page)
        </p>
      ) : plans.length === 0 ? null : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
          {plans.map((plan, i) => {
            const name = pickLocalized(plan.name, locale, defaultLocale)
            if (name.length === 0) return null
            const price = typeof plan.priceMonthly === 'string' ? plan.priceMonthly : ''
            const currency = typeof plan.currency === 'string' ? plan.currency : ''
            const ctaLabel = pickLocalized(plan.cta?.label, locale, defaultLocale)
            return (
              <div
                key={i}
                style={{
                  ...cardStyle,
                  flex: '1 1 200px',
                  maxWidth: 260,
                  border: plan.highlighted
                    ? `1px solid ${primaryColor}`
                    : '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <h3 style={{ fontSize: 16, fontWeight: 600 }}>{name}</h3>
                <p style={{ fontSize: 24, fontWeight: 700, marginTop: 8 }}>
                  {price} {currency}
                </p>
                {ctaLabel.length > 0 && (
                  <CtaButton label={ctaLabel} href="#register" primaryColor={primaryColor} variant="primary" />
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

function Faq({ section, locale, defaultLocale }: SectionProps) {
  const data = section.data as { heading?: unknown; items?: Array<{ question?: unknown; answer?: unknown }> }
  const heading = pickLocalized(data.heading, locale, defaultLocale)
  const items = Array.isArray(data.items) ? data.items : []
  if (items.length === 0) return null
  return (
    <section style={{ padding: '32px 24px' }}>
      {heading.length > 0 && (
        <h2 style={{ textAlign: 'center', fontSize: 26, color: '#fff', marginBottom: 24 }}>{heading}</h2>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 560, margin: '0 auto' }}>
        {items.map((item, i) => {
          const question = pickLocalized(item.question, locale, defaultLocale)
          const answer = pickLocalized(item.answer, locale, defaultLocale)
          if (question.length === 0) return null
          return (
            <details key={i} style={{ ...cardStyle, padding: 12 }}>
              <summary style={{ cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>{question}</summary>
              {answer.length > 0 && <p style={{ fontSize: 13, color: '#d4d4d8', marginTop: 8 }}>{answer}</p>}
            </details>
          )
        })}
      </div>
    </section>
  )
}

function Testimonials({ section, locale, defaultLocale }: SectionProps) {
  const data = section.data as { heading?: unknown; items?: Array<{ quote?: unknown; author?: unknown }> }
  const heading = pickLocalized(data.heading, locale, defaultLocale)
  const items = Array.isArray(data.items) ? data.items : []
  if (items.length === 0) return null
  return (
    <section style={{ padding: '32px 24px' }}>
      {heading.length > 0 && (
        <h2 style={{ textAlign: 'center', fontSize: 26, color: '#fff', marginBottom: 24 }}>{heading}</h2>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
        {items.map((item, i) => {
          const quote = pickLocalized(item.quote, locale, defaultLocale)
          if (quote.length === 0) return null
          const author = pickLocalized(item.author, locale, defaultLocale)
          return (
            <div key={i} style={{ ...cardStyle, flex: '1 1 260px', maxWidth: 320 }}>
              <p style={{ fontSize: 14 }}>&ldquo;{quote}&rdquo;</p>
              {author.length > 0 && <p style={{ fontSize: 12, color: '#a1a1aa', marginTop: 8 }}>{author}</p>}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function Stats({ section, locale, defaultLocale, primaryColor }: SectionProps) {
  const data = section.data as { heading?: unknown; items?: Array<{ value?: unknown; label?: unknown }> }
  const heading = pickLocalized(data.heading, locale, defaultLocale)
  const items = Array.isArray(data.items) ? data.items : []
  if (items.length === 0) return null
  return (
    <section style={{ padding: '24px' }}>
      {heading.length > 0 && (
        <h2 style={{ textAlign: 'center', fontSize: 22, color: '#fff', marginBottom: 16 }}>{heading}</h2>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, justifyContent: 'center' }}>
        {items.map((item, i) => {
          const value = typeof item.value === 'string' ? item.value : ''
          if (value.length === 0) return null
          const label = pickLocalized(item.label, locale, defaultLocale)
          return (
            <div key={i} style={{ textAlign: 'center', color: '#fff' }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: primaryColor }}>{value}</div>
              {label.length > 0 && <div style={{ fontSize: 12, color: '#a1a1aa' }}>{label}</div>}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function TrustLogos({ section, locale, defaultLocale }: SectionProps) {
  const data = section.data as { heading?: unknown; logos?: Array<{ image?: { src?: unknown; alt?: unknown } }> }
  const heading = pickLocalized(data.heading, locale, defaultLocale)
  const logos = Array.isArray(data.logos) ? data.logos : []
  if (logos.length === 0) return null
  return (
    <section style={{ padding: '20px 24px' }}>
      {heading.length > 0 && (
        <p style={{ textAlign: 'center', fontSize: 11, letterSpacing: '0.2em', color: '#71717a', marginBottom: 12 }}>
          {heading.toUpperCase()}
        </p>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center', opacity: 0.7 }}>
        {logos.map((logo, i) => {
          const src = safeUrl(logo.image?.src)
          if (src === null) return null
          const alt = pickLocalized(logo.image?.alt, locale, defaultLocale)
          return <img key={i} src={src} alt={alt} style={{ height: 24 }} />
        })}
      </div>
    </section>
  )
}

function CtaBanner({ section, locale, defaultLocale, primaryColor }: SectionProps) {
  const data = section.data as { heading?: unknown; body?: unknown; cta?: { label?: unknown; action?: unknown; url?: unknown } }
  const heading = pickLocalized(data.heading, locale, defaultLocale)
  if (heading.length === 0) return null
  const body = pickLocalized(data.body, locale, defaultLocale)
  const ctaLabel = pickLocalized(data.cta?.label, locale, defaultLocale)
  const href = resolveCtaHref(data.cta?.action, data.cta?.url)
  return (
    <section style={{ padding: '32px 24px' }}>
      <div
        style={{
          maxWidth: 640,
          margin: '0 auto',
          borderRadius: 24,
          padding: 32,
          textAlign: 'center',
          color: '#fff',
          background: `linear-gradient(90deg, ${primaryColor}, ${primaryColor}99)`,
        }}
      >
        <h2 style={{ fontSize: 24, fontWeight: 600 }}>{heading}</h2>
        {body.length > 0 && <p style={{ marginTop: 8, fontSize: 14 }}>{body}</p>}
        {ctaLabel.length > 0 && href && (
          <a
            href={href}
            style={{
              display: 'inline-flex',
              marginTop: 16,
              height: 40,
              alignItems: 'center',
              padding: '0 20px',
              borderRadius: 999,
              background: '#fff',
              color: '#000',
              fontWeight: 600,
              fontSize: 13,
              textDecoration: 'none',
            }}
          >
            {ctaLabel}
          </a>
        )}
      </div>
    </section>
  )
}

function Footer({ section, locale, defaultLocale }: SectionProps) {
  const data = section.data as { columns?: Array<{ title?: unknown }>; legal?: unknown }
  const columns = Array.isArray(data.columns) ? data.columns : []
  const legal = pickLocalized(data.legal, locale, defaultLocale)
  return (
    <footer style={{ padding: '24px', borderTop: '1px solid rgba(255,255,255,0.1)', color: '#a1a1aa', fontSize: 12 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between' }}>
        {columns.map((col, i) => {
          const title = pickLocalized(col.title, locale, defaultLocale)
          return title.length > 0 ? <div key={i}>{title}</div> : null
        })}
      </div>
      {legal.length > 0 && <p style={{ marginTop: 12 }}>{legal}</p>}
    </footer>
  )
}

/** Fixed registry — the same 10 section types the canonical schema defines. */
export const PREVIEW_SECTIONS: Record<LandingSectionType, ComponentType<SectionProps>> = {
  hero: Hero,
  featuresGrid: FeaturesGrid,
  howItWorks: HowItWorks,
  pricing: Pricing,
  faq: Faq,
  testimonials: Testimonials,
  stats: Stats,
  trustLogos: TrustLogos,
  ctaBanner: CtaBanner,
  footer: Footer,
}

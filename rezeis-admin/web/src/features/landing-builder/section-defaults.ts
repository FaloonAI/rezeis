/**
 * Safe default `data` for each section type, so a newly-added section always
 * renders and can be published once its localized strings are filled in for
 * every configured locale. Localized strings default to empty per-locale maps
 * built from the config's `locales` (the missing-translation badge then guides
 * the operator to fill them before publish).
 */
import type { LandingSection, LandingSectionType, LocalizedText } from './landing-builder-api'

function emptyLocalized(locales: readonly string[]): LocalizedText {
  const map: LocalizedText = {}
  for (const locale of locales) map[locale] = ''
  return map
}

function id(type: string): string {
  return `${type}-${Math.random().toString(36).slice(2, 8)}`
}

export function buildDefaultSection(
  type: LandingSectionType,
  locales: readonly string[],
): LandingSection {
  const L = () => emptyLocalized(locales)
  const cta = () => ({ label: L(), action: 'register' as const })
  const data: Record<LandingSectionType, Record<string, unknown>> = {
    hero: { heading: L(), subheading: L(), primaryCta: cta(), align: 'center' },
    featuresGrid: { heading: L(), columns: 3, items: [{ icon: 'zap', title: L(), body: L() }] },
    howItWorks: { heading: L(), steps: [{ title: L(), body: L() }] },
    pricing: { source: 'catalog', billingToggle: false, heading: L() },
    faq: { heading: L(), items: [{ question: L(), answer: L() }] },
    testimonials: { heading: L(), items: [{ quote: L(), author: L() }] },
    stats: { heading: L(), items: [{ value: '', label: L() }] },
    trustLogos: { heading: L(), logos: [] },
    ctaBanner: { heading: L(), body: L(), cta: cta(), style: 'gradient' },
    footer: { columns: [{ title: L(), links: [] }], legal: L() },
  }
  return { id: id(type), type, visible: true, data: data[type] }
}

/** Deep-clone a section and give it a fresh id (for the duplicate action). */
export function cloneSection(section: LandingSection): LandingSection {
  const cloned = JSON.parse(JSON.stringify(section)) as LandingSection
  return { ...cloned, id: id(section.type) }
}

/**
 * Walk a section's data and collect the locales missing a non-empty value for
 * any localized-text leaf. Used for the per-section missing-translation badge
 * and to block publish (mirrors the backend publish-strict gate).
 */
export function missingLocales(section: LandingSection, locales: readonly string[]): string[] {
  const missing = new Set<string>()
  const isLocalized = (node: object): boolean => {
    const keys = Object.keys(node)
    return keys.length > 0 && keys.every((k) => /^[a-z]{2}$/.test(k))
  }
  const walk = (node: unknown): void => {
    if (node === null || typeof node !== 'object') return
    if (isLocalized(node)) {
      const map = node as Record<string, unknown>
      for (const locale of locales) {
        const value = map[locale]
        if (typeof value !== 'string' || value.trim().length === 0) missing.add(locale)
      }
      return
    }
    if (Array.isArray(node)) {
      node.forEach(walk)
      return
    }
    Object.values(node as Record<string, unknown>).forEach(walk)
  }
  walk(section.data)
  return Array.from(missing)
}

export function configMissingLocales(
  sections: readonly LandingSection[],
  locales: readonly string[],
): boolean {
  return sections.some((s) => s.visible && missingLocales(s, locales).length > 0)
}

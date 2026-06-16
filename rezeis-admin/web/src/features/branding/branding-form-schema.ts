import { z } from 'zod'

import { CARD_LOGO_PRESETS, type CardLogoPreset } from './branding-options'

export const BRANDING_BG_EFFECTS = ['NONE', 'MESH', 'PARTICLES', 'NOISE', 'AURORA'] as const
export const BRANDING_ICON_COLOR_MODES = ['default', 'theme', 'custom'] as const

export interface BrandingFormDraft {
  readonly brandName: string
  readonly logoUrl: string | null
  readonly primary: string
  readonly primaryFg: string
  readonly bgPrimary: string
  readonly bgSecondary: string
  readonly cardGradient: string
  readonly cardPattern: string | null
  readonly cardLogo: CardLogoPreset
  readonly cardLogoUrl: string | null
  readonly cardEffect: string
  readonly cardEffectProps?: Record<string, unknown>
  readonly cardEffectOpacity: number
  readonly cardEffectsByIndex?: readonly BrandingCardEffectSlotDraft[]
  readonly bgEffect: (typeof BRANDING_BG_EFFECTS)[number]
  readonly appBackground?: BrandingAppBackgroundDraft
  readonly iconColorMode: (typeof BRANDING_ICON_COLOR_MODES)[number]
  readonly iconColors?: Record<string, string>
  readonly borderRadius: string
  readonly fontFamily: string
}

export interface BrandingAppBackgroundDraft {
  readonly effect: string
  readonly props: Record<string, unknown>
  readonly opacity: number
}

export interface BrandingCardEffectSlotDraft {
  readonly cardEffect: string
  readonly cardEffectProps: Record<string, unknown>
  readonly cardEffectOpacity: number
}

export type BrandingFormData = Omit<BrandingFormDraft, 'cardEffectsByIndex'> & {
  readonly logoUrl: string | null
  readonly cardPattern: string | null
  readonly cardLogoUrl: string | null
  readonly cardEffectsByIndex?: readonly BrandingCardEffectSlotDraft[]
}

export interface BrandingFormValidationMessages {
  readonly hexInvalid: string
  readonly imageUrlInvalid: string
}

const HEX_PATTERN = /^#([0-9a-fA-F]{3,8})$/
const DATA_IMAGE_BASE64_PATTERN = /^data:image\/[a-z0-9+.-]+;base64,[A-Za-z0-9+/=]+$/i
/**
 * Max length for image-bearing fields (`logoUrl`, `cardLogoUrl`,
 * `cardPattern`). Generous enough to hold an inline `data:image` base64
 * logo (~512 KB string ≈ a ~384 KB image) — the previous 8 KB cap rejected
 * almost every real PNG/SVG data URI with a bare "Invalid input".
 */
const IMAGE_URL_MAX = 524288

const DEFAULT_BRANDING_DRAFT: BrandingFormDraft = {
  brandName: 'Reiwa',
  logoUrl: null,
  primary: '#22c55e',
  primaryFg: '#0a0a0a',
  bgPrimary: '#0a0a0a',
  bgSecondary: '#171717',
  cardGradient: 'linear-gradient(135deg, #064e3b 0%, #22c55e 100%)',
  cardPattern: null,
  cardLogo: 'DEFAULT',
  cardLogoUrl: null,
  cardEffect: 'aurora',
  cardEffectProps: {},
  cardEffectOpacity: 1,
  cardEffectsByIndex: [],
  bgEffect: 'AURORA',
  appBackground: { effect: 'NONE', props: {}, opacity: 1 },
  iconColorMode: 'default',
  iconColors: {},
  borderRadius: 'rounded-2xl',
  fontFamily: 'Geist Variable, system-ui, sans-serif',
}

export function createBrandingFormSchema(messages: BrandingFormValidationMessages) {
  return z
    .object({
      brandName: z.string().trim().min(1).max(64),
      logoUrl: optionalImageUrl(messages.imageUrlInvalid),
      primary: z.string().regex(HEX_PATTERN, messages.hexInvalid),
      primaryFg: z.string().regex(HEX_PATTERN, messages.hexInvalid),
      bgPrimary: z.string().regex(HEX_PATTERN, messages.hexInvalid),
      bgSecondary: z.string().regex(HEX_PATTERN, messages.hexInvalid),
      cardGradient: z.string().trim().min(1).max(512),
      cardPattern: optionalNullableString(IMAGE_URL_MAX),
      cardLogo: z.enum(CARD_LOGO_PRESETS),
      cardLogoUrl: optionalImageUrl(messages.imageUrlInvalid),
      cardEffect: z.string().max(32),
      cardEffectProps: z.record(z.string(), z.unknown()).optional(),
      cardEffectOpacity: z.number().min(0.05).max(1),
      cardEffectsByIndex: z
        .array(
          z.object({
            cardEffect: z.string().max(32),
            cardEffectProps: z.record(z.string(), z.unknown()),
            cardEffectOpacity: z.number().min(0.05).max(1),
          }),
        )
        .optional(),
      bgEffect: z.enum(BRANDING_BG_EFFECTS),
      appBackground: z
        .object({
          effect: z.string().max(32),
          props: z.record(z.string(), z.unknown()),
          opacity: z.number().min(0.05).max(1),
        })
        .optional(),
      iconColorMode: z.enum(BRANDING_ICON_COLOR_MODES),
      iconColors: z.record(z.string(), z.string()).optional(),
      borderRadius: z.string().trim().min(1).max(64),
      fontFamily: z.string().trim().min(1).max(256),
    })
    .transform((values): BrandingFormData => ({
      ...values,
      cardEffectsByIndex: values.cardEffectsByIndex ?? [],
      cardEffectProps: values.cardEffectProps ?? {},
      appBackground: values.appBackground ?? { effect: 'NONE', props: {}, opacity: 1 },
      iconColors: values.iconColors ?? {},
    }))
}

export function createInitialBrandingDraft(input?: Partial<BrandingFormDraft> | null): BrandingFormDraft {
  return {
    ...DEFAULT_BRANDING_DRAFT,
    ...(input ?? {}),
    logoUrl: normalizeDraftNullableString(input?.logoUrl),
    cardPattern: normalizeDraftNullableString(input?.cardPattern),
    cardLogoUrl: normalizeDraftNullableString(input?.cardLogoUrl),
    cardEffectProps: isPlainRecord(input?.cardEffectProps) ? input.cardEffectProps : {},
    cardEffectsByIndex: Array.isArray(input?.cardEffectsByIndex) ? input.cardEffectsByIndex : [],
    appBackground: normalizeAppBackgroundDraft(input?.appBackground),
    iconColors: isPlainRecord(input?.iconColors) ? input.iconColors : {},
  }
}

function normalizeAppBackgroundDraft(
  value: BrandingAppBackgroundDraft | undefined,
): BrandingAppBackgroundDraft {
  if (typeof value !== 'object' || value === null) {
    return { effect: 'NONE', props: {}, opacity: 1 }
  }
  return {
    effect: typeof value.effect === 'string' ? value.effect : 'NONE',
    props: isPlainRecordUnknown(value.props) ? value.props : {},
    opacity:
      typeof value.opacity === 'number' && Number.isFinite(value.opacity)
        ? Math.min(Math.max(value.opacity, 0.05), 1)
        : 1,
  }
}

function optionalImageUrl(message: string) {
  return optionalNullableString(IMAGE_URL_MAX)
    .refine((value) => value === null || isAllowedImageUrl(value), { message })
}

function optionalNullableString(maxLength: number) {
  return z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => (typeof value === 'string' ? value.trim() : ''))
    .pipe(z.string().max(maxLength))
    .transform((value) => (value.length > 0 ? value : null))
}

function isAllowedImageUrl(value: string): boolean {
  if (DATA_IMAGE_BASE64_PATTERN.test(value)) {
    return true
  }
  try {
    const url = new URL(value)
    return (url.protocol === 'http:' || url.protocol === 'https:') && !url.username && !url.password
  } catch {
    return false
  }
}

function normalizeDraftNullableString(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function isPlainRecord(value: unknown): value is Record<string, string> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isPlainRecordUnknown(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

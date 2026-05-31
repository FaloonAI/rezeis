/**
 * CardLogoMark + CARD_LOGO_PRESETS
 * ────────────────────────────────
 * Renders the subscription-card watermark glyph in the WEB Reiwa configurator,
 * mirroring the reiwa SPA `CardWatermark`. Each preset is a Lucide icon
 * (tintable, scalable, zero assets); `DEFAULT` uses the Reiwa origami mark and
 * `NONE` renders nothing. A custom image (`customUrl`) overrides the glyph.
 *
 * Keep the preset list in sync with the backend `CARD_LOGO_PRESETS` and the
 * SPA `CardWatermark` icon map.
 */

import type { CSSProperties } from 'react'
import {
  Crown,
  Flame,
  Gem,
  Ghost,
  Globe,
  Hexagon,
  Mountain,
  Orbit,
  Rocket,
  Shield,
  Waves,
  Zap,
  type LucideIcon,
} from 'lucide-react'

import { ReiwaMark } from './reiwa-mark'

export const CARD_LOGO_PRESETS = [
  'DEFAULT',
  'NONE',
  'SHIELD',
  'BOLT',
  'GLOBE',
  'ROCKET',
  'GHOST',
  'CROWN',
  'GEM',
  'FLAME',
  'WAVES',
  'MOUNTAIN',
  'ORBIT',
  'HEXAGON',
] as const

export type CardLogoPreset = (typeof CARD_LOGO_PRESETS)[number]

const PRESET_ICON: Partial<Record<CardLogoPreset, LucideIcon>> = {
  SHIELD: Shield,
  BOLT: Zap,
  GLOBE: Globe,
  ROCKET: Rocket,
  GHOST: Ghost,
  CROWN: Crown,
  GEM: Gem,
  FLAME: Flame,
  WAVES: Waves,
  MOUNTAIN: Mountain,
  ORBIT: Orbit,
  HEXAGON: Hexagon,
}

interface CardLogoMarkProps {
  readonly preset: CardLogoPreset
  readonly customUrl?: string | null
  readonly className?: string
  readonly style?: CSSProperties
}

export function CardLogoMark({ preset, customUrl, className, style }: CardLogoMarkProps) {
  if (customUrl) {
    return <img src={customUrl} alt="" aria-hidden className={className} style={{ objectFit: 'contain', ...style }} />
  }
  if (preset === 'NONE') return null
  if (preset === 'DEFAULT') {
    return <ReiwaMark className={className} style={style} />
  }
  const Icon = PRESET_ICON[preset]
  if (!Icon) return <ReiwaMark className={className} style={style} />
  return <Icon aria-hidden strokeWidth={1.5} className={className} style={style} />
}

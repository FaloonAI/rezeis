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

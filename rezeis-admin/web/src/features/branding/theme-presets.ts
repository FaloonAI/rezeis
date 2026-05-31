/**
 * Curated one-click theme presets for the reiwa web cabinet.
 *
 * Each preset is a complete palette (primary/foreground/backgrounds + card
 * gradient + recommended bg effect). Applying a preset sets every visual field
 * at once so an operator can re-skin the whole cabinet in a single click, then
 * fine-tune individual colours if desired.
 *
 * Pure data — no React. Consumed by the WEB Reiwa configurator.
 */

export interface ThemePreset {
  /** Stable id used as the React key + i18n label key. */
  readonly id: string;
  readonly primary: string;
  readonly primaryFg: string;
  readonly bgPrimary: string;
  readonly bgSecondary: string;
  readonly cardGradient: string;
  readonly bgEffect: 'NONE' | 'MESH' | 'PARTICLES' | 'NOISE' | 'AURORA';
}

export const THEME_PRESETS: readonly ThemePreset[] = [
  {
    id: 'emerald',
    primary: '#22c55e',
    primaryFg: '#0a0a0a',
    bgPrimary: '#0a0a0a',
    bgSecondary: '#171717',
    cardGradient: 'linear-gradient(135deg, #064e3b 0%, #22c55e 100%)',
    bgEffect: 'AURORA',
  },
  {
    id: 'royal',
    primary: '#6366f1',
    primaryFg: '#0a0a0a',
    bgPrimary: '#09090b',
    bgSecondary: '#18181b',
    cardGradient: 'linear-gradient(135deg, #1e1b4b 0%, #6366f1 100%)',
    bgEffect: 'AURORA',
  },
  {
    id: 'sunset',
    primary: '#f97316',
    primaryFg: '#0a0a0a',
    bgPrimary: '#0c0a09',
    bgSecondary: '#1c1917',
    cardGradient: 'linear-gradient(135deg, #7c2d12 0%, #f97316 100%)',
    bgEffect: 'AURORA',
  },
  {
    id: 'rose',
    primary: '#f43f5e',
    primaryFg: '#0a0a0a',
    bgPrimary: '#0a0a0a',
    bgSecondary: '#18181b',
    cardGradient: 'linear-gradient(135deg, #881337 0%, #f43f5e 100%)',
    bgEffect: 'AURORA',
  },
  {
    id: 'cyan',
    primary: '#06b6d4',
    primaryFg: '#0a0a0a',
    bgPrimary: '#08090a',
    bgSecondary: '#15191c',
    cardGradient: 'linear-gradient(135deg, #164e63 0%, #06b6d4 100%)',
    bgEffect: 'AURORA',
  },
  {
    id: 'violet',
    primary: '#a855f7',
    primaryFg: '#0a0a0a',
    bgPrimary: '#0a0812',
    bgSecondary: '#1a1625',
    cardGradient: 'linear-gradient(135deg, #4c1d95 0%, #a855f7 100%)',
    bgEffect: 'AURORA',
  },
  {
    id: 'amber',
    primary: '#f59e0b',
    primaryFg: '#0a0a0a',
    bgPrimary: '#0c0a09',
    bgSecondary: '#1c1917',
    cardGradient: 'linear-gradient(135deg, #78350f 0%, #f59e0b 100%)',
    bgEffect: 'MESH',
  },
  {
    id: 'mono',
    primary: '#e5e5e5',
    primaryFg: '#0a0a0a',
    bgPrimary: '#0a0a0a',
    bgSecondary: '#171717',
    cardGradient: 'linear-gradient(135deg, #262626 0%, #525252 100%)',
    bgEffect: 'NOISE',
  },
] as const;

/**
 * Curated card-gradient presets. Each is a ready-made CSS background for the
 * subscription card — operators pick one with a click (like the theme/logo
 * grids) instead of hand-writing CSS. The `id` doubles as the i18n label key.
 * Mix of linear and radial/conic styles so there's real visual variety.
 */
export interface CardGradientPreset {
  readonly id: string;
  readonly value: string;
}

export const CARD_GRADIENT_PRESETS: readonly CardGradientPreset[] = [
  { id: 'emerald', value: 'linear-gradient(135deg, #064e3b 0%, #22c55e 100%)' },
  { id: 'indigo', value: 'linear-gradient(135deg, #1e1b4b 0%, #6366f1 100%)' },
  { id: 'sunset', value: 'linear-gradient(135deg, #7c2d12 0%, #f97316 100%)' },
  { id: 'rose', value: 'linear-gradient(135deg, #881337 0%, #f43f5e 100%)' },
  { id: 'cyan', value: 'linear-gradient(135deg, #164e63 0%, #06b6d4 100%)' },
  { id: 'violet', value: 'linear-gradient(135deg, #4c1d95 0%, #a855f7 100%)' },
  { id: 'amber', value: 'linear-gradient(135deg, #78350f 0%, #f59e0b 100%)' },
  { id: 'slate', value: 'linear-gradient(135deg, #1e293b 0%, #64748b 100%)' },
  { id: 'midnight', value: 'linear-gradient(135deg, #0f172a 0%, #334155 60%, #0ea5e9 100%)' },
  { id: 'aurora', value: 'linear-gradient(135deg, #042f2e 0%, #0d9488 45%, #6366f1 100%)' },
  { id: 'fire', value: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 50%, #f59e0b 100%)' },
  { id: 'grape', value: 'linear-gradient(135deg, #2e1065 0%, #7c3aed 55%, #ec4899 100%)' },
  { id: 'ocean', value: 'linear-gradient(135deg, #0c4a6e 0%, #0284c7 50%, #06b6d4 100%)' },
  { id: 'forest', value: 'linear-gradient(135deg, #14532d 0%, #16a34a 60%, #84cc16 100%)' },
  { id: 'gold', value: 'linear-gradient(135deg, #422006 0%, #a16207 50%, #facc15 100%)' },
  { id: 'mono', value: 'linear-gradient(135deg, #262626 0%, #525252 100%)' },
  { id: 'glow', value: 'radial-gradient(circle at 30% 20%, #6366f1 0%, #1e1b4b 70%)' },
  { id: 'spotlight', value: 'radial-gradient(circle at 70% 30%, #f43f5e 0%, #4c0519 75%)' },
  { id: 'conic', value: 'conic-gradient(from 210deg at 70% 30%, #6366f1, #ec4899, #f59e0b, #6366f1)' },
  { id: 'nebula', value: 'radial-gradient(circle at 50% 0%, #7c3aed 0%, #1e1b4b 55%, #020617 100%)' },
] as const;

/** Font-family options offered in the configurator (label key → CSS stack). */
export const FONT_OPTIONS: readonly { readonly id: string; readonly value: string }[] = [
  { id: 'geist', value: 'Geist Variable, system-ui, sans-serif' },
  { id: 'inter', value: 'Inter, system-ui, sans-serif' },
  { id: 'system', value: 'system-ui, -apple-system, sans-serif' },
  { id: 'mono', value: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
  { id: 'rounded', value: '"SF Pro Rounded", "Nunito", system-ui, sans-serif' },
  { id: 'serif', value: 'Georgia, "Times New Roman", serif' },
] as const;

/**
 * Builds a 135° two-stop card gradient from a single brand colour: a darkened
 * shade → the colour itself. Mirrors the SPA's `brandAuroraStops` intent so the
 * card preview tracks the chosen primary.
 */
export function gradientFromPrimary(primary: string): string {
  const dark = shade(primary, -0.55);
  return `linear-gradient(135deg, ${dark} 0%, ${primary} 100%)`;
}

function shade(hex: string, amount: number): string {
  const m = hex.trim().replace(/^#/, '');
  const full =
    m.length === 3
      ? m.split('').map((c) => c + c).join('')
      : m;
  if (full.length < 6) return hex;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const mix = (n: number) =>
    amount >= 0
      ? Math.round(n + (255 - n) * amount)
      : Math.round(n * (1 + amount));
  const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
}

/**
 * Card-effect registry (WEB Reiwa configurator).
 * ──────────────────────────────────────────────
 * The animated ReactBits effects an operator can place BEHIND the reiwa
 * subscription card. Mirrors the reiwa SPA registry
 * (`reiwa/web/src/components/reactbits/registry.ts`) — keep both in lockstep.
 *
 * Only the dependency-light effects (ogl + canvas) are exposed; reiwa ships
 * `ogl` but not three.js, so Silk/Beams/Dither are intentionally excluded.
 *
 * Each effect reuses the existing admin `components/reactbits/<Name>` so the
 * configurator preview renders the REAL effect, and the control defs drive the
 * tunable parameter UI + the params we persist to branding.
 */

import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

import type { ControlDef } from '@/features/appearance/background-controls'

export type CardEffectId =
  | 'aurora'
  | 'threads'
  | 'softAurora'
  | 'rippleGrid'
  | 'radar'
  | 'plasma'
  | 'particles'
  | 'liquidChrome'
  | 'lineWaves'
  | 'iridescence'
  | 'grainient'
  | 'galaxy'
  | 'balatro'
  | 'waves'
  | 'silk'
  | 'beams'
  | 'dither'

type EffectComponent = LazyExoticComponent<ComponentType<Record<string, unknown>>>

/** Lazy components reused from the admin's reactbits set (preview only). */
export const CARD_EFFECT_COMPONENTS: Record<CardEffectId, EffectComponent> = {
  aurora: lazy(() => import('@/components/reactbits/Aurora')),
  threads: lazy(() => import('@/components/reactbits/Threads')),
  softAurora: lazy(() => import('@/components/reactbits/SoftAurora')),
  rippleGrid: lazy(() => import('@/components/reactbits/RippleGrid')),
  radar: lazy(() => import('@/components/reactbits/Radar')),
  plasma: lazy(() => import('@/components/reactbits/Plasma')),
  particles: lazy(() => import('@/components/reactbits/Particles')),
  liquidChrome: lazy(() => import('@/components/reactbits/LiquidChrome')),
  lineWaves: lazy(() => import('@/components/reactbits/LineWaves')),
  iridescence: lazy(() => import('@/components/reactbits/Iridescence')),
  grainient: lazy(() => import('@/components/reactbits/Grainient')),
  galaxy: lazy(() => import('@/components/reactbits/Galaxy')),
  balatro: lazy(() => import('@/components/reactbits/Balatro')),
  waves: lazy(() => import('@/components/reactbits/Waves')),
  silk: lazy(() => import('@/components/reactbits/Silk')),
  beams: lazy(() => import('@/components/reactbits/Beams')),
  dither: lazy(() => import('@/components/reactbits/Dither')),
}

export interface CardEffectDef {
  id: CardEffectId
  /** Default English display name — also i18n fallback. */
  name: string
  controls: ControlDef[]
}

/** Tunable params per effect (subset of the full appearance registry). */
export const CARD_EFFECT_REGISTRY: readonly CardEffectDef[] = [
  {
    id: 'aurora', name: 'Aurora',
    controls: [
      { prop: 'speed', label: 'Speed', type: 'slider', min: 0.1, max: 5, step: 0.1, default: 1 },
      { prop: 'amplitude', label: 'Amplitude', type: 'slider', min: 0.1, max: 3, step: 0.1, default: 1 },
      { prop: 'blend', label: 'Blend', type: 'slider', min: 0, max: 1, step: 0.05, default: 0.5 },
      { prop: 'colorStops', label: 'Colors', type: 'colorArray', count: 3, default: ['#5227FF', '#7cff67', '#5227FF'] },
    ],
  },
  {
    id: 'threads', name: 'Threads',
    controls: [
      { prop: 'color', label: 'Color', type: 'rgbColor', default: [1, 1, 1] },
      { prop: 'amplitude', label: 'Amplitude', type: 'slider', min: 0.1, max: 3, step: 0.1, default: 1 },
      { prop: 'distance', label: 'Distance', type: 'slider', min: 0, max: 2, step: 0.1, default: 0 },
    ],
  },
  {
    id: 'softAurora', name: 'Soft Aurora',
    controls: [
      { prop: 'color1', label: 'Color 1', type: 'color', default: '#f7f7f7' },
      { prop: 'color2', label: 'Color 2', type: 'color', default: '#e100ff' },
      { prop: 'speed', label: 'Speed', type: 'slider', min: 0.1, max: 3, step: 0.1, default: 0.6 },
      { prop: 'scale', label: 'Scale', type: 'slider', min: 0.5, max: 5, step: 0.1, default: 1.5 },
      { prop: 'brightness', label: 'Brightness', type: 'slider', min: 0.1, max: 3, step: 0.1, default: 1 },
      { prop: 'noiseFrequency', label: 'Noise Frequency', type: 'slider', min: 0.5, max: 10, step: 0.5, default: 2.5 },
    ],
  },
  {
    id: 'rippleGrid', name: 'Ripple Grid',
    controls: [
      { prop: 'gridColor', label: 'Grid Color', type: 'color', default: '#ffffff' },
      { prop: 'rippleIntensity', label: 'Ripple Intensity', type: 'slider', min: 0.01, max: 0.2, step: 0.01, default: 0.05 },
      { prop: 'gridSize', label: 'Grid Size', type: 'slider', min: 2, max: 30, step: 1, default: 10 },
      { prop: 'glowIntensity', label: 'Glow', type: 'slider', min: 0, max: 0.5, step: 0.05, default: 0.1 },
      { prop: 'enableRainbow', label: 'Rainbow', type: 'toggle', default: false },
    ],
  },
  {
    id: 'radar', name: 'Radar',
    controls: [
      { prop: 'color', label: 'Color', type: 'color', default: '#9f29ff' },
      { prop: 'speed', label: 'Speed', type: 'slider', min: 0.1, max: 5, step: 0.1, default: 1 },
      { prop: 'ringCount', label: 'Rings', type: 'slider', min: 3, max: 20, step: 1, default: 10 },
      { prop: 'spokeCount', label: 'Spokes', type: 'slider', min: 3, max: 20, step: 1, default: 10 },
      { prop: 'sweepSpeed', label: 'Sweep Speed', type: 'slider', min: 0.1, max: 5, step: 0.1, default: 1 },
      { prop: 'brightness', label: 'Brightness', type: 'slider', min: 0.1, max: 3, step: 0.1, default: 1 },
    ],
  },
  {
    id: 'plasma', name: 'Plasma',
    controls: [
      { prop: 'color', label: 'Color', type: 'color', default: '#ffffff' },
      { prop: 'speed', label: 'Speed', type: 'slider', min: 0.1, max: 5, step: 0.1, default: 1 },
      { prop: 'scale', label: 'Scale', type: 'slider', min: 0.1, max: 5, step: 0.1, default: 1 },
    ],
  },
  {
    id: 'particles', name: 'Particles',
    controls: [
      { prop: 'particleColors', label: 'Colors', type: 'colorArray', count: 3, default: ['#ffffff', '#ffffff', '#ffffff'] },
      { prop: 'particleCount', label: 'Count', type: 'slider', min: 50, max: 500, step: 10, default: 200 },
      { prop: 'speed', label: 'Speed', type: 'slider', min: 0.01, max: 1, step: 0.01, default: 0.1 },
      { prop: 'particleBaseSize', label: 'Size', type: 'slider', min: 10, max: 300, step: 10, default: 100 },
    ],
  },
  {
    id: 'liquidChrome', name: 'Liquid Chrome',
    controls: [
      { prop: 'baseColor', label: 'Base Color', type: 'rgbColor', default: [0.1, 0.1, 0.1] },
      { prop: 'speed', label: 'Speed', type: 'slider', min: 0.01, max: 1, step: 0.01, default: 0.2 },
      { prop: 'amplitude', label: 'Amplitude', type: 'slider', min: 0.1, max: 2, step: 0.1, default: 0.5 },
      { prop: 'frequencyX', label: 'Frequency X', type: 'slider', min: 1, max: 10, step: 0.5, default: 3 },
      { prop: 'frequencyY', label: 'Frequency Y', type: 'slider', min: 1, max: 10, step: 0.5, default: 2 },
    ],
  },
  {
    id: 'lineWaves', name: 'Line Waves',
    controls: [
      { prop: 'color1', label: 'Color 1', type: 'color', default: '#ffffff' },
      { prop: 'color2', label: 'Color 2', type: 'color', default: '#ffffff' },
      { prop: 'color3', label: 'Color 3', type: 'color', default: '#ffffff' },
      { prop: 'speed', label: 'Speed', type: 'slider', min: 0.05, max: 2, step: 0.05, default: 0.3 },
      { prop: 'brightness', label: 'Brightness', type: 'slider', min: 0.05, max: 1, step: 0.05, default: 0.2 },
      { prop: 'warpIntensity', label: 'Warp', type: 'slider', min: 0, max: 5, step: 0.1, default: 1 },
    ],
  },
  {
    id: 'iridescence', name: 'Iridescence',
    controls: [
      { prop: 'color', label: 'Color', type: 'rgbColor', default: [1, 1, 1] },
      { prop: 'speed', label: 'Speed', type: 'slider', min: 0.1, max: 5, step: 0.1, default: 1 },
      { prop: 'amplitude', label: 'Amplitude', type: 'slider', min: 0.01, max: 1, step: 0.01, default: 0.1 },
    ],
  },
  {
    id: 'grainient', name: 'Grainient',
    controls: [
      { prop: 'color1', label: 'Color 1', type: 'color', default: '#FF9FFC' },
      { prop: 'color2', label: 'Color 2', type: 'color', default: '#5227FF' },
      { prop: 'color3', label: 'Color 3', type: 'color', default: '#B497CF' },
      { prop: 'timeSpeed', label: 'Speed', type: 'slider', min: 0.05, max: 2, step: 0.05, default: 0.25 },
      { prop: 'grainAmount', label: 'Grain', type: 'slider', min: 0, max: 0.5, step: 0.01, default: 0.1 },
      { prop: 'warpStrength', label: 'Warp', type: 'slider', min: 0, max: 5, step: 0.1, default: 1 },
    ],
  },
  {
    id: 'galaxy', name: 'Galaxy',
    controls: [
      { prop: 'speed', label: 'Speed', type: 'slider', min: 0.1, max: 5, step: 0.1, default: 1 },
      { prop: 'density', label: 'Density', type: 'slider', min: 0.1, max: 3, step: 0.1, default: 1 },
      { prop: 'hueShift', label: 'Hue Shift', type: 'slider', min: 0, max: 360, step: 5, default: 140 },
      { prop: 'glowIntensity', label: 'Glow', type: 'slider', min: 0, max: 1, step: 0.05, default: 0.3 },
      { prop: 'twinkleIntensity', label: 'Twinkle', type: 'slider', min: 0, max: 1, step: 0.05, default: 0.3 },
    ],
  },
  {
    id: 'balatro', name: 'Balatro',
    controls: [
      { prop: 'color1', label: 'Color 1', type: 'color', default: '#DE443B' },
      { prop: 'color2', label: 'Color 2', type: 'color', default: '#006BB4' },
      { prop: 'color3', label: 'Color 3', type: 'color', default: '#162325' },
      { prop: 'spinSpeed', label: 'Spin Speed', type: 'slider', min: 0.5, max: 15, step: 0.5, default: 7 },
      { prop: 'contrast', label: 'Contrast', type: 'slider', min: 1, max: 8, step: 0.5, default: 3.5 },
      { prop: 'lighting', label: 'Lighting', type: 'slider', min: 0, max: 1, step: 0.05, default: 0.4 },
    ],
  },
  {
    id: 'waves', name: 'Waves',
    controls: [
      { prop: 'lineColor', label: 'Line Color', type: 'color', default: '#ffffff' },
      { prop: 'waveSpeedX', label: 'Speed X', type: 'slider', min: 0.001, max: 0.05, step: 0.001, default: 0.0125 },
      { prop: 'waveAmpX', label: 'Amplitude X', type: 'slider', min: 5, max: 100, step: 5, default: 32 },
      { prop: 'xGap', label: 'X Gap', type: 'slider', min: 2, max: 30, step: 1, default: 10 },
      { prop: 'yGap', label: 'Y Gap', type: 'slider', min: 5, max: 60, step: 1, default: 32 },
    ],
  },
  {
    id: 'silk', name: 'Silk',
    controls: [
      { prop: 'speed', label: 'Speed', type: 'slider', min: 0.1, max: 10, step: 0.1, default: 5 },
      { prop: 'scale', label: 'Scale', type: 'slider', min: 0.1, max: 5, step: 0.1, default: 1 },
      { prop: 'color', label: 'Color', type: 'color', default: '#7b7481' },
      { prop: 'noiseIntensity', label: 'Noise Intensity', type: 'slider', min: 0, max: 5, step: 0.1, default: 1.5 },
      { prop: 'rotation', label: 'Rotation', type: 'slider', min: -180, max: 180, step: 1, default: 0 },
    ],
  },
  {
    id: 'beams', name: 'Beams',
    controls: [
      { prop: 'lightColor', label: 'Light Color', type: 'color', default: '#ffffff' },
      { prop: 'speed', label: 'Speed', type: 'slider', min: 0.5, max: 10, step: 0.5, default: 2 },
      { prop: 'beamWidth', label: 'Beam Width', type: 'slider', min: 0.5, max: 5, step: 0.5, default: 2 },
      { prop: 'beamNumber', label: 'Beam Count', type: 'slider', min: 4, max: 30, step: 1, default: 12 },
      { prop: 'noiseIntensity', label: 'Noise', type: 'slider', min: 0, max: 5, step: 0.25, default: 1.75 },
      { prop: 'scale', label: 'Scale', type: 'slider', min: 0.05, max: 1, step: 0.05, default: 0.2 },
    ],
  },
  {
    id: 'dither', name: 'Dither',
    controls: [
      { prop: 'waveColor', label: 'Color', type: 'rgbColor', default: [0.5, 0.5, 0.5] },
      { prop: 'waveSpeed', label: 'Speed', type: 'slider', min: 0.01, max: 0.2, step: 0.01, default: 0.05 },
      { prop: 'waveFrequency', label: 'Frequency', type: 'slider', min: 1, max: 10, step: 0.5, default: 3 },
      { prop: 'waveAmplitude', label: 'Amplitude', type: 'slider', min: 0.05, max: 1, step: 0.05, default: 0.3 },
      { prop: 'pixelSize', label: 'Pixel Size', type: 'slider', min: 1, max: 8, step: 1, default: 2 },
      { prop: 'colorNum', label: 'Color Levels', type: 'slider', min: 2, max: 8, step: 1, default: 4 },
    ],
  },
]

export function getCardEffectDef(id: string): CardEffectDef | undefined {
  return CARD_EFFECT_REGISTRY.find((e) => e.id === id)
}

export function getCardEffectDefaults(id: string): Record<string, unknown> {
  const def = getCardEffectDef(id)
  if (!def) return {}
  const props: Record<string, unknown> = {}
  for (const c of def.controls) props[c.prop] = c.default
  return props
}

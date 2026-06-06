/**
 * GradientBuilder — visual constructor for the subscription-card gradient.
 *
 * Instead of hand-writing CSS, the operator picks a gradient type
 * (linear/radial), drags an angle slider, and edits 2–4 colour stops (colour +
 * position). The component composes the corresponding `linear-gradient(...)` /
 * `radial-gradient(...)` CSS string and emits it through `onChange`, which the
 * branding form writes to `cardGradient`.
 *
 * It keeps its own working state (seeded once from the incoming value when it
 * is parseable) so the controls stay smooth; every edit writes the freshly
 * composed CSS back up so the live preview + form stay in sync.
 */

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'

type GradientType = 'linear' | 'radial'

interface Stop {
  color: string
  /** 0–100 percentage along the gradient axis. */
  position: number
}

interface GradientBuilderProps {
  value: string
  onChange: (css: string) => void
}

const DEFAULT_STOPS: Stop[] = [
  { color: '#064e3b', position: 0 },
  { color: '#22c55e', position: 100 },
]

/** Compose a CSS gradient string from the builder state. */
function composeGradient(type: GradientType, angle: number, stops: Stop[]): string {
  const sorted = [...stops].sort((a, b) => a.position - b.position)
  const parts = sorted.map((s) => `${s.color} ${Math.round(s.position)}%`).join(', ')
  if (type === 'radial') {
    return `radial-gradient(circle at 50% 50%, ${parts})`
  }
  return `linear-gradient(${Math.round(angle)}deg, ${parts})`
}

/**
 * Best-effort parse of an existing gradient string into builder state. Only
 * handles the simple shapes this builder emits; anything else falls back to
 * defaults (the builder still works, it just starts fresh).
 */
function parseGradient(value: string): { type: GradientType; angle: number; stops: Stop[] } | null {
  const v = value.trim()
  const hexStop = /(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))\s*(\d+)%/g

  if (v.startsWith('linear-gradient')) {
    const angleMatch = v.match(/linear-gradient\(\s*(-?\d+(?:\.\d+)?)deg/)
    const angle = angleMatch ? Number(angleMatch[1]) : 135
    const stops: Stop[] = []
    let m: RegExpExecArray | null
    while ((m = hexStop.exec(v)) !== null) {
      stops.push({ color: m[1], position: Number(m[2]) })
    }
    if (stops.length >= 2) return { type: 'linear', angle, stops }
  } else if (v.startsWith('radial-gradient')) {
    const stops: Stop[] = []
    let m: RegExpExecArray | null
    while ((m = hexStop.exec(v)) !== null) {
      stops.push({ color: m[1], position: Number(m[2]) })
    }
    if (stops.length >= 2) return { type: 'radial', angle: 135, stops }
  }
  return null
}

export function GradientBuilder({ value, onChange }: GradientBuilderProps) {
  const { t } = useTranslation()

  const initial = parseGradient(value)
  const [type, setType] = useState<GradientType>(initial?.type ?? 'linear')
  const [angle, setAngle] = useState<number>(initial?.angle ?? 135)
  const [stops, setStops] = useState<Stop[]>(initial?.stops ?? DEFAULT_STOPS)

  // Track the last CSS this builder emitted so we can tell our own edits apart
  // from external changes (preset swatch click, "from primary", manual input,
  // branding load). When `value` changes for any reason other than our own
  // emit, re-seed the controls from it so the builder stays in sync.
  const lastEmitted = useRef<string>(composeGradient(type, angle, stops))
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const incoming = (value ?? '').trim()
      if (incoming === lastEmitted.current.trim()) return
    const parsed = parseGradient(incoming)
    if (!parsed) return
    setType(parsed.type)
    setAngle(parsed.angle)
    setStops(parsed.stops)
    lastEmitted.current = incoming
  }, [value])
  /* eslint-enable react-hooks/set-state-in-effect */

  const preview = composeGradient(type, angle, stops)

  function emit(nextType: GradientType, nextAngle: number, nextStops: Stop[]): void {
    const css = composeGradient(nextType, nextAngle, nextStops)
    lastEmitted.current = css
    onChange(css)
  }

  function handleType(next: GradientType): void {
    setType(next)
    emit(next, angle, stops)
  }

  function handleAngle(next: number): void {
    setAngle(next)
    emit(type, next, stops)
  }

  function handleStopColor(index: number, color: string): void {
    const next = stops.map((s, i) => (i === index ? { ...s, color } : s))
    setStops(next)
    emit(type, angle, next)
  }

  function handleStopPosition(index: number, position: number): void {
    const next = stops.map((s, i) => (i === index ? { ...s, position } : s))
    setStops(next)
    emit(type, angle, next)
  }

  function addStop(): void {
    if (stops.length >= 4) return
    // Insert a midpoint stop between the last two.
    const last = stops[stops.length - 1]
    const prev = stops[stops.length - 2]
    const mid: Stop = {
      color: last?.color ?? '#ffffff',
      position: prev ? Math.round((prev.position + last.position) / 2) : 50,
    }
    const next = [...stops.slice(0, -1), mid, last]
    setStops(next)
    emit(type, angle, next)
  }

  function removeStop(index: number): void {
    if (stops.length <= 2) return
    const next = stops.filter((_, i) => i !== index)
    setStops(next)
    emit(type, angle, next)
  }

  return (
    <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium">{t('brandingPage.sections.card.builderTitle')}</Label>
        {/* Type toggle */}
        <div className="flex overflow-hidden rounded-md border">
          {(['linear', 'radial'] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => handleType(g)}
              className={`px-2.5 py-1 text-[11px] font-medium transition-colors ${
                type === g ? 'bg-primary text-primary-foreground' : 'bg-transparent text-muted-foreground hover:bg-muted'
              }`}
            >
              {t(`brandingPage.sections.card.builder_${g}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Live preview */}
      <div className="h-9 w-full rounded-md ring-1 ring-border" style={{ backgroundImage: preview }} />

      {/* Angle (linear only) */}
      {type === 'linear' && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs">{t('brandingPage.sections.card.builderAngle')}</Label>
            <span className="font-mono text-[10px] text-muted-foreground">{Math.round(angle)}°</span>
          </div>
          <Slider
            value={[angle]}
            min={0}
            max={360}
            step={1}
            onValueChange={(v: number[]) => handleAngle(v[0] ?? angle)}
            aria-label={t('brandingPage.sections.card.builderAngle')}
          />
        </div>
      )}

      {/* Colour stops */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">{t('brandingPage.sections.card.builderStops')}</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[11px]"
            onClick={addStop}
            disabled={stops.length >= 4}
          >
            <Plus className="mr-1 h-3 w-3" />
            {t('brandingPage.sections.card.builderAddStop')}
          </Button>
        </div>
        <div className="space-y-2">
          {stops.map((stop, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="color"
                value={/^#[0-9a-fA-F]{6}$/.test(stop.color) ? stop.color : '#ffffff'}
                onChange={(e) => handleStopColor(i, e.target.value)}
                className="h-7 w-9 shrink-0 cursor-pointer rounded border"
                aria-label={t('brandingPage.sections.card.builderStopColor', { index: i + 1 })}
              />
              <Slider
                value={[stop.position]}
                min={0}
                max={100}
                step={1}
                onValueChange={(v: number[]) => handleStopPosition(i, v[0] ?? stop.position)}
                aria-label={t('brandingPage.sections.card.builderStopPosition', { index: i + 1 })}
              />
              <span className="w-9 shrink-0 text-right font-mono text-[10px] text-muted-foreground">
                {Math.round(stop.position)}%
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => removeStop(i)}
                disabled={stops.length <= 2}
                aria-label={t('brandingPage.sections.card.builderRemoveStop')}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

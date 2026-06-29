/**
 * NavConfigSection — WEB Reiwa configurator block (Навигация tab).
 *
 * Lets the operator choose which destinations appear in the reiwa cabinet
 * bottom navigation (and in what order), and hide the rest (they stay
 * reachable from Settings). `subscriptions` and `settings` are essential —
 * always visible, locked on. At most `NAV_MAX_VISIBLE` destinations can be
 * shown at once. Persists into `brandingSettings.navItems`.
 */
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronUp, Lock } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import {
  BRANDING_NAV_DESTINATIONS,
  BRANDING_NAV_ESSENTIALS,
  type NavDestinationId,
  type NavItemDraft,
} from './branding-form-schema'

const NAV_MAX_VISIBLE = 5

function isEssential(id: NavDestinationId): boolean {
  return (BRANDING_NAV_ESSENTIALS as readonly string[]).includes(id)
}

/** Ensure every destination is present once, essentials forced visible. */
function normalize(value: readonly NavItemDraft[] | undefined): NavItemDraft[] {
  const seen = new Set<NavDestinationId>()
  const out: NavItemDraft[] = []
  for (const item of value ?? []) {
    if (!(BRANDING_NAV_DESTINATIONS as readonly string[]).includes(item.id) || seen.has(item.id)) continue
    seen.add(item.id)
    out.push({ id: item.id, visible: isEssential(item.id) ? true : item.visible })
  }
  for (const id of BRANDING_NAV_DESTINATIONS) {
    if (!seen.has(id)) out.push({ id, visible: isEssential(id) })
  }
  return out
}

interface NavConfigSectionProps {
  readonly value: readonly NavItemDraft[]
  readonly onChange: (next: NavItemDraft[]) => void
}

export function NavConfigSection({ value, onChange }: NavConfigSectionProps) {
  const { t } = useTranslation()
  const items = useMemo(() => normalize(value), [value])
  const visibleCount = items.filter((i) => i.visible).length

  const toggle = (id: NavDestinationId) => {
    if (isEssential(id)) return
    onChange(items.map((i) => (i.id === id ? { ...i, visible: !i.visible } : i)))
  }

  const move = (index: number, dir: -1 | 1) => {
    const j = index + dir
    if (j < 0 || j >= items.length) return
    const next = [...items]
    const tmp = next[index]
    next[index] = next[j]
    next[j] = tmp
    onChange(next)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('brandingPage.sections.nav.title')}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {t('brandingPage.sections.nav.description')}
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-muted-foreground">
          {t('brandingPage.sections.nav.maxHint', { count: NAV_MAX_VISIBLE })}
        </p>
        {items.map((item, index) => {
          const essential = isEssential(item.id)
          const capReached = !item.visible && visibleCount >= NAV_MAX_VISIBLE
          return (
            <div
              key={item.id}
              className={cn(
                'flex items-center gap-3 rounded-lg border p-3 transition-colors',
                item.visible ? 'bg-primary/5' : 'bg-muted/10',
              )}
            >
              <div className="flex flex-col">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  aria-label={t('brandingPage.sections.nav.moveUp')}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  aria-label={t('brandingPage.sections.nav.moveDown')}
                  disabled={index === items.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </div>
              <span className="flex-1 text-sm font-medium">
                {t(`brandingPage.sections.nav.dest.${item.id}`)}
              </span>
              {essential && (
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  {t('brandingPage.sections.nav.locked')}
                </span>
              )}
              <Switch
                checked={item.visible}
                disabled={essential || capReached}
                onCheckedChange={() => toggle(item.id)}
                aria-label={t(`brandingPage.sections.nav.dest.${item.id}`)}
              />
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

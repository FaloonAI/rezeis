/**
 * NavConfigSection — WEB Reiwa configurator block (Навигация tab).
 *
 * Lets the operator choose which destinations appear in the reiwa cabinet
 * bottom navigation (and in what order), and hide the rest (they stay
 * reachable from Settings). `subscriptions` and `settings` are essential —
 * always visible, locked on. At most `NAV_MAX_VISIBLE` destinations can be
 * shown at once. Order is set by free drag-and-drop. Persists into
 * `brandingSettings.navItems`.
 */
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Lock } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const toggle = (id: NavDestinationId) => {
    if (isEssential(id)) return
    onChange(items.map((i) => (i.id === id ? { ...i, visible: !i.visible } : i)))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const from = items.findIndex((i) => i.id === active.id)
    const to = items.findIndex((i) => i.id === over.id)
    if (from === -1 || to === -1) return
    onChange(arrayMove(items, from, to))
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
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {items.map((item) => (
                <SortableNavRow
                  key={item.id}
                  item={item}
                  essential={isEssential(item.id)}
                  capReached={!item.visible && visibleCount >= NAV_MAX_VISIBLE}
                  onToggle={() => toggle(item.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </CardContent>
    </Card>
  )
}

interface SortableNavRowProps {
  readonly item: NavItemDraft
  readonly essential: boolean
  readonly capReached: boolean
  readonly onToggle: () => void
}

function SortableNavRow({ item, essential, capReached, onToggle }: SortableNavRowProps) {
  const { t } = useTranslation()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 rounded-lg border p-3 transition-colors',
        item.visible ? 'bg-primary/5' : 'bg-muted/10',
        isDragging && 'opacity-80 shadow-lg',
      )}
    >
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing focus:outline-none"
        aria-label={t('brandingPage.sections.nav.dragHandle')}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" aria-hidden="true" />
      </button>
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
        onCheckedChange={onToggle}
        aria-label={t(`brandingPage.sections.nav.dest.${item.id}`)}
      />
    </div>
  )
}

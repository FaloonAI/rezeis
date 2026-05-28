/**
 * ReplyKeyboardEditorPanel — right-side inspector for the pinned reply-
 * keyboard pseudo-node on the Bot Studio canvas.
 *
 * Mirrors the existing ScreenEditorPanel's contract: the panel is rendered
 * inside the canvas page when the corresponding node is selected, and it
 * owns its own data fetches + mutations against the bot-config endpoints.
 *
 * The DnD pattern follows the well-trodden codebase recipe in
 * features/remnawave/infra/infra-hosts-section.tsx:
 *   - Local optimistic copy resyncs whenever upstream refetches.
 *   - DragEnd computes the new order and fires the reorder mutation
 *     immediately; failure paths trigger a refetch which restores the
 *     authoritative server state via the resync effect.
 *
 * Following the official TanStack Query v5 optimistic-update guide the
 * visibility toggle uses cancel → snapshot → setQueryData → return ctx →
 * onError restores → onSettled invalidates.
 */
import { useEffect, useState, type CSSProperties, type JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Eye, EyeOff, GripVertical, Pencil, Plus } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

import {
  BOT_CONFIG_KEYS,
  type BotButton,
  botConfigApi,
} from './bot-config-api'
import { BotButtonCreateDialog, BotButtonEditDialog } from './bot-button-dialogs'

export function ReplyKeyboardEditorPanel(): JSX.Element {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const { data: buttons, isLoading } = useQuery({
    queryKey: BOT_CONFIG_KEYS.buttons,
    queryFn: botConfigApi.listButtons,
  })

  const [order, setOrder] = useState<BotButton[]>([])
  useEffect(() => {
    if (buttons) {
      setOrder([...buttons].sort((a, b) => a.orderIndex - b.orderIndex))
    }
  }, [buttons])

  const reorderMutation = useMutation({
    mutationFn: (ids: string[]) => botConfigApi.reorderButtons(ids),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: BOT_CONFIG_KEYS.buttons })
      toast.success(t('botConfigPage.buttons.toasts.reordered'))
    },
    onError: () => {
      toast.error(t('botConfigPage.buttons.toasts.reorderFailed'))
      void queryClient.invalidateQueries({ queryKey: BOT_CONFIG_KEYS.buttons })
    },
  })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent): void {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setOrder((prev) => {
      const oldIndex = prev.findIndex((b) => b.id === active.id)
      const newIndex = prev.findIndex((b) => b.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return prev
      const next = arrayMove(prev, oldIndex, newIndex)
      reorderMutation.mutate(next.map((b) => b.id))
      return next
    })
  }

  const toggleVisibilityMutation = useMutation({
    mutationFn: ({ id, visible }: { readonly id: string; readonly visible: boolean }) =>
      botConfigApi.updateButton(id, { visible }),
    onMutate: async ({ id, visible }) => {
      await queryClient.cancelQueries({ queryKey: BOT_CONFIG_KEYS.buttons })
      const previous = queryClient.getQueryData<BotButton[]>(BOT_CONFIG_KEYS.buttons)
      queryClient.setQueryData<BotButton[]>(BOT_CONFIG_KEYS.buttons, (old) =>
        old ? old.map((b) => (b.id === id ? { ...b, visible } : b)) : old,
      )
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(BOT_CONFIG_KEYS.buttons, ctx.previous)
      toast.error(t('botConfigPage.buttons.toasts.updateFailed'))
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: BOT_CONFIG_KEYS.buttons })
    },
  })

  const [editing, setEditing] = useState<BotButton | null>(null)
  const [creating, setCreating] = useState(false)

  if (isLoading) {
    return (
      <div className="space-y-2 p-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-semibold">{t('botStudio.replyKeyboard.title')}</h3>
        <p className="text-xs text-muted-foreground">{t('botStudio.replyKeyboard.subtitle')}</p>
      </div>

      <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-[11px] leading-relaxed text-emerald-700 dark:text-emerald-400">
        {t('botStudio.replyKeyboard.autoSaveHint')}
      </div>

      <Button size="sm" variant="outline" onClick={() => setCreating(true)}>
        <Plus className="mr-1 h-4 w-4" aria-hidden />
        {t('botConfigPage.buttons.create')}
      </Button>

      {order.length === 0 ? (
        <p className="rounded-md border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
          {t('botConfigPage.buttons.empty')}
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={order.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <ul className="divide-y divide-border/60 rounded-md border">
              {order.map((button) => (
                <SortableReplyButton
                  key={button.id}
                  button={button}
                  onEdit={() => setEditing(button)}
                  onToggleVisible={(visible) =>
                    toggleVisibilityMutation.mutate({ id: button.id, visible })
                  }
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <BotButtonEditDialog
        button={editing}
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null)
        }}
      />
      <BotButtonCreateDialog open={creating} onOpenChange={setCreating} />
    </div>
  )
}

interface SortableReplyButtonProps {
  readonly button: BotButton
  readonly onEdit: () => void
  readonly onToggleVisible: (visible: boolean) => void
}

function SortableReplyButton({
  button,
  onEdit,
  onToggleVisible,
}: SortableReplyButtonProps): JSX.Element {
  const { t } = useTranslation()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: button.id,
  })

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-start gap-2 px-2 py-2 text-sm',
        isDragging && 'bg-muted/40',
      )}
    >
      <button
        type="button"
        className="mt-1 cursor-grab touch-none rounded px-1 text-muted-foreground hover:text-foreground"
        aria-label={t('botConfigPage.buttons.dragHandle')}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" aria-hidden />
      </button>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{button.label}</span>
          <Badge variant={button.style === 'PRIMARY' ? 'default' : 'secondary'} className="text-[10px]">
            {t(`botConfigPage.buttons.styles.${button.style}`)}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">{button.buttonId}</code>
          {button.onePerRow && (
            <Badge variant="outline" className="text-[10px]">
              {t('botConfigPage.buttons.onePerRow')}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Switch
          checked={button.visible}
          onCheckedChange={onToggleVisible}
          aria-label={t('botConfigPage.buttons.toggleVisible')}
        />
        {button.visible ? (
          <Eye className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
        ) : (
          <EyeOff className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
        )}
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('botConfigPage.buttons.edit')}
          onClick={onEdit}
          className="h-7 w-7"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden />
        </Button>
      </div>
    </li>
  )
}

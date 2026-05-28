/**
 * Standalone tab listing the global reply-keyboard buttons (DnD reorder
 * + visibility toggle + edit/create dialogs). Kept around for embedding
 * inside Sheet drawers from the Bot Studio toolbar.
 *
 * The Bot Studio canvas itself uses ReplyKeyboardEditorPanel (a more
 * compact version that fits the 320px right inspector). Both share the
 * same edit / create dialogs from bot-button-dialogs.tsx so behaviour
 * stays in lockstep.
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
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

import {
  BOT_CONFIG_KEYS,
  type BotButton,
  botConfigApi,
} from './bot-config-api'
import { BotButtonCreateDialog, BotButtonEditDialog } from './bot-button-dialogs'

export function BotButtonsTab(): JSX.Element {
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

  const [editing, setEditing] = useState<BotButton | null>(null)
  const [creating, setCreating] = useState(false)

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

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {t('botConfigPage.buttons.helpText')}
        </div>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="mr-1 h-4 w-4" aria-hidden />
          {t('botConfigPage.buttons.create')}
        </Button>
      </div>

      <Card>
        <CardContent className="p-2">
          {order.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              {t('botConfigPage.buttons.empty')}
            </p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={order.map((b) => b.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="divide-y divide-border/60">
                  {order.map((button) => (
                    <SortableButtonRow
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
        </CardContent>
      </Card>

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

interface SortableButtonRowProps {
  readonly button: BotButton
  readonly onEdit: () => void
  readonly onToggleVisible: (visible: boolean) => void
}

function SortableButtonRow({
  button,
  onEdit,
  onToggleVisible,
}: SortableButtonRowProps): JSX.Element {
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
      className={cn('flex items-center gap-3 px-2 py-2', isDragging && 'bg-muted/40')}
    >
      <button
        type="button"
        className="cursor-grab touch-none rounded px-1 py-1 text-muted-foreground hover:text-foreground"
        aria-label={t('botConfigPage.buttons.dragHandle')}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" aria-hidden />
      </button>

      <div className="flex min-w-0 flex-1 items-center gap-2">
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
          {button.buttonId}
        </code>
        <span className="truncate font-medium">{button.label}</span>
        <Badge variant={button.style === 'PRIMARY' ? 'default' : 'secondary'}>
          {t(`botConfigPage.buttons.styles.${button.style}`)}
        </Badge>
        <Badge variant="outline" className="text-xs">
          {t(`botConfigPage.buttons.fields.actionType.options.${button.actionType}`)}
        </Badge>
        {button.actionTarget !== null && button.actionTarget.length > 0 && (
          <code
            className="hidden truncate rounded bg-muted px-1 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline"
            title={button.actionTarget}
          >
            {button.actionTarget}
          </code>
        )}
        {button.onePerRow && (
          <Badge variant="outline" className="text-xs">
            {t('botConfigPage.buttons.onePerRow')}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Switch
          checked={button.visible}
          onCheckedChange={onToggleVisible}
          aria-label={t('botConfigPage.buttons.toggleVisible')}
        />
        {button.visible ? (
          <Eye className="h-4 w-4 text-muted-foreground" aria-hidden />
        ) : (
          <EyeOff className="h-4 w-4 text-muted-foreground" aria-hidden />
        )}
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('botConfigPage.buttons.edit')}
          onClick={onEdit}
        >
          <Pencil className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </li>
  )
}

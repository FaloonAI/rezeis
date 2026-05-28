/**
 * Reusable Edit / Create dialogs for the global reply-keyboard buttons.
 *
 * Pulled out of the original CRUD-tab so the same dialogs can drive the
 * Bot Studio's right-inspector panel and the Sheet drawer that opens
 * from the canvas toolbar. Each dialog owns its own form state and
 * mutation pipeline; consumers just toggle `open`.
 */
import { useEffect, useState, type JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

import {
  BOT_CONFIG_KEYS,
  type BotButton,
  type BotButtonStyle,
  botConfigApi,
  type CreateBotButtonPayload,
  type UpdateBotButtonPayload,
} from './bot-config-api'

const STYLES: BotButtonStyle[] = ['DEFAULT', 'PRIMARY', 'SUCCESS', 'DANGER']

// ── Edit ───────────────────────────────────────────────────────────────────

interface BotButtonEditDialogProps {
  readonly button: BotButton | null
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
}

export function BotButtonEditDialog({
  button,
  open,
  onOpenChange,
}: BotButtonEditDialogProps): JSX.Element {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [label, setLabel] = useState('')
  const [style, setStyle] = useState<BotButtonStyle>('DEFAULT')
  const [iconCustomEmojiId, setIconCustomEmojiId] = useState('')
  const [visible, setVisible] = useState(true)
  const [onePerRow, setOnePerRow] = useState(false)

  useEffect(() => {
    if (button !== null && open) {
      setLabel(button.label)
      setStyle(button.style)
      setIconCustomEmojiId(button.iconCustomEmojiId ?? '')
      setVisible(button.visible)
      setOnePerRow(button.onePerRow)
    }
  }, [button, open])

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { readonly id: string; readonly payload: UpdateBotButtonPayload }) =>
      botConfigApi.updateButton(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: BOT_CONFIG_KEYS.buttons })
      toast.success(t('botConfigPage.buttons.toasts.updated'))
      onOpenChange(false)
    },
    onError: () => toast.error(t('botConfigPage.buttons.toasts.updateFailed')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => botConfigApi.deleteButton(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: BOT_CONFIG_KEYS.buttons })
      toast.success(t('botConfigPage.buttons.toasts.deleted'))
      onOpenChange(false)
    },
    onError: () => toast.error(t('botConfigPage.buttons.toasts.deleteFailed')),
  })

  function submit(): void {
    if (button === null) return
    updateMutation.mutate({
      id: button.id,
      payload: {
        label,
        style,
        iconCustomEmojiId: iconCustomEmojiId.trim() === '' ? null : iconCustomEmojiId.trim(),
        visible,
        onePerRow,
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('botConfigPage.buttons.editTitle')}</DialogTitle>
          {button !== null && (
            <DialogDescription>
              <code className="font-mono text-xs">{button.buttonId}</code>
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="bbd-edit-label">{t('botConfigPage.buttons.fields.label')}</Label>
            <Input
              id="bbd-edit-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={120}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bbd-edit-style">{t('botConfigPage.buttons.fields.style')}</Label>
            <Select value={style} onValueChange={(v) => setStyle(v as BotButtonStyle)}>
              <SelectTrigger id="bbd-edit-style">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STYLES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(`botConfigPage.buttons.styles.${s}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bbd-edit-emoji">
              {t('botConfigPage.buttons.fields.iconCustomEmojiId')}
            </Label>
            <Input
              id="bbd-edit-emoji"
              value={iconCustomEmojiId}
              onChange={(e) => setIconCustomEmojiId(e.target.value)}
              placeholder={t('botConfigPage.buttons.fields.iconCustomEmojiIdPlaceholder')}
              maxLength={120}
            />
            <p className="text-xs text-muted-foreground">
              {t('botConfigPage.buttons.fields.iconCustomEmojiIdHint')}
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="bbd-edit-visible" className="font-medium">
                {t('botConfigPage.buttons.fields.visible')}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t('botConfigPage.buttons.fields.visibleHint')}
              </p>
            </div>
            <Switch
              id="bbd-edit-visible"
              checked={visible}
              onCheckedChange={setVisible}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="bbd-edit-row" className="font-medium">
                {t('botConfigPage.buttons.fields.onePerRow')}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t('botConfigPage.buttons.fields.onePerRowHint')}
              </p>
            </div>
            <Switch id="bbd-edit-row" checked={onePerRow} onCheckedChange={setOnePerRow} />
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button
            variant="destructive"
            onClick={() => button !== null && deleteMutation.mutate(button.id)}
            disabled={button === null || deleteMutation.isPending}
          >
            <Trash2 className="mr-1 h-4 w-4" aria-hidden />
            {t('botConfigPage.buttons.delete')}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('botConfigPage.buttons.cancel')}
            </Button>
            <Button onClick={submit} disabled={updateMutation.isPending || label.length === 0}>
              {t('botConfigPage.buttons.save')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Create ────────────────────────────────────────────────────────────────

interface BotButtonCreateDialogProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
}

export function BotButtonCreateDialog({
  open,
  onOpenChange,
}: BotButtonCreateDialogProps): JSX.Element {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [buttonId, setButtonId] = useState('')
  const [label, setLabel] = useState('')
  const [style, setStyle] = useState<BotButtonStyle>('DEFAULT')
  const [iconCustomEmojiId, setIconCustomEmojiId] = useState('')
  const [visible, setVisible] = useState(true)
  const [onePerRow, setOnePerRow] = useState(false)

  useEffect(() => {
    if (open) {
      setButtonId('')
      setLabel('')
      setStyle('DEFAULT')
      setIconCustomEmojiId('')
      setVisible(true)
      setOnePerRow(false)
    }
  }, [open])

  const createMutation = useMutation({
    mutationFn: (payload: CreateBotButtonPayload) => botConfigApi.createButton(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: BOT_CONFIG_KEYS.buttons })
      toast.success(t('botConfigPage.buttons.toasts.created'))
      onOpenChange(false)
    },
    onError: () => toast.error(t('botConfigPage.buttons.toasts.createFailed')),
  })

  function submit(): void {
    createMutation.mutate({
      buttonId: buttonId.trim(),
      label: label.trim(),
      style,
      iconCustomEmojiId: iconCustomEmojiId.trim() === '' ? null : iconCustomEmojiId.trim(),
      visible,
      onePerRow,
    })
  }

  const canSubmit =
    buttonId.trim().length > 0 &&
    label.trim().length > 0 &&
    /^[a-z0-9._-]+$/i.test(buttonId.trim())

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('botConfigPage.buttons.createTitle')}</DialogTitle>
          <DialogDescription>{t('botConfigPage.buttons.createDescription')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="bbd-new-id">{t('botConfigPage.buttons.fields.buttonId')}</Label>
            <Input
              id="bbd-new-id"
              value={buttonId}
              onChange={(e) => setButtonId(e.target.value)}
              placeholder={t('botConfigPage.buttons.fields.buttonIdPlaceholder')}
              maxLength={64}
            />
            <p className="text-xs text-muted-foreground">
              {t('botConfigPage.buttons.fields.buttonIdHint')}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bbd-new-label">{t('botConfigPage.buttons.fields.label')}</Label>
            <Input
              id="bbd-new-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={120}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bbd-new-style">{t('botConfigPage.buttons.fields.style')}</Label>
            <Select value={style} onValueChange={(v) => setStyle(v as BotButtonStyle)}>
              <SelectTrigger id="bbd-new-style">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STYLES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(`botConfigPage.buttons.styles.${s}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bbd-new-emoji">
              {t('botConfigPage.buttons.fields.iconCustomEmojiId')}
            </Label>
            <Input
              id="bbd-new-emoji"
              value={iconCustomEmojiId}
              onChange={(e) => setIconCustomEmojiId(e.target.value)}
              placeholder={t('botConfigPage.buttons.fields.iconCustomEmojiIdPlaceholder')}
              maxLength={120}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label htmlFor="bbd-new-visible" className="font-medium">
              {t('botConfigPage.buttons.fields.visible')}
            </Label>
            <Switch id="bbd-new-visible" checked={visible} onCheckedChange={setVisible} />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label htmlFor="bbd-new-row" className="font-medium">
              {t('botConfigPage.buttons.fields.onePerRow')}
            </Label>
            <Switch id="bbd-new-row" checked={onePerRow} onCheckedChange={setOnePerRow} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('botConfigPage.buttons.cancel')}
          </Button>
          <Button onClick={submit} disabled={!canSubmit || createMutation.isPending}>
            {t('botConfigPage.buttons.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

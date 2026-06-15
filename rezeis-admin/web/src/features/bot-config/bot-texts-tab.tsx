/**
 * Bot copy texts — searchable table + edit/create dialog with Textarea.
 *
 * Text values can be up to 8000 chars (Telegram caption / message limits
 * leave room) so the editor uses a multi-line Textarea. The seed-only
 * row `bot.banner_url` is editable from here as well — operators set
 * the banner URL by editing this very key, no separate field.
 */
import { useEffect, useMemo, useRef, useState, type JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, EyeOff, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { EmojiPicker } from '@/features/broadcast/emoji-picker'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'

import {
  BOT_CONFIG_KEYS,
  type BotText,
  type CreateBotTextPayload,
  type UpdateBotTextPayload,
  botConfigApi,
} from './bot-config-api'

export function BotTextsTab(): JSX.Element {
  const { t } = useTranslation()
  const { data: texts, isLoading } = useQuery({
    queryKey: BOT_CONFIG_KEYS.texts,
    queryFn: botConfigApi.listTexts,
  })

  const [editing, setEditing] = useState<BotText | null>(null)
  const [creating, setCreating] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!texts) return []
    const query = search.trim().toLowerCase()
    if (query.length === 0) return texts
    return texts.filter(
      (text) =>
        text.key.toLowerCase().includes(query) || text.value.toLowerCase().includes(query),
    )
  }, [texts, search])

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="relative max-w-sm flex-1">
          <Search
            className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('botConfigPage.texts.searchPlaceholder')}
            aria-label={t('botConfigPage.texts.searchAria')}
            className="pl-8"
          />
        </div>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="mr-1 h-4 w-4" aria-hidden />
          {t('botConfigPage.texts.create')}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              {search.trim().length > 0
                ? t('botConfigPage.texts.emptySearch')
                : t('botConfigPage.texts.empty')}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/3">{t('botConfigPage.texts.columns.key')}</TableHead>
                  <TableHead>{t('botConfigPage.texts.columns.value')}</TableHead>
                  <TableHead className="w-24 text-center">
                    {t('botConfigPage.texts.columns.visible')}
                  </TableHead>
                  <TableHead className="w-24 text-right">
                    {t('botConfigPage.texts.columns.actions')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((text) => (
                  <TableRow key={text.id}>
                    <TableCell className="align-top">
                      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                        {text.key}
                      </code>
                    </TableCell>
                    <TableCell className="max-w-xl whitespace-pre-wrap break-words text-sm">
                      {text.value.length === 0 ? (
                        <Badge variant="outline" className="text-xs">
                          {t('botConfigPage.texts.emptyValue')}
                        </Badge>
                      ) : (
                        truncate(text.value, 200)
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {text.visible ? (
                        <Eye
                          className="mx-auto h-4 w-4 text-muted-foreground"
                          aria-label={t('botConfigPage.texts.visible')}
                        />
                      ) : (
                        <EyeOff
                          className="mx-auto h-4 w-4 text-muted-foreground"
                          aria-label={t('botConfigPage.texts.hidden')}
                        />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t('botConfigPage.texts.edit')}
                        onClick={() => setEditing(text)}
                      >
                        <Pencil className="h-4 w-4" aria-hidden />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <TextEditDialog
        text={editing}
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null)
        }}
      />
      <TextCreateDialog open={creating} onOpenChange={setCreating} />
    </div>
  )
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value
  return `${value.slice(0, max)}…`
}

interface TextEditDialogProps {
  readonly text: BotText | null
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
}

function TextEditDialog({ text, open, onOpenChange }: TextEditDialogProps): JSX.Element {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [value, setValue] = useState('')
  const [visible, setVisible] = useState(true)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function insertAtCaret(emoji: string): void {
    const el = textareaRef.current
    if (!el) {
      setValue((prev) => prev + emoji)
      return
    }
    const start = el.selectionStart ?? value.length
    const end = el.selectionEnd ?? value.length
    const next = value.slice(0, start) + emoji + value.slice(end)
    setValue(next)
    requestAnimationFrame(() => {
      el.focus()
      const caret = start + emoji.length
      el.setSelectionRange(caret, caret)
    })
  }

    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
    if (text !== null && open) {
      setValue(text.value)
      setVisible(text.visible)
    }
  }, [text, open])
    /* eslint-enable react-hooks/set-state-in-effect */

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { readonly id: string; readonly payload: UpdateBotTextPayload }) =>
      botConfigApi.updateText(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: BOT_CONFIG_KEYS.texts })
      toast.success(t('botConfigPage.texts.toasts.updated'))
      onOpenChange(false)
    },
    onError: () => toast.error(t('botConfigPage.texts.toasts.updateFailed')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => botConfigApi.deleteText(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: BOT_CONFIG_KEYS.texts })
      toast.success(t('botConfigPage.texts.toasts.deleted'))
      onOpenChange(false)
    },
    onError: () => toast.error(t('botConfigPage.texts.toasts.deleteFailed')),
  })

  function submit(): void {
    if (text === null) return
    updateMutation.mutate({ id: text.id, payload: { value, visible } })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('botConfigPage.texts.editTitle')}</DialogTitle>
          {text !== null && (
            <DialogDescription>
              <code className="font-mono text-xs">{text.key}</code>
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="bc-text-value">{t('botConfigPage.texts.fields.value')}</Label>
            <div className="relative">
              <Textarea
                id="bc-text-value"
                ref={textareaRef}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                maxLength={8000}
                rows={10}
                className="font-mono text-sm pr-10"
              />
              <div className="absolute right-1.5 top-1.5">
                <EmojiPicker onSelect={insertAtCaret} ariaLabel={t('broadcastPage.emoji.trigger')} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {value.length}/8000
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="bc-text-visible" className="font-medium">
                {t('botConfigPage.texts.fields.visible')}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t('botConfigPage.texts.fields.visibleHint')}
              </p>
            </div>
            <Switch id="bc-text-visible" checked={visible} onCheckedChange={setVisible} />
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button
            variant="destructive"
            onClick={() => text !== null && deleteMutation.mutate(text.id)}
            disabled={text === null || deleteMutation.isPending}
          >
            <Trash2 className="mr-1 h-4 w-4" aria-hidden />
            {t('botConfigPage.texts.delete')}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('botConfigPage.texts.cancel')}
            </Button>
            <Button onClick={submit} disabled={updateMutation.isPending}>
              {t('botConfigPage.texts.save')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface TextCreateDialogProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
}

function TextCreateDialog({ open, onOpenChange }: TextCreateDialogProps): JSX.Element {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [key, setKey] = useState('')
  const [value, setValue] = useState('')
  const [visible, setVisible] = useState(true)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function insertAtCaret(emoji: string): void {
    const el = textareaRef.current
    if (!el) {
      setValue((prev) => prev + emoji)
      return
    }
    const start = el.selectionStart ?? value.length
    const end = el.selectionEnd ?? value.length
    const next = value.slice(0, start) + emoji + value.slice(end)
    setValue(next)
    requestAnimationFrame(() => {
      el.focus()
      const caret = start + emoji.length
      el.setSelectionRange(caret, caret)
    })
  }

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) {
      setKey('')
      setValue('')
      setVisible(true)
    }
  }, [open])
  /* eslint-enable react-hooks/set-state-in-effect */

  const createMutation = useMutation({
    mutationFn: (payload: CreateBotTextPayload) => botConfigApi.createText(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: BOT_CONFIG_KEYS.texts })
      toast.success(t('botConfigPage.texts.toasts.created'))
      onOpenChange(false)
    },
    onError: () => toast.error(t('botConfigPage.texts.toasts.createFailed')),
  })

  function submit(): void {
    createMutation.mutate({ key: key.trim(), value, visible })
  }

  const canSubmit =
    key.trim().length > 0 &&
    value.length > 0 &&
    /^[a-z0-9._-]+$/i.test(key.trim())

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('botConfigPage.texts.createTitle')}</DialogTitle>
          <DialogDescription>{t('botConfigPage.texts.createDescription')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="bc-new-text-key">{t('botConfigPage.texts.fields.key')}</Label>
            <Input
              id="bc-new-text-key"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder={t('botConfigPage.texts.fields.keyPlaceholder')}
              maxLength={160}
            />
            <p className="text-xs text-muted-foreground">
              {t('botConfigPage.texts.fields.keyHint')}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bc-new-text-value">{t('botConfigPage.texts.fields.value')}</Label>
            <div className="relative">
              <Textarea
                id="bc-new-text-value"
                ref={textareaRef}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                maxLength={8000}
                rows={10}
                className="font-mono text-sm pr-10"
              />
              <div className="absolute right-1.5 top-1.5">
                <EmojiPicker onSelect={insertAtCaret} ariaLabel={t('broadcastPage.emoji.trigger')} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{value.length}/8000</p>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label htmlFor="bc-new-text-visible" className="font-medium">
              {t('botConfigPage.texts.fields.visible')}
            </Label>
            <Switch id="bc-new-text-visible" checked={visible} onCheckedChange={setVisible} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('botConfigPage.texts.cancel')}
          </Button>
          <Button onClick={submit} disabled={!canSubmit || createMutation.isPending}>
            {t('botConfigPage.texts.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

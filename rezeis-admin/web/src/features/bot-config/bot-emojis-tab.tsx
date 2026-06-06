/**
 * Bot emojis — table + edit/create dialog.
 *
 * Each emoji entry maps an UPPER_CASE key to a unicode glyph plus an
 * optional Telegram premium custom_emoji_id. Reiwa picks tgEmojiId when
 * present, falls back to the unicode otherwise. Operators rarely have
 * dozens of these — a flat alphabetical table is enough; no DnD needed.
 */
import { useEffect, useState, type JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import {
  BOT_CONFIG_KEYS,
  type BotEmoji,
  type CreateBotEmojiPayload,
  type UpdateBotEmojiPayload,
  botConfigApi,
} from './bot-config-api'

export function BotEmojisTab(): JSX.Element {
  const { t } = useTranslation()
  const { data: emojis, isLoading } = useQuery({
    queryKey: BOT_CONFIG_KEYS.emojis,
    queryFn: botConfigApi.listEmojis,
  })

  const [editing, setEditing] = useState<BotEmoji | null>(null)
  const [creating, setCreating] = useState(false)

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  const list = emojis ?? []

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {t('botConfigPage.emojis.helpText')}
        </div>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="mr-1 h-4 w-4" aria-hidden />
          {t('botConfigPage.emojis.create')}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {list.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              {t('botConfigPage.emojis.empty')}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('botConfigPage.emojis.columns.key')}</TableHead>
                  <TableHead className="w-20 text-center">
                    {t('botConfigPage.emojis.columns.unicode')}
                  </TableHead>
                  <TableHead>{t('botConfigPage.emojis.columns.tgEmojiId')}</TableHead>
                  <TableHead className="w-24 text-right">
                    {t('botConfigPage.emojis.columns.actions')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((emoji) => (
                  <TableRow key={emoji.id}>
                    <TableCell>
                      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                        {emoji.key}
                      </code>
                    </TableCell>
                    <TableCell className="text-center text-lg">{emoji.unicode}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {emoji.tgEmojiId ?? '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t('botConfigPage.emojis.edit')}
                        onClick={() => setEditing(emoji)}
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

      <EmojiEditDialog
        emoji={editing}
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null)
        }}
      />
      <EmojiCreateDialog open={creating} onOpenChange={setCreating} />
    </div>
  )
}

interface EmojiEditDialogProps {
  readonly emoji: BotEmoji | null
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
}

function EmojiEditDialog({ emoji, open, onOpenChange }: EmojiEditDialogProps): JSX.Element {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [unicode, setUnicode] = useState('')
  const [tgEmojiId, setTgEmojiId] = useState('')

    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
    if (emoji !== null && open) {
      setUnicode(emoji.unicode)
      setTgEmojiId(emoji.tgEmojiId ?? '')
    }
  }, [emoji, open])
    /* eslint-enable react-hooks/set-state-in-effect */

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { readonly id: string; readonly payload: UpdateBotEmojiPayload }) =>
      botConfigApi.updateEmoji(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: BOT_CONFIG_KEYS.emojis })
      toast.success(t('botConfigPage.emojis.toasts.updated'))
      onOpenChange(false)
    },
    onError: () => toast.error(t('botConfigPage.emojis.toasts.updateFailed')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => botConfigApi.deleteEmoji(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: BOT_CONFIG_KEYS.emojis })
      toast.success(t('botConfigPage.emojis.toasts.deleted'))
      onOpenChange(false)
    },
    onError: () => toast.error(t('botConfigPage.emojis.toasts.deleteFailed')),
  })

  function submit(): void {
    if (emoji === null) return
    updateMutation.mutate({
      id: emoji.id,
      payload: {
        unicode,
        tgEmojiId: tgEmojiId.trim() === '' ? null : tgEmojiId.trim(),
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('botConfigPage.emojis.editTitle')}</DialogTitle>
          {emoji !== null && (
            <DialogDescription>
              <code className="font-mono text-xs">{emoji.key}</code>
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="bc-emoji-unicode">{t('botConfigPage.emojis.fields.unicode')}</Label>
            <Input
              id="bc-emoji-unicode"
              value={unicode}
              onChange={(e) => setUnicode(e.target.value)}
              maxLength={16}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bc-emoji-tgid">{t('botConfigPage.emojis.fields.tgEmojiId')}</Label>
            <Input
              id="bc-emoji-tgid"
              value={tgEmojiId}
              onChange={(e) => setTgEmojiId(e.target.value)}
              placeholder={t('botConfigPage.emojis.fields.tgEmojiIdPlaceholder')}
              maxLength={120}
            />
            <p className="text-xs text-muted-foreground">
              {t('botConfigPage.emojis.fields.tgEmojiIdHint')}
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button
            variant="destructive"
            onClick={() => emoji !== null && deleteMutation.mutate(emoji.id)}
            disabled={emoji === null || deleteMutation.isPending}
          >
            <Trash2 className="mr-1 h-4 w-4" aria-hidden />
            {t('botConfigPage.emojis.delete')}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('botConfigPage.emojis.cancel')}
            </Button>
            <Button onClick={submit} disabled={updateMutation.isPending || unicode.length === 0}>
              {t('botConfigPage.emojis.save')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface EmojiCreateDialogProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
}

function EmojiCreateDialog({ open, onOpenChange }: EmojiCreateDialogProps): JSX.Element {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [key, setKey] = useState('')
  const [unicode, setUnicode] = useState('')
  const [tgEmojiId, setTgEmojiId] = useState('')
  
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) {
      setKey('')
      setUnicode('')
      setTgEmojiId('')
    }
  }, [open])
  /* eslint-enable react-hooks/set-state-in-effect */

  const createMutation = useMutation({
    mutationFn: (payload: CreateBotEmojiPayload) => botConfigApi.createEmoji(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: BOT_CONFIG_KEYS.emojis })
      toast.success(t('botConfigPage.emojis.toasts.created'))
      onOpenChange(false)
    },
    onError: () => toast.error(t('botConfigPage.emojis.toasts.createFailed')),
  })

  function submit(): void {
    createMutation.mutate({
      key: key.trim().toUpperCase(),
      unicode: unicode.trim(),
      tgEmojiId: tgEmojiId.trim() === '' ? null : tgEmojiId.trim(),
    })
  }

  const canSubmit =
    key.trim().length > 0 &&
    unicode.trim().length > 0 &&
    /^[A-Za-z][A-Za-z0-9_]*$/.test(key.trim())

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('botConfigPage.emojis.createTitle')}</DialogTitle>
          <DialogDescription>{t('botConfigPage.emojis.createDescription')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="bc-new-emoji-key">{t('botConfigPage.emojis.fields.key')}</Label>
            <Input
              id="bc-new-emoji-key"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder={t('botConfigPage.emojis.fields.keyPlaceholder')}
              maxLength={64}
            />
            <p className="text-xs text-muted-foreground">
              {t('botConfigPage.emojis.fields.keyHint')}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bc-new-emoji-unicode">
              {t('botConfigPage.emojis.fields.unicode')}
            </Label>
            <Input
              id="bc-new-emoji-unicode"
              value={unicode}
              onChange={(e) => setUnicode(e.target.value)}
              maxLength={16}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bc-new-emoji-tgid">{t('botConfigPage.emojis.fields.tgEmojiId')}</Label>
            <Input
              id="bc-new-emoji-tgid"
              value={tgEmojiId}
              onChange={(e) => setTgEmojiId(e.target.value)}
              placeholder={t('botConfigPage.emojis.fields.tgEmojiIdPlaceholder')}
              maxLength={120}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('botConfigPage.emojis.cancel')}
          </Button>
          <Button onClick={submit} disabled={!canSubmit || createMutation.isPending}>
            {t('botConfigPage.emojis.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

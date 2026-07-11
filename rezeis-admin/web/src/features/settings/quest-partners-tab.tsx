/**
 * Quest partners tab — manage per-partner HMAC secrets for PARTNER_TASK quest
 * verification. Secrets are stored AES-256-GCM-encrypted server-side; this UI
 * only ever sees a presence flag (`configured`), never the secret itself.
 *
 * Semantics mirror the Turnstile secret input: an empty secret field on save
 * means "keep unchanged" for an existing partner. Removal is explicit (Delete).
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { KeyRound, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useHasPermission } from '@/features/rbac'
import { settingsApi, type QuestPartnerView } from './settings-api'

const SLUG_RE = /^[a-z0-9][a-z0-9_-]{1,63}$/

export default function QuestPartnersTab() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const canEdit = useHasPermission('settings', 'edit')

  const { data: partners = [], isLoading } = useQuery({
    queryKey: ['admin', 'quest-partners'],
    queryFn: () => settingsApi.getQuestPartnerSecrets(),
  })

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSlug, setEditingSlug] = useState<string | null>(null)
  const [slug, setSlug] = useState('')
  const [label, setLabel] = useState('')
  const [secret, setSecret] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (partnersPatch: Array<{ slug: string; secret?: string; label?: string }>) =>
      settingsApi.updateQuestPartnerSecrets(partnersPatch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'quest-partners'] })
    },
  })

  const openAdd = () => {
    setEditingSlug(null)
    setSlug('')
    setLabel('')
    setSecret('')
    setDialogOpen(true)
  }

  const openEdit = (p: QuestPartnerView) => {
    setEditingSlug(p.slug)
    setSlug(p.slug)
    setLabel(p.label ?? '')
    setSecret('')
    setDialogOpen(true)
  }

  const slugValid = SLUG_RE.test(slug.trim())
  // On add, a secret is mandatory; on edit, empty secret keeps the existing one.
  const canSave = slugValid && (editingSlug !== null || secret.trim().length > 0)

  const save = async () => {
    const patch: { slug: string; secret?: string; label?: string } = { slug: slug.trim() }
    if (label.trim().length > 0) patch.label = label.trim()
    // Empty secret on edit = keep; on add the button is disabled until entered.
    if (secret.trim().length > 0) patch.secret = secret.trim()
    try {
      await mutation.mutateAsync([patch])
      toast.success(t('questPartnersSettings.saved'))
      setDialogOpen(false)
    } catch {
      toast.error(t('questPartnersSettings.saveFailed'))
    }
  }

  const confirmDelete = async () => {
    if (deleteTarget === null) return
    try {
      // Empty secret clears the partner server-side.
      await mutation.mutateAsync([{ slug: deleteTarget, secret: '' }])
      toast.success(t('questPartnersSettings.deleted'))
    } catch {
      toast.error(t('questPartnersSettings.saveFailed'))
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              {t('questPartnersSettings.title')}
            </CardTitle>
            <CardDescription>{t('questPartnersSettings.subtitle')}</CardDescription>
          </div>
          {canEdit && (
            <Button size="sm" onClick={openAdd} className="gap-1.5 shrink-0">
              <Plus className="h-4 w-4" />
              {t('questPartnersSettings.add')}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">…</p>
        ) : partners.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('questPartnersSettings.empty')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('questPartnersSettings.columns.slug')}</TableHead>
                <TableHead>{t('questPartnersSettings.columns.label')}</TableHead>
                <TableHead>{t('questPartnersSettings.columns.secret')}</TableHead>
                {canEdit && (
                  <TableHead className="text-right">
                    {t('questPartnersSettings.columns.actions')}
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {partners.map((p) => (
                <TableRow key={p.slug}>
                  <TableCell>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{p.slug}</code>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.label ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={p.configured ? 'default' : 'secondary'}>
                      {p.configured
                        ? t('questPartnersSettings.hasSecret')
                        : t('questPartnersSettings.noSecret')}
                    </Badge>
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button variant="outline" size="sm" onClick={() => openEdit(p)}>
                          {t('questPartnersSettings.editSecret')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          aria-label={t('questPartnersSettings.delete')}
                          onClick={() => setDeleteTarget(p.slug)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSlug !== null
                ? t('questPartnersSettings.editSecret')
                : t('questPartnersSettings.add')}
            </DialogTitle>
            <DialogDescription>{t('questPartnersSettings.slugHint')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="qp-slug">{t('questPartnersSettings.slugLabel')}</Label>
              <Input
                id="qp-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                disabled={editingSlug !== null}
                placeholder="acme"
                aria-invalid={slug.length > 0 && !slugValid}
              />
              {slug.length > 0 && !slugValid && (
                <p className="text-xs text-destructive">{t('questPartnersSettings.slugInvalid')}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qp-label">{t('questPartnersSettings.labelLabel')}</Label>
              <Input
                id="qp-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Acme Ads"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qp-secret">
                {t('questPartnersSettings.secretLabel')}
                {editingSlug !== null && (
                  <span className="ml-2 text-[10px] text-muted-foreground">
                    ({t('questPartnersSettings.hasSecret')})
                  </span>
                )}
              </Label>
              <Input
                id="qp-secret"
                type="password"
                value={secret}
                autoComplete="off"
                onChange={(e) => setSecret(e.target.value)}
                placeholder={t('questPartnersSettings.secretPlaceholder')}
              />
              {editingSlug !== null && (
                <p className="text-[10px] text-muted-foreground">
                  {t('questPartnersSettings.secretKeepHint')}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={save} disabled={!canSave || mutation.isPending}>
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('questPartnersSettings.confirmDeleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('questPartnersSettings.confirmDeleteDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground"
            >
              {t('questPartnersSettings.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

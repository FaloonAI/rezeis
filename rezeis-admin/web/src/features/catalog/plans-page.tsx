import type { JSX, ReactNode } from 'react'
import type React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Pencil, Plus, Save, Search, Trash2, UserPlus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { createEmptyPlanFormValues, planFormSchema, type PlanFormValues } from '@/features/catalog/plan-schema'
import { adminPlanSchema, plansAdminApi } from '@/features/catalog/plans-api'
import { createUserSearchSchema } from '@/features/users/user-search-schema'
import { usersApi } from '@/features/users/users-api'
import { queryClient } from '@/lib/query-client'
import { translateErrorMessage } from '@/lib/translate-error'

type AdminPlan = ReturnType<typeof adminPlanSchema.parse>
type UserSearchPayload = Parameters<typeof usersApi.searchUser>[0]
type UserSearchResult = Awaited<ReturnType<typeof usersApi.searchUser>>
type SquadOption = Awaited<ReturnType<typeof plansAdminApi.getInternalSquads>>[number]

interface EditablePlanState extends PlanFormValues {
  readonly id: string | null
}

type AllowedUserLabels = Record<string, string>
type AllowedUserLookupMode = 'userId' | 'telegramId' | 'email' | 'login'

export function PlansPage(): JSX.Element {
  const { t } = useTranslation()
  const plansQuery = useQuery({
    queryKey: ['catalog', 'plans'],
    queryFn: plansAdminApi.listPlans,
  })
  const internalSquadsQuery = useQuery({
    queryKey: ['catalog', 'plans', 'internal-squads'],
    queryFn: plansAdminApi.getInternalSquads,
  })
  const externalSquadsQuery = useQuery({
    queryKey: ['catalog', 'plans', 'external-squads'],
    queryFn: plansAdminApi.getExternalSquads,
  })

  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [draft, setDraft] = useState<EditablePlanState>(() => ({ id: null, ...createEmptyPlanFormValues() }))
  const [allowedUserLookupMode, setAllowedUserLookupMode] = useState<AllowedUserLookupMode>('login')
  const [allowedUserLookupValue, setAllowedUserLookupValue] = useState('')
  const [allowedUserLabels, setAllowedUserLabels] = useState<AllowedUserLabels>({})

  const plans = plansQuery.data ?? []

  const saveMutation = useMutation({
    mutationFn: async (nextDraft: EditablePlanState) => {
      const parsedPayload = planFormSchema.parse(nextDraft)
      if (nextDraft.id !== null) {
        return plansAdminApi.updatePlan(nextDraft.id, parsedPayload)
      }
      return plansAdminApi.createPlan(parsedPayload)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['catalog', 'plans'] })
      setIsSheetOpen(false)
      toast.success('Plan saved')
    },
    onError: (error: Error) => {
      toast.error(translateErrorMessage(t, error.message))
    },
  })

  const moveMutation = useMutation({
    mutationFn: ({ planId, direction }: { readonly planId: string; readonly direction: 'up' | 'down' }) =>
      plansAdminApi.movePlan(planId, direction),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['catalog', 'plans'] })
    },
    onError: (error: Error) => {
      toast.error(translateErrorMessage(t, error.message))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (planId: string) => plansAdminApi.deletePlan(planId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['catalog', 'plans'] })
      toast.success('Plan deleted')
    },
    onError: (error: Error) => {
      toast.error(translateErrorMessage(t, error.message))
    },
  })

  const userLookupMutation = useMutation({
    mutationFn: (payload: UserSearchPayload) => usersApi.searchUser(payload),
    onSuccess: (result: UserSearchResult) => {
      const displayLabel = readAllowedUserLabel(result)
      setDraft((current) => ({
        ...current,
        allowedUserIds: current.allowedUserIds.includes(result.session.id)
          ? current.allowedUserIds
          : [...current.allowedUserIds, result.session.id],
      }))
      setAllowedUserLabels((current) => ({
        ...current,
        [result.session.id]: displayLabel,
      }))
      setAllowedUserLookupValue('')
      toast.success('Allowed user added')
    },
    onError: (error: Error) => {
      toast.error(translateErrorMessage(t, error.message))
    },
  })

  const eligibleTransitionPlans = useMemo(
    () =>
      plans.filter((plan) => plan.id !== draft.id && plan.isActive && !plan.isArchived),
    [draft.id, plans],
  )

  useEffect(() => {
    if (internalSquadsQuery.data === undefined) {
      return
    }
    const validSquadIds = new Set(internalSquadsQuery.data.map((squad) => squad.uuid))
    setDraft((current) => ({
      ...current,
      internalSquads: current.internalSquads.filter((squad) => validSquadIds.has(squad)),
    }))
  }, [internalSquadsQuery.data])

  useEffect(() => {
    if (externalSquadsQuery.data === undefined) {
      return
    }
    const validSquadIds = new Set(externalSquadsQuery.data.map((squad) => squad.uuid))
    setDraft((current) => ({
      ...current,
      externalSquad:
        current.externalSquad !== null && validSquadIds.has(current.externalSquad)
          ? current.externalSquad
          : null,
    }))
  }, [externalSquadsQuery.data])

  function openCreate(): void {
    setDraft({ id: null, ...createEmptyPlanFormValues() })
    setAllowedUserLabels({})
    setAllowedUserLookupMode('login')
    setAllowedUserLookupValue('')
    setIsSheetOpen(true)
  }

  function openEdit(plan: AdminPlan): void {
    setDraft(
      normalizeDraft({
        id: plan.id,
        name: plan.name,
        description: plan.description,
        tag: plan.tag,
        isActive: plan.isActive,
        isArchived: plan.isArchived,
        archivedRenewMode: plan.archivedRenewMode,
        type: plan.type,
        availability: plan.availability,
        trafficLimit: plan.trafficLimit,
        deviceLimit: plan.deviceLimit,
        trafficLimitStrategy: plan.trafficLimitStrategy,
        internalSquads: [...plan.internalSquads],
        externalSquad: plan.externalSquad,
        upgradeToPlanIds: [...plan.upgradeToPlanIds],
        replacementPlanIds: [...plan.replacementPlanIds],
        allowedUserIds: [...plan.allowedUserIds],
        durations: plan.durations.map((duration) => ({
          days: duration.days,
          prices: duration.prices.map((price) => ({
            currency: price.currency,
            price: price.price,
          })),
        })),
      }),
    )
    setAllowedUserLabels(
      Object.fromEntries(plan.allowedUserIds.map((userId) => [userId, userId])),
    )
    setAllowedUserLookupMode('login')
    setAllowedUserLookupValue('')
    setIsSheetOpen(true)
  }

  function submitAllowedUserLookup(): void {
    const value = allowedUserLookupValue.trim()
    if (value.length === 0) {
      return
    }
    const schema = createUserSearchSchema()
    const payload = {
      userId: '',
      telegramId: '',
      email: '',
      login: '',
    }
    payload[allowedUserLookupMode] = value
    const parsedPayload = schema.parse(payload)
    void userLookupMutation.mutateAsync(parsedPayload)
  }

  return (
    <div className="space-y-4">
      <section className="rounded-[28px] border border-border/80 bg-card/90 px-5 py-5 shadow-sm backdrop-blur sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">{t('nav.catalog')}</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Plans Catalog</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Configure plan truth for downstream subscription flows: lifecycle visibility, renew behavior, traffic reset strategy, durations, pricing, allowed users, and real Remnawave squads.
            </p>
          </div>
          <Button type="button" onClick={openCreate}>
            <Plus className="size-4" />
            New plan
          </Button>
        </div>
      </section>

      {plansQuery.error ? (
        <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {translateErrorMessage(t, plansQuery.error.message)}
        </p>
      ) : null}
      {plansQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading plans...</p> : null}

      <section className="grid gap-4">
        {plans.map((plan, index) => (
          <Card key={plan.id}>
            <CardHeader>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription className="mt-2">{plan.description ?? 'No description set.'}</CardDescription>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {plan.type} • {plan.availability} • order {plan.orderIndex}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={() => void moveMutation.mutateAsync({ planId: plan.id, direction: 'up' })} disabled={index === 0 || moveMutation.isPending}>
                    <ArrowUp className="size-4" />
                    Up
                  </Button>
                  <Button type="button" variant="outline" onClick={() => void moveMutation.mutateAsync({ planId: plan.id, direction: 'down' })} disabled={index === plans.length - 1 || moveMutation.isPending}>
                    <ArrowDown className="size-4" />
                    Down
                  </Button>
                  <Button type="button" variant="outline" onClick={() => openEdit(plan)}>
                    <Pencil className="size-4" />
                    Edit
                  </Button>
                  <Button type="button" variant="outline" onClick={() => void deleteMutation.mutateAsync(plan.id)} disabled={deleteMutation.isPending}>
                    <Trash2 className="size-4" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-4">
                  <InfoTile label="Status" value={plan.isActive ? (plan.isArchived ? 'Active + archived' : 'Active') : 'Inactive'} />
                  <InfoTile label="Traffic" value={formatTrafficValue(plan.trafficLimit)} />
                  <InfoTile label="Devices" value={formatDeviceValue(plan.deviceLimit)} />
                  <InfoTile label="Traffic strategy" value={plan.trafficLimitStrategy} />
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
                  <p className="text-sm font-medium">Durations and prices</p>
                  <div className="mt-3 grid gap-3">
                    {plan.durations.map((duration) => (
                      <div key={duration.id} className="rounded-2xl border border-border/70 bg-card px-4 py-3">
                        <p className="text-sm font-medium">{formatDurationLabel(duration.days)}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {duration.prices.map((price) => (
                            <span key={price.id} className="rounded-full bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground">
                              {price.currency} {price.price}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-3 rounded-2xl border border-border/70 bg-background/60 p-4">
                <InfoTile label="Archived renew mode" value={plan.archivedRenewMode} />
                <InfoTile label="External squad" value={findSquadName(externalSquadsQuery.data, plan.externalSquad) ?? plan.externalSquad ?? 'None'} />
                <InfoTile label="Internal squads" value={plan.internalSquads.length > 0 ? plan.internalSquads.map((squad) => findSquadName(internalSquadsQuery.data, squad) ?? squad).join(', ') : 'None'} />
                <InfoTile label="Upgrade targets" value={plan.upgradeToPlanIds.length > 0 ? plan.upgradeToPlanIds.map((planId) => findPlanName(plans, planId) ?? planId).join(', ') : 'None'} />
                <InfoTile label="Replacement targets" value={plan.replacementPlanIds.length > 0 ? plan.replacementPlanIds.map((planId) => findPlanName(plans, planId) ?? planId).join(', ') : 'None'} />
                <InfoTile label="Allowed users" value={plan.allowedUserIds.length > 0 ? plan.allowedUserIds.join(', ') : 'None'} />
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right" className="w-full max-w-3xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{draft.id ? 'Edit plan' : 'Create plan'}</SheetTitle>
            <SheetDescription>
              Structured operator configurator for downstream subscription creation. This editor mirrors AltShop capability inside the Rezeis admin web shell.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-6 px-4 pb-4">
            <Section title="Basics" description="Name, description, tag, lifecycle flags, and user-visible availability.">
              <div className="grid gap-4 md:grid-cols-2">
                <TextField label="Name" value={draft.name} onChange={(value) => setDraft((current) => ({ ...current, name: value }))} />
                <TextField label="Tag" value={draft.tag ?? ''} onChange={(value) => setDraft((current) => ({ ...current, tag: normalizeNullableInput(value) }))} />
                <div className="space-y-2 md:col-span-2">
                  <Label>Description</Label>
                  <Textarea value={draft.description ?? ''} onChange={(event) => setDraft((current) => ({ ...current, description: normalizeNullableInput(event.target.value) }))} />
                </div>
                <div className="space-y-2">
                  <Label>Plan type</Label>
                  <Select value={draft.type} onValueChange={(value: PlanFormValues['type']) => setDraft((current) => normalizeDraft({ ...current, type: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TRAFFIC">Traffic</SelectItem>
                      <SelectItem value="DEVICES">Devices</SelectItem>
                      <SelectItem value="BOTH">Both</SelectItem>
                      <SelectItem value="UNLIMITED">Unlimited</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Availability</Label>
                  <Select value={draft.availability} onValueChange={(value: PlanFormValues['availability']) => setDraft((current) => normalizeDraft({ ...current, availability: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All</SelectItem>
                      <SelectItem value="NEW">New</SelectItem>
                      <SelectItem value="EXISTING">Existing</SelectItem>
                      <SelectItem value="INVITED">Invited</SelectItem>
                      <SelectItem value="ALLOWED">Allowed</SelectItem>
                      <SelectItem value="TRIAL">Trial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <CheckboxField label="Active" checked={draft.isActive} onCheckedChange={(checked) => setDraft((current) => normalizeDraft({ ...current, isActive: checked }))} />
                <CheckboxField label="Archived" checked={draft.isArchived} onCheckedChange={(checked) => setDraft((current) => normalizeDraft({ ...current, isArchived: checked }))} />
              </div>
            </Section>

            <Section title="Renew behavior" description="Archived renew mode and transition targets.">
              <div className="space-y-2">
                <Label>Archived renew mode</Label>
                <Select value={draft.archivedRenewMode} onValueChange={(value: PlanFormValues['archivedRenewMode']) => setDraft((current) => normalizeDraft({ ...current, archivedRenewMode: value }))} disabled={!draft.isArchived}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SELF_RENEW">Self renew</SelectItem>
                    <SelectItem value="REPLACE_ON_RENEW">Replace on renew</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {draft.isArchived && draft.archivedRenewMode === 'REPLACE_ON_RENEW' ? (
                <SelectionList
                  title="Replacement plans"
                  items={eligibleTransitionPlans}
                  selectedIds={draft.replacementPlanIds}
                  onToggle={(planId) => setDraft((current) => ({
                    ...current,
                    replacementPlanIds: toggleId(current.replacementPlanIds, planId),
                  }))}
                />
              ) : null}
              <SelectionList
                title="Upgrade targets"
                items={eligibleTransitionPlans}
                selectedIds={draft.upgradeToPlanIds}
                onToggle={(planId) => setDraft((current) => ({
                  ...current,
                  upgradeToPlanIds: toggleId(current.upgradeToPlanIds, planId),
                }))}
              />
            </Section>

            <Section title="Limits" description="Traffic, device caps, and traffic reset behavior.">
              <div className="grid gap-4 md:grid-cols-3">
                <TextField label="Traffic limit" value={draft.trafficLimit === null ? '' : String(draft.trafficLimit)} onChange={(value) => setDraft((current) => normalizeDraft({ ...current, trafficLimit: value.trim() ? Number(value) : null }))} disabled={draft.type === 'DEVICES' || draft.type === 'UNLIMITED'} />
                <TextField label="Device limit" value={String(draft.deviceLimit)} onChange={(value) => setDraft((current) => normalizeDraft({ ...current, deviceLimit: Number(value) || -1 }))} disabled={draft.type === 'TRAFFIC' || draft.type === 'UNLIMITED'} />
                <div className="space-y-2">
                  <Label>Traffic reset strategy</Label>
                  <Select value={draft.trafficLimitStrategy} onValueChange={(value: PlanFormValues['trafficLimitStrategy']) => setDraft((current) => ({ ...current, trafficLimitStrategy: value }))} disabled={draft.type === 'DEVICES' || draft.type === 'UNLIMITED'}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NO_RESET">On payment</SelectItem>
                      <SelectItem value="DAY">Daily</SelectItem>
                      <SelectItem value="WEEK">Weekly</SelectItem>
                      <SelectItem value="MONTH">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Section>

            <Section title="Durations & prices" description="Structured duration rows and per-currency pricing. Trial plans are normalized to one duration with zero prices.">
              {draft.availability === 'TRIAL' ? (
                <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-sm text-muted-foreground">
                  Trial plans are restricted to a single duration and all prices are normalized to zero on save.
                </div>
              ) : null}
              <div className="space-y-4">
                {draft.durations.map((duration, durationIndex) => (
                  <div key={`${durationIndex}-${duration.days}`} className="rounded-2xl border border-border/70 bg-background/60 p-4">
                    <div className="grid gap-4 md:grid-cols-[140px_minmax(0,1fr)]">
                      <TextField label="Days" value={String(duration.days)} onChange={(value) => updateDurationField(setDraft, durationIndex, { days: Number(value) || 1 })} disabled={draft.availability === 'TRIAL'} />
                      <div className="space-y-3">
                        {duration.prices.map((price, priceIndex) => (
                          <div key={`${durationIndex}-${priceIndex}`} className="grid gap-3 md:grid-cols-[180px_minmax(0,1fr)_auto]">
                            <div className="space-y-2">
                              <Label>Currency</Label>
                              <Select value={price.currency} onValueChange={(value: PlanFormValues['durations'][number]['prices'][number]['currency']) => updatePriceField(setDraft, durationIndex, priceIndex, { currency: value })} disabled={draft.availability === 'TRIAL'}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="USD">USD</SelectItem>
                                  <SelectItem value="RUB">RUB</SelectItem>
                                  <SelectItem value="USDT">USDT</SelectItem>
                                  <SelectItem value="TON">TON</SelectItem>
                                  <SelectItem value="BTC">BTC</SelectItem>
                                  <SelectItem value="ETH">ETH</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <TextField label="Price" value={price.price} onChange={(value) => updatePriceField(setDraft, durationIndex, priceIndex, { price: value })} disabled={draft.availability === 'TRIAL'} />
                            <div className="flex items-end">
                              <Button type="button" variant="outline" onClick={() => removePrice(setDraft, durationIndex, priceIndex)} disabled={duration.prices.length === 1 || draft.availability === 'TRIAL'}>
                                Remove
                              </Button>
                            </div>
                          </div>
                        ))}
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" variant="outline" onClick={() => addPrice(setDraft, durationIndex)} disabled={draft.availability === 'TRIAL'}>
                            <Plus className="size-4" />
                            Add price
                          </Button>
                          <Button type="button" variant="outline" onClick={() => removeDuration(setDraft, durationIndex)} disabled={draft.durations.length === 1 || draft.availability === 'TRIAL'}>
                            Remove duration
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={() => addDuration(setDraft)} disabled={draft.availability === 'TRIAL'}>
                  <Plus className="size-4" />
                  Add duration
                </Button>
              </div>
            </Section>

            <Section title="Allowed users" description="Reuse the existing admin user search to add canonical user UUIDs to ALLOWED plans.">
              {draft.availability !== 'ALLOWED' ? (
                <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-sm text-muted-foreground">
                  Allowed user restrictions are disabled unless availability is set to ALLOWED.
                </div>
              ) : (
                <>
                  <div className="grid gap-3 md:grid-cols-[180px_minmax(0,1fr)_auto]">
                    <div className="space-y-2">
                      <Label>Lookup mode</Label>
                      <Select value={allowedUserLookupMode} onValueChange={(value: AllowedUserLookupMode) => setAllowedUserLookupMode(value)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="login">Login</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="telegramId">Telegram ID</SelectItem>
                          <SelectItem value="userId">User ID</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <TextField label="Identifier" value={allowedUserLookupValue} onChange={setAllowedUserLookupValue} />
                    <div className="flex items-end">
                      <Button type="button" onClick={submitAllowedUserLookup} disabled={userLookupMutation.isPending}>
                        {userLookupMutation.isPending ? <Search className="size-4" /> : <UserPlus className="size-4" />}
                        Add
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    {draft.allowedUserIds.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No allowed users selected yet.</p>
                    ) : (
                      draft.allowedUserIds.map((userId) => (
                        <div key={userId} className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-sm">
                          <span>{allowedUserLabels[userId] ?? userId}</span>
                          <Button type="button" variant="outline" onClick={() => setDraft((current) => ({ ...current, allowedUserIds: current.allowedUserIds.filter((value) => value !== userId) }))}>
                            Remove
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </Section>

            <Section title="Remnawave squads" description="Use live Remnawave option reads instead of free-text UUID entry.">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>External squad</Label>
                  <Select value={draft.externalSquad ?? 'none'} onValueChange={(value) => setDraft((current) => ({ ...current, externalSquad: value === 'none' ? null : value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {(externalSquadsQuery.data ?? []).map((squad) => (
                        <SelectItem key={squad.uuid} value={squad.uuid}>{squad.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Internal squads</Label>
                  <div className="grid gap-2 rounded-2xl border border-border/70 bg-background/60 p-4">
                    {(internalSquadsQuery.data ?? []).map((squad) => (
                      <label key={squad.uuid} className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card p-3">
                        <Checkbox
                          className="mt-1"
                          checked={draft.internalSquads.includes(squad.uuid)}
                          onCheckedChange={() => setDraft((current) => ({
                            ...current,
                            internalSquads: toggleId(current.internalSquads, squad.uuid),
                          }))}
                        />
                        <div>
                          <p className="text-sm font-medium">{squad.name}</p>
                          <p className="mt-1 break-all text-xs text-muted-foreground">{squad.uuid}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </Section>
          </div>
          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => setIsSheetOpen(false)}>Cancel</Button>
            <Button type="button" onClick={() => void saveMutation.mutateAsync(draft)} disabled={saveMutation.isPending}>
              <Save className="size-4" />
              {saveMutation.isPending ? 'Saving...' : 'Save plan'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}

function Section({ title, description, children }: { readonly title: string; readonly description: string; readonly children: ReactNode }): JSX.Element {
  return (
    <section className="space-y-4 rounded-2xl border border-border/70 bg-card/80 p-4">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  )
}

function SelectionList({
  title,
  items,
  selectedIds,
  onToggle,
}: {
  readonly title: string
  readonly items: readonly AdminPlan[]
  readonly selectedIds: readonly string[]
  readonly onToggle: (planId: string) => void
}): JSX.Element {
  return (
    <div className="space-y-2">
      <Label>{title}</Label>
      <div className="grid gap-2 rounded-2xl border border-border/70 bg-background/60 p-4">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No eligible plans available.</p>
        ) : (
          items.map((item) => (
            <label key={item.id} className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card p-3">
              <Checkbox className="mt-1" checked={selectedIds.includes(item.id)} onCheckedChange={() => onToggle(item.id)} />
              <div>
                <p className="text-sm font-medium">{item.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.type} • {item.availability}</p>
              </div>
            </label>
          ))
        )}
      </div>
    </div>
  )
}

function InfoTile({ label, value }: { readonly label: string; readonly value: string }): JSX.Element {
  return (
    <div className="rounded-2xl border border-border/70 bg-card px-4 py-3">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}

function TextField({
  label,
  value,
  onChange,
  disabled = false,
}: {
  readonly label: string
  readonly value: string
  readonly onChange: (value: string) => void
  readonly disabled?: boolean
}): JSX.Element {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} />
    </div>
  )
}

function CheckboxField({
  label,
  checked,
  onCheckedChange,
}: {
  readonly label: string
  readonly checked: boolean
  readonly onCheckedChange: (checked: boolean) => void
}): JSX.Element {
  return (
    <label className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background/60 p-4">
      <Checkbox className="mt-1" checked={checked} onCheckedChange={(value) => onCheckedChange(value === true)} />
      <div>
        <p className="text-sm font-medium">{label}</p>
      </div>
    </label>
  )
}

function readAllowedUserLabel(result: UserSearchResult): string {
  return result.session.webAccount?.login ?? result.session.email ?? result.session.username ?? result.session.id
}

function normalizeNullableInput(value: string): string | null {
  const normalizedValue = value.trim()
  return normalizedValue.length > 0 ? normalizedValue : null
}

function formatTrafficValue(trafficLimit: number | null): string {
  return trafficLimit === null ? 'Unlimited' : String(trafficLimit)
}

function formatDeviceValue(deviceLimit: number): string {
  return deviceLimit < 0 ? 'Unlimited' : String(deviceLimit)
}

function formatDurationLabel(days: number): string {
  return days === -1 ? 'Unlimited duration' : `${days} days`
}

function findPlanName(plans: readonly AdminPlan[], planId: string): string | null {
  return plans.find((plan) => plan.id === planId)?.name ?? null
}

function findSquadName(squads: readonly SquadOption[] | undefined, squadId: string | null): string | null {
  if (squadId === null || squads === undefined) {
    return null
  }
  return squads.find((squad) => squad.uuid === squadId)?.name ?? null
}

function toggleId(values: readonly string[], value: string): string[] {
  return values.includes(value)
    ? values.filter((currentValue) => currentValue !== value)
    : [...values, value]
}

function addDuration(
  setDraft: React.Dispatch<React.SetStateAction<EditablePlanState>>,
): void {
  setDraft((current) => ({
    ...current,
    durations: [...current.durations, { days: 30, prices: [{ currency: 'USD', price: '9.99' }] }],
  }))
}

function updateDurationField(
  setDraft: React.Dispatch<React.SetStateAction<EditablePlanState>>,
  durationIndex: number,
  nextValue: Partial<EditablePlanState['durations'][number]>,
): void {
  setDraft((current) => ({
    ...current,
    durations: current.durations.map((duration, index) =>
      index === durationIndex ? { ...duration, ...nextValue } : duration,
    ),
  }))
}

function updatePriceField(
  setDraft: React.Dispatch<React.SetStateAction<EditablePlanState>>,
  durationIndex: number,
  priceIndex: number,
  nextValue: Partial<EditablePlanState['durations'][number]['prices'][number]>,
): void {
  setDraft((current) => ({
    ...current,
    durations: current.durations.map((duration, currentDurationIndex) =>
      currentDurationIndex === durationIndex
        ? {
            ...duration,
            prices: duration.prices.map((price, currentPriceIndex) =>
              currentPriceIndex === priceIndex ? { ...price, ...nextValue } : price,
            ),
          }
        : duration,
    ),
  }))
}

function addPrice(
  setDraft: React.Dispatch<React.SetStateAction<EditablePlanState>>,
  durationIndex: number,
): void {
  setDraft((current) => ({
    ...current,
    durations: current.durations.map((duration, index) =>
      index === durationIndex
        ? { ...duration, prices: [...duration.prices, { currency: 'USD', price: '9.99' }] }
        : duration,
    ),
  }))
}

function removePrice(
  setDraft: React.Dispatch<React.SetStateAction<EditablePlanState>>,
  durationIndex: number,
  priceIndex: number,
): void {
  setDraft((current) => ({
    ...current,
    durations: current.durations.map((duration, currentDurationIndex) =>
      currentDurationIndex === durationIndex
        ? {
            ...duration,
            prices: duration.prices.filter((_, currentPriceIndex) => currentPriceIndex !== priceIndex),
          }
        : duration,
    ),
  }))
}

function removeDuration(
  setDraft: React.Dispatch<React.SetStateAction<EditablePlanState>>,
  durationIndex: number,
): void {
  setDraft((current) => ({
    ...current,
    durations: current.durations.filter((_, index) => index !== durationIndex),
  }))
}

function normalizeDraft(draft: EditablePlanState): EditablePlanState {
  let trafficLimit = draft.trafficLimit
  let deviceLimit = draft.deviceLimit
  let archivedRenewMode = draft.archivedRenewMode
  let replacementPlanIds = draft.replacementPlanIds
  let allowedUserIds = draft.allowedUserIds

  if (draft.type === 'DEVICES') {
    trafficLimit = null
  } else if (draft.type === 'TRAFFIC') {
    deviceLimit = -1
  } else if (draft.type === 'UNLIMITED') {
    trafficLimit = null
    deviceLimit = -1
  } else {
    if (deviceLimit < 0) {
      deviceLimit = 1
    }
    if (trafficLimit === null) {
      trafficLimit = 1
    }
  }

  if (!draft.isArchived) {
    archivedRenewMode = 'SELF_RENEW'
    replacementPlanIds = []
  } else if (archivedRenewMode !== 'REPLACE_ON_RENEW') {
    replacementPlanIds = []
  }

  if (draft.availability !== 'ALLOWED') {
    allowedUserIds = []
  }

  const durations =
    draft.availability === 'TRIAL'
      ? draft.durations.slice(0, 1).map((duration) => ({
          ...duration,
          prices: duration.prices.map((price) => ({ ...price, price: '0' })),
        }))
      : draft.durations

  return {
    ...draft,
    trafficLimit,
    deviceLimit,
    archivedRenewMode,
    replacementPlanIds,
    allowedUserIds,
    durations,
  }
}

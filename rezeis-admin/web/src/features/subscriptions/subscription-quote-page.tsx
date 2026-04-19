import type { JSX } from 'react'
import { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Calculator, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { paymentApi, type PaymentTransaction } from '@/features/payments/payments-api'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { usersApi } from '@/features/users/users-api'
import { createUserSearchSchema } from '@/features/users/user-search-schema'
import { subscriptionQuoteApi, type SubscriptionActionPolicy, type SubscriptionQuote, type SubscriptionQuoteAction, type SubscriptionQuoteChannel } from '@/features/subscriptions/subscription-quote-api'
import { translateErrorMessage } from '@/lib/translate-error'

type UserSearchPayload = Parameters<typeof usersApi.searchUser>[0]
type UserSearchResult = Awaited<ReturnType<typeof usersApi.searchUser>>
type UserLookupMode = 'userId' | 'telegramId' | 'email' | 'login'

export function SubscriptionQuotePage(): JSX.Element {
  const { t } = useTranslation()
  const [lookupMode, setLookupMode] = useState<UserLookupMode>('login')
  const [lookupValue, setLookupValue] = useState('')
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null)
  const [purchaseType, setPurchaseType] = useState<SubscriptionQuoteAction>('NEW')
  const [channel, setChannel] = useState<SubscriptionQuoteChannel>('WEB')
  const [selectedPlanId, setSelectedPlanId] = useState<string | undefined>(undefined)
  const [selectedDurationDays, setSelectedDurationDays] = useState<number | undefined>(undefined)
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string | undefined>(undefined)
  const [actionPolicy, setActionPolicy] = useState<SubscriptionActionPolicy | null>(null)
  const [quote, setQuote] = useState<SubscriptionQuote | null>(null)
  const [createdDraft, setCreatedDraft] = useState<PaymentTransaction | null>(null)

  const userLookupMutation = useMutation({
    mutationFn: (payload: UserSearchPayload) => usersApi.searchUser(payload),
    onSuccess: (result) => {
      setSelectedUser(result)
      setQuote(null)
      setCreatedDraft(null)
      setActionPolicy(null)
      const subscriptionId = result.subscription?.id
      setSelectedSubscriptionId(subscriptionId)
      void actionPolicyMutation.mutateAsync({
        userId: result.session.id,
        subscriptionId,
        channel,
      })
    },
  })

  const actionPolicyMutation = useMutation({
    mutationFn: subscriptionQuoteApi.getActionPolicy,
    onSuccess: (policy) => {
      setActionPolicy(policy)
      setSelectedPlanId(policy.availablePlans[0]?.id)
      setSelectedDurationDays(policy.availablePlans[0]?.durations[0]?.days)
    },
  })

  const quoteMutation = useMutation({
    mutationFn: subscriptionQuoteApi.getQuote,
    onSuccess: (result) => {
      setQuote(result)
    },
  })

  const createDraftMutation = useMutation({
    mutationFn: paymentApi.createDraft,
    onSuccess: (result) => {
      setCreatedDraft(result)
    },
  })

  const availablePlans = quote?.availablePlans ?? actionPolicy?.availablePlans ?? []
  const selectedPlan = useMemo(
    () => availablePlans.find((plan) => plan.id === selectedPlanId) ?? availablePlans[0],
    [availablePlans, selectedPlanId],
  )
  const availableDurations = selectedPlan?.durations ?? []

  function submitUserLookup(): void {
    const value = lookupValue.trim()
    if (value.length === 0) {
      return
    }
    const payload = {
      userId: '',
      telegramId: '',
      email: '',
      login: '',
    }
    payload[lookupMode] = value
    const parsedPayload = createUserSearchSchema().parse(payload)
    void userLookupMutation.mutateAsync(parsedPayload)
  }

  function requestPolicy(): void {
    if (!selectedUser) {
      return
    }
    void actionPolicyMutation.mutateAsync({
      userId: selectedUser.session.id,
      subscriptionId: selectedSubscriptionId,
      channel,
    })
  }

  function requestQuote(): void {
    if (!selectedUser) {
      return
    }
    setCreatedDraft(null)
    void quoteMutation.mutateAsync({
      userId: selectedUser.session.id,
      purchaseType,
      subscriptionId: selectedSubscriptionId,
      planId: selectedPlanId,
      durationDays: selectedDurationDays,
      channel,
    })
  }

  function createLocalDraft(): void {
    if (!selectedUser || !quote?.isEligible || quote.price === null || quote.selectedPlan === null || quote.selectedDuration === null) {
      return
    }
    if (purchaseType === 'TRIAL') {
      return
    }
    void createDraftMutation.mutateAsync({
      userId: selectedUser.session.id,
      purchaseType,
      planId: quote.selectedPlan.id,
      durationDays: quote.selectedDuration.days,
      gatewayType: quote.price.gatewayType,
      sourceSubscriptionId: selectedSubscriptionId,
      channel,
    })
  }

  return (
    <div className="space-y-4">
      <section className="rounded-[28px] border border-border/80 bg-card/90 px-5 py-5 shadow-sm backdrop-blur sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Subscriptions</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Quote Preview</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Preview subscription actions and pricing without creating transactions, taking payment, or provisioning Remnawave users.
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>User lookup</CardTitle>
          <CardDescription>Resolve the user through the existing admin search contract.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)_auto]">
          <div className="space-y-2">
            <Label>Lookup mode</Label>
            <Select value={lookupMode} onValueChange={(value: UserLookupMode) => setLookupMode(value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="login">Login</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="telegramId">Telegram ID</SelectItem>
                <SelectItem value="userId">User ID</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Identifier</Label>
            <Input value={lookupValue} onChange={(event) => setLookupValue(event.target.value)} />
          </div>
          <div className="flex items-end">
            <Button type="button" onClick={submitUserLookup} disabled={userLookupMutation.isPending}>
              <Search className="size-4" />
              Resolve
            </Button>
          </div>
          {userLookupMutation.error ? <ErrorMessage message={translateErrorMessage(t, userLookupMutation.error.message)} /> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Action setup</CardTitle>
          <CardDescription>Choose the read-only subscription action and candidate plan.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-4">
          <SelectField label="Action" value={purchaseType} onChange={(value) => setPurchaseType(value as SubscriptionQuoteAction)} values={['NEW', 'ADDITIONAL', 'RENEW', 'UPGRADE', 'TRIAL']} />
          <SelectField label="Channel" value={channel} onChange={(value) => setChannel(value as SubscriptionQuoteChannel)} values={['WEB', 'TELEGRAM', 'MINI_APP']} />
          <SelectField label="Plan" value={selectedPlanId ?? ''} onChange={(value) => {
            setSelectedPlanId(value)
            const nextPlan = availablePlans.find((plan) => plan.id === value)
            setSelectedDurationDays(nextPlan?.durations[0]?.days)
          }} values={availablePlans.map((plan) => plan.id)} labels={Object.fromEntries(availablePlans.map((plan) => [plan.id, plan.name]))} />
          <SelectField label="Duration" value={selectedDurationDays === undefined ? '' : String(selectedDurationDays)} onChange={(value) => setSelectedDurationDays(Number(value))} values={availableDurations.map((duration) => String(duration.days))} labels={Object.fromEntries(availableDurations.map((duration) => [String(duration.days), formatDuration(duration.days)]))} />
          <div className="lg:col-span-4 flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={requestPolicy} disabled={!selectedUser || actionPolicyMutation.isPending}>
              Refresh policy
            </Button>
            <Button type="button" onClick={requestQuote} disabled={!selectedUser || quoteMutation.isPending}>
              <Calculator className="size-4" />
              Preview quote
            </Button>
          </div>
          {actionPolicyMutation.error ? <ErrorMessage message={translateErrorMessage(t, actionPolicyMutation.error.message)} /> : null}
          {quoteMutation.error ? <ErrorMessage message={translateErrorMessage(t, quoteMutation.error.message)} /> : null}
        </CardContent>
      </Card>

      {selectedUser ? (
        <Card>
          <CardHeader>
            <CardTitle>{selectedUser.session.webAccount?.login ?? selectedUser.session.email ?? selectedUser.session.id}</CardTitle>
            <CardDescription>
              {actionPolicy
                ? `${actionPolicy.activeSubscriptionCount}/${actionPolicy.maxSubscriptions} active subscriptions`
                : 'Action policy has not been loaded yet.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-5">
            {actionPolicy ? Object.entries(actionPolicy.actions).map(([action, allowed]) => (
              <InfoTile key={action} label={action} value={allowed ? 'Allowed' : 'Blocked'} />
            )) : null}
          </CardContent>
        </Card>
      ) : null}

      {quote ? (
        <Card>
          <CardHeader>
            <CardTitle>{quote.isEligible ? 'Quote ready' : 'Quote incomplete'}</CardTitle>
            <CardDescription>
              {quote.selectedPlan ? `${quote.selectedPlan.name} / ${quote.selectedDuration ? formatDuration(quote.selectedDuration.days) : 'no duration'}` : 'No plan selected'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {quote.price ? (
              <div className="grid gap-3 md:grid-cols-4">
                <InfoTile label="Gateway" value={quote.price.gatewayType} />
                <InfoTile label="Currency" value={quote.price.currency} />
                <InfoTile label="Original" value={quote.price.originalPrice} />
                <InfoTile label="Final" value={`${quote.price.price} (${quote.price.discountSource} ${quote.price.discountPercent}%)`} />
              </div>
            ) : null}
            {quote.isEligible && purchaseType !== 'TRIAL' && quote.price ? (
              <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" onClick={createLocalDraft} disabled={createDraftMutation.isPending}>
                    Create local draft
                  </Button>
                  <Badge variant="outline">Local only · not sent to provider</Badge>
                </div>
              </div>
            ) : null}
            {createDraftMutation.error ? <ErrorMessage message={translateErrorMessage(t, createDraftMutation.error.message)} /> : null}
            {createdDraft ? (
              <p className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">
                Local draft created: {createdDraft.id} ({createdDraft.status})
              </p>
            ) : null}
            <Warnings warnings={quote.warnings} />
          </CardContent>
        </Card>
      ) : actionPolicy ? (
        <Card>
          <CardHeader>
            <CardTitle>Policy warnings</CardTitle>
            <CardDescription>Warnings returned while resolving action candidates.</CardDescription>
          </CardHeader>
          <CardContent>
            <Warnings warnings={actionPolicy.warnings} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

function SelectField({
  label,
  value,
  values,
  labels = {},
  onChange,
}: {
  readonly label: string
  readonly value: string
  readonly values: readonly string[]
  readonly labels?: Readonly<Record<string, string>>
  readonly onChange: (value: string) => void
}): JSX.Element {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={values.length === 0}>
        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
        <SelectContent>
          {values.map((item) => (
            <SelectItem key={item} value={item}>{labels[item] ?? item}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function InfoTile({ label, value }: { readonly label: string; readonly value: string }): JSX.Element {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  )
}

function ErrorMessage({ message }: { readonly message: string }): JSX.Element {
  return <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive lg:col-span-4">{message}</p>
}

function Warnings({ warnings }: { readonly warnings: readonly { readonly code: string; readonly message: string }[] }): JSX.Element {
  if (warnings.length === 0) {
    return <p className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-sm text-muted-foreground">No warnings.</p>
  }
  return (
    <div className="grid gap-2">
      {warnings.map((warning) => (
        <div key={warning.code} className="rounded-2xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">{warning.code}</p>
          <p className="mt-1">{warning.message}</p>
        </div>
      ))}
    </div>
  )
}

function formatDuration(days: number): string {
  return days === -1 ? 'Unlimited duration' : `${days} days`
}

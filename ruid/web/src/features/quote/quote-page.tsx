import { useEffect, useMemo, useState, type ReactElement } from 'react'
import { useMutation } from '@tanstack/react-query'
import { AuthRequiredState } from '@/features/auth/auth-required-state'
import { useAuthSession } from '@/features/auth/auth-provider'
import { paymentsApi } from '@/features/payments/payments-api'
import {
  quoteApi,
  type PaymentGatewayType,
  type SubscriptionActionPolicy,
  type SubscriptionQuote,
  type SubscriptionQuoteAction,
  type SubscriptionQuoteChannel,
} from '@/features/quote/quote-api'
import { getApiErrorMessage } from '@/lib/api'
import { useNavigate } from 'react-router-dom'

const PURCHASE_ACTIONS: readonly SubscriptionQuoteAction[] = [
  'NEW',
  'ADDITIONAL',
  'RENEW',
  'UPGRADE',
  'TRIAL',
]

const PURCHASE_CHANNELS: readonly SubscriptionQuoteChannel[] = ['WEB', 'TELEGRAM', 'MINI_APP']
const PAYMENT_GATEWAYS: readonly PaymentGatewayType[] = [
  'YOOKASSA',
  'TELEGRAM_STARS',
  'PLATEGA',
  'HELEKET',
  'CRYPTOMUS',
  'MULENPAY',
]

export function QuotePage(): ReactElement {
  const authSession = useAuthSession()
  const navigate = useNavigate()
  const [channel, setChannel] = useState<SubscriptionQuoteChannel>('WEB')
  const [purchaseType, setPurchaseType] = useState<SubscriptionQuoteAction>('NEW')
  const [subscriptionId, setSubscriptionId] = useState<string>('')
  const [selectedPlanId, setSelectedPlanId] = useState<string>('')
  const [selectedDurationDays, setSelectedDurationDays] = useState<string>('')
  const [gatewayType, setGatewayType] = useState<PaymentGatewayType | ''>('')
  const [actionPolicy, setActionPolicy] = useState<SubscriptionActionPolicy | null>(null)
  const [quote, setQuote] = useState<SubscriptionQuote | null>(null)

  const actionPolicyMutation = useMutation({
    mutationFn: quoteApi.getActionPolicy,
    onSuccess: (nextActionPolicy) => {
      setActionPolicy(nextActionPolicy)
      setQuote(null)
      if (nextActionPolicy.currentSubscriptionId !== null) {
        setSubscriptionId(nextActionPolicy.currentSubscriptionId)
      }
      const firstPlan = nextActionPolicy.availablePlans[0]
      if (firstPlan) {
        setSelectedPlanId(firstPlan.id)
        setSelectedDurationDays(
          firstPlan.durations[0] ? String(firstPlan.durations[0].days) : '',
        )
      } else {
        setSelectedPlanId('')
        setSelectedDurationDays('')
      }
    },
  })

  const quoteMutation = useMutation({
    mutationFn: quoteApi.getQuote,
    onSuccess: (nextQuote) => {
      setQuote(nextQuote)
    },
  })

  const checkoutMutation = useMutation({
    mutationFn: paymentsApi.checkout,
    onSuccess: (checkout) => {
      if (checkout.checkoutUrl) {
        window.location.assign(checkout.checkoutUrl)
        return
      }
      void navigate(`/payments/result?paymentId=${encodeURIComponent(checkout.paymentId)}`)
    },
  })

  useEffect(() => {
    if (authSession.status !== 'authenticated' || actionPolicy !== null || actionPolicyMutation.isPending) {
      return
    }
    void actionPolicyMutation.mutateAsync({
      subscriptionId: subscriptionId || undefined,
      channel,
    })
  }, [
    actionPolicy,
    actionPolicyMutation,
    authSession.status,
    channel,
    subscriptionId,
  ])

  const availablePlans = quote?.availablePlans ?? actionPolicy?.availablePlans ?? []
  const availableGateways = useMemo(
    () =>
      PAYMENT_GATEWAYS.filter((candidateGateway) =>
        channel === 'WEB' ? candidateGateway !== 'TELEGRAM_STARS' : true,
      ),
    [channel],
  )
  const selectedPlan = useMemo(
    () => availablePlans.find((plan) => plan.id === selectedPlanId) ?? availablePlans[0] ?? null,
    [availablePlans, selectedPlanId],
  )
  const availableDurations = selectedPlan?.durations ?? []

  useEffect(() => {
    if (!selectedPlan) {
      setSelectedDurationDays('')
      return
    }
    if (availableDurations.some((duration) => String(duration.days) === selectedDurationDays)) {
      return
    }
    setSelectedDurationDays(availableDurations[0] ? String(availableDurations[0].days) : '')
  }, [availableDurations, selectedDurationDays, selectedPlan])

  function refreshActionPolicy(): void {
    setQuote(null)
    void actionPolicyMutation.mutateAsync({
      subscriptionId: subscriptionId || undefined,
      channel,
    })
  }

  function previewQuote(): void {
    void quoteMutation.mutateAsync({
      purchaseType,
      subscriptionId: subscriptionId || undefined,
      planId: selectedPlan?.id,
      durationDays: selectedDurationDays ? Number(selectedDurationDays) : undefined,
      channel,
      gatewayType: gatewayType || undefined,
    })
  }

  function startCheckout(): void {
    if (!quote?.isEligible || quote.price === null || selectedPlan === null || purchaseType === 'TRIAL') {
      return
    }
    void checkoutMutation.mutateAsync({
      purchaseType,
      planId: selectedPlan.id,
      durationDays: quote.selectedDuration?.days ?? Number(selectedDurationDays),
      gatewayType: quote.price.gatewayType,
      subscriptionId: subscriptionId || undefined,
      channel,
    })
  }

  const visibleError = actionPolicyMutation.error ?? quoteMutation.error ?? checkoutMutation.error

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border/70 bg-card/95 p-6 shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight">Quote</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Session-aware quote preview and checkout start. This route evaluates action eligibility,
          shows pricing, and starts provider checkout for eligible payment flows.
        </p>
      </section>

      {authSession.status === 'authentication-required' ? <AuthRequiredState /> : null}
      {authSession.status === 'loading' ? (
        <p className="text-sm text-muted-foreground">Loading quote context...</p>
      ) : null}

      {authSession.status === 'authenticated' ? (
        <section className="rounded-3xl border border-border/70 bg-card/95 p-6 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-3">
            <SelectField
              label="Action"
              value={purchaseType}
              values={PURCHASE_ACTIONS}
              onChange={(nextValue) => setPurchaseType(nextValue as SubscriptionQuoteAction)}
            />
            <SelectField
              label="Channel"
              value={channel}
              values={PURCHASE_CHANNELS}
              onChange={(nextValue) => setChannel(nextValue as SubscriptionQuoteChannel)}
            />
            <TextField
              label="Source subscription ID"
              value={subscriptionId}
              placeholder="Optional UUID"
              onChange={setSubscriptionId}
            />
            <SelectField
              label="Plan"
              value={selectedPlan?.id ?? ''}
              values={availablePlans.map((plan) => plan.id)}
              labels={Object.fromEntries(availablePlans.map((plan) => [plan.id, plan.name]))}
              onChange={(nextValue) => {
                setSelectedPlanId(nextValue)
                const nextPlan = availablePlans.find((plan) => plan.id === nextValue)
                setSelectedDurationDays(nextPlan?.durations[0] ? String(nextPlan.durations[0].days) : '')
              }}
            />
            <SelectField
              label="Duration"
              value={selectedDurationDays}
              values={availableDurations.map((duration) => String(duration.days))}
              labels={Object.fromEntries(
                availableDurations.map((duration) => [
                  String(duration.days),
                  formatDuration(duration.days),
                ]),
              )}
              onChange={setSelectedDurationDays}
            />
            <SelectField
              label="Gateway (optional)"
              value={gatewayType}
              values={['', ...availableGateways]}
              labels={{
                '': 'Auto',
              }}
              onChange={(nextValue) => setGatewayType(nextValue as PaymentGatewayType | '')}
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-secondary"
              onClick={refreshActionPolicy}
              disabled={actionPolicyMutation.isPending}
            >
              Refresh policy
            </button>
            <button
              type="button"
              className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              onClick={previewQuote}
              disabled={quoteMutation.isPending || selectedPlan === null}
            >
              Preview quote
            </button>
            <button
              type="button"
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={startCheckout}
              disabled={
                checkoutMutation.isPending ||
                purchaseType === 'TRIAL' ||
                !quote?.isEligible ||
                quote.price === null
              }
            >
              Pay now
            </button>
          </div>

          {visibleError ? (
            <p className="mt-4 rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {getApiErrorMessage(visibleError)}
            </p>
          ) : null}

          {actionPolicy ? (
            <div className="mt-5 grid gap-3 md:grid-cols-5">
              {Object.entries(actionPolicy.actions).map(([actionKey, isAllowed]) => (
                <InfoTile
                  key={actionKey}
                  label={actionKey}
                  value={isAllowed ? 'Allowed' : 'Blocked'}
                />
              ))}
            </div>
          ) : null}

          {quote ? (
            <div className="mt-5 space-y-3">
              <InfoTile label="Eligible" value={quote.isEligible ? 'Yes' : 'No'} />
              {quote.price ? (
                <div className="grid gap-3 md:grid-cols-4">
                  <InfoTile label="Gateway" value={quote.price.gatewayType} />
                  <InfoTile label="Currency" value={quote.price.currency} />
                  <InfoTile label="Original" value={quote.price.originalPrice} />
                  <InfoTile label="Final" value={quote.price.price} />
                </div>
              ) : null}
              <WarningsList warnings={quote.warnings} />
            </div>
          ) : actionPolicy ? (
            <div className="mt-5">
              <WarningsList warnings={actionPolicy.warnings} />
            </div>
          ) : null}
        </section>
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
}): ReactElement {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <select
        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {values.map((itemValue) => (
          <option key={itemValue || '__empty'} value={itemValue}>
            {labels[itemValue] ?? itemValue}
          </option>
        ))}
      </select>
    </label>
  )
}

function TextField({
  label,
  value,
  placeholder,
  onChange,
}: {
  readonly label: string
  readonly value: string
  readonly placeholder: string
  readonly onChange: (value: string) => void
}): ReactElement {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <input
        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

function InfoTile({ label, value }: { readonly label: string; readonly value: string }): ReactElement {
  return (
    <article className="rounded-2xl bg-secondary/50 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </article>
  )
}

function WarningsList({
  warnings,
}: {
  readonly warnings: readonly { readonly code: string; readonly message: string }[]
}): ReactElement {
  if (warnings.length === 0) {
    return (
      <p className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-sm text-muted-foreground">
        No warnings.
      </p>
    )
  }
  return (
    <div className="grid gap-2">
      {warnings.map((warning) => (
        <div
          key={warning.code}
          className="rounded-2xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          <p className="font-medium">{warning.code}</p>
          <p className="mt-1">{warning.message}</p>
        </div>
      ))}
    </div>
  )
}

function formatDuration(days: number): string {
  if (days === -1) {
    return 'Unlimited duration'
  }
  return `${days} days`
}

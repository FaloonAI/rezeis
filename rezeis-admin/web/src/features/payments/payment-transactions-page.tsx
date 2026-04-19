import type { JSX } from 'react'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FilePlus2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { paymentApi, type PaymentGatewayType, type PaymentTransaction, type PurchaseChannel, type PurchaseType, type TransactionStatus } from '@/features/payments/payments-api'
import { translateErrorMessage } from '@/lib/translate-error'
import { useTranslation } from 'react-i18next'

export function PaymentTransactionsPage(): JSX.Element {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [filterUserId, setFilterUserId] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterGatewayType, setFilterGatewayType] = useState<string>('all')
  const [filterPurchaseType, setFilterPurchaseType] = useState<string>('all')
  const [formState, setFormState] = useState({
    userId: '',
    purchaseType: 'NEW' as PurchaseType,
    planId: '',
    durationDays: '30',
    gatewayType: 'YOOKASSA' as PaymentGatewayType,
    sourceSubscriptionId: '',
    channel: 'WEB' as PurchaseChannel,
  })
  const [localError, setLocalError] = useState<string>('')
  const [lastCreated, setLastCreated] = useState<PaymentTransaction | null>(null)

  const gatewaysQuery = useQuery({
    queryKey: ['payments', 'gateways'],
    queryFn: paymentApi.listGateways,
  })

  const transactionsQuery = useQuery({
    queryKey: ['payments', 'transactions', filterUserId, filterStatus, filterGatewayType, filterPurchaseType],
    queryFn: () =>
      paymentApi.listTransactions({
        userId: filterUserId.trim() || undefined,
        status: filterStatus === 'all' ? undefined : (filterStatus as TransactionStatus),
        gatewayType: filterGatewayType === 'all' ? undefined : (filterGatewayType as PaymentGatewayType),
        purchaseType: filterPurchaseType === 'all' ? undefined : (filterPurchaseType as PurchaseType),
      }),
  })

  const createDraftMutation = useMutation({
    mutationFn: paymentApi.createDraft,
    onSuccess: async (createdTransaction) => {
      setLastCreated(createdTransaction)
      await queryClient.invalidateQueries({ queryKey: ['payments', 'transactions'] })
    },
  })

  const gatewayOptions = useMemo(() => gatewaysQuery.data?.map((gateway) => gateway.type) ?? paymentApi.gatewayTypes, [gatewaysQuery.data])

  function createDraftFromForm(): void {
    if (!formState.userId.trim() || !formState.planId.trim()) {
      setLocalError('User ID and Plan ID are required.')
      return
    }
    const durationDays = Number(formState.durationDays)
    if (!Number.isInteger(durationDays) || durationDays < -1) {
      setLocalError('Duration must be an integer and greater than or equal to -1.')
      return
    }
    setLocalError('')
    void createDraftMutation.mutateAsync({
      userId: formState.userId.trim(),
      purchaseType: formState.purchaseType,
      planId: formState.planId.trim(),
      durationDays,
      gatewayType: formState.gatewayType,
      sourceSubscriptionId: formState.sourceSubscriptionId.trim() || undefined,
      channel: formState.channel,
    })
  }

  return (
    <div className="space-y-4">
      <section className="rounded-[28px] border border-border/80 bg-card/90 px-5 py-5 shadow-sm backdrop-blur sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Payments</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Transaction Drafts</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Create local-only pending transaction drafts from quote inputs. Drafts are not sent to providers and do not provision subscriptions.
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Create local draft</CardTitle>
          <CardDescription>Use explicit quote inputs to persist a pending local transaction draft only.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-3">
          <Field label="User ID">
            <Input value={formState.userId} onChange={(event) => setFormState((prev) => ({ ...prev, userId: event.target.value }))} placeholder="11111111-1111-1111-1111-111111111111" />
          </Field>
          <Field label="Purchase action">
            <Select value={formState.purchaseType} onValueChange={(value) => setFormState((prev) => ({ ...prev, purchaseType: value as PurchaseType }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {paymentApi.purchaseTypes.map((purchaseType) => (
                  <SelectItem key={purchaseType} value={purchaseType}>
                    {purchaseType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Channel">
            <Select value={formState.channel} onValueChange={(value) => setFormState((prev) => ({ ...prev, channel: value as PurchaseChannel }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {paymentApi.purchaseChannels.map((channel) => (
                  <SelectItem key={channel} value={channel}>
                    {channel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Plan ID">
            <Input value={formState.planId} onChange={(event) => setFormState((prev) => ({ ...prev, planId: event.target.value }))} placeholder="plan uuid" />
          </Field>
          <Field label="Duration days">
            <Input value={formState.durationDays} onChange={(event) => setFormState((prev) => ({ ...prev, durationDays: event.target.value }))} />
          </Field>
          <Field label="Gateway type">
            <Select value={formState.gatewayType} onValueChange={(value) => setFormState((prev) => ({ ...prev, gatewayType: value as PaymentGatewayType }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {gatewayOptions.map((gatewayType) => (
                  <SelectItem key={gatewayType} value={gatewayType}>
                    {gatewayType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Source subscription ID (optional)">
            <Input value={formState.sourceSubscriptionId} onChange={(event) => setFormState((prev) => ({ ...prev, sourceSubscriptionId: event.target.value }))} placeholder="subscription uuid" />
          </Field>
          <div className="lg:col-span-3 flex flex-wrap gap-2">
            <Button type="button" onClick={createDraftFromForm} disabled={createDraftMutation.isPending}>
              <FilePlus2 className="size-4" />
              Create local draft
            </Button>
            <Badge variant="outline">Local only · no provider call</Badge>
          </div>
          {localError ? <ErrorMessage message={localError} /> : null}
          {createDraftMutation.error ? <ErrorMessage message={translateErrorMessage(t, createDraftMutation.error.message)} /> : null}
          {lastCreated ? (
            <p className="lg:col-span-3 rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">
              Draft created: {lastCreated.id} ({lastCreated.status})
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent transactions</CardTitle>
          <CardDescription>Filter pending and historical transaction records by status, gateway, purchase action, and user.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-4">
            <Field label="User ID">
              <Input value={filterUserId} onChange={(event) => setFilterUserId(event.target.value)} placeholder="optional user uuid" />
            </Field>
            <Field label="Status">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {paymentApi.statuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Gateway">
              <Select value={filterGatewayType} onValueChange={setFilterGatewayType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {paymentApi.gatewayTypes.map((gatewayType) => (
                    <SelectItem key={gatewayType} value={gatewayType}>
                      {gatewayType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Purchase action">
              <Select value={filterPurchaseType} onValueChange={setFilterPurchaseType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {paymentApi.purchaseTypes.map((purchaseType) => (
                    <SelectItem key={purchaseType} value={purchaseType}>
                      {purchaseType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {transactionsQuery.isPending ? <p className="text-sm text-muted-foreground">Loading transactions…</p> : null}
          {transactionsQuery.error ? <ErrorMessage message={translateErrorMessage(t, transactionsQuery.error.message)} /> : null}

          <div className="space-y-2">
            {(transactionsQuery.data ?? []).map((transaction) => (
              <div key={transaction.id} className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{transaction.id}</p>
                  <Badge variant={transaction.status === 'PENDING' ? 'secondary' : 'outline'}>{transaction.status}</Badge>
                  <Badge variant="outline">{transaction.gatewayType}</Badge>
                  <Badge variant="outline">{transaction.purchaseType}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  User: {transaction.userId} · Amount: {transaction.amount} {transaction.currency} · Created: {new Date(transaction.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
            {transactionsQuery.data?.length === 0 ? (
              <p className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-sm text-muted-foreground">
                No transactions found for current filters.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Field({ label, children }: { readonly label: string; readonly children: JSX.Element }): JSX.Element {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function ErrorMessage({ message }: { readonly message: string }): JSX.Element {
  return <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive lg:col-span-3">{message}</p>
}

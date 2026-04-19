import type { JSX } from 'react'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, RefreshCcw, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { paymentApi, type PaymentGatewayType, type PaymentWebhookEvent, type PaymentWebhookLifecycleStatus } from '@/features/payments/payments-api'
import { translateErrorMessage } from '@/lib/translate-error'
import { useTranslation } from 'react-i18next'

export function PaymentWebhooksPage(): JSX.Element {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [gatewayType, setGatewayType] = useState('all')
  const [status, setStatus] = useState('all')
  const [paymentId, setPaymentId] = useState('')
  const [providerEventId, setProviderEventId] = useState('')
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [includeRaw, setIncludeRaw] = useState(false)
  const [replayReason, setReplayReason] = useState('')
  const [forceReplay, setForceReplay] = useState(false)

  const eventsQuery = useQuery({
    queryKey: ['payments', 'webhooks', gatewayType, status, paymentId, providerEventId],
    queryFn: () => paymentApi.listWebhookEvents({
      gatewayType: gatewayType === 'all' ? undefined : (gatewayType as PaymentGatewayType),
      status: status === 'all' ? undefined : (status as PaymentWebhookLifecycleStatus),
      paymentId: paymentId.trim() || undefined,
      providerEventId: providerEventId.trim() || undefined,
      limit: 100,
    }),
  })

  const detailQuery = useQuery({
    queryKey: ['payments', 'webhooks', selectedEventId, includeRaw],
    queryFn: () => paymentApi.getWebhookEvent(selectedEventId ?? '', includeRaw),
    enabled: selectedEventId !== null,
  })

  const replayMutation = useMutation({
    mutationFn: paymentApi.replayWebhookEvent,
    onSuccess: async () => {
      setReplayReason('')
      setForceReplay(false)
      await queryClient.invalidateQueries({ queryKey: ['payments', 'webhooks'] })
      await queryClient.invalidateQueries({ queryKey: ['payments', 'reconciliation'] })
    },
  })

  function selectEvent(event: PaymentWebhookEvent): void {
    setSelectedEventId(event.id)
    setIncludeRaw(false)
  }

  function replaySelectedEvent(): void {
    if (selectedEventId === null || replayReason.trim().length < 3) {
      return
    }
    void replayMutation.mutateAsync({
      eventId: selectedEventId,
      reason: replayReason.trim(),
      force: forceReplay,
    })
  }

  return (
    <div className="space-y-4">
      <section className="rounded-[28px] border border-border/80 bg-card/90 px-5 py-5 shadow-sm backdrop-blur sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Payments</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Webhook Inbox</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Inspect provider deliveries, replay stuck events, and reveal payloads only when an operator explicitly needs them.
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Find webhook deliveries by gateway, lifecycle status, payment ID, or provider event ID.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-[180px_180px_minmax(0,1fr)_minmax(0,1fr)_auto]">
          <Select value={gatewayType} onValueChange={setGatewayType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All gateways</SelectItem>
              {paymentApi.gatewayTypes.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {paymentApi.webhookStatuses.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input value={paymentId} onChange={(event) => setPaymentId(event.target.value)} placeholder="paymentId" />
          <Input value={providerEventId} onChange={(event) => setProviderEventId(event.target.value)} placeholder="providerEventId" />
          <Button type="button" variant="outline" onClick={() => void eventsQuery.refetch()}>
            <Search className="size-4" />
            Search
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card>
          <CardHeader>
            <CardTitle>Deliveries</CardTitle>
            <CardDescription>{eventsQuery.data?.length ?? 0} events in current view.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {eventsQuery.isPending ? <p className="text-sm text-muted-foreground">Loading webhook events...</p> : null}
            {eventsQuery.error ? <ErrorMessage message={translateErrorMessage(t, eventsQuery.error.message)} /> : null}
            {(eventsQuery.data ?? []).map((event) => (
              <button
                key={event.id}
                type="button"
                className="w-full rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-left transition-colors hover:bg-accent"
                onClick={() => selectEvent(event)}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={event.status === 'FAILED' ? 'destructive' : event.status === 'PROCESSED' ? 'default' : 'secondary'}>
                    {event.status}
                  </Badge>
                  <Badge variant="outline">{event.gatewayType}</Badge>
                  <span className="text-sm font-medium">{event.paymentId}</span>
                </div>
                <p className="mt-2 break-all text-xs text-muted-foreground">
                  providerEventId: {event.providerEventId} · attempts {event.attempts} · replay {event.replayCount}
                </p>
                {event.lastError ? <p className="mt-2 text-sm text-destructive">{event.lastError}</p> : null}
              </button>
            ))}
            {eventsQuery.data?.length === 0 ? (
              <p className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-sm text-muted-foreground">No webhook events found.</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Event detail</CardTitle>
            <CardDescription>Payload is redacted until explicit reveal.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedEventId ? <p className="text-sm text-muted-foreground">Select an event to inspect it.</p> : null}
            {detailQuery.error ? <ErrorMessage message={translateErrorMessage(t, detailQuery.error.message)} /> : null}
            {detailQuery.data ? (
              <>
                <InfoLine label="Event" value={detailQuery.data.id} />
                <InfoLine label="Payment" value={detailQuery.data.paymentId} />
                <InfoLine label="Status" value={detailQuery.data.status} />
                <InfoLine label="Last transition" value={new Date(detailQuery.data.lastTransitionAt).toLocaleString()} />
                <div className="space-y-2">
                  <Label>Payload</Label>
                  <pre className="max-h-[340px] overflow-auto rounded-2xl border border-border/70 bg-background/80 p-3 text-xs">
                    {JSON.stringify(detailQuery.data.rawPayload ?? detailQuery.data.redactedPayload, null, 2)}
                  </pre>
                </div>
                <Button type="button" variant="outline" onClick={() => setIncludeRaw(true)} disabled={includeRaw}>
                  <Eye className="size-4" />
                  Reveal raw payload
                </Button>
                <div className="space-y-2">
                  <Label>Replay reason</Label>
                  <Textarea value={replayReason} onChange={(event) => setReplayReason(event.target.value)} placeholder="Why is this event being replayed?" />
                </div>
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox checked={forceReplay} onCheckedChange={(checked) => setForceReplay(checked === true)} />
                  Force replay for processed events
                </label>
                <Button type="button" onClick={replaySelectedEvent} disabled={replayMutation.isPending || replayReason.trim().length < 3}>
                  <RefreshCcw className="size-4" />
                  Replay event
                </Button>
                {replayMutation.error ? <ErrorMessage message={translateErrorMessage(t, replayMutation.error.message)} /> : null}
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function InfoLine({ label, value }: { readonly label: string; readonly value: string }): JSX.Element {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1 break-all text-sm font-medium">{value}</p>
    </div>
  )
}

function ErrorMessage({ message }: { readonly message: string }): JSX.Element {
  return <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{message}</p>
}

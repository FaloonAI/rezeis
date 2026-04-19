import type { JSX } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Activity, AlertTriangle, Clock, ListChecks } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { paymentApi } from '@/features/payments/payments-api'
import { translateErrorMessage } from '@/lib/translate-error'
import { useTranslation } from 'react-i18next'

export function PaymentReconciliationPage(): JSX.Element {
  const { t } = useTranslation()
  const healthQuery = useQuery({
    queryKey: ['payments', 'reconciliation', 'health'],
    queryFn: paymentApi.getReconciliationHealth,
    refetchInterval: 15_000,
  })
  const health = healthQuery.data
  return (
    <div className="space-y-4">
      <section className="rounded-[28px] border border-border/80 bg-card/90 px-5 py-5 shadow-sm backdrop-blur sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Payments</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Reconciliation Health</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Queue and webhook lifecycle health for payment settlement and subscription mutation.
        </p>
      </section>

      {healthQuery.error ? (
        <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{translateErrorMessage(t, healthQuery.error.message)}</p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-4">
        <MetricCard title="Waiting" value={health?.queue.waiting ?? 0} icon={<Clock className="size-5" />} />
        <MetricCard title="Active" value={health?.queue.active ?? 0} icon={<Activity className="size-5" />} />
        <MetricCard title="Failed jobs" value={health?.queue.failed ?? 0} icon={<AlertTriangle className="size-5" />} />
        <MetricCard title="Completed jobs" value={health?.queue.completed ?? 0} icon={<ListChecks className="size-5" />} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Webhook lifecycle</CardTitle>
            <CardDescription>Database state by processing status.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {paymentApi.webhookStatuses.map((status) => (
              <div key={status} className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{status}</p>
                <p className="mt-2 text-2xl font-semibold">{health?.eventsByStatus[status] ?? 0}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Stale signals</CardTitle>
            <CardDescription>Events that stayed too long in operationally sensitive statuses.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">ENQUEUED stale</p>
              <p className="mt-2 text-2xl font-semibold">{health?.staleEnqueuedCount ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">PROCESSING stale</p>
              <p className="mt-2 text-2xl font-semibold">{health?.staleProcessingCount ?? 0}</p>
            </div>
            <p className="text-sm text-muted-foreground sm:col-span-2">
              Last generated: {health?.generatedAt ? new Date(health.generatedAt).toLocaleString() : 'loading'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MetricCard({
  title,
  value,
  icon,
}: {
  readonly title: string
  readonly value: number
  readonly icon: JSX.Element
}): JSX.Element {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  )
}

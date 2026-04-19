import { useEffect, type ReactElement } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { useAuthSession } from '@/features/auth/auth-provider'
import { AuthRequiredState } from '@/features/auth/auth-required-state'
import { paymentsApi } from '@/features/payments/payments-api'
import { getApiErrorMessage } from '@/lib/api'

export function PaymentResultPage(): ReactElement {
  const [searchParams] = useSearchParams()
  const paymentId = searchParams.get('paymentId') ?? ''
  const authSession = useAuthSession()
  const queryClient = useQueryClient()

  const paymentStatusQuery = useQuery({
    queryKey: ['payments', 'status', paymentId],
    queryFn: () => paymentsApi.getPaymentStatus(paymentId),
    enabled: authSession.status === 'authenticated' && paymentId.length > 0,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'PENDING' || status === undefined ? 2000 : false
    },
  })

  useEffect(() => {
    if (paymentStatusQuery.data?.status !== 'COMPLETED') {
      return
    }
    void queryClient.invalidateQueries({ queryKey: ['session'] })
    void queryClient.invalidateQueries({ queryKey: ['subscription'] })
  }, [paymentStatusQuery.data?.status, queryClient])

  if (authSession.status === 'authentication-required') {
    return <AuthRequiredState />
  }
  if (!paymentId) {
    return (
      <section className="rounded-3xl border border-border/70 bg-card/95 p-6 shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight">Payment result</h1>
        <p className="mt-3 text-sm text-muted-foreground">Payment ID is missing.</p>
      </section>
    )
  }
  return (
    <section className="space-y-4 rounded-3xl border border-border/70 bg-card/95 p-6 shadow-sm">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Payment result</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We are checking the final payment state and waiting for reconciliation if needed.
        </p>
      </div>
      {authSession.status === 'loading' || paymentStatusQuery.isPending ? (
        <p className="text-sm text-muted-foreground">Loading payment status...</p>
      ) : null}
      {paymentStatusQuery.error ? (
        <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {getApiErrorMessage(paymentStatusQuery.error)}
        </p>
      ) : null}
      {paymentStatusQuery.data ? (
        <div className="grid gap-3 md:grid-cols-2">
          <Tile label="Status" value={paymentStatusQuery.data.status} />
          <Tile label="Gateway" value={paymentStatusQuery.data.gatewayType} />
          <Tile label="Purchase" value={paymentStatusQuery.data.purchaseType} />
          <Tile label="Amount" value={`${paymentStatusQuery.data.amount} ${paymentStatusQuery.data.currency}`} />
          <Tile label="Payment ID" value={paymentStatusQuery.data.paymentId} />
          <Tile label="Updated" value={new Date(paymentStatusQuery.data.updatedAt).toLocaleString()} />
          {paymentStatusQuery.data.failureReason ? (
            <Tile label="Failure" value={paymentStatusQuery.data.failureReason} />
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

function Tile({ label, value }: { readonly label: string; readonly value: string }): ReactElement {
  return (
    <article className="rounded-2xl bg-secondary/50 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1 break-all text-sm font-medium text-foreground">{value}</p>
    </article>
  )
}

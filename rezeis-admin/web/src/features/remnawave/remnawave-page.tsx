import type { JSX } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Activity, KeyRound, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { remnawaveApi } from '@/features/remnawave/remnawave-api'
import { translateErrorMessage } from '@/lib/translate-error'

export function RemnawavePage(): JSX.Element {
  const { t } = useTranslation()
  const statusQuery = useQuery({
    queryKey: ['remnawave', 'status'],
    queryFn: remnawaveApi.getStatus,
  })
  const status = statusQuery.data
  return (
    <div className="space-y-4">
      <section className="rounded-[28px] border border-border/80 bg-card/90 px-5 py-5 shadow-sm backdrop-blur sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">{t('nav.remnawave')}</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Remnawave Panel</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Checks the panel auth/status contract through the official Remnawave TypeScript SDK contract and the local admin backend adapter.
        </p>
      </section>
      {statusQuery.error ? (
        <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {translateErrorMessage(t, statusQuery.error.message)}
        </p>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-3">
        <StatusCard
          title="Configuration"
          description="Host, port, and API token availability."
          icon={<KeyRound className="size-5" />}
          value={statusQuery.isLoading ? 'Checking...' : status?.isConfigured ? 'Configured' : 'Not configured'}
        />
        <StatusCard
          title="Reachability"
          description="Panel auth status endpoint response."
          icon={<Activity className="size-5" />}
          value={statusQuery.isLoading ? 'Checking...' : status?.isReachable ? 'Reachable' : 'Unavailable'}
        />
        <StatusCard
          title="Authentication"
          description="Password, passkey, and OAuth2 modes exposed by the panel."
          icon={<ShieldCheck className="size-5" />}
          value={formatAuthentication(status)}
        />
      </div>
      {status?.branding ? (
        <Card>
          <CardHeader>
            <CardTitle>Branding</CardTitle>
            <CardDescription>Values returned by the panel auth-controller status contract.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <InfoTile label="Title" value={status.branding.title ?? 'Not set'} />
            <InfoTile label="Logo URL" value={status.branding.logoUrl ?? 'Not set'} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

function StatusCard({
  title,
  description,
  icon,
  value,
}: {
  readonly title: string
  readonly description: string
  readonly icon: JSX.Element
  readonly value: string
}): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-accent text-primary">{icon}</div>
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-lg font-semibold">{value}</p>
      </CardContent>
    </Card>
  )
}

function InfoTile({ label, value }: { readonly label: string; readonly value: string }): JSX.Element {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1 break-all text-sm font-medium">{value}</p>
    </div>
  )
}

function formatAuthentication(status: Awaited<ReturnType<typeof remnawaveApi.getStatus>> | undefined): string {
  if (status === undefined) {
    return 'Checking...'
  }
  if (status.authentication === null) {
    return 'Not exposed'
  }
  const oauthProviders = Object.entries(status.authentication.oauth2Providers)
    .filter(([, enabled]) => enabled)
    .map(([provider]) => provider)
  return [
    status.authentication.passwordEnabled ? 'password' : null,
    status.authentication.passkeyEnabled ? 'passkey' : null,
    ...oauthProviders,
  ].filter(Boolean).join(', ') || 'Disabled'
}

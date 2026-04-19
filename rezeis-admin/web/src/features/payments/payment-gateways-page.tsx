import type { JSX } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Save } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { paymentApi, type PaymentGateway } from '@/features/payments/payments-api'
import { translateErrorMessage } from '@/lib/translate-error'
import { useTranslation } from 'react-i18next'

interface GatewayDraft {
  readonly currency: string
  readonly isActive: boolean
  readonly settingsText: string
}

export function PaymentGatewaysPage(): JSX.Element {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [drafts, setDrafts] = useState<Record<string, GatewayDraft>>({})
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({})

  const gatewaysQuery = useQuery({
    queryKey: ['payments', 'gateways'],
    queryFn: paymentApi.listGateways,
  })

  useEffect(() => {
    if (!gatewaysQuery.data) {
      return
    }
    setDrafts((previousDrafts) => {
      const nextDrafts: Record<string, GatewayDraft> = {}
      for (const gateway of gatewaysQuery.data) {
        const previousGatewayDraft = previousDrafts[gateway.id]
        nextDrafts[gateway.id] = previousGatewayDraft ?? {
          currency: gateway.currency,
          isActive: gateway.isActive,
          settingsText: JSON.stringify(gateway.settings, null, 2),
        }
      }
      return nextDrafts
    })
  }, [gatewaysQuery.data])

  const updateGatewayMutation = useMutation({
    mutationFn: (payload: {
      readonly gatewayId: string
      readonly currency: string
      readonly isActive: boolean
      readonly settings: Record<string, unknown> | null
    }) =>
      paymentApi.updateGateway(payload.gatewayId, {
        currency: payload.currency as never,
        isActive: payload.isActive,
        settings: payload.settings,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['payments', 'gateways'] })
    },
  })

  const moveGatewayMutation = useMutation({
    mutationFn: (payload: { readonly gatewayId: string; readonly direction: 'up' | 'down' }) =>
      paymentApi.moveGateway(payload.gatewayId, payload.direction),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['payments', 'gateways'] })
    },
  })

  const createDefaultsMutation = useMutation({
    mutationFn: paymentApi.createGatewayDefaults,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['payments', 'gateways'] })
    },
  })

  const orderedGateways = useMemo(
    () =>
      [...(gatewaysQuery.data ?? [])].sort((left, right) =>
        left.orderIndex === right.orderIndex
          ? left.type.localeCompare(right.type)
          : left.orderIndex - right.orderIndex,
      ),
    [gatewaysQuery.data],
  )

  function setGatewayDraft(gatewayId: string, updater: (draft: GatewayDraft) => GatewayDraft): void {
    setDrafts((previousDrafts) => {
      const currentDraft = previousDrafts[gatewayId] ?? {
        currency: 'USD',
        isActive: false,
        settingsText: '{}',
      }
      return {
        ...previousDrafts,
        [gatewayId]: updater(currentDraft),
      }
    })
  }

  function saveGateway(gateway: PaymentGateway): void {
    const currentDraft = drafts[gateway.id]
    if (!currentDraft) {
      return
    }
    let parsedSettings: Record<string, unknown> | null
    try {
      const parsedValue = JSON.parse(currentDraft.settingsText) as unknown
      if (parsedValue === null) {
        parsedSettings = null
      } else if (typeof parsedValue !== 'object' || Array.isArray(parsedValue)) {
        setLocalErrors((previous) => ({
          ...previous,
          [gateway.id]: 'Settings must be a JSON object or null.',
        }))
        return
      } else {
        parsedSettings = parsedValue as Record<string, unknown>
      }
    } catch {
      setLocalErrors((previous) => ({
        ...previous,
        [gateway.id]: 'Settings must be valid JSON.',
      }))
      return
    }
    setLocalErrors((previous) => ({ ...previous, [gateway.id]: '' }))
    void updateGatewayMutation.mutateAsync({
      gatewayId: gateway.id,
      currency: currentDraft.currency,
      isActive: currentDraft.isActive,
      settings: parsedSettings,
    })
  }

  return (
    <div className="space-y-4">
      <section className="rounded-[28px] border border-border/80 bg-card/90 px-5 py-5 shadow-sm backdrop-blur sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Payments</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Gateway Registry</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Configure local payment gateways for quote and plan pricing. This page does not call providers and does not execute payments.
        </p>
      </section>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Gateway defaults</CardTitle>
            <CardDescription>Create missing default rows for all supported gateway types.</CardDescription>
          </div>
          <Button type="button" variant="outline" onClick={() => void createDefaultsMutation.mutateAsync()} disabled={createDefaultsMutation.isPending}>
            Create defaults
          </Button>
        </CardHeader>
      </Card>

      {gatewaysQuery.isPending ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">Loading gateways…</CardContent>
        </Card>
      ) : null}

      {gatewaysQuery.error ? (
        <Card>
          <CardContent className="py-6 text-sm text-destructive">
            {translateErrorMessage(t, gatewaysQuery.error.message)}
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-3">
        {orderedGateways.map((gateway) => {
          const draft = drafts[gateway.id]
          return (
            <Card key={gateway.id}>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base">{gateway.type}</CardTitle>
                  <CardDescription>
                    Order #{gateway.orderIndex} · Updated {new Date(gateway.updatedAt).toLocaleString()}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={gateway.isActive ? 'default' : 'outline'}>
                    {gateway.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  <Badge variant={gateway.isUsedInPricing ? 'secondary' : 'outline'}>
                    {gateway.isUsedInPricing ? `Used in pricing (${gateway.activePlanDurationCount})` : 'No active pricing usage'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select
                      value={draft?.currency ?? gateway.currency}
                      onValueChange={(value) =>
                        setGatewayDraft(gateway.id, (currentDraft) => ({
                          ...currentDraft,
                          currency: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentApi.currencies.map((currency) => (
                          <SelectItem key={currency} value={currency}>
                            {currency}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Active</Label>
                    <div className="flex h-10 items-center rounded-2xl border border-border/70 bg-background/70 px-3">
                      <Checkbox
                        checked={draft?.isActive ?? gateway.isActive}
                        onCheckedChange={(checked) =>
                          setGatewayDraft(gateway.id, (currentDraft) => ({
                            ...currentDraft,
                            isActive: checked === true,
                          }))
                        }
                      />
                      <span className="ml-2 text-sm text-muted-foreground">Enable gateway for pricing selection</span>
                    </div>
                  </div>
                  <div className="flex items-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void moveGatewayMutation.mutateAsync({ gatewayId: gateway.id, direction: 'up' })}
                      disabled={moveGatewayMutation.isPending}
                    >
                      <ArrowUp className="size-4" />
                      Move up
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void moveGatewayMutation.mutateAsync({ gatewayId: gateway.id, direction: 'down' })}
                      disabled={moveGatewayMutation.isPending}
                    >
                      <ArrowDown className="size-4" />
                      Move down
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Settings JSON</Label>
                  <Textarea
                    value={draft?.settingsText ?? JSON.stringify(gateway.settings, null, 2)}
                    onChange={(event) =>
                      setGatewayDraft(gateway.id, (currentDraft) => ({
                        ...currentDraft,
                        settingsText: event.target.value,
                      }))
                    }
                    rows={8}
                  />
                </div>
                {localErrors[gateway.id] ? (
                  <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{localErrors[gateway.id]}</p>
                ) : null}
                <div className="flex justify-end">
                  <Button type="button" onClick={() => saveGateway(gateway)} disabled={updateGatewayMutation.isPending}>
                    <Save className="size-4" />
                    Save gateway
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

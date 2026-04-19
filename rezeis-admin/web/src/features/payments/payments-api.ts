import { z } from 'zod'
import { api } from '@/lib/api'

const currencySchema = z.enum(['USD', 'RUB', 'USDT', 'XTR', 'TON', 'BTC', 'ETH'])
const paymentGatewayTypeSchema = z.enum(['TELEGRAM_STARS', 'YOOKASSA', 'PLATEGA', 'HELEKET', 'CRYPTOMUS', 'MULENPAY'])
const purchaseTypeSchema = z.enum(['NEW', 'ADDITIONAL', 'RENEW', 'UPGRADE'])
const purchaseChannelSchema = z.enum(['WEB', 'TELEGRAM', 'MINI_APP'])
const transactionStatusSchema = z.enum(['PENDING', 'COMPLETED', 'CANCELED', 'REFUNDED', 'FAILED'])
const paymentWebhookLifecycleStatusSchema = z.enum(['RECEIVED', 'ENQUEUED', 'PROCESSING', 'PROCESSED', 'FAILED'])

const paymentGatewaySchema = z.object({
  id: z.string(),
  type: paymentGatewayTypeSchema,
  orderIndex: z.number(),
  currency: currencySchema,
  isActive: z.boolean(),
  settings: z.record(z.string(), z.unknown()),
  isUsedInPricing: z.boolean(),
  activePlanDurationCount: z.number(),
  updatedAt: z.string(),
})

const paymentTransactionSchema = z.object({
  id: z.string(),
  paymentId: z.string(),
  userId: z.string(),
  subscriptionId: z.string().nullable(),
  status: transactionStatusSchema,
  purchaseType: purchaseTypeSchema,
  channel: purchaseChannelSchema,
  gatewayType: paymentGatewayTypeSchema,
  currency: currencySchema,
  amount: z.string(),
  paymentAsset: z.string().nullable(),
  gatewayId: z.string().nullable(),
  planSnapshot: z.unknown(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const paymentWebhookEventSchema = z.object({
  id: z.string(),
  gatewayType: paymentGatewayTypeSchema,
  paymentId: z.string(),
  providerEventId: z.string(),
  eventStatus: z.string().nullable(),
  status: paymentWebhookLifecycleStatusSchema,
  attempts: z.number(),
  reconciliationAttempts: z.number(),
  replayCount: z.number(),
  lastError: z.string().nullable(),
  receivedAt: z.string(),
  processedAt: z.string().nullable(),
  lastTransitionAt: z.string(),
  lastReplayedAt: z.string().nullable(),
})

const paymentWebhookEventDetailSchema = paymentWebhookEventSchema.extend({
  payloadHash: z.string().nullable(),
  redactedPayload: z.unknown(),
  rawPayload: z.unknown().nullable(),
})

const paymentReconciliationHealthSchema = z.object({
  queue: z.object({
    waiting: z.number(),
    active: z.number(),
    delayed: z.number(),
    completed: z.number(),
    failed: z.number(),
  }),
  eventsByStatus: z.record(paymentWebhookLifecycleStatusSchema, z.number()),
  staleProcessingCount: z.number(),
  staleEnqueuedCount: z.number(),
  generatedAt: z.string(),
})

const paymentOpsAlertSettingsSchema = z.object({
  enabled: z.boolean(),
  chatId: z.string().nullable(),
  threadId: z.string().nullable(),
  hashtag: z.string().nullable(),
})

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function unwrapPayload(value: unknown): Record<string, unknown> | unknown[] {
  if (Array.isArray(value)) {
    return value
  }
  if (!isRecord(value)) {
    throw new Error('errors.unexpectedResponsePayload')
  }
  const nestedValue: unknown = value.data
  if (Array.isArray(nestedValue) || isRecord(nestedValue)) {
    return nestedValue
  }
  return value
}

export type PaymentGateway = z.infer<typeof paymentGatewaySchema>
export type PaymentTransaction = z.infer<typeof paymentTransactionSchema>
export type PaymentGatewayType = z.infer<typeof paymentGatewayTypeSchema>
export type TransactionStatus = z.infer<typeof transactionStatusSchema>
export type PurchaseType = z.infer<typeof purchaseTypeSchema>
export type PurchaseChannel = z.infer<typeof purchaseChannelSchema>
export type PaymentWebhookLifecycleStatus = z.infer<typeof paymentWebhookLifecycleStatusSchema>
export type PaymentWebhookEvent = z.infer<typeof paymentWebhookEventSchema>
export type PaymentWebhookEventDetail = z.infer<typeof paymentWebhookEventDetailSchema>
export type PaymentReconciliationHealth = z.infer<typeof paymentReconciliationHealthSchema>
export type PaymentOpsAlertSettings = z.infer<typeof paymentOpsAlertSettingsSchema>

export const paymentApi = {
  gatewayTypes: paymentGatewayTypeSchema.options,
  currencies: currencySchema.options,
  statuses: transactionStatusSchema.options,
  webhookStatuses: paymentWebhookLifecycleStatusSchema.options,
  purchaseTypes: purchaseTypeSchema.options,
  purchaseChannels: purchaseChannelSchema.options,

  async listGateways(): Promise<readonly PaymentGateway[]> {
    const response = await api.get('/admin/payments/gateways')
    return z.array(paymentGatewaySchema).parse(unwrapPayload(response.data))
  },

  async updateGateway(
    gatewayId: string,
    payload: {
      readonly type?: PaymentGatewayType
      readonly currency?: z.infer<typeof currencySchema>
      readonly isActive?: boolean
      readonly orderIndex?: number
      readonly settings?: Record<string, unknown> | null
    },
  ): Promise<PaymentGateway> {
    const response = await api.patch(`/admin/payments/gateways/${gatewayId}`, payload)
    return paymentGatewaySchema.parse(unwrapPayload(response.data))
  },

  async moveGateway(gatewayId: string, direction: 'up' | 'down'): Promise<PaymentGateway> {
    const response = await api.patch(`/admin/payments/gateways/${gatewayId}/move`, { direction })
    return paymentGatewaySchema.parse(unwrapPayload(response.data))
  },

  async createGatewayDefaults(): Promise<readonly PaymentGateway[]> {
    const response = await api.post('/admin/payments/gateways/defaults')
    return z.array(paymentGatewaySchema).parse(unwrapPayload(response.data))
  },

  async listTransactions(filters: {
    readonly userId?: string
    readonly status?: TransactionStatus
    readonly gatewayType?: PaymentGatewayType
    readonly purchaseType?: PurchaseType
    readonly limit?: number
  }): Promise<readonly PaymentTransaction[]> {
    const query = new URLSearchParams()
    if (filters.userId) {
      query.set('userId', filters.userId)
    }
    if (filters.status) {
      query.set('status', filters.status)
    }
    if (filters.gatewayType) {
      query.set('gatewayType', filters.gatewayType)
    }
    if (filters.purchaseType) {
      query.set('purchaseType', filters.purchaseType)
    }
    if (filters.limit !== undefined) {
      query.set('limit', String(filters.limit))
    }
    const queryString = query.toString()
    const path = queryString.length > 0 ? `/admin/payments/transactions?${queryString}` : '/admin/payments/transactions'
    const response = await api.get(path)
    return z.array(paymentTransactionSchema).parse(unwrapPayload(response.data))
  },

  async createDraft(payload: {
    readonly userId: string
    readonly purchaseType: PurchaseType
    readonly planId: string
    readonly durationDays: number
    readonly gatewayType: PaymentGatewayType
    readonly sourceSubscriptionId?: string
    readonly channel?: PurchaseChannel
  }): Promise<PaymentTransaction> {
    const response = await api.post('/admin/payments/transactions/draft', payload)
    return paymentTransactionSchema.parse(unwrapPayload(response.data))
  },

  async listWebhookEvents(filters: {
    readonly gatewayType?: PaymentGatewayType
    readonly status?: PaymentWebhookLifecycleStatus
    readonly paymentId?: string
    readonly providerEventId?: string
    readonly limit?: number
  }): Promise<readonly PaymentWebhookEvent[]> {
    const query = new URLSearchParams()
    if (filters.gatewayType) {
      query.set('gatewayType', filters.gatewayType)
    }
    if (filters.status) {
      query.set('status', filters.status)
    }
    if (filters.paymentId) {
      query.set('paymentId', filters.paymentId)
    }
    if (filters.providerEventId) {
      query.set('providerEventId', filters.providerEventId)
    }
    if (filters.limit !== undefined) {
      query.set('limit', String(filters.limit))
    }
    const queryString = query.toString()
    const path = queryString.length > 0 ? `/admin/payments/webhooks/events?${queryString}` : '/admin/payments/webhooks/events'
    const response = await api.get(path)
    return z.array(paymentWebhookEventSchema).parse(unwrapPayload(response.data))
  },

  async getWebhookEvent(eventId: string, includeRaw = false): Promise<PaymentWebhookEventDetail> {
    const query = includeRaw ? '?includeRaw=true' : ''
    const response = await api.get(`/admin/payments/webhooks/events/${eventId}${query}`)
    return paymentWebhookEventDetailSchema.parse(unwrapPayload(response.data))
  },

  async replayWebhookEvent(payload: {
    readonly eventId: string
    readonly reason: string
    readonly force: boolean
  }): Promise<{ readonly event: PaymentWebhookEvent; readonly alreadyQueued: boolean }> {
    const response = await api.post(`/admin/payments/webhooks/events/${payload.eventId}/replay`, {
      reason: payload.reason,
      force: payload.force,
    })
    const parsedPayload = z.object({
      event: paymentWebhookEventSchema,
      alreadyQueued: z.boolean(),
    }).parse(unwrapPayload(response.data))
    return parsedPayload
  },

  async getReconciliationHealth(): Promise<PaymentReconciliationHealth> {
    const response = await api.get('/admin/payments/reconciliation/health')
    return paymentReconciliationHealthSchema.parse(unwrapPayload(response.data))
  },

  async getPaymentOpsAlertSettings(): Promise<PaymentOpsAlertSettings> {
    const response = await api.get('/admin/settings/system-notifications/payment-ops')
    return paymentOpsAlertSettingsSchema.parse(unwrapPayload(response.data))
  },

  async updatePaymentOpsAlertSettings(payload: Partial<PaymentOpsAlertSettings>): Promise<PaymentOpsAlertSettings> {
    const response = await api.patch('/admin/settings/system-notifications/payment-ops', payload)
    return paymentOpsAlertSettingsSchema.parse(unwrapPayload(response.data))
  },

  async sendPaymentOpsAlertTest(note: string): Promise<void> {
    await api.post('/admin/settings/system-notifications/payment-ops/test', { note })
  },
}

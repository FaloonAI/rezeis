import { z } from 'zod'
import { api } from '@/lib/api'

const paymentGatewayTypeSchema = z.enum([
  'YOOKASSA',
  'TELEGRAM_STARS',
  'PLATEGA',
  'HELEKET',
  'CRYPTOMUS',
  'MULENPAY',
])

const purchaseChannelSchema = z.enum(['WEB', 'TELEGRAM', 'MINI_APP'])
const purchaseTypeSchema = z.enum(['NEW', 'ADDITIONAL', 'RENEW', 'UPGRADE', 'TRIAL'])

const quoteWarningSchema = z.object({
  code: z.string(),
  message: z.string(),
})

const quoteDurationSchema = z.object({
  id: z.string(),
  days: z.number(),
})

const quotePlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  tag: z.string().nullable(),
  type: z.enum(['TRAFFIC', 'DEVICES', 'BOTH', 'UNLIMITED']),
  trafficLimit: z.number().nullable(),
  deviceLimit: z.number(),
  trafficLimitStrategy: z.string(),
  durations: z.array(quoteDurationSchema),
})

const actionPolicySchema = z.object({
  userId: z.string(),
  channel: purchaseChannelSchema,
  actions: z.object({
    NEW: z.boolean(),
    ADDITIONAL: z.boolean(),
    RENEW: z.boolean(),
    UPGRADE: z.boolean(),
    TRIAL: z.boolean(),
  }),
  activeSubscriptionCount: z.number(),
  maxSubscriptions: z.number(),
  currentSubscriptionId: z.string().nullable(),
  availablePlans: z.array(quotePlanSchema),
  warnings: z.array(quoteWarningSchema),
})

const quoteSchema = z.object({
  userId: z.string(),
  purchaseType: purchaseTypeSchema,
  channel: purchaseChannelSchema,
  isEligible: z.boolean(),
  selectedSubscriptionId: z.string().nullable(),
  selectedPlan: quotePlanSchema.nullable(),
  selectedDuration: quoteDurationSchema.nullable(),
  availablePlans: z.array(quotePlanSchema),
  price: z
    .object({
      gatewayType: paymentGatewayTypeSchema,
      currency: z.enum(['USD', 'RUB', 'USDT', 'XTR', 'TON', 'BTC', 'ETH']),
      originalPrice: z.string(),
      price: z.string(),
      discountPercent: z.number(),
      discountSource: z.enum(['NONE', 'PURCHASE', 'PERSONAL']),
    })
    .nullable(),
  warnings: z.array(quoteWarningSchema),
})

const actionPolicyInputSchema = z.object({
  subscriptionId: z.string().uuid().optional(),
  channel: purchaseChannelSchema.optional(),
})

const quoteInputSchema = z.object({
  purchaseType: purchaseTypeSchema,
  subscriptionId: z.string().uuid().optional(),
  planId: z.string().uuid().optional(),
  durationDays: z.number().int().min(-1).optional(),
  channel: purchaseChannelSchema.optional(),
  gatewayType: paymentGatewayTypeSchema.optional(),
})

export type SubscriptionQuoteAction = z.infer<typeof purchaseTypeSchema>
export type SubscriptionQuoteChannel = z.infer<typeof purchaseChannelSchema>
export type PaymentGatewayType = z.infer<typeof paymentGatewayTypeSchema>
export type SubscriptionActionPolicy = z.infer<typeof actionPolicySchema>
export type SubscriptionQuote = z.infer<typeof quoteSchema>
export type SubscriptionQuotePlan = z.infer<typeof quotePlanSchema>
export type SubscriptionQuoteDuration = z.infer<typeof quoteDurationSchema>

export const quoteApi = {
  async getActionPolicy(input: z.input<typeof actionPolicyInputSchema>): Promise<SubscriptionActionPolicy> {
    const payload = actionPolicyInputSchema.parse(input)
    const response = await api.post('/subscription/action-policy', payload)
    return actionPolicySchema.parse(response.data)
  },
  async getQuote(input: z.input<typeof quoteInputSchema>): Promise<SubscriptionQuote> {
    const payload = quoteInputSchema.parse(input)
    const response = await api.post('/subscription/quote', payload)
    return quoteSchema.parse(response.data)
  },
}

import { z } from 'zod'
import { api } from '@/lib/api'

const planPriceSchema = z.object({
  gatewayType: z.enum(['YOOKASSA', 'TELEGRAM_STARS', 'PLATEGA', 'HELEKET', 'CRYPTOMUS', 'MULENPAY']),
  currency: z.enum(['USD', 'RUB', 'USDT', 'XTR', 'TON', 'BTC', 'ETH']),
  originalPrice: z.string(),
  price: z.string(),
  discountPercent: z.number(),
  discountSource: z.enum(['NONE', 'PURCHASE', 'PERSONAL']),
  supportedPaymentAssets: z.array(z.string()).nullable(),
})

const planDurationSchema = z.object({
  id: z.string(),
  days: z.number(),
  prices: z.array(planPriceSchema),
})

const planSchema = z.object({
  id: z.string(),
  orderIndex: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  tag: z.string().nullable(),
  type: z.enum(['TRAFFIC', 'DEVICES', 'BOTH', 'UNLIMITED']),
  trafficLimit: z.number().nullable(),
  deviceLimit: z.number(),
  durations: z.array(planDurationSchema),
})

export const plansApi = {
  async getPlans() {
    const response = await api.get('/plans')
    const plans = z.array(planSchema).parse(response.data)
    return [...plans].sort((leftPlan, rightPlan) => leftPlan.orderIndex - rightPlan.orderIndex)
  },
}

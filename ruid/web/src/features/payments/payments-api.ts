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
const purchaseTypeSchema = z.enum(['NEW', 'ADDITIONAL', 'RENEW', 'UPGRADE'])
const purchaseChannelSchema = z.enum(['WEB', 'TELEGRAM', 'MINI_APP'])
const transactionStatusSchema = z.enum(['PENDING', 'COMPLETED', 'CANCELED', 'REFUNDED', 'FAILED'])
const currencySchema = z.enum(['USD', 'RUB', 'USDT', 'XTR', 'TON', 'BTC', 'ETH'])

const paymentCheckoutInputSchema = z.object({
  purchaseType: purchaseTypeSchema,
  planId: z.string().uuid(),
  durationDays: z.number().int().min(-1),
  gatewayType: paymentGatewayTypeSchema,
  subscriptionId: z.string().uuid().optional(),
  channel: purchaseChannelSchema.optional(),
})

const paymentCheckoutSchema = z.object({
  paymentId: z.string(),
  transactionStatus: transactionStatusSchema,
  gatewayType: paymentGatewayTypeSchema,
  purchaseType: purchaseTypeSchema,
  amount: z.string(),
  currency: currencySchema,
  checkoutUrl: z.string().nullable(),
  providerMode: z.string(),
  createdAt: z.string(),
})

const paymentStatusSchema = z.object({
  paymentId: z.string(),
  status: transactionStatusSchema,
  gatewayType: paymentGatewayTypeSchema,
  purchaseType: purchaseTypeSchema,
  amount: z.string(),
  currency: currencySchema,
  checkoutUrl: z.string().nullable(),
  failureReason: z.string().nullable(),
  subscriptionId: z.string().nullable(),
  updatedAt: z.string(),
})

export type PaymentCheckout = z.infer<typeof paymentCheckoutSchema>
export type PaymentStatus = z.infer<typeof paymentStatusSchema>
export type PaymentGatewayType = z.infer<typeof paymentGatewayTypeSchema>

export const paymentsApi = {
  async checkout(input: z.input<typeof paymentCheckoutInputSchema>): Promise<PaymentCheckout> {
    const payload = paymentCheckoutInputSchema.parse(input)
    const response = await api.post('/payments/checkout', payload)
    return paymentCheckoutSchema.parse(response.data)
  },
  async getPaymentStatus(paymentId: string): Promise<PaymentStatus> {
    const response = await api.get(`/payments/${paymentId}`)
    return paymentStatusSchema.parse(response.data)
  },
}

import type { MockInstance } from 'vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { paymentsApi } from '@/features/payments/payments-api'
import { api } from '@/lib/api'

describe('paymentsApi', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('posts checkout payload and parses typed response', async () => {
    const postSpy: MockInstance = vi.spyOn(api, 'post').mockResolvedValue({
      data: {
        paymentId: 'payment-1',
        transactionStatus: 'PENDING',
        gatewayType: 'YOOKASSA',
        purchaseType: 'NEW',
        amount: '9.99',
        currency: 'USD',
        checkoutUrl: 'https://checkout.example.com',
        providerMode: 'REDIRECT',
        createdAt: '2026-04-19T12:00:00Z',
      },
    } as Awaited<ReturnType<typeof api.post>>)

    const result = await paymentsApi.checkout({
      purchaseType: 'NEW',
      planId: '11111111-1111-4111-8111-111111111111',
      durationDays: 30,
      gatewayType: 'YOOKASSA',
      channel: 'WEB',
    })

    expect(postSpy).toHaveBeenCalledWith('/payments/checkout', {
      purchaseType: 'NEW',
      planId: '11111111-1111-4111-8111-111111111111',
      durationDays: 30,
      gatewayType: 'YOOKASSA',
      channel: 'WEB',
    })
    expect(result.checkoutUrl).toBe('https://checkout.example.com')
  })

  it('loads payment status and parses typed response', async () => {
    const getSpy: MockInstance = vi.spyOn(api, 'get').mockResolvedValue({
      data: {
        paymentId: 'payment-1',
        status: 'COMPLETED',
        gatewayType: 'YOOKASSA',
        purchaseType: 'NEW',
        amount: '9.99',
        currency: 'USD',
        checkoutUrl: 'https://checkout.example.com',
        failureReason: null,
        subscriptionId: 'subscription-1',
        updatedAt: '2026-04-19T12:00:00Z',
      },
    } as Awaited<ReturnType<typeof api.get>>)

    const result = await paymentsApi.getPaymentStatus('payment-1')

    expect(getSpy).toHaveBeenCalledWith('/payments/payment-1')
    expect(result.status).toBe('COMPLETED')
  })
})

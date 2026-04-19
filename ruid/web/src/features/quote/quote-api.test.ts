import type { MockInstance } from 'vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { quoteApi } from '@/features/quote/quote-api'
import { api } from '@/lib/api'

describe('quoteApi', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('posts action-policy payload and parses the typed contract', async () => {
    const postSpy: MockInstance = vi.spyOn(api, 'post').mockResolvedValue({
      data: {
        userId: '11111111-1111-1111-1111-111111111111',
        channel: 'WEB',
        actions: {
          NEW: true,
          ADDITIONAL: true,
          RENEW: true,
          UPGRADE: false,
          TRIAL: false,
        },
        activeSubscriptionCount: 1,
        maxSubscriptions: 2,
        currentSubscriptionId: null,
        availablePlans: [],
        warnings: [],
      },
    } as Awaited<ReturnType<typeof api.post>>)

    const result = await quoteApi.getActionPolicy({
      channel: 'WEB',
    })

    expect(postSpy).toHaveBeenCalledWith('/subscription/action-policy', { channel: 'WEB' })
    expect(result.actions.NEW).toBe(true)
  })

  it('posts quote payload and parses quote response', async () => {
    const postSpy: MockInstance = vi.spyOn(api, 'post').mockResolvedValue({
      data: {
        userId: '11111111-1111-1111-1111-111111111111',
        purchaseType: 'NEW',
        channel: 'WEB',
        isEligible: true,
        selectedSubscriptionId: null,
        selectedPlan: {
          id: '22222222-2222-2222-2222-222222222222',
          name: 'Starter',
          tag: null,
          type: 'BOTH',
          trafficLimit: 100,
          deviceLimit: 3,
          trafficLimitStrategy: 'RESET',
          durations: [{ id: '33333333-3333-3333-3333-333333333333', days: 30 }],
        },
        selectedDuration: { id: '33333333-3333-3333-3333-333333333333', days: 30 },
        availablePlans: [],
        price: {
          gatewayType: 'YOOKASSA',
          currency: 'USD',
          originalPrice: '12.99',
          price: '9.99',
          discountPercent: 23,
          discountSource: 'PURCHASE',
        },
        warnings: [],
      },
    } as Awaited<ReturnType<typeof api.post>>)

    const result = await quoteApi.getQuote({
      purchaseType: 'NEW',
      durationDays: 30,
      channel: 'WEB',
    })

    expect(postSpy).toHaveBeenCalledWith('/subscription/quote', {
      purchaseType: 'NEW',
      durationDays: 30,
      channel: 'WEB',
    })
    expect(result.price?.price).toBe('9.99')
  })

  it('throws on invalid quote contract payload', async () => {
    vi.spyOn(api, 'post').mockResolvedValue({
      data: { isEligible: true },
    } as Awaited<ReturnType<typeof api.post>>)

    await expect(
      quoteApi.getQuote({
        purchaseType: 'NEW',
      }),
    ).rejects.toThrow()
  })
})

import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthSession } from '@/features/auth/auth-provider'
import { paymentsApi } from '@/features/payments/payments-api'
import { QuotePage } from '@/features/quote/quote-page'
import { quoteApi } from '@/features/quote/quote-api'
import { renderWithProviders } from '@/test/render-app'

vi.mock('@/features/auth/auth-provider', () => ({
  useAuthSession: vi.fn(),
}))

vi.mock('@/features/quote/quote-api', () => ({
  quoteApi: {
    getActionPolicy: vi.fn(),
    getQuote: vi.fn(),
  },
}))

vi.mock('@/features/payments/payments-api', () => ({
  paymentsApi: {
    checkout: vi.fn(),
    getPaymentStatus: vi.fn(),
  },
}))

function createAuthSession(
  overrides: Partial<ReturnType<typeof useAuthSession>> = {},
): ReturnType<typeof useAuthSession> {
  return {
    status: 'authenticated',
    sessionQuery: {
      data: {
        id: '11111111-1111-1111-1111-111111111111',
      },
      error: null,
      isPending: false,
    },
    bootstrapError: null,
    hasSessionPersistenceIssue: false,
    telegramWebApp: null,
    hasTelegramLaunch: false,
    canBootstrapWithTelegram: false,
    ...overrides,
  } as ReturnType<typeof useAuthSession>
}

describe('QuotePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders auth-required state for unauthenticated users', () => {
    vi.mocked(useAuthSession).mockReturnValue(createAuthSession({ status: 'authentication-required' }))

    renderWithProviders(<QuotePage />)

    expect(screen.getByText('Authentication required')).toBeInTheDocument()
    expect(screen.getByText(/Sign in with linked account/i)).toBeInTheDocument()
  })

  it('loads action-policy and renders all purchase actions', async () => {
    vi.mocked(useAuthSession).mockReturnValue(createAuthSession())
    vi.mocked(quoteApi.getActionPolicy).mockResolvedValue({
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
      availablePlans: [
        {
          id: '22222222-2222-2222-2222-222222222222',
          name: 'Starter',
          tag: null,
          type: 'BOTH',
          trafficLimit: 100,
          deviceLimit: 3,
          trafficLimitStrategy: 'RESET',
          durations: [{ id: '33333333-3333-3333-3333-333333333333', days: 30 }],
        },
      ],
      warnings: [],
    })

    renderWithProviders(<QuotePage />)

    await waitFor(() => {
      expect(quoteApi.getActionPolicy).toHaveBeenCalledTimes(1)
    })
    expect(vi.mocked(quoteApi.getActionPolicy).mock.calls[0]?.[0]).toEqual({
      subscriptionId: undefined,
      channel: 'WEB',
    })

    expect(screen.getAllByText('NEW').length).toBeGreaterThan(0)
    expect(screen.getAllByText('ADDITIONAL').length).toBeGreaterThan(0)
    expect(screen.getAllByText('RENEW').length).toBeGreaterThan(0)
    expect(screen.getAllByText('UPGRADE').length).toBeGreaterThan(0)
    expect(screen.getAllByText('TRIAL').length).toBeGreaterThan(0)
    expect(screen.queryByRole('option', { name: 'TELEGRAM_STARS' })).not.toBeInTheDocument()
  })

  it('previews quote and renders price plus warnings', async () => {
    vi.mocked(useAuthSession).mockReturnValue(createAuthSession())
    vi.mocked(quoteApi.getActionPolicy).mockResolvedValue({
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
      availablePlans: [
        {
          id: '22222222-2222-2222-2222-222222222222',
          name: 'Starter',
          tag: null,
          type: 'BOTH',
          trafficLimit: 100,
          deviceLimit: 3,
          trafficLimitStrategy: 'RESET',
          durations: [{ id: '33333333-3333-3333-3333-333333333333', days: 30 }],
        },
      ],
      warnings: [],
    })
    vi.mocked(quoteApi.getQuote).mockResolvedValue({
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
      availablePlans: [
        {
          id: '22222222-2222-2222-2222-222222222222',
          name: 'Starter',
          tag: null,
          type: 'BOTH',
          trafficLimit: 100,
          deviceLimit: 3,
          trafficLimitStrategy: 'RESET',
          durations: [{ id: '33333333-3333-3333-3333-333333333333', days: 30 }],
        },
      ],
      price: {
        gatewayType: 'YOOKASSA',
        currency: 'USD',
        originalPrice: '12.99',
        price: '9.99',
        discountPercent: 23,
        discountSource: 'PURCHASE',
      },
      warnings: [{ code: 'TRIAL_UPGRADE_REQUIRED', message: 'Trial upgrade required.' }],
    })

    renderWithProviders(<QuotePage />)

    await waitFor(() => {
      expect(quoteApi.getActionPolicy).toHaveBeenCalledTimes(1)
    })

    fireEvent.click(screen.getByRole('button', { name: /Preview quote/i }))

    await waitFor(() => {
      expect(quoteApi.getQuote).toHaveBeenCalledTimes(1)
    })
    expect(vi.mocked(quoteApi.getQuote).mock.calls[0]?.[0]).toEqual({
      purchaseType: 'NEW',
      subscriptionId: undefined,
      planId: '22222222-2222-2222-2222-222222222222',
      durationDays: 30,
      channel: 'WEB',
      gatewayType: undefined,
    })

    expect(screen.getByText('Final')).toBeInTheDocument()
    expect(screen.getByText('9.99')).toBeInTheDocument()
    expect(screen.getByText('TRIAL_UPGRADE_REQUIRED')).toBeInTheDocument()
  })

  it('starts checkout from an eligible quote and redirects to provider checkout url', async () => {
    vi.mocked(useAuthSession).mockReturnValue(createAuthSession())
    vi.mocked(quoteApi.getActionPolicy).mockResolvedValue({
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
      availablePlans: [
        {
          id: '22222222-2222-2222-2222-222222222222',
          name: 'Starter',
          tag: null,
          type: 'BOTH',
          trafficLimit: 100,
          deviceLimit: 3,
          trafficLimitStrategy: 'RESET',
          durations: [{ id: '33333333-3333-3333-3333-333333333333', days: 30 }],
        },
      ],
      warnings: [],
    })
    vi.mocked(quoteApi.getQuote).mockResolvedValue({
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
      availablePlans: [
        {
          id: '22222222-2222-2222-2222-222222222222',
          name: 'Starter',
          tag: null,
          type: 'BOTH',
          trafficLimit: 100,
          deviceLimit: 3,
          trafficLimitStrategy: 'RESET',
          durations: [{ id: '33333333-3333-3333-3333-333333333333', days: 30 }],
        },
      ],
      price: {
        gatewayType: 'YOOKASSA',
        currency: 'USD',
        originalPrice: '12.99',
        price: '9.99',
        discountPercent: 23,
        discountSource: 'PURCHASE',
      },
      warnings: [],
    })
    vi.mocked(paymentsApi.checkout).mockResolvedValue({
      paymentId: 'payment-1',
      transactionStatus: 'PENDING',
      gatewayType: 'YOOKASSA',
      purchaseType: 'NEW',
      amount: '9.99',
      currency: 'USD',
      checkoutUrl: null,
      providerMode: 'REDIRECT',
      createdAt: '2026-04-19T12:00:00Z',
    })

    renderWithProviders(<QuotePage />)

    await waitFor(() => {
      expect(quoteApi.getActionPolicy).toHaveBeenCalledTimes(1)
    })

    fireEvent.click(screen.getByRole('button', { name: /Preview quote/i }))

    await waitFor(() => {
      expect(quoteApi.getQuote).toHaveBeenCalledTimes(1)
    })

    fireEvent.click(screen.getByRole('button', { name: /Pay now/i }))

    await waitFor(() => {
      expect(paymentsApi.checkout).toHaveBeenCalledTimes(1)
    })

    expect(vi.mocked(paymentsApi.checkout).mock.calls[0]?.[0]).toEqual({
      purchaseType: 'NEW',
      planId: '22222222-2222-2222-2222-222222222222',
      durationDays: 30,
      gatewayType: 'YOOKASSA',
      subscriptionId: undefined,
      channel: 'WEB',
    })
  })
})

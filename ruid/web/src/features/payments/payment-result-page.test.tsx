import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/auth-provider'
import { paymentsApi } from '@/features/payments/payments-api'
import { PaymentResultPage } from '@/features/payments/payment-result-page'
import { renderWithProviders } from '@/test/render-app'

vi.mock('@/features/auth/telegram-web-app', () => ({
  getTelegramBootstrapInitData: vi.fn(),
  getTelegramLaunchInitData: vi.fn(),
  getTelegramWebApp: vi.fn(),
  loadTelegramWebAppScript: vi.fn(),
}))

import {
  getTelegramBootstrapInitData,
  getTelegramLaunchInitData,
  getTelegramWebApp,
  loadTelegramWebAppScript,
} from '@/features/auth/telegram-web-app'
import { sessionApi } from '@/features/session/session-api'

describe('PaymentResultPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getTelegramWebApp).mockReturnValue(null)
    vi.mocked(loadTelegramWebAppScript).mockResolvedValue(undefined)
    vi.mocked(getTelegramLaunchInitData).mockReturnValue(null)
    vi.mocked(getTelegramBootstrapInitData).mockReturnValue(null)
  })

  it('renders completed payment status from the user edge', async () => {
    vi.spyOn(sessionApi, 'getSession').mockResolvedValue({
      id: 'session-1',
      telegramId: '123',
      username: 'rezeis-user',
      name: 'Rezeis User',
      email: 'user@rezeis.test',
      role: 'USER',
      language: 'EN',
      personalDiscount: 0,
      purchaseDiscount: 0,
      points: 0,
      maxSubscriptions: 2,
      isBlocked: false,
      isBotBlocked: false,
      isRulesAccepted: true,
      createdAt: '2026-04-01T12:00:00.000Z',
      updatedAt: '2026-04-10T12:00:00.000Z',
      webAccount: null,
    })
    vi.spyOn(paymentsApi, 'getPaymentStatus').mockResolvedValue({
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
    })

    renderWithProviders(
      <AuthProvider>
        <PaymentResultPage />
      </AuthProvider>,
      { route: '/payments/result?paymentId=payment-1' },
    )

    await waitFor(() => {
      expect(screen.getByText('COMPLETED')).toBeInTheDocument()
    })

    expect(screen.getByText('YOOKASSA')).toBeInTheDocument()
    expect(screen.getByText('9.99 USD')).toBeInTheDocument()
  })
})

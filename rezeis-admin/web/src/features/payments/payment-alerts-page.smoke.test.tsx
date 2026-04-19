import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PaymentAlertsPage } from '@/features/payments/payment-alerts-page'
import { paymentApi } from '@/features/payments/payments-api'
import { renderWithProviders } from '@/test/test-utils'

describe('payment alerts page smoke', () => {
  it('renders Telegram alert settings safely', async () => {
    vi.spyOn(paymentApi, 'getPaymentOpsAlertSettings').mockResolvedValue({
      enabled: false,
      chatId: null,
      threadId: null,
      hashtag: '#payments_ops',
    })

    renderWithProviders(<PaymentAlertsPage />)

    expect(await screen.findByText('Telegram Alerts')).toBeInTheDocument()
    expect(await screen.findByText('Alert sink')).toBeInTheDocument()
  })
})

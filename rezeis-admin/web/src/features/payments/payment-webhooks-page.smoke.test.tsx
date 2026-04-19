import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PaymentWebhooksPage } from '@/features/payments/payment-webhooks-page'
import { paymentApi } from '@/features/payments/payments-api'
import { renderWithProviders } from '@/test/test-utils'

describe('payment webhooks page smoke', () => {
  it('renders empty webhook inbox safely', async () => {
    vi.spyOn(paymentApi, 'listWebhookEvents').mockResolvedValue([])

    renderWithProviders(<PaymentWebhooksPage />)

    expect(await screen.findByText('Webhook Inbox')).toBeInTheDocument()
    expect(await screen.findByText('No webhook events found.')).toBeInTheDocument()
  })

  it('renders a safe error state when webhook list fails', async () => {
    vi.spyOn(paymentApi, 'listWebhookEvents').mockRejectedValue(new Error('webhook smoke error'))

    renderWithProviders(<PaymentWebhooksPage />)

    expect(await screen.findByText('webhook smoke error')).toBeInTheDocument()
  })
})

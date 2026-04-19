import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PaymentGatewaysPage } from '@/features/payments/payment-gateways-page'
import { paymentApi } from '@/features/payments/payments-api'
import { renderWithProviders } from '@/test/test-utils'

describe('payment gateways page smoke', () => {
  it('renders with empty gateway list', async () => {
    vi.spyOn(paymentApi, 'listGateways').mockResolvedValue([])

    renderWithProviders(<PaymentGatewaysPage />)

    expect(await screen.findByText('Gateway Registry')).toBeInTheDocument()
  })

  it('renders a safe error state when gateways request fails', async () => {
    vi.spyOn(paymentApi, 'listGateways').mockRejectedValue(new Error('gateway smoke error'))

    renderWithProviders(<PaymentGatewaysPage />)

    expect(await screen.findByText('gateway smoke error')).toBeInTheDocument()
  })
})

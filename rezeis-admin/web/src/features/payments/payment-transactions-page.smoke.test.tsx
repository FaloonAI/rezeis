import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PaymentTransactionsPage } from '@/features/payments/payment-transactions-page'
import { paymentApi } from '@/features/payments/payments-api'
import { renderWithProviders } from '@/test/test-utils'

describe('payment transactions page smoke', () => {
  it('renders with empty transactions list', async () => {
    vi.spyOn(paymentApi, 'listGateways').mockResolvedValue([])
    vi.spyOn(paymentApi, 'listTransactions').mockResolvedValue([])

    renderWithProviders(<PaymentTransactionsPage />)

    expect(await screen.findByText('No transactions found for current filters.')).toBeInTheDocument()
  })

  it('renders a safe error state when transactions request fails', async () => {
    vi.spyOn(paymentApi, 'listGateways').mockResolvedValue([])
    vi.spyOn(paymentApi, 'listTransactions').mockRejectedValue(new Error('transactions smoke error'))

    renderWithProviders(<PaymentTransactionsPage />)

    expect(await screen.findByText('transactions smoke error')).toBeInTheDocument()
  })
})

import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PaymentReconciliationPage } from '@/features/payments/payment-reconciliation-page'
import { paymentApi } from '@/features/payments/payments-api'
import { renderWithProviders } from '@/test/test-utils'

describe('payment reconciliation page smoke', () => {
  it('renders health metrics safely', async () => {
    vi.spyOn(paymentApi, 'getReconciliationHealth').mockResolvedValue({
      queue: {
        waiting: 0,
        active: 0,
        delayed: 0,
        completed: 3,
        failed: 1,
      },
      eventsByStatus: {
        RECEIVED: 0,
        ENQUEUED: 1,
        PROCESSING: 0,
        PROCESSED: 3,
        FAILED: 1,
      },
      staleProcessingCount: 0,
      staleEnqueuedCount: 1,
      generatedAt: '2026-04-19T12:00:00.000Z',
    })

    renderWithProviders(<PaymentReconciliationPage />)

    expect(await screen.findByText('Reconciliation Health')).toBeInTheDocument()
    expect(await screen.findByText('Webhook lifecycle')).toBeInTheDocument()
  })
})

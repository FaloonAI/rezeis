import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SubscriptionQuotePage } from '@/features/subscriptions/subscription-quote-page'
import { renderWithProviders } from '@/test/test-utils'

describe('subscription quote page smoke', () => {
  it('renders initial quote workspace safely', async () => {
    renderWithProviders(<SubscriptionQuotePage />)

    expect(await screen.findByText('Quote Preview')).toBeInTheDocument()
  })
})

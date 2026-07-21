import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen } from '@testing-library/react'

import { api } from '@/lib/api'
import { renderWithProviders } from '@/test/test-utils'
import SubscriptionsPage from './subscriptions-page'

describe('SubscriptionsPage accessibility', () => {
  beforeEach(() => {
    vi.spyOn(api, 'get').mockImplementation(async (path: string) => {
      if (path.startsWith('/admin/subscriptions?')) {
        return {
          data: {
            items: [
              {
                id: 'subscription-1',
                user: { id: 'cluseralice0000000000001', name: 'Alice' },
                userTelegramId: '12345',
                status: 'ACTIVE',
                isTrial: false,
                plan: { name: 'Premium' },
                trafficLimit: null,
                deviceLimit: null,
                expireAt: '2026-06-04T10:00:00.000Z',
              },
            ],
            total: 1,
          },
        }
      }

      if (path === '/admin/subscriptions/stats') {
        return {
          data: {
            total: 1,
            byStatus: { ACTIVE: 1 },
            trialCount: 0,
            expiringIn7d: 0,
          },
        }
      }

      return { data: {} }
    })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it('names icon-only subscription actions', async () => {
    renderWithProviders(<SubscriptionsPage />)

    expect(await screen.findByRole('button', { name: 'Refresh subscriptions' })).toBeInTheDocument()
    // Open-user aria prefers reiwa user id (works for web-only / no Telegram).
    expect(
      await screen.findByRole('button', { name: 'Open user cluseralice0000000000001' }),
    ).toBeInTheDocument()
  })

  it('names the status filter select', async () => {
    renderWithProviders(<SubscriptionsPage />)

    expect(await screen.findByRole('combobox', { name: 'Status' })).toBeInTheDocument()
  })

  it('makes the whole row open the user profile (incl. web-only via user.id)', async () => {
    renderWithProviders(<SubscriptionsPage />)

    const userCell = await screen.findByText('Alice')
    const row = userCell.closest('tr')
    expect(row).toHaveClass('cursor-pointer')
    // Keyboard parity without nested interactive roles: focusable row + named ↗ button.
    expect(row).toHaveAttribute('tabindex', '0')
    expect(
      screen.getByRole('button', { name: 'Open user cluseralice0000000000001' }),
    ).toBeInTheDocument()
  })
})

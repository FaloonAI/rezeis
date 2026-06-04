import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'

import { loadFeatureBundle } from '@/i18n/i18n'
import { api } from '@/lib/api'
import { renderWithProviders } from '@/test/test-utils'
import UserDetailPanel from './user-detail-panel'

describe('UserDetailPanel accessibility', () => {
  beforeAll(async () => {
    await loadFeatureBundle('userDetail')
  })

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('names the icon-only delete user trigger', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({
      data: {
        id: 'user-1',
        telegramId: '12345',
        username: 'alice',
        name: 'Alice',
        email: 'alice@example.com',
        language: 'en',
        role: 'USER',
        isBlocked: false,
        isPartner: false,
        points: 0,
        personalDiscount: 0,
        purchaseDiscount: 0,
        maxSubscriptions: 1,
        createdAt: '2026-06-04T10:00:00.000Z',
        updatedAt: '2026-06-04T10:00:00.000Z',
        subscriptions: [],
        transactions: [],
        referralsGiven: [],
        partner: null,
        webAccount: null,
      },
    })

    renderWithProviders(<UserDetailPanel telegramId="12345" />)

    expect(await screen.findByRole('button', { name: 'Delete user?' })).toBeInTheDocument()
  })
})

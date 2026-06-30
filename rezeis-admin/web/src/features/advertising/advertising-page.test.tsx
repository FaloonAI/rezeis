import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'

import { renderWithProviders } from '@/test/test-utils'
import AdvertisingPage from './advertising-page'
import {
  getAdOverview,
  listAdCampaigns,
  listAdRequests,
  type AdCampaign,
  type AdPlacement,
} from './advertising-api'

vi.mock('./advertising-api', () => ({
  getAdOverview: vi.fn(),
  listAdCampaigns: vi.fn(),
  listAdRequests: vi.fn(),
  getPlacementMetrics: vi.fn(),
  getPlacementChartData: vi.fn(),
  createAdCampaign: vi.fn(),
  createAdPlacement: vi.fn(),
  archiveAdPlacement: vi.fn(),
  approveAdRequest: vi.fn(),
  rejectAdRequest: vi.fn(),
}))

const placement: AdPlacement = {
  id: 'p1',
  campaignId: 'c1',
  platform: 'YOUTUBE',
  channel: 'Tech Blogger',
  ownerType: 'COMPANY',
  partnerId: null,
  trackingCode: 'abc12345',
  payload: 'ad_abc12345',
  links: { botStart: 'https://t.me/Bot?start=ad_abc12345', miniAppStart: null, miniAppWeb: null },
  attributionWindowDays: 30,
  promoCodeId: null,
  spendAmountMinor: 300000,
  spendCurrency: 'RUB',
  signupBonusType: 'NONE',
  status: 'ACTIVE',
  createdAt: '2026-06-30T00:00:00.000Z',
  updatedAt: '2026-06-30T00:00:00.000Z',
}

const campaign: AdCampaign = {
  id: 'c1',
  name: 'October launch',
  status: 'ACTIVE',
  notes: null,
  createdBy: null,
  createdAt: '2026-06-30T00:00:00.000Z',
  updatedAt: '2026-06-30T00:00:00.000Z',
  placements: [placement],
}

describe('AdvertisingPage', () => {
  beforeEach(() => {
    vi.mocked(getAdOverview).mockResolvedValue({
      campaigns: 1,
      activePlacements: 1,
      opens: 42,
      registrations: 10,
      conversions: 3,
      revenueMinor: 900000,
    })
    vi.mocked(listAdCampaigns).mockResolvedValue([campaign])
    vi.mocked(listAdRequests).mockResolvedValue([])
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders the campaign and its placement tile (payload + channel)', async () => {
    renderWithProviders(<AdvertisingPage />)
    await waitFor(() => {
      expect(screen.getByText('October launch')).toBeInTheDocument()
    })
    expect(screen.getByText('ad_abc12345')).toBeInTheDocument()
    expect(screen.getByText('Tech Blogger')).toBeInTheDocument()
    // Overview opens tile value.
    expect(screen.getByText('42')).toBeInTheDocument()
  })
})

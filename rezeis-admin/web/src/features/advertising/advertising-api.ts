import { api } from '@/lib/api'

export type AdPlatform =
  | 'TELEGRAM'
  | 'TELEGRAM_ADS'
  | 'YOUTUBE'
  | 'TIKTOK'
  | 'INSTAGRAM'
  | 'VK'
  | 'WEBSITE'
  | 'INFLUENCER'
  | 'OTHER'

export type AdOwnerType = 'COMPANY' | 'PARTNER'
export type AdPlacementStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED'
export type AdSignupBonusType = 'NONE' | 'TRIAL' | 'TARIFF'
export type AdRequestStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'COUNTERED'
  | 'ACCEPTED'
  | 'ACTIVE'
  | 'REJECTED'
  | 'EXPIRED'

export interface AdDeepLinks {
  botStart: string
  miniAppStart: string | null
  miniAppWeb: string | null
}

export interface AdPlacement {
  id: string
  campaignId: string
  platform: AdPlatform
  channel: string | null
  ownerType: AdOwnerType
  partnerId: string | null
  trackingCode: string
  payload: string
  links: AdDeepLinks
  attributionWindowDays: number
  promoCodeId: string | null
  spendAmountMinor: number | null
  spendCurrency: string | null
  signupBonusType: AdSignupBonusType
  status: AdPlacementStatus
  createdAt: string
  updatedAt: string
}

export interface AdCampaign {
  id: string
  name: string
  status: AdPlacementStatus
  notes: string | null
  createdBy: string | null
  createdAt: string
  updatedAt: string
  placements: AdPlacement[]
}

export interface AdOverview {
  campaigns: number
  activePlacements: number
  opens: number
  registrations: number
  conversions: number
  revenueMinor: number
}

export interface AdMetrics {
  opens: number
  registrations: number
  conversions: number
  revenueMinor: number
  costMinor: number
  currency: string
  cac: number | null
  roas: number | null
  roi: number | null
  openToRegistrationRate: number
  registrationToPurchaseRate: number
  avgFirstPaymentMinor: number | null
  arpuMinor: number | null
  avgDaysToPurchase: number | null
}

export interface AdChartPoint {
  date: string
  opens: number
  registrations: number
}

export interface AdPlacementRequest {
  id: string
  partnerId: string
  platforms: AdPlatform[]
  channel: string | null
  notes: string | null
  proposedWindowDays: number
  approvedWindowDays: number | null
  selfFundedBudgetNote: string | null
  status: AdRequestStatus
  reviewedBy: string | null
  reviewedAt: string | null
  campaignId: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateCampaignInput {
  name: string
  notes?: string
}

export interface CreatePlacementInput {
  campaignId: string
  platform: AdPlatform
  channel?: string
  ownerType?: AdOwnerType
  partnerId?: string
  attributionWindowDays: number
  promoCodeId?: string
  spendAmountMinor?: number
  spendCurrency?: string
  signupBonus?: { type: AdSignupBonusType; trialDurationDays?: number; trialTrafficGb?: number; trialDeviceLimit?: number; tariffPlanId?: string; tariffDurationDays?: number }
}

export const getAdOverview = () =>
  api.get<AdOverview>('/admin/advertising/overview').then((r) => r.data)

export const listAdCampaigns = () =>
  api.get<AdCampaign[]>('/admin/advertising/campaigns').then((r) => r.data)

export const createAdCampaign = (input: CreateCampaignInput) =>
  api.post<AdCampaign>('/admin/advertising/campaigns', input).then((r) => r.data)

export const createAdPlacement = (input: CreatePlacementInput) =>
  api.post<AdPlacement>('/admin/advertising/placements', input).then((r) => r.data)

export const archiveAdPlacement = (id: string) =>
  api.delete<{ archived: boolean }>(`/admin/advertising/placements/${id}`).then((r) => r.data)

export const getPlacementMetrics = (id: string) =>
  api.get<AdMetrics>(`/admin/advertising/placements/${id}/metrics`).then((r) => r.data)

export const getPlacementChartData = (id: string, days = 14) =>
  api
    .get<AdChartPoint[]>(`/admin/advertising/placements/${id}/chart-data`, { params: { days } })
    .then((r) => r.data)

export const listAdRequests = (status?: string) =>
  api
    .get<AdPlacementRequest[]>('/admin/advertising/requests', { params: status ? { status } : {} })
    .then((r) => r.data)

export const approveAdRequest = (id: string, approvedWindowDays?: number) =>
  api
    .post(`/admin/advertising/requests/${id}/approve`, approvedWindowDays ? { approvedWindowDays } : {})
    .then((r) => r.data)

export const rejectAdRequest = (id: string) =>
  api.post(`/admin/advertising/requests/${id}/reject`, {}).then((r) => r.data)

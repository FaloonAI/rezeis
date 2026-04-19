import { z } from 'zod'
import { api } from '@/lib/api'

const adminPlanPriceSchema = z.object({
  id: z.string(),
  currency: z.enum(['USD', 'RUB', 'USDT', 'TON', 'BTC', 'ETH']),
  price: z.string(),
})

const adminPlanDurationSchema = z.object({
  id: z.string(),
  days: z.number(),
  prices: z.array(adminPlanPriceSchema),
})

const squadOptionSchema = z.object({
  uuid: z.string().uuid(),
  name: z.string(),
})

export const adminPlanSchema = z.object({
  id: z.string(),
  orderIndex: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  tag: z.string().nullable(),
  isActive: z.boolean(),
  isArchived: z.boolean(),
  archivedRenewMode: z.enum(['SELF_RENEW', 'REPLACE_ON_RENEW']),
  type: z.enum(['TRAFFIC', 'DEVICES', 'BOTH', 'UNLIMITED']),
  availability: z.enum(['ALL', 'NEW', 'EXISTING', 'INVITED', 'ALLOWED', 'TRIAL']),
  trafficLimit: z.number().nullable(),
  deviceLimit: z.number(),
  trafficLimitStrategy: z.enum(['NO_RESET', 'DAY', 'WEEK', 'MONTH']),
  internalSquads: z.array(z.string()),
  externalSquad: z.string().nullable(),
  upgradeToPlanIds: z.array(z.string()),
  replacementPlanIds: z.array(z.string()),
  allowedUserIds: z.array(z.string()),
  durations: z.array(adminPlanDurationSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
})

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function unwrapPayload(value: unknown): Record<string, unknown> | unknown[] {
  if (Array.isArray(value)) {
    return value
  }
  if (!isRecord(value)) {
    throw new Error('errors.unexpectedResponsePayload')
  }
  const nestedValue: unknown = value.data
  if (Array.isArray(nestedValue) || isRecord(nestedValue)) {
    return nestedValue
  }
  return value
}

export const plansAdminApi = {
  async listPlans(): Promise<z.infer<typeof adminPlanSchema>[]> {
    const response = await api.get('/admin/plans')
    return z.array(adminPlanSchema).parse(unwrapPayload(response.data))
  },
  async createPlan(payload: unknown): Promise<z.infer<typeof adminPlanSchema>> {
    const response = await api.post('/admin/plans', payload)
    return adminPlanSchema.parse(unwrapPayload(response.data))
  },
  async updatePlan(planId: string, payload: unknown): Promise<z.infer<typeof adminPlanSchema>> {
    const response = await api.patch(`/admin/plans/${planId}`, payload)
    return adminPlanSchema.parse(unwrapPayload(response.data))
  },
  async movePlan(planId: string, direction: 'up' | 'down'): Promise<z.infer<typeof adminPlanSchema>> {
    const response = await api.patch(`/admin/plans/${planId}/move`, { direction })
    return adminPlanSchema.parse(unwrapPayload(response.data))
  },
  async getInternalSquads(): Promise<z.infer<typeof squadOptionSchema>[]> {
    const response = await api.get('/admin/plans/options/internal-squads')
    return z.array(squadOptionSchema).parse(unwrapPayload(response.data))
  },
  async getExternalSquads(): Promise<z.infer<typeof squadOptionSchema>[]> {
    const response = await api.get('/admin/plans/options/external-squads')
    return z.array(squadOptionSchema).parse(unwrapPayload(response.data))
  },
  async deletePlan(planId: string): Promise<void> {
    await api.delete(`/admin/plans/${planId}`)
  },
}

import { z } from 'zod'

export const planPriceFormSchema = z.object({
  currency: z.enum(['USD', 'RUB', 'USDT', 'TON', 'BTC', 'ETH']),
  price: z
    .string()
    .trim()
    .min(1, 'Price is required')
    .regex(/^\d+(?:\.\d{1,8})?$/, 'Use a positive decimal price'),
})

export const planDurationFormSchema = z.object({
  days: z.coerce.number().int().min(1, 'Duration must be at least 1 day'),
  prices: z.array(planPriceFormSchema).min(1, 'Add at least one price'),
})

export const planFormSchema = z.object({
  name: z.string().trim().min(3, 'Name must be at least 3 characters'),
  description: z.string().trim().nullable(),
  tag: z.string().trim().nullable(),
  isActive: z.boolean(),
  isArchived: z.boolean(),
  archivedRenewMode: z.enum(['SELF_RENEW', 'REPLACE_ON_RENEW']),
  type: z.enum(['TRAFFIC', 'DEVICES', 'BOTH', 'UNLIMITED']),
  availability: z.enum(['ALL', 'NEW', 'EXISTING', 'INVITED', 'ALLOWED', 'TRIAL']),
  trafficLimit: z.union([z.coerce.number().int().min(1), z.null()]),
  deviceLimit: z.coerce.number().int().min(-1).refine((value) => value !== 0, 'Device limit must be positive or -1'),
  trafficLimitStrategy: z.enum(['NO_RESET', 'DAY', 'WEEK', 'MONTH']),
  internalSquads: z.array(z.string().trim().min(1)).default([]),
  externalSquad: z.string().trim().nullable(),
  upgradeToPlanIds: z.array(z.string().uuid()).default([]),
  replacementPlanIds: z.array(z.string().uuid()).default([]),
  allowedUserIds: z.array(z.string().uuid()).default([]),
  durations: z.array(planDurationFormSchema).min(1, 'Add at least one duration'),
})

export type PlanFormValues = z.infer<typeof planFormSchema>

export function parseLineList(value: string): string[] {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

export function formatLineList(values: readonly string[]): string {
  return values.join('\n')
}

export function createEmptyPlanFormValues(): PlanFormValues {
  return {
    name: '',
    description: null,
    tag: null,
    isActive: true,
    isArchived: false,
    archivedRenewMode: 'SELF_RENEW',
    type: 'TRAFFIC',
    availability: 'ALL',
    trafficLimit: null,
    deviceLimit: 1,
    trafficLimitStrategy: 'NO_RESET',
    internalSquads: [],
    externalSquad: null,
    upgradeToPlanIds: [],
    replacementPlanIds: [],
    allowedUserIds: [],
    durations: [
      {
        days: 30,
        prices: [{ currency: 'USD', price: '9.99' }],
      },
    ],
  }
}

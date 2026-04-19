import { z } from 'zod'
import { api } from '@/lib/api'

const remnawaveStatusSchema = z.object({
  isConfigured: z.boolean(),
  isReachable: z.boolean(),
  isLoginAllowed: z.boolean().nullable(),
  isRegisterAllowed: z.boolean().nullable(),
  authentication: z
    .object({
      passwordEnabled: z.boolean(),
      passkeyEnabled: z.boolean(),
      oauth2Providers: z.record(z.string(), z.boolean()),
    })
    .nullable(),
  branding: z
    .object({
      title: z.string().nullable(),
      logoUrl: z.string().nullable(),
    })
    .nullable(),
})

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function unwrapPayload(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error('errors.unexpectedResponsePayload')
  }
  const nestedValue: unknown = value.data
  if (isRecord(nestedValue)) {
    return nestedValue
  }
  return value
}

export const remnawaveApi = {
  async getStatus(): Promise<z.infer<typeof remnawaveStatusSchema>> {
    const response = await api.get('/admin/remnawave/status')
    return remnawaveStatusSchema.parse(unwrapPayload(response.data))
  },
}

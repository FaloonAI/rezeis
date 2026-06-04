import { z } from 'zod'

export interface NotificationJsonSettingsDraft {
  readonly userNotificationsJson: string
  readonly systemNotificationsJson: string
}

export interface NotificationJsonSettingsData {
  readonly userNotifications: Record<string, unknown>
  readonly systemNotifications: Record<string, unknown>
}

export interface NotificationJsonSettingsValidationMessages {
  readonly invalidJson: string
}

export function createNotificationJsonSettingsSchema(
  messages: NotificationJsonSettingsValidationMessages,
) {
  const jsonObject = createJsonObjectStringSchema(messages.invalidJson)

  return z
    .object({
      userNotificationsJson: jsonObject,
      systemNotificationsJson: jsonObject,
    })
    .transform((values): NotificationJsonSettingsData => ({
      userNotifications: values.userNotificationsJson,
      systemNotifications: values.systemNotificationsJson,
    }))
}

export function createInitialNotificationJsonSettingsDraft(input?: {
  readonly userNotifications?: Record<string, unknown>
  readonly systemNotifications?: Record<string, unknown>
}): NotificationJsonSettingsDraft {
  return {
    userNotificationsJson: stringifyJsonObject(input?.userNotifications),
    systemNotificationsJson: stringifyJsonObject(input?.systemNotifications),
  }
}

function createJsonObjectStringSchema(message: string) {
  return z.string().transform((value, ctx): Record<string, unknown> => {
    const trimmed = value.trim()
    if (trimmed.length === 0) {
      ctx.addIssue({ code: 'custom', message })
      return z.NEVER
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(trimmed) as unknown
    } catch {
      ctx.addIssue({ code: 'custom', message })
      return z.NEVER
    }

    if (!isJsonObject(parsed)) {
      ctx.addIssue({ code: 'custom', message })
      return z.NEVER
    }
    return parsed
  })
}

function stringifyJsonObject(value: unknown): string {
  const objectValue = isJsonObject(value) ? value : {}
  try {
    return JSON.stringify(objectValue, null, 2)
  } catch {
    return '{}'
  }
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

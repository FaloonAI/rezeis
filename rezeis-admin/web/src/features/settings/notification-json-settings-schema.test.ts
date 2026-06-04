import { describe, expect, it } from 'vitest'

import {
  createInitialNotificationJsonSettingsDraft,
  createNotificationJsonSettingsSchema,
} from './notification-json-settings-schema'

const schema = createNotificationJsonSettingsSchema({ invalidJson: 'invalid json' })

describe('notification JSON settings schema', () => {
  it('parses valid notification JSON objects before submit', () => {
    const result = schema.safeParse({
      userNotificationsJson: '{"expired": true}',
      systemNotificationsJson: '{"node_status": false, "telegram": {"enabled": true}}',
    })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data).toEqual({
      userNotifications: { expired: true },
      systemNotifications: { node_status: false, telegram: { enabled: true } },
    })
  })

  it('rejects malformed JSON and non-object JSON payloads', () => {
    const malformed = schema.safeParse({
      userNotificationsJson: '{"expired": true',
      systemNotificationsJson: '{}',
    })
    const nonObject = schema.safeParse({
      userNotificationsJson: '[]',
      systemNotificationsJson: 'true',
    })

    expect(malformed.success).toBe(false)
    if (!malformed.success) {
      expect(malformed.error.issues[0]).toMatchObject({
        path: ['userNotificationsJson'],
        message: 'invalid json',
      })
    }
    expect(nonObject.success).toBe(false)
    if (!nonObject.success) {
      expect(nonObject.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: ['userNotificationsJson'], message: 'invalid json' }),
          expect.objectContaining({ path: ['systemNotificationsJson'], message: 'invalid json' }),
        ]),
      )
    }
  })

  it('creates stable pretty-printed defaults from current settings', () => {
    expect(createInitialNotificationJsonSettingsDraft({
      userNotifications: { expired: true },
      systemNotifications: { node_status: false },
    })).toEqual({
      userNotificationsJson: '{\n  "expired": true\n}',
      systemNotificationsJson: '{\n  "node_status": false\n}',
    })
  })
})

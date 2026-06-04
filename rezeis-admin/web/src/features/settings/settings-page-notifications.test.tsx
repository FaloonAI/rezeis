import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { api } from '@/lib/api'
import { renderWithProviders } from '@/test/test-utils'
import { NotificationsTab } from './settings-page'

describe('NotificationsTab JSON validation', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('blocks malformed notification JSON before submit', async () => {
    const user = userEvent.setup()
    const patchSpy = vi.spyOn(api, 'patch').mockResolvedValue({ data: {} })

    renderWithProviders(<NotificationsTab settings={settingsPayload()} />)

    fireEvent.change(screen.getByLabelText('User Notifications'), { target: { value: '{"expired": true' } })
    await user.click(screen.getByRole('button', { name: 'Save Notification Settings' }))

    expect(await screen.findByText('Invalid JSON format')).toBeInTheDocument()
    expect(patchSpy).not.toHaveBeenCalled()
  })

  it('blocks array/scalar JSON before submit because backend expects objects', async () => {
    const user = userEvent.setup()
    const patchSpy = vi.spyOn(api, 'patch').mockResolvedValue({ data: {} })

    renderWithProviders(<NotificationsTab settings={settingsPayload()} />)

    fireEvent.change(screen.getByLabelText('User Notifications'), { target: { value: '[]' } })
    fireEvent.change(screen.getByLabelText('System Notifications'), { target: { value: 'true' } })
    await user.click(screen.getByRole('button', { name: 'Save Notification Settings' }))

    expect(await screen.findAllByText('Invalid JSON format')).toHaveLength(2)
    expect(patchSpy).not.toHaveBeenCalled()
  })

  it('submits parsed notification JSON objects', async () => {
    const user = userEvent.setup()
    const patchSpy = vi.spyOn(api, 'patch').mockResolvedValue({ data: {} })

    renderWithProviders(<NotificationsTab settings={settingsPayload()} />)

    fireEvent.change(screen.getByLabelText('User Notifications'), { target: { value: '{"expired":false}' } })
    fireEvent.change(screen.getByLabelText('System Notifications'), { target: { value: '{"node_status":true}' } })
    await user.click(screen.getByRole('button', { name: 'Save Notification Settings' }))

    await waitFor(() => {
      expect(patchSpy).toHaveBeenCalledWith('/admin/settings/notifications', {
        userNotifications: { expired: false },
        systemNotifications: { node_status: true },
      })
    })
  })
})

function settingsPayload() {
  return {
    userNotifications: { expired: true },
    systemNotifications: { node_status: false },
  }
}

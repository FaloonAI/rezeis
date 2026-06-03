import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'

import { usePermissionStore, type RbacAction } from '@/features/rbac'
import { loadFeatureBundle } from '@/i18n/i18n'
import { api } from '@/lib/api'
import { renderWithProviders } from '@/test/test-utils'
import GatewaySettingsPage from './gateway-settings-page'

describe('GatewaySettingsPage RBAC gating', () => {
  beforeAll(async () => {
    await loadFeatureBundle('payments')
  })

  beforeEach(() => {
    usePermissionStore.getState().reset()
    vi.restoreAllMocks()
  })

  it('does not fetch gateway settings without payment_gateways:view', async () => {
    const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ data: [] })
    grantPermissions([])

    renderWithProviders(<GatewaySettingsPage />)

    expect(await screen.findByText('Payment gateway access is restricted')).toBeInTheDocument()
    expect(getSpy).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Create default gateways' })).not.toBeInTheDocument()
  })

  it('shows gateway settings read-only without payment_gateways:edit', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({
      data: [
        {
          id: 'gateway-1',
          type: 'YOOKASSA',
          currency: 'RUB',
          isActive: true,
          orderIndex: 1,
          settings: { shopId: 'shop-1', apiKey: 'secret-key' },
          updatedAt: '2026-06-03T00:00:00.000Z',
        },
      ],
    })
    grantPermissions([{ resource: 'payment_gateways', action: 'view' }])

    renderWithProviders(<GatewaySettingsPage />)

    expect(await screen.findByText('YooKassa')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add missing' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Open settings' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Test request' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Move up' })).not.toBeInTheDocument()
    expect(screen.queryByRole('switch', { name: 'Toggle active' })).not.toBeInTheDocument()
  })
})

function grantPermissions(permissions: ReadonlyArray<{ resource: string; action: RbacAction }>): void {
  usePermissionStore.setState({
    loaded: true,
    loading: false,
    granted: new Set(permissions.map((permission) => `${permission.resource}:${permission.action}`)),
    mustChangePassword: false,
    role: 'ADMIN',
    rbacRoleId: 'role-1',
    error: null,
  })
}

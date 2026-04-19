import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RemnawavePage } from '@/features/remnawave/remnawave-page'
import { remnawaveApi } from '@/features/remnawave/remnawave-api'
import { renderWithProviders } from '@/test/test-utils'

describe('remnawave page smoke', () => {
  it('renders with a successful status payload', async () => {
    vi.spyOn(remnawaveApi, 'getStatus').mockResolvedValue({
      isConfigured: false,
      isReachable: false,
      isLoginAllowed: null,
      isRegisterAllowed: null,
      authentication: null,
      branding: null,
    })

    renderWithProviders(<RemnawavePage />)

    expect(await screen.findByText('Remnawave Panel')).toBeInTheDocument()
  })

  it('renders a safe error state when status request fails', async () => {
    vi.spyOn(remnawaveApi, 'getStatus').mockRejectedValue(new Error('remnawave smoke error'))

    renderWithProviders(<RemnawavePage />)

    expect(await screen.findByText('remnawave smoke error')).toBeInTheDocument()
  })
})

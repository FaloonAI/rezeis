import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'

import { api } from '@/lib/api'
import { renderWithProviders } from '@/test/test-utils'
import UsersPage from './users-page'

describe('UsersPage accessibility', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('names the user search field and icon-only submit action', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: { items: [], total: 0 } })

    renderWithProviders(<UsersPage />)

    expect(await screen.findByRole('textbox', { name: 'Enter a Reiwa ID, Telegram ID, email or login to search' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Users: Search/ })).toBeInTheDocument()
  })
})

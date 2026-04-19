import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PlansPage } from '@/features/catalog/plans-page'
import { plansAdminApi } from '@/features/catalog/plans-api'
import { renderWithProviders } from '@/test/test-utils'

describe('plans page smoke', () => {
  it('renders with empty catalog data', async () => {
    const listPlansSpy = vi.spyOn(plansAdminApi, 'listPlans').mockResolvedValue([])
    const internalSquadsSpy = vi.spyOn(plansAdminApi, 'getInternalSquads').mockResolvedValue([])
    const externalSquadsSpy = vi.spyOn(plansAdminApi, 'getExternalSquads').mockResolvedValue([])

    renderWithProviders(<PlansPage />)

    expect(await screen.findByText('Plans Catalog')).toBeInTheDocument()
    await waitFor(() => {
      expect(listPlansSpy).toHaveBeenCalledTimes(1)
      expect(internalSquadsSpy).toHaveBeenCalledTimes(1)
      expect(externalSquadsSpy).toHaveBeenCalledTimes(1)
    })
  })

  it('renders a safe error state when catalog request fails', async () => {
    vi.spyOn(plansAdminApi, 'listPlans').mockRejectedValue(new Error('plans smoke error'))
    vi.spyOn(plansAdminApi, 'getInternalSquads').mockResolvedValue([])
    vi.spyOn(plansAdminApi, 'getExternalSquads').mockResolvedValue([])

    renderWithProviders(<PlansPage />)

    expect(await screen.findByText('plans smoke error')).toBeInTheDocument()
  })
})

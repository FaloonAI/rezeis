import { describe, expect, it } from 'vitest'

import { canShowNavItem, navItemMap } from './admin-nav-config'

describe('admin nav permission metadata', () => {
  it('requires payments:view for the main payment transactions page', () => {
    const paymentsItem = navItemMap.get('payments')

    expect(paymentsItem?.requiredPermission).toEqual({ resource: 'payments', action: 'view' })
    expect(canShowNavItem(paymentsItem!, true, () => false)).toBe(false)
    expect(canShowNavItem(paymentsItem!, true, (resource, action) => resource === 'payments' && action === 'view')).toBe(true)
  })

  it('keeps restricted nav visible until permissions finish loading to avoid first-paint flicker', () => {
    const paymentsItem = navItemMap.get('payments')

    expect(canShowNavItem(paymentsItem!, false, () => false)).toBe(true)
  })
})

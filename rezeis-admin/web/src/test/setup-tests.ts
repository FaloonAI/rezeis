import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'
import { i18n } from '@/i18n/i18n'
import { authStorage } from '@/lib/auth-storage'
import { queryClient } from '@/lib/query-client'
import { useAuthStore } from '@/stores/auth-store'
import { useLocaleStore } from '@/stores/locale-store'

beforeEach(async () => {
  window.localStorage.clear()
  authStorage.clearToken()
  queryClient.clear()
  useAuthStore.setState({
    token: '',
    user: null,
    sessionRevision: 0,
    verifiedSessionRevision: null,
    pendingLoginRevision: null,
  })
  useLocaleStore.setState({ locale: 'en' })
  if (i18n.language !== 'en') {
    await i18n.changeLanguage('en')
  }
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

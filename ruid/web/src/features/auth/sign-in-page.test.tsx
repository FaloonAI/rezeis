import type { MockedFunction } from 'vitest'
import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { AxiosError } from 'axios'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { SignInPage } from '@/features/auth/sign-in-page'
import { authApi } from '@/features/auth/auth-api'
import { useAuthSession } from '@/features/auth/auth-provider'
import { createQueryClient } from '@/lib/query-client'

vi.mock('@/features/auth/auth-provider', () => ({
  useAuthSession: vi.fn(),
}))

function createAuthSession(overrides: Partial<ReturnType<typeof useAuthSession>> = {}): ReturnType<typeof useAuthSession> {
  return {
    status: 'authentication-required',
    sessionQuery: {
      data: undefined,
      error: null,
      isPending: false,
    },
    bootstrapError: null,
    hasSessionPersistenceIssue: false,
    telegramWebApp: null,
    hasTelegramLaunch: false,
    canBootstrapWithTelegram: false,
    ...overrides,
  } as ReturnType<typeof useAuthSession>
}

function createApiError(detail: string): AxiosError {
  const apiError = new AxiosError(detail)
  Object.defineProperty(apiError, 'response', {
    value: {
      data: { detail },
      status: 401,
      statusText: 'Unauthorized',
      headers: {},
      config: {},
    },
  })
  return apiError
}

function renderSignInPage(authSession: ReturnType<typeof useAuthSession> = createAuthSession()) {
  const mockedUseAuthSession: MockedFunction<typeof useAuthSession> = vi.mocked(useAuthSession)
  mockedUseAuthSession.mockReturnValue(authSession)
  const queryClient = createQueryClient({ isTest: true })
  const router = createMemoryRouter(
    [
      {
        path: '/sign-in',
        element: <SignInPage />,
      },
      {
        path: '/',
        element: <div>Authenticated shell</div>,
      },
    ],
    {
      initialEntries: ['/sign-in'],
    },
  )
  const renderResult = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return {
    ...renderResult,
    router,
  }
}

describe('SignInPage', () => {
  it('submits linked credentials and navigates back to the shell', async () => {
    const signInSpy = vi.spyOn(authApi, 'signInLinkedWebAccount').mockResolvedValue(undefined)
    const { getByLabelText, getByRole, getByText, router } = renderSignInPage()

    fireEvent.change(getByLabelText('Linked login'), { target: { value: ' user-login ' } })
    fireEvent.change(getByLabelText('Password'), { target: { value: 'correct-password' } })
    fireEvent.click(getByRole('button', { name: 'Sign in' }))

    await waitFor(() => {
      expect(getByText('Authenticated shell')).toBeInTheDocument()
    })

    expect(signInSpy).toHaveBeenCalledWith({
      login: 'user-login',
      password: 'correct-password',
    }, expect.anything())
    expect(router.state.location.pathname).toBe('/')
  })

  it('shows local validation errors before calling the API', () => {
    const signInSpy = vi.spyOn(authApi, 'signInLinkedWebAccount').mockResolvedValue(undefined)
    const { getByLabelText, getByRole, getByText } = renderSignInPage()

    fireEvent.change(getByLabelText('Linked login'), { target: { value: 'bad login' } })
    fireEvent.change(getByLabelText('Password'), { target: { value: 'short' } })
    fireEvent.click(getByRole('button', { name: 'Sign in' }))

    expect(getByText('Use only letters, numbers, dots, underscores, or hyphens.')).toBeInTheDocument()
    expect(getByText('Enter your linked account password.')).toBeInTheDocument()
    expect(signInSpy).not.toHaveBeenCalled()
  })

  it('renders the backend sign-in failure', async () => {
    vi.spyOn(authApi, 'signInLinkedWebAccount').mockRejectedValue(
      createApiError('Invalid login or password'),
    )
    const { getByLabelText, getByRole, findByText } = renderSignInPage()

    fireEvent.change(getByLabelText('Linked login'), { target: { value: 'user-login' } })
    fireEvent.change(getByLabelText('Password'), { target: { value: 'wrong-password' } })
    fireEvent.click(getByRole('button', { name: 'Sign in' }))

    expect(await findByText('Invalid login or password')).toBeInTheDocument()
  })

  it('redirects authenticated users away from the sign-in route', async () => {
    const { findByText, router } = renderSignInPage(createAuthSession({ status: 'authenticated' }))

    expect(await findByText('Authenticated shell')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
  })
})

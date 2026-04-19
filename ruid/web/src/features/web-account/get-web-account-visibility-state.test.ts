import { describe, expect, it } from 'vitest'
import {
  getSupportedEmailVerificationChallenge,
  getWebAccountVisibilityState,
  reconcileSessionAfterEmailVerificationChallenge,
} from '@/features/web-account/get-web-account-visibility-state'
import { sessionApi } from '@/features/session/session-api'

type SessionData = Awaited<ReturnType<typeof sessionApi.getSession>>
type WebAccountData = NonNullable<SessionData['webAccount']>
type ChallengeData = Awaited<ReturnType<typeof sessionApi.issueWebAccountEmailVerificationChallenge>>

function createWebAccount(overrides: Partial<WebAccountData> = {}): WebAccountData {
  return {
    id: 'web-account-1',
    login: 'user-login',
    loginNormalized: 'user-login',
    email: 'user@rezeis.test',
    emailNormalized: 'user@rezeis.test',
    emailVerifiedAt: null,
    requiresPasswordChange: false,
    linkPromptSnoozeUntil: null,
    credentialsBootstrappedAt: '2026-04-17T12:00:00.000Z',
    createdAt: '2026-04-17T12:00:00.000Z',
    updatedAt: '2026-04-17T12:00:00.000Z',
    ...overrides,
  }
}

function createSession(overrides: Partial<SessionData> = {}): SessionData {
  return {
    id: 'session-1',
    telegramId: '777000',
    username: 'rezeis-user',
    name: 'Rezeis User',
    email: 'user@rezeis.test',
    role: 'USER',
    language: 'EN',
    personalDiscount: 0,
    purchaseDiscount: 0,
    points: 0,
    maxSubscriptions: 1,
    isBlocked: false,
    isBotBlocked: false,
    isRulesAccepted: true,
    createdAt: '2026-04-17T12:00:00.000Z',
    updatedAt: '2026-04-17T12:00:00.000Z',
    webAccount: createWebAccount(),
    ...overrides,
  }
}

function createChallenge(overrides: Partial<ChallengeData> = {}): ChallengeData {
  return {
    webAccountId: 'web-account-1',
    email: 'user@rezeis.test',
    challengeExpiresAt: '2026-04-17T12:05:00.000Z',
    emailVerifiedAt: null,
    ...overrides,
  }
}

describe('getWebAccountVisibilityState', () => {
  it('hides an expired pending email verification challenge', () => {
    const challenge = createChallenge()

    expect(getWebAccountVisibilityState({
      webAccount: createWebAccount(),
      challenge,
      now: Date.parse('2026-04-17T12:00:00.000Z'),
    }).visibleEmailVerificationChallenge).toEqual(challenge)

    expect(getWebAccountVisibilityState({
      webAccount: createWebAccount(),
      challenge,
      now: Date.parse('2026-04-17T12:06:00.000Z'),
    }).visibleEmailVerificationChallenge).toBeNull()
  })

  it('shows readiness prompt only after snooze boundary passes', () => {
    const webAccount = createWebAccount({
      requiresPasswordChange: true,
      linkPromptSnoozeUntil: '2026-04-17T12:05:00.000Z',
    })

    expect(getWebAccountVisibilityState({
      webAccount,
      challenge: null,
      now: Date.parse('2026-04-17T12:00:00.000Z'),
    }).isReadinessPromptVisible).toBe(false)

    expect(getWebAccountVisibilityState({
      webAccount,
      challenge: null,
      now: Date.parse('2026-04-17T12:06:00.000Z'),
    }).isReadinessPromptVisible).toBe(true)
  })
})

describe('getSupportedEmailVerificationChallenge', () => {
  it('returns null while auth is loading to avoid clearing pending challenge state too early', () => {
    expect(getSupportedEmailVerificationChallenge({
      authStatus: 'loading',
      webAccount: createWebAccount(),
      challenge: createChallenge(),
      now: Date.parse('2026-04-17T12:00:00.000Z'),
    })).toBeNull()
  })
})

describe('reconcileSessionAfterEmailVerificationChallenge', () => {
  it('reconciles a missing-web-account fallback payload to an unlinked session', () => {
    const session = createSession()

    const actualSession = reconcileSessionAfterEmailVerificationChallenge({
      session,
      challenge: createChallenge({
        webAccountId: null,
        email: null,
        challengeExpiresAt: null,
        emailVerifiedAt: null,
      }),
    })

    expect(actualSession?.webAccount).toBeNull()
  })

  it('keeps the current session unchanged for mismatched fallback payloads', () => {
    const session = createSession()

    const actualSession = reconcileSessionAfterEmailVerificationChallenge({
      session,
      challenge: createChallenge({
        webAccountId: 'web-account-2',
        email: null,
        challengeExpiresAt: null,
        emailVerifiedAt: null,
      }),
    })

    expect(actualSession).toBe(session)
  })
})

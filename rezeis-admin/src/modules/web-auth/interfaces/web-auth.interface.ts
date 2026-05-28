/**
 * Result of `POST /api/internal/web-auth/register`.
 *
 * `userId` is the canonical reiwa_id (CUID) the caller should treat as the
 * stable user identity going forward. `webAccountId` is exposed mostly for
 * audit-log correlation; it is not required for any subsequent call.
 */
export interface WebAuthRegisterResultInterface {
  readonly userId: string;
  readonly webAccountId: string;
}

/**
 * Result of `POST /api/internal/web-auth/login`.
 *
 *  - `requiresPasswordChange`: bootstrap step (admin-issued temporary
 *    password); reiwa SPA must redirect to `/change-password` first.
 *  - `telegramLinked` / `emailVerified`: drive the recovery affordances
 *    in the SPA settings (greyed-out vs primary).
 */
export interface WebAuthLoginResultInterface {
  readonly userId: string;
  readonly requiresPasswordChange: boolean;
  readonly telegramLinked: boolean;
  readonly emailVerified: boolean;
}

/**
 * Result of `POST /api/internal/web-auth/recover`.
 *
 *   - `telegram`: a verification code was generated and the bot will
 *     deliver it on the next user message (or via realtime stream when
 *     the bot is configured to push). `challengeId` is opaque to reiwa.
 *   - `email`:    a magic-link/email-OTP was sent.
 *   - `none`:     user has neither a verified email nor a linked Telegram
 *                 account — recovery is impossible without operator help.
 */
export interface WebAuthRecoverResultInterface {
  readonly method: 'telegram' | 'email' | 'none';
  readonly challengeId?: string;
}

export interface WebAuthChangePasswordResultInterface {
  readonly success: boolean;
}

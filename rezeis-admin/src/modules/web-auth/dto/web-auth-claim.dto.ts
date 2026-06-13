import { IsString, Length, Matches } from 'class-validator';

/**
 * Body for `POST /api/internal/web-auth/claim`.
 *
 * Claim links a `WebAccount` (login + password) to an ALREADY-EXISTING
 * `User` identified by its canonical `reiwa_id` (CUID). Unlike `register`,
 * it never creates a new `User` and never resolves by Telegram id — reiwa
 * passes the userId straight from the authenticated WebSession, so the claim
 * can only ever attach credentials to the caller's own account.
 *
 * Used by the mandatory first-entry onboarding: a Telegram-first user (who
 * has a `User` but no `WebAccount`) sets a login + password so they can also
 * sign in from a browser without Telegram.
 *
 * `password` arrives as the SHA-256 hex the SPA already produces (mirrors
 * `register`); admin scrypt-hashes it.
 */
export class WebAuthClaimDto {
  @IsString()
  @Matches(/^c[a-z0-9]{20,}$/i, { message: 'userId must be a reiwa_id (CUID)' })
  public readonly userId!: string;

  @IsString()
  @Length(3, 64)
  @Matches(/^[A-Za-z0-9._-]+$/, {
    message: 'login may contain only letters, digits, dot, underscore and hyphen',
  })
  public readonly login!: string;

  @IsString()
  @Length(8, 256)
  public readonly password!: string;
}

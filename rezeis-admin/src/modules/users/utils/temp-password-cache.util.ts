/**
 * Cache key + TTL for the operator-viewable temporary password.
 *
 * The plaintext temporary password is stored in the Redis-backed cache (NOT a
 * DB column) so the operator can re-view it until the user changes their
 * password. It is admin-JWT gated, never logged, TTL-bounded (matches
 * `temporaryPasswordExpiresAt`), and cleared the moment the user sets their
 * own password.
 */
export const TEMP_PASSWORD_TTL_HOURS = 24;
export const TEMP_PASSWORD_TTL_SECONDS = TEMP_PASSWORD_TTL_HOURS * 60 * 60;

export function tempPasswordCacheKey(webAccountId: string): string {
  return `web-auth:temp-password:${webAccountId}`;
}

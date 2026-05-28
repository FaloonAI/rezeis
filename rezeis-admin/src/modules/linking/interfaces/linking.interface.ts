/**
 * Result of `POST /api/internal/link/telegram/generate`.
 *
 * The web-side caller takes `code` and shows it to the user as "type this
 * into the Rezeis bot to link your Telegram". `expiresAt` is the wall-clock
 * deadline (ISO-8601). Reiwa surfaces this in the SPA settings page.
 */
export interface LinkTelegramGenerateResultInterface {
  readonly code: string;
  readonly expiresAt: string;
}

/**
 * Result of `POST /api/internal/link/telegram/consume`.
 *
 *  - `success: true` — `User.telegramId` was attached to the previously
 *    web-only User row owning the challenge. Reiwa returns the user to
 *    their dashboard.
 *  - `success: false, reason: 'TELEGRAM_ALREADY_LINKED'` — the user is
 *    already in the bot under a different User row that has its own
 *    history. Per the agreed identity model we refuse silent merges.
 *  - `success: false, reason: 'INVALID_OR_EXPIRED_CODE'` — bad code,
 *    expired challenge, or already-consumed challenge.
 */
export interface LinkTelegramConsumeResultInterface {
  readonly success: boolean;
  readonly reason?: 'INVALID_OR_EXPIRED_CODE' | 'TELEGRAM_ALREADY_LINKED' | 'USER_NOT_FOUND';
  readonly userId?: string;
}

export interface LinkEmailInitiateResultInterface {
  readonly success: boolean;
  readonly message: string;
}

export interface LinkEmailVerifyResultInterface {
  readonly success: boolean;
  readonly verified: boolean;
}

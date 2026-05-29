import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

/**
 * Generic identity query/body DTO for user-edge read+write endpoints
 * (notifications, transactions, devices, trial, etc.).
 *
 * Accepts EITHER:
 *   - `userId`: the canonical reiwa_id (CUID) — works for every user
 *     including browser-registered ones with no Telegram, OR
 *   - `telegramId`: a positive numeric string (Telegram flows).
 *
 * At least one must be present; the controller picks the best available
 * reference (reiwa_id preferred) via `pickUserReference`.
 */
export class InternalByTelegramQueryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  public readonly userId?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{1,19}$/, { message: 'telegramId must be a positive numeric string up to 19 digits' })
  public readonly telegramId?: string;
}

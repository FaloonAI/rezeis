import { IsString, Length, Matches } from 'class-validator';

/**
 * Bot-facing payload for `PATCH /api/internal/user/language`.
 * Accepts the canonical Telegram id + a short ISO locale code; the service
 * resolves `Locale` enum values case-insensitively.
 */
export class InternalUpdateLanguageDto {
  @IsString()
  @Matches(/^\d{1,19}$/, { message: 'telegramId must be a positive numeric string up to 19 digits' })
  public readonly telegramId!: string;

  @IsString()
  @Length(2, 8)
  public readonly language!: string;
}

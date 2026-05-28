import { IsString, Matches } from 'class-validator';

/**
 * Generic query DTO for read endpoints that take only `?telegramId=`.
 * Used by notifications, transactions, devices, trial, etc.
 */
export class InternalByTelegramQueryDto {
  @IsString()
  @Matches(/^\d{1,19}$/, { message: 'telegramId must be a positive numeric string up to 19 digits' })
  public readonly telegramId!: string;
}

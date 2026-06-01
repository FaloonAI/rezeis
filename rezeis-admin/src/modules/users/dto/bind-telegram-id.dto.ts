import { IsString, Matches } from 'class-validator';

/** Body payload for `PATCH /admin/users/:telegramId/telegram-binding`. */
export class BindTelegramIdDto {
  @IsString()
  @Matches(/^\d{1,19}$/, {
    message: 'telegramId must be a positive numeric string up to 19 digits',
  })
  public telegramId!: string;
}

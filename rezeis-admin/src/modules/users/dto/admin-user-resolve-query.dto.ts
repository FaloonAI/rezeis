import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Accepts a single free-text identifier — reiwa_id, Telegram ID, login or
 * email — to resolve to a canonical reiwa user for the plan "Allowed users"
 * picker.
 */
export class AdminUserResolveQueryDto {
  @Transform(({ value }: { readonly value: unknown }): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(320)
  public identifier!: string;
}

import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/**
 * Query for `GET /admin/notifications/events` — the admin "Пользовательские
 * события" feed. Cursor-paginated (opaque `cursor` = last row id).
 */
export class ListUserNotificationEventsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  public readonly limit?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  public readonly cursor?: string;
}

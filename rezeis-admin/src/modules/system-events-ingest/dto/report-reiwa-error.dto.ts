import { IsIn, IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Payload reiwa posts to `POST /api/internal/system/error` so its runtime
 * errors (bot / api / worker) are captured centrally as rezeis system events
 * — persisted to the audit log, shown in the Events page, and included in the
 * .txt export alongside panel errors.
 */
export class ReportReiwaErrorDto {
  /** Originating reiwa process: `api` | `bot` | `worker`. */
  @IsString()
  @MaxLength(32)
  public readonly source!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  public readonly message!: string;

  @IsOptional()
  @IsIn(['error', 'warning'])
  public readonly level?: 'error' | 'warning';

  @IsOptional()
  @IsObject()
  public readonly context?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  public readonly stack?: string;
}

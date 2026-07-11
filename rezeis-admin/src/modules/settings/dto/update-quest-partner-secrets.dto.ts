import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

/**
 * One quest-partner upsert. `secret` semantics mirror the bot-token contract:
 *   - omitted  → keep the existing secret (label-only edit)
 *   - ''       → clear (remove the partner)
 *   - non-empty→ set (stored AES-256-GCM-encrypted; never echoed back)
 */
export class QuestPartnerUpsertDto {
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9_-]{1,63}$/, {
    message: 'slug must be lowercase alphanumeric with - or _ (2–64 chars)',
  })
  public readonly slug!: string;

  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsString()
  @MaxLength(256)
  public readonly secret?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  public readonly label?: string;
}

/** Batch upsert of quest-partner HMAC secrets from the settings page. */
export class UpdateQuestPartnerSecretsDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => QuestPartnerUpsertDto)
  public readonly partners!: QuestPartnerUpsertDto[];
}

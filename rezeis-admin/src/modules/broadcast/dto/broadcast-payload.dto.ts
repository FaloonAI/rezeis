import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { BroadcastAudience } from '@prisma/client';

export class BroadcastPayloadDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  public title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4096)
  public text?: string;

  @IsOptional()
  @IsIn(['none', 'photo', 'video'])
  public mediaType?: 'none' | 'photo' | 'video';

  @IsOptional()
  @IsString()
  @MaxLength(256)
  public mediaFileId?: string;

  @IsOptional()
  @IsIn(['HTML', 'MarkdownV2'])
  public parseMode?: 'HTML' | 'MarkdownV2';
}

export class CreateBroadcastDraftDto {
  @IsEnum(BroadcastAudience)
  public audience!: BroadcastAudience;

  @IsOptional()
  @IsString()
  public audiencePlanId?: string;

  /** Optional promo-code tag. Validated (exists + usable) on save. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  public promoCode?: string;

  @IsOptional()
  @ValidateNested()
  @Type((): typeof BroadcastPayloadDto => BroadcastPayloadDto)
  public payload?: BroadcastPayloadDto;
}

export class UpdateBroadcastDraftDto {
  @IsOptional()
  @IsEnum(BroadcastAudience)
  public audience?: BroadcastAudience;

  @IsOptional()
  @IsString()
  public audiencePlanId?: string;

  /**
   * Optional promo-code tag. An empty string clears the tag; a non-empty
   * value is validated (exists + usable) on save.
   */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  public promoCode?: string;

  @IsOptional()
  @ValidateNested()
  @Type((): typeof BroadcastPayloadDto => BroadcastPayloadDto)
  public payload?: BroadcastPayloadDto;
}

export class SendBroadcastDto {
  /** Optional delay in minutes for scheduled sends. */
  @IsOptional()
  @IsInt()
  @Min(1)
  public delayMinutes?: number;
}

export class EditBroadcastDto {
  @IsString()
  @MaxLength(4096)
  public text!: string;

  @IsOptional()
  @IsIn(['HTML', 'MarkdownV2'])
  public parseMode?: 'HTML' | 'MarkdownV2' | null;
}

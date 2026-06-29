import { PaymentGatewayType, PurchaseChannel } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { RenewalDurationDto } from './renewal-duration.dto';
import { RenewalPlanDto } from './renewal-plan.dto';

/**
 * Lists a user's renewable subscriptions with per-item renewal pricing.
 * Identity is the canonical `reiwa_id` (`userId`) or a `telegramId`. When
 * `subscriptionIds` is omitted all renewable subscriptions are returned.
 */
export class InternalRenewalOptionsDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  public userId?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d+$/, { message: 'telegramId must be a valid integer string' })
  public telegramId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  public subscriptionIds?: string[];

  @IsOptional()
  @IsEnum(PaymentGatewayType)
  public gatewayType?: PaymentGatewayType;

  @IsOptional()
  @IsEnum(PurchaseChannel)
  public channel?: PurchaseChannel;

  /** Optional explicit renewal-duration choices, one entry per subscription. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => RenewalDurationDto)
  public durations?: RenewalDurationDto[];

  /** Optional explicit plan choices (for plan-less subscriptions). */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => RenewalPlanDto)
  public plans?: RenewalPlanDto[];
}

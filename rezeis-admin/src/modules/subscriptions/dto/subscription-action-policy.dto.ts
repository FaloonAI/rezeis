import { PurchaseChannel } from '@prisma/client';
import { IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

/**
 * Action-policy request. Identity is the canonical `reiwa_id`
 * (`User.id`, a CUID). Either `userId` (reiwa_id) or `telegramId` must
 * be supplied; the service resolves to the canonical user.
 */
export class SubscriptionActionPolicyDto {
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
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  public subscriptionId?: string;

  @IsOptional()
  @IsEnum(PurchaseChannel)
  public channel?: PurchaseChannel;
}

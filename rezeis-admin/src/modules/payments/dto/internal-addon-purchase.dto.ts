import { PaymentGatewayType, PurchaseChannel } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
} from 'class-validator';

/**
 * Add-on purchase checkout request (reiwa user edge → rezeis).
 *
 * `addOnId` selects the extra-traffic / extra-devices product,
 * `subscriptionId` is the active subscription to top up. Pricing is
 * resolved from the gateway's currency upstream.
 */
export class InternalAddOnPurchaseDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  public userId?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d+$/, { message: 'telegramId must be a valid integer string' })
  public telegramId?: string;

  @IsString()
  @MaxLength(64)
  public addOnId!: string;

  @IsString()
  @MaxLength(64)
  public subscriptionId!: string;

  @IsEnum(PaymentGatewayType)
  public gatewayType!: PaymentGatewayType;

  @IsOptional()
  @IsEnum(PurchaseChannel)
  public channel?: PurchaseChannel;

  @IsOptional()
  @IsString()
  @IsUrl({ require_protocol: true, protocols: ['http', 'https', 'tg', 'tgapp'] })
  @MaxLength(2048)
  public successUrl?: string;

  @IsOptional()
  @IsString()
  @IsUrl({ require_protocol: true, protocols: ['http', 'https', 'tg', 'tgapp'] })
  @MaxLength(2048)
  public failUrl?: string;
}

import { PaymentGatewayType, PurchaseChannel, PurchaseType } from '@prisma/client';
import { IsEnum, IsIn, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

const LIVE_PAYMENT_PURCHASE_TYPES: readonly PurchaseType[] = [
  PurchaseType.NEW,
  PurchaseType.RENEW,
  PurchaseType.UPGRADE,
  PurchaseType.ADDITIONAL,
] as const;

export class InternalPaymentCheckoutDto {
  @IsUUID('4')
  public userId!: string;

  @IsEnum(PurchaseType)
  @IsIn(LIVE_PAYMENT_PURCHASE_TYPES)
  public purchaseType!: PurchaseType;

  @IsUUID('4')
  public planId!: string;

  @IsInt()
  @Min(-1)
  public durationDays!: number;

  @IsEnum(PaymentGatewayType)
  public gatewayType!: PaymentGatewayType;

  @IsOptional()
  @IsUUID('4')
  public subscriptionId?: string;

  @IsOptional()
  @IsEnum(PurchaseChannel)
  public channel?: PurchaseChannel;
}

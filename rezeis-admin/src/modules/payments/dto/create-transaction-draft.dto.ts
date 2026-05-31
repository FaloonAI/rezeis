import { PaymentGatewayType, PurchaseChannel, PurchaseType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

const DRAFT_PURCHASE_TYPES: readonly PurchaseType[] = [
  PurchaseType.NEW,
  PurchaseType.ADDITIONAL,
  PurchaseType.RENEW,
  PurchaseType.UPGRADE,
];

const DEVICE_TYPES = ['ANDROID', 'IPHONE', 'WINDOWS', 'MAC', 'OTHER'] as const;

export class CreateTransactionDraftDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  public userId!: string;

  @IsEnum(PurchaseType)
  @IsIn(DRAFT_PURCHASE_TYPES)
  public purchaseType!: PurchaseType;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  public planId!: string;

  @Type((): NumberConstructor => Number)
  @IsInt()
  @Min(-1)
  public durationDays!: number;

  @IsEnum(PaymentGatewayType)
  public gatewayType!: PaymentGatewayType;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  public sourceSubscriptionId?: string;

  @IsOptional()
  @IsEnum(PurchaseChannel)
  public channel?: PurchaseChannel;

  /** Device the user intends to use the subscription on (cosmetic hint). */
  @IsOptional()
  @IsIn(DEVICE_TYPES as readonly string[])
  public deviceType?: string;
}

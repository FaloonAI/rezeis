import { PaymentGatewayType, PurchaseChannel, PurchaseType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

const DRAFT_PURCHASE_TYPES: readonly PurchaseType[] = [
  PurchaseType.NEW,
  PurchaseType.ADDITIONAL,
  PurchaseType.RENEW,
  PurchaseType.UPGRADE,
];

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
}

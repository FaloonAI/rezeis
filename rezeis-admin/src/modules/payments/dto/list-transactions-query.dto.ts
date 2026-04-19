import { PaymentGatewayType, PurchaseType, TransactionStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class ListTransactionsQueryDto {
  @IsOptional()
  @IsUUID('4')
  public userId?: string;

  @IsOptional()
  @IsEnum(TransactionStatus)
  public status?: TransactionStatus;

  @IsOptional()
  @IsEnum(PaymentGatewayType)
  public gatewayType?: PaymentGatewayType;

  @IsOptional()
  @IsEnum(PurchaseType)
  public purchaseType?: PurchaseType;

  @IsOptional()
  @Type((): NumberConstructor => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  public limit?: number;
}

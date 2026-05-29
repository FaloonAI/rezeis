import { PaymentGatewayType, PurchaseChannel, PurchaseType } from '@prisma/client';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const LIVE_PAYMENT_PURCHASE_TYPES: readonly PurchaseType[] = [
  PurchaseType.NEW,
  PurchaseType.RENEW,
  PurchaseType.UPGRADE,
  PurchaseType.ADDITIONAL,
] as const;

/**
 * Checkout request. Identity is the canonical `reiwa_id` (`User.id`, a
 * CUID). Either `userId` (reiwa_id) or `telegramId` must be supplied;
 * the service resolves to the canonical user so web / web-first users
 * (no Telegram) and Telegram-only users both check out through the same
 * endpoint.
 */
export class InternalPaymentCheckoutDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  public userId?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d+$/, { message: 'telegramId must be a valid integer string' })
  public telegramId?: string;

  @IsEnum(PurchaseType)
  @IsIn(LIVE_PAYMENT_PURCHASE_TYPES)
  public purchaseType!: PurchaseType;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  public planId!: string;

  @IsInt()
  @Min(-1)
  public durationDays!: number;

  @IsEnum(PaymentGatewayType)
  public gatewayType!: PaymentGatewayType;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  public subscriptionId?: string;

  @IsOptional()
  @IsEnum(PurchaseChannel)
  public channel?: PurchaseChannel;

  /**
   * URL the payment provider redirects the customer to on a successful payment.
   * Reiwa supplies a context-aware URL (web origin for browser, Telegram deep link for Mini App).
   * Falls back to `${REZEIS_DOMAIN}/payments/result?paymentId=...` when not provided.
   */
  @IsOptional()
  @IsString()
  @IsUrl({ require_protocol: true, protocols: ['http', 'https', 'tg', 'tgapp'] })
  @MaxLength(2048)
  public successUrl?: string;

  /**
   * URL the payment provider redirects the customer to on a failed/cancelled payment.
   * Defaults to `successUrl` when omitted, mirroring most providers' behaviour.
   */
  @IsOptional()
  @IsString()
  @IsUrl({ require_protocol: true, protocols: ['http', 'https', 'tg', 'tgapp'] })
  @MaxLength(2048)
  public failUrl?: string;
}

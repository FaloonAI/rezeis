import {
  Currency,
  PaymentGatewayType,
  PurchaseChannel,
  PurchaseType,
  TransactionStatus,
} from '@prisma/client';

export interface AdminPaymentTransactionInterface {
  readonly id: string;
  readonly paymentId: string;
  readonly userId: string;
  readonly subscriptionId: string | null;
  readonly status: TransactionStatus;
  readonly purchaseType: PurchaseType;
  readonly channel: PurchaseChannel;
  readonly gatewayType: PaymentGatewayType;
  readonly currency: Currency;
  readonly amount: string;
  readonly paymentAsset: string | null;
  readonly gatewayId: string | null;
  readonly planSnapshot: unknown;
  readonly createdAt: string;
  readonly updatedAt: string;
}

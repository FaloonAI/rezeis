/**
 * Single user-facing notification event (created by admin tooling, the
 * auto-renew job, partners service, etc.). Reiwa renders these in the
 * dashboard's notifications panel and on the bot's `Activity` feed.
 */
export interface InternalUserNotificationInterface {
  readonly id: string;
  readonly type: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly readAt: string | null;
  readonly createdAt: string;
}

/**
 * Single transaction (payment / subscription purchase / partner payout)
 * exposed to reiwa. Currency / amount are returned as strings to keep
 * decimal precision identical to what the upstream Prisma `Decimal` carries.
 */
export interface InternalUserTransactionInterface {
  readonly id: string;
  readonly paymentId: string;
  readonly status: string;
  readonly purchaseType: string;
  readonly channel: string;
  readonly gatewayType: string;
  readonly currency: string;
  readonly amount: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

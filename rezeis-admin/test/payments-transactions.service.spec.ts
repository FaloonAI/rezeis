import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  Currency,
  PaymentGatewayType,
  PurchaseChannel,
  PurchaseType,
  TransactionStatus,
} from '@prisma/client';

import { PaymentsTransactionsService } from '../src/modules/payments/services/payments-transactions.service';

describe('PaymentsTransactionsService', () => {
  it('creates pending transaction draft from eligible quote', async () => {
    const { service, state } = createService({
      quoteResult: createEligibleQuote(),
    });

    const transaction = await service.createDraft({
      userId: 'user-1',
      purchaseType: PurchaseType.NEW,
      planId: 'plan-1',
      durationDays: 30,
      gatewayType: PaymentGatewayType.YOOKASSA,
      channel: PurchaseChannel.WEB,
    });

    assert.equal(transaction.status, TransactionStatus.PENDING);
    assert.equal(transaction.purchaseType, PurchaseType.NEW);
    assert.equal(transaction.gatewayType, PaymentGatewayType.YOOKASSA);
    assert.equal(transaction.currency, Currency.USD);
    assert.equal(transaction.amount, '8');
    assert.equal(state.transactionCreateCalls.length, 1);
  });

  it('rejects ineligible quotes and does not create transaction', async () => {
    const { service, state } = createService({
      quoteResult: {
        ...createEligibleQuote(),
        isEligible: false,
        warnings: [{ code: 'PLAN_NOT_AVAILABLE', message: 'Plan not available' }],
      },
    });

    await assert.rejects(
      async () => {
        await service.createDraft({
          userId: 'user-1',
          purchaseType: PurchaseType.NEW,
          planId: 'plan-1',
          durationDays: 30,
          gatewayType: PaymentGatewayType.YOOKASSA,
          channel: PurchaseChannel.WEB,
        });
      },
      {
        name: 'BadRequestException',
        message: 'Quote is not eligible for transaction draft creation.',
      },
    );

    assert.equal(state.transactionCreateCalls.length, 0);
  });

  it('rejects TRIAL transaction draft payloads', async () => {
    const { service } = createService({
      quoteResult: createEligibleQuote(),
    });

    await assert.rejects(
      async () => {
        await service.createDraft({
          userId: 'user-1',
          purchaseType: 'TRIAL' as unknown as PurchaseType,
          planId: 'plan-1',
          durationDays: 30,
          gatewayType: PaymentGatewayType.YOOKASSA,
          channel: PurchaseChannel.WEB,
        });
      },
      {
        name: 'BadRequestException',
        message: 'Trial purchases cannot be converted to transaction drafts.',
      },
    );
  });

  it('stores plan snapshot and final quote amount without creating subscriptions or provider calls', async () => {
    const { service, state } = createService({
      quoteResult: createEligibleQuote(),
    });

    await service.createDraft({
      userId: 'user-1',
      purchaseType: PurchaseType.UPGRADE,
      planId: 'plan-1',
      durationDays: 30,
      gatewayType: PaymentGatewayType.YOOKASSA,
      sourceSubscriptionId: 'subscription-1',
      channel: PurchaseChannel.WEB,
    });

    assert.equal(state.transactionCreateCalls.length, 1);
    assert.deepStrictEqual(state.transactionCreateCalls[0], {
      userId: 'user-1',
      subscriptionId: 'subscription-1',
      status: TransactionStatus.PENDING,
      purchaseType: PurchaseType.UPGRADE,
      channel: PurchaseChannel.WEB,
      gatewayType: PaymentGatewayType.YOOKASSA,
      currency: Currency.USD,
      amount: '8',
      planSnapshot: {
        id: 'plan-1',
        name: 'Starter',
        tag: null,
        type: 'BOTH',
        trafficLimit: 1024,
        deviceLimit: 1,
        trafficLimitStrategy: 'NO_RESET',
        selectedDurationDays: 30,
        purchaseType: PurchaseType.UPGRADE,
        snapshotSource: 'ADMIN_TRANSACTION_DRAFT',
      },
      deviceTypes: [],
    });
    assert.equal(state.subscriptionCreateCalls, 0);
    assert.equal(state.providerCalls, 0);
  });

  it('reuses an existing pending draft for the same quote context', async () => {
    const existingPlanSnapshot = {
      id: 'plan-1',
      name: 'Starter',
      tag: null,
      type: 'BOTH',
      trafficLimit: 1024,
      deviceLimit: 1,
      trafficLimitStrategy: 'NO_RESET',
      selectedDurationDays: 30,
      purchaseType: PurchaseType.NEW,
      snapshotSource: 'ADMIN_TRANSACTION_DRAFT',
    };
    const { service, state } = createService({
      quoteResult: createEligibleQuote(),
      existingTransactions: [
        createStoredTransaction({
          id: 'transaction-existing',
          paymentId: 'payment-existing',
          purchaseType: PurchaseType.NEW,
          channel: PurchaseChannel.WEB,
          gatewayType: PaymentGatewayType.YOOKASSA,
          currency: Currency.USD,
          amount: '8',
          planSnapshot: existingPlanSnapshot,
        }),
      ],
    });

    const transaction = await service.createDraft({
      userId: 'user-1',
      purchaseType: PurchaseType.NEW,
      planId: 'plan-1',
      durationDays: 30,
      gatewayType: PaymentGatewayType.YOOKASSA,
      channel: PurchaseChannel.WEB,
    });

    assert.equal(transaction.id, 'transaction-existing');
    assert.equal(state.transactionCreateCalls.length, 0);
  });
});

function createService(input: {
  readonly quoteResult: QuoteResult;
  readonly existingTransactions?: readonly ReturnType<typeof createStoredTransaction>[];
}): {
  readonly service: PaymentsTransactionsService;
  readonly state: {
    readonly transactionCreateCalls: Record<string, unknown>[];
    readonly subscriptionCreateCalls: number;
    readonly providerCalls: number;
  };
} {
  const transactionCreateCalls: Record<string, unknown>[] = [];
  const existingTransactions = [...(input.existingTransactions ?? [])];
  const state = {
    transactionCreateCalls,
    subscriptionCreateCalls: 0,
    providerCalls: 0,
  };
  const prismaService = {
    transaction: {
      findMany: async () => existingTransactions,
      create: async (args: { readonly data: Record<string, unknown> }) => {
        transactionCreateCalls.push(args.data);
        return {
          id: 'transaction-1',
          paymentId: 'payment-1',
          userId: args.data.userId,
          subscriptionId: args.data.subscriptionId,
          status: args.data.status,
          purchaseType: args.data.purchaseType,
          channel: args.data.channel,
          gatewayType: args.data.gatewayType,
          currency: args.data.currency,
          amount: { toString: (): string => String(args.data.amount) },
          paymentAsset: null,
          gatewayId: null,
          planSnapshot: args.data.planSnapshot,
          createdAt: new Date('2026-04-19T12:00:00.000Z'),
          updatedAt: new Date('2026-04-19T12:00:00.000Z'),
        };
      },
    },
  };
  const quoteService = {
    getQuote: async () => input.quoteResult,
  };
  return {
    service: new PaymentsTransactionsService(
      prismaService as never,
      quoteService as never,
    ),
    state,
  };
}

function createEligibleQuote() {
  return {
    userId: 'user-1',
    purchaseType: PurchaseType.NEW,
    channel: PurchaseChannel.WEB,
    isEligible: true,
    selectedSubscriptionId: null,
    selectedPlan: {
      id: 'plan-1',
      name: 'Starter',
      tag: null,
      type: 'BOTH',
      trafficLimit: 1024,
      deviceLimit: 1,
      trafficLimitStrategy: 'NO_RESET',
      durations: [],
    },
    selectedDuration: {
      id: 'duration-1',
      days: 30,
    },
    availablePlans: [],
    price: {
      gatewayType: PaymentGatewayType.YOOKASSA,
      currency: Currency.USD,
      originalPrice: '10',
      price: '8',
      discountPercent: 20,
      discountSource: 'PURCHASE',
    },
    warnings: [],
  };
}

interface QuoteResult {
  userId: string;
  purchaseType: PurchaseType;
  channel: PurchaseChannel;
  isEligible: boolean;
  selectedSubscriptionId: string | null;
  selectedPlan: {
    id: string;
    name: string;
    tag: string | null;
    type: string;
    trafficLimit: number | null;
    deviceLimit: number;
    trafficLimitStrategy: string;
    durations: readonly unknown[];
  } | null;
  selectedDuration: {
    id: string;
    days: number;
  } | null;
  availablePlans: readonly unknown[];
  price: {
    gatewayType: PaymentGatewayType;
    currency: Currency;
    originalPrice: string;
    price: string;
    discountPercent: number;
    discountSource: string;
  } | null;
  warnings: { code: string; message: string }[];
}

function createStoredTransaction(input: {
  readonly id: string;
  readonly paymentId: string;
  readonly purchaseType: PurchaseType;
  readonly channel: PurchaseChannel;
  readonly gatewayType: PaymentGatewayType;
  readonly currency: Currency;
  readonly amount: string;
  readonly planSnapshot: Record<string, unknown>;
}) {
  return {
    id: input.id,
    paymentId: input.paymentId,
    userId: 'user-1',
    subscriptionId: null,
    status: TransactionStatus.PENDING,
    purchaseType: input.purchaseType,
    channel: input.channel,
    gatewayType: input.gatewayType,
    currency: input.currency,
    amount: { toString: (): string => input.amount },
    paymentAsset: null,
    gatewayId: null,
    planSnapshot: input.planSnapshot,
    createdAt: new Date('2026-04-19T12:00:00.000Z'),
    updatedAt: new Date('2026-04-19T12:00:00.000Z'),
  };
}

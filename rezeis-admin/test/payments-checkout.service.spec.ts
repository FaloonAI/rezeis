import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  Currency,
  PaymentGatewayType,
  PurchaseChannel,
  PurchaseType,
  TransactionStatus,
} from '@prisma/client';

import { PaymentsCheckoutService } from '../src/modules/payments/services/payments-checkout.service';

describe('PaymentsCheckoutService', () => {
  it('creates checkout for an active and configured gateway', async () => {
    const { service, state } = createService()

    const checkout = await service.checkout({
      userId: 'user-1',
      purchaseType: PurchaseType.NEW,
      planId: 'plan-1',
      durationDays: 30,
      gatewayType: PaymentGatewayType.YOOKASSA,
      channel: PurchaseChannel.WEB,
    })

    assert.equal(checkout.paymentId, 'payment-1')
    assert.equal(checkout.checkoutUrl, 'https://checkout.example.com')
    assert.equal(state.transactionUpdates.length, 1)
  })

  it('rejects Telegram Stars checkout on WEB channel', async () => {
    const { service } = createService({
      gatewayType: PaymentGatewayType.TELEGRAM_STARS,
      gatewayCurrency: Currency.XTR,
      gatewaySettings: { webhookSecret: 'telegram-secret' },
    })

    await assert.rejects(
      async () => {
        await service.checkout({
          userId: 'user-1',
          purchaseType: PurchaseType.NEW,
          planId: 'plan-1',
          durationDays: 30,
          gatewayType: PaymentGatewayType.TELEGRAM_STARS,
          channel: PurchaseChannel.WEB,
        })
      },
      {
        name: 'BadRequestException',
        message: 'PAYMENT_GATEWAY_CHANNEL_UNSUPPORTED',
      },
    )
  })

  it('reuses existing checkout url when provider execution already ran for the draft', async () => {
    const { service, state } = createService({
      transactionGatewayData: {
        checkoutUrl: 'https://existing-checkout.example.com',
        providerMode: 'REDIRECT',
      },
    })

    const checkout = await service.checkout({
      userId: 'user-1',
      purchaseType: PurchaseType.NEW,
      planId: 'plan-1',
      durationDays: 30,
      gatewayType: PaymentGatewayType.YOOKASSA,
      channel: PurchaseChannel.WEB,
    })

    assert.equal(checkout.checkoutUrl, 'https://existing-checkout.example.com')
    assert.equal(state.providerCreateCalls, 0)
  })
})

function createService(input: {
  readonly gatewayType?: PaymentGatewayType
  readonly gatewayCurrency?: Currency
  readonly gatewaySettings?: Record<string, unknown>
  readonly transactionGatewayData?: Record<string, unknown>
} = {}) {
  const transactionUpdates: Record<string, unknown>[] = []
  const state = {
    transactionUpdates,
    providerCreateCalls: 0,
  }
  const paymentId = 'payment-1'
  const gatewayType = input.gatewayType ?? PaymentGatewayType.YOOKASSA
  const transaction = {
    id: 'transaction-1',
    paymentId,
    userId: 'user-1',
    subscriptionId: null,
    status: TransactionStatus.PENDING,
    purchaseType: PurchaseType.NEW,
    channel: PurchaseChannel.WEB,
    gatewayType,
    currency: input.gatewayCurrency ?? Currency.USD,
    amount: { toString: () => '9.99' },
    paymentAsset: null,
    gatewayId: null,
    gatewayData: input.transactionGatewayData ?? null,
    planSnapshot: {
      id: 'plan-1',
      name: 'Starter',
      selectedDurationDays: 30,
    },
    createdAt: new Date('2026-04-19T12:00:00.000Z'),
    updatedAt: new Date('2026-04-19T12:00:00.000Z'),
  }
  const prismaService = {
    paymentGateway: {
      findUnique: async () => ({
        id: 'gateway-1',
        type: gatewayType,
        currency: input.gatewayCurrency ?? Currency.USD,
        isActive: true,
        settings: input.gatewaySettings ?? { shopId: 'shop-1', apiKey: 'secret-1' },
      }),
    },
    transaction: {
      findUnique: async () => transaction,
      update: async (args: { readonly data: Record<string, unknown> }) => {
        transactionUpdates.push(args.data)
        return {
          ...transaction,
          gatewayId: args.data.gatewayId,
          gatewayData: args.data.gatewayData,
        }
      },
    },
  }
  const paymentsTransactionsService = {
    createDraft: async () => ({
      id: 'transaction-1',
      paymentId,
      status: TransactionStatus.PENDING,
      gatewayType,
      purchaseType: PurchaseType.NEW,
      channel: PurchaseChannel.WEB,
      currency: input.gatewayCurrency ?? Currency.USD,
      amount: '9.99',
    }),
  }
  const paymentProviderExecutionService = {
    createCheckout: async () => {
      state.providerCreateCalls += 1
      return {
        gatewayId: 'provider-1',
        checkoutUrl: 'https://checkout.example.com',
        providerMode: 'REDIRECT',
        providerStatus: 'pending',
        gatewayData: {
          checkoutUrl: 'https://checkout.example.com',
          providerMode: 'REDIRECT',
        },
      }
    },
  }

  return {
    service: new PaymentsCheckoutService(
      prismaService as never,
      paymentsTransactionsService as never,
      paymentProviderExecutionService as never,
    ),
    state,
  }
}

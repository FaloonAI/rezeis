import { BadRequestException, Injectable } from '@nestjs/common';
import {
  Prisma,
  PurchaseChannel,
  PurchaseType,
  Transaction,
  TransactionStatus,
} from '@prisma/client';

import { PrismaService } from '../../../common/prisma/prisma.service';
import { SubscriptionQuoteService } from '../../subscriptions/services/subscription-quote.service';
import { CreateTransactionDraftDto } from '../dto/create-transaction-draft.dto';
import { ListTransactionsQueryDto } from '../dto/list-transactions-query.dto';
import { AdminPaymentTransactionInterface } from '../interfaces/admin-payment-transaction.interface';

@Injectable()
export class PaymentsTransactionsService {
  public constructor(
    private readonly prismaService: PrismaService,
    private readonly subscriptionQuoteService: SubscriptionQuoteService,
  ) {}

  public async listTransactions(
    query: ListTransactionsQueryDto,
  ): Promise<readonly AdminPaymentTransactionInterface[]> {
    const transactions = await this.prismaService.transaction.findMany({
      where: {
        userId: query.userId,
        status: query.status,
        gatewayType: query.gatewayType,
        purchaseType: query.purchaseType,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit ?? 50,
    });
    return transactions.map(mapAdminPaymentTransaction);
  }

  public async createDraft(
    input: CreateTransactionDraftDto,
  ): Promise<AdminPaymentTransactionInterface> {
    if ((input.purchaseType as unknown as string) === 'TRIAL') {
      throw new BadRequestException({
        code: 'PAYMENT_DRAFT_TRIAL_UNSUPPORTED',
        message: 'Trial purchases cannot be converted to transaction drafts.',
      });
    }
    const channel = input.channel ?? PurchaseChannel.WEB;
    const quote = await this.subscriptionQuoteService.getQuote({
      userId: input.userId,
      purchaseType: input.purchaseType,
      subscriptionId: input.sourceSubscriptionId,
      planId: input.planId,
      durationDays: input.durationDays,
      channel,
      gatewayType: input.gatewayType,
    });
    if (
      !quote.isEligible ||
      quote.price === null ||
      quote.selectedPlan === null ||
      quote.selectedDuration === null
    ) {
      throw new BadRequestException({
        code: 'PAYMENT_DRAFT_QUOTE_NOT_ELIGIBLE',
        message: 'Quote is not eligible for transaction draft creation.',
        warnings: quote.warnings,
      });
    }
    const draftPlanSnapshot = buildTransactionDraftSnapshot({
      purchaseType: input.purchaseType,
      selectedPlan: quote.selectedPlan,
      selectedDurationDays: quote.selectedDuration.days,
    });
    const existingPendingDraft = await this.findExistingPendingDraft({
      userId: input.userId,
      subscriptionId: input.sourceSubscriptionId ?? quote.selectedSubscriptionId ?? null,
      purchaseType: input.purchaseType,
      channel,
      gatewayType: input.gatewayType,
      currency: quote.price.currency,
      amount: quote.price.price,
      planSnapshot: draftPlanSnapshot,
    });
    if (existingPendingDraft !== null) {
      return mapAdminPaymentTransaction(existingPendingDraft);
    }
    const createdTransaction = await this.prismaService.transaction.create({
      data: {
        userId: input.userId,
        subscriptionId: input.sourceSubscriptionId ?? quote.selectedSubscriptionId ?? null,
        status: TransactionStatus.PENDING,
        purchaseType: input.purchaseType,
        channel,
        gatewayType: input.gatewayType,
        currency: quote.price.currency,
        amount: quote.price.price,
        planSnapshot: draftPlanSnapshot as Prisma.InputJsonValue,
        deviceTypes: [],
      },
    });
    return mapAdminPaymentTransaction(createdTransaction);
  }

  private async findExistingPendingDraft(input: {
    readonly userId: string;
    readonly subscriptionId: string | null;
    readonly purchaseType: PurchaseType;
    readonly channel: PurchaseChannel;
    readonly gatewayType: Transaction['gatewayType'];
    readonly currency: Transaction['currency'];
    readonly amount: string;
    readonly planSnapshot: Record<string, unknown>;
  }): Promise<Transaction | null> {
    const pendingTransactions = await this.prismaService.transaction.findMany({
      where: {
        userId: input.userId,
        subscriptionId: input.subscriptionId,
        status: TransactionStatus.PENDING,
        purchaseType: input.purchaseType,
        channel: input.channel,
        gatewayType: input.gatewayType,
        currency: input.currency,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 10,
    });
    const expectedPlanSnapshot = stableJsonStringify(input.planSnapshot);
    return (
      pendingTransactions.find(
        (transaction) =>
          transaction.amount.toString() === input.amount &&
          stableJsonStringify(transaction.planSnapshot) === expectedPlanSnapshot,
      ) ?? null
    );
  }
}

function mapAdminPaymentTransaction(transaction: Transaction): AdminPaymentTransactionInterface {
  return {
    id: transaction.id,
    paymentId: transaction.paymentId,
    userId: transaction.userId,
    subscriptionId: transaction.subscriptionId,
    status: transaction.status,
    purchaseType: transaction.purchaseType,
    channel: transaction.channel,
    gatewayType: transaction.gatewayType,
    currency: transaction.currency,
    amount: transaction.amount.toString(),
    paymentAsset: transaction.paymentAsset,
    gatewayId: transaction.gatewayId,
    planSnapshot: transaction.planSnapshot,
    createdAt: transaction.createdAt.toISOString(),
    updatedAt: transaction.updatedAt.toISOString(),
  };
}

function buildTransactionDraftSnapshot(input: {
  readonly purchaseType: PurchaseType;
  readonly selectedPlan: {
    readonly id: string;
    readonly name: string;
    readonly tag: string | null;
    readonly type: string;
    readonly trafficLimit: number | null;
    readonly deviceLimit: number;
    readonly trafficLimitStrategy: string;
  };
  readonly selectedDurationDays: number;
}): Record<string, unknown> {
  return {
    id: input.selectedPlan.id,
    name: input.selectedPlan.name,
    tag: input.selectedPlan.tag,
    type: input.selectedPlan.type,
    trafficLimit: input.selectedPlan.trafficLimit,
    deviceLimit: input.selectedPlan.deviceLimit,
    trafficLimitStrategy: input.selectedPlan.trafficLimitStrategy,
    selectedDurationDays: input.selectedDurationDays,
    purchaseType: input.purchaseType,
    snapshotSource: 'ADMIN_TRANSACTION_DRAFT',
  };
}

function stableJsonStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableJsonStringify(entry)).join(',')}]`;
  }
  const objectValue = value as Record<string, unknown>;
  const sortedKeys = Object.keys(objectValue).sort((left, right) => left.localeCompare(right));
  return `{${sortedKeys
    .map((key) => `${JSON.stringify(key)}:${stableJsonStringify(objectValue[key])}`)
    .join(',')}}`;
}

import { Injectable, NotFoundException } from '@nestjs/common';
import {
  PaymentGatewayType,
  Plan,
  ProfileSyncJob,
  Prisma,
  PurchaseType,
  Subscription,
  SubscriptionStatus,
  SyncAction,
  SyncJobStatus,
  Transaction,
} from '@prisma/client';

import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class PaymentSubscriptionMutationService {
  public constructor(private readonly prismaService: PrismaService) {}

  public async applyCompletedTransaction(
    transaction: Transaction,
  ): Promise<{ readonly subscription: Subscription; readonly syncJob: ProfileSyncJob }> {
    const purchasedPlan = await this.getRequiredPlan(transaction);
    const selectedDurationDays = readSelectedDurationDays(transaction);
    switch (transaction.purchaseType) {
      case PurchaseType.NEW:
      case PurchaseType.ADDITIONAL:
        return this.createSubscriptionFromPayment({
          transaction,
          purchasedPlan,
          selectedDurationDays,
        });
      case PurchaseType.RENEW:
        return this.renewSubscriptionFromPayment({
          transaction,
          purchasedPlan,
          selectedDurationDays,
        });
      case PurchaseType.UPGRADE:
        return this.upgradeSubscriptionFromPayment({
          transaction,
          purchasedPlan,
          selectedDurationDays,
        });
      default:
        throw new NotFoundException('Unsupported purchase type');
    }
  }

  private async createSubscriptionFromPayment(input: {
    readonly transaction: Transaction;
    readonly purchasedPlan: Plan;
    readonly selectedDurationDays: number;
  }): Promise<{ readonly subscription: Subscription; readonly syncJob: ProfileSyncJob }> {
    return this.prismaService.$transaction(async (transactionClient) => {
      const now = new Date();
      const createdSubscription = await transactionClient.subscription.create({
        data: {
          userId: input.transaction.userId,
          status: SubscriptionStatus.ACTIVE,
          isTrial: false,
          planSnapshot: buildPlanSnapshot({
            transaction: input.transaction,
            purchasedPlan: input.purchasedPlan,
            selectedDurationDays: input.selectedDurationDays,
          }) as Prisma.InputJsonValue,
          trafficLimit: input.purchasedPlan.trafficLimit,
          deviceLimit: input.purchasedPlan.deviceLimit,
          internalSquads: input.purchasedPlan.internalSquads,
          externalSquad: input.purchasedPlan.externalSquad,
          startedAt: now,
          expiresAt: calculateExpiry(now, input.selectedDurationDays),
        },
      });
      const syncJob = await transactionClient.profileSyncJob.create({
        data: {
          subscriptionId: createdSubscription.id,
          action: SyncAction.CREATE,
          status: SyncJobStatus.PENDING,
          payload: {
            source: 'PAYMENT_COMPLETION',
            paymentId: input.transaction.paymentId,
          },
        },
      });
      await transactionClient.transaction.update({
        where: { id: input.transaction.id },
        data: {
          subscriptionId: createdSubscription.id,
        },
      });
      return {
        subscription: createdSubscription,
        syncJob,
      };
    });
  }

  private async renewSubscriptionFromPayment(input: {
    readonly transaction: Transaction;
    readonly purchasedPlan: Plan;
    readonly selectedDurationDays: number;
  }): Promise<{ readonly subscription: Subscription; readonly syncJob: ProfileSyncJob }> {
    if (input.transaction.subscriptionId === null) {
      throw new NotFoundException('Source subscription not found');
    }
    return this.prismaService.$transaction(async (transactionClient) => {
      const currentSubscription = await transactionClient.subscription.findUnique({
        where: { id: input.transaction.subscriptionId! },
      });
      if (currentSubscription === null) {
        throw new NotFoundException('Source subscription not found');
      }
      const now = new Date();
      const renewalBase =
        currentSubscription.expiresAt !== null && currentSubscription.expiresAt.getTime() > now.getTime()
          ? currentSubscription.expiresAt
          : now;
      const renewedSubscription = await transactionClient.subscription.update({
        where: { id: currentSubscription.id },
        data: {
          status: SubscriptionStatus.ACTIVE,
          planSnapshot: buildPlanSnapshot({
            transaction: input.transaction,
            purchasedPlan: input.purchasedPlan,
            selectedDurationDays: input.selectedDurationDays,
          }) as Prisma.InputJsonValue,
          trafficLimit: input.purchasedPlan.trafficLimit,
          deviceLimit: input.purchasedPlan.deviceLimit,
          internalSquads: input.purchasedPlan.internalSquads,
          externalSquad: input.purchasedPlan.externalSquad,
          expiresAt: calculateExpiry(renewalBase, input.selectedDurationDays),
        },
      });
      const syncJob = await transactionClient.profileSyncJob.create({
        data: {
          subscriptionId: renewedSubscription.id,
          action: renewedSubscription.remnawaveId === null ? SyncAction.CREATE : SyncAction.UPDATE,
          status: SyncJobStatus.PENDING,
          payload: {
            source: 'PAYMENT_COMPLETION',
            paymentId: input.transaction.paymentId,
          },
        },
      });
      return {
        subscription: renewedSubscription,
        syncJob,
      };
    });
  }

  private async upgradeSubscriptionFromPayment(input: {
    readonly transaction: Transaction;
    readonly purchasedPlan: Plan;
    readonly selectedDurationDays: number;
  }): Promise<{ readonly subscription: Subscription; readonly syncJob: ProfileSyncJob }> {
    if (input.transaction.subscriptionId === null) {
      throw new NotFoundException('Source subscription not found');
    }
    return this.prismaService.$transaction(async (transactionClient) => {
      const currentSubscription = await transactionClient.subscription.findUnique({
        where: { id: input.transaction.subscriptionId! },
      });
      if (currentSubscription === null) {
        throw new NotFoundException('Source subscription not found');
      }
      const now = new Date();
      const upgradedSubscription = await transactionClient.subscription.update({
        where: { id: currentSubscription.id },
        data: {
          status: SubscriptionStatus.ACTIVE,
          planSnapshot: buildPlanSnapshot({
            transaction: input.transaction,
            purchasedPlan: input.purchasedPlan,
            selectedDurationDays: input.selectedDurationDays,
          }) as Prisma.InputJsonValue,
          trafficLimit: input.purchasedPlan.trafficLimit,
          deviceLimit: input.purchasedPlan.deviceLimit,
          internalSquads: input.purchasedPlan.internalSquads,
          externalSquad: input.purchasedPlan.externalSquad,
          startedAt: now,
          expiresAt: calculateExpiry(now, input.selectedDurationDays),
        },
      });
      const syncJob = await transactionClient.profileSyncJob.create({
        data: {
          subscriptionId: upgradedSubscription.id,
          action: upgradedSubscription.remnawaveId === null ? SyncAction.CREATE : SyncAction.UPDATE,
          status: SyncJobStatus.PENDING,
          payload: {
            source: 'PAYMENT_COMPLETION',
            paymentId: input.transaction.paymentId,
          },
        },
      });
      return {
        subscription: upgradedSubscription,
        syncJob,
      };
    });
  }

  private async getRequiredPlan(transaction: Transaction): Promise<Plan> {
    const planId = readPlanId(transaction);
    const plan = await this.prismaService.plan.findUnique({
      where: { id: planId },
    });
    if (plan === null) {
      throw new NotFoundException('Purchased plan not found');
    }
    return plan;
  }
}

function buildPlanSnapshot(input: {
  readonly transaction: Transaction;
  readonly purchasedPlan: Plan;
  readonly selectedDurationDays: number;
}): Record<string, unknown> {
  return {
    id: input.purchasedPlan.id,
    name: input.purchasedPlan.name,
    description: input.purchasedPlan.description,
    tag: input.purchasedPlan.tag,
    type: input.purchasedPlan.type,
    trafficLimit: input.purchasedPlan.trafficLimit,
    deviceLimit: input.purchasedPlan.deviceLimit,
    trafficLimitStrategy: input.purchasedPlan.trafficLimitStrategy,
    internalSquads: input.purchasedPlan.internalSquads,
    externalSquad: input.purchasedPlan.externalSquad,
    selectedDurationDays: input.selectedDurationDays,
    purchaseType: input.transaction.purchaseType,
    gatewayType: input.transaction.gatewayType,
    amount: input.transaction.amount.toString(),
    currency: input.transaction.currency,
    snapshotSource: 'PAYMENT_COMPLETION',
  };
}

function readPlanId(transaction: Transaction): string {
  const planSnapshot =
    typeof transaction.planSnapshot === 'object' &&
    transaction.planSnapshot !== null &&
    !Array.isArray(transaction.planSnapshot)
      ? (transaction.planSnapshot as Record<string, unknown>)
      : {};
  const planId = planSnapshot.id;
  if (typeof planId !== 'string' || planId.length === 0) {
    throw new NotFoundException('Purchased plan not found');
  }
  return planId;
}

function readSelectedDurationDays(transaction: Transaction): number {
  const planSnapshot =
    typeof transaction.planSnapshot === 'object' &&
    transaction.planSnapshot !== null &&
    !Array.isArray(transaction.planSnapshot)
      ? (transaction.planSnapshot as Record<string, unknown>)
      : {};
  const selectedDurationDays = planSnapshot.selectedDurationDays;
  if (typeof selectedDurationDays !== 'number' || !Number.isInteger(selectedDurationDays)) {
    throw new NotFoundException('Purchased duration not found');
  }
  return selectedDurationDays;
}

function calculateExpiry(baseDate: Date, durationDays: number): Date | null {
  if (durationDays === -1) {
    return null;
  }
  const expiresAt = new Date(baseDate);
  expiresAt.setUTCDate(expiresAt.getUTCDate() + durationDays);
  return expiresAt;
}

import { Injectable, Logger } from '@nestjs/common';
import { AdSignupBonusType, Prisma } from '@prisma/client';

import { PrismaService } from '../../../common/prisma/prisma.service';
import { SubscriptionMutationsService } from '../../subscriptions/services/subscription-mutations.service';
import { readSignupBonus } from '../utils/advertising-mappers';

const DEFAULT_TRIAL_DAYS = 3;
const DEFAULT_TARIFF_DAYS = 30;

/**
 * Grants a placement's optional signup bonus to a brand-new user, reusing the
 * existing `SubscriptionMutationsService.grantTrial` path (creates the local
 * subscription + enqueues Remnawave provisioning). Best-effort and granted at
 * most once: it only fires for a user with **no** existing subscription (truly
 * new), so it never double-grants and the standard trial offer is naturally
 * suppressed afterwards (the user then has an active subscription).
 *
 * No BALANCE bonus — the platform has no user balance.
 */
@Injectable()
export class AdSignupBonusService {
  private readonly logger = new Logger(AdSignupBonusService.name);

  public constructor(
    private readonly prismaService: PrismaService,
    private readonly subscriptionMutationsService: SubscriptionMutationsService,
  ) {}

  public async grantIfEligible(input: {
    readonly userId: string;
    readonly bonusType: AdSignupBonusType;
    readonly bonusJson: Prisma.JsonValue | null;
  }): Promise<void> {
    if (input.bonusType === 'NONE') {
      return;
    }
    try {
      // New-user-only + one-per-user guard: skip if the user already has any
      // non-deleted subscription.
      const existing = await this.prismaService.subscription.count({
        where: { userId: input.userId, status: { not: 'DELETED' } },
      });
      if (existing > 0) {
        return;
      }

      const bonus = readSignupBonus(input.bonusType, input.bonusJson);
      if (bonus === null) {
        return;
      }

      if (input.bonusType === 'TRIAL') {
        const trialPlan = await this.prismaService.plan.findFirst({
          where: { availability: 'TRIAL', isActive: true, isArchived: false },
          include: { durations: { take: 1, orderBy: { days: 'asc' } } },
        });
        if (trialPlan === null) {
          this.logger.warn('Signup bonus TRIAL skipped: no active trial plan configured');
          return;
        }
        const durationDays =
          bonus.trialDurationDays ?? trialPlan.durations[0]?.days ?? DEFAULT_TRIAL_DAYS;
        await this.subscriptionMutationsService.grantTrial({
          userId: input.userId,
          planId: trialPlan.id,
          durationDays,
        });
        this.logger.log(`Granted TRIAL signup bonus to user ${input.userId}`);
        return;
      }

      if (input.bonusType === 'TARIFF') {
        const planId = bonus.tariffPlanId;
        if (planId === undefined) {
          this.logger.warn('Signup bonus TARIFF skipped: no tariffPlanId configured');
          return;
        }
        const plan = await this.prismaService.plan.findFirst({
          where: { id: planId, isActive: true, isArchived: false },
          select: { id: true },
        });
        if (plan === null) {
          this.logger.warn(`Signup bonus TARIFF skipped: plan ${planId} not found/active`);
          return;
        }
        await this.subscriptionMutationsService.grantTrial({
          userId: input.userId,
          planId: plan.id,
          durationDays: bonus.tariffDurationDays ?? DEFAULT_TARIFF_DAYS,
        });
        this.logger.log(`Granted TARIFF signup bonus (plan ${plan.id}) to user ${input.userId}`);
      }
    } catch (error: unknown) {
      this.logger.warn(
        `signup bonus grant failed for user ${input.userId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}

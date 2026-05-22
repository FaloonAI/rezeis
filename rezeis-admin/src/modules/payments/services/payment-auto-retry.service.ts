import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PaymentWebhookLifecycleStatus } from '@prisma/client';
import { Queue } from 'bullmq';

import { PrismaService } from '../../../common/prisma/prisma.service';
import { shouldRunSchedules } from '../../../common/runtime/process-role.util';
import {
  PAYMENT_RECONCILIATION_JOB,
  PAYMENT_RECONCILIATION_QUEUE,
} from '../constants/payment-reconciliation.constant';

/**
 * Automatic retry for failed payment webhook events.
 *
 * Strategy:
 *   - Every 5 minutes, find FAILED events that:
 *     - Failed less than 3 times (reconciliationAttempts < 3)
 *     - Failed within the last 2 hours (not ancient failures)
 *   - Re-enqueue them with exponential delay:
 *     - Attempt 1 → immediate
 *     - Attempt 2 → 5 min delay
 *     - Attempt 3 → 15 min delay
 *
 * After 3 attempts, the event stays FAILED and requires manual replay
 * from the admin panel.
 */
const MAX_AUTO_RETRIES = 3;
const RETRY_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours

@Injectable()
export class PaymentAutoRetryService {
  private readonly logger = new Logger(PaymentAutoRetryService.name);

  public constructor(
    private readonly prismaService: PrismaService,
    @InjectQueue(PAYMENT_RECONCILIATION_QUEUE)
    private readonly reconciliationQueue: Queue,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES, { name: 'payment-auto-retry' })
  public async retryFailedWebhooks(): Promise<void> {
    if (!shouldRunSchedules()) return;

    const cutoff = new Date(Date.now() - RETRY_WINDOW_MS);

    const failedEvents = await this.prismaService.paymentWebhookEvent.findMany({
      where: {
        status: PaymentWebhookLifecycleStatus.FAILED,
        reconciliationAttempts: { lt: MAX_AUTO_RETRIES },
        lastTransitionAt: { gte: cutoff },
      },
      select: { id: true, reconciliationAttempts: true },
      take: 20, // Process max 20 per tick to avoid queue flooding
    });

    if (failedEvents.length === 0) return;

    let enqueued = 0;
    for (const event of failedEvents) {
      const delay = this.calculateDelay(event.reconciliationAttempts);
      await this.reconciliationQueue.add(
        PAYMENT_RECONCILIATION_JOB,
        { eventId: event.id },
        {
          delay,
          attempts: 1,
          removeOnComplete: { age: 86_400 },
          removeOnFail: { age: 604_800 },
          jobId: `auto-retry-${event.id}-${event.reconciliationAttempts + 1}`,
        },
      );
      enqueued++;
    }

    if (enqueued > 0) {
      this.logger.log(`Auto-retry: enqueued ${enqueued} failed payment webhooks`);
    }
  }

  private calculateDelay(currentAttempts: number): number {
    switch (currentAttempts) {
      case 0: return 0; // immediate
      case 1: return 5 * 60_000; // 5 min
      case 2: return 15 * 60_000; // 15 min
      default: return 30 * 60_000; // 30 min
    }
  }
}

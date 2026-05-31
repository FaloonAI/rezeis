import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SyncAction, SyncJobStatus } from '@prisma/client';
import { Queue } from 'bullmq';

import { PrismaService } from '../../common/prisma/prisma.service';
import { shouldRunSchedules } from '../../common/runtime/process-role.util';
import {
  PROFILE_SYNC_BACKOFF_MS,
  PROFILE_SYNC_JOB,
  PROFILE_SYNC_MAX_ATTEMPTS,
  PROFILE_SYNC_QUEUE,
} from './profile-sync.constants';

/** Recover stuck CREATE jobs no more than this often (avoid hammering a down panel). */
const FAILED_RECOVERY_MAX = 50;

/**
 * Enqueues pending `ProfileSyncJob` rows into BullMQ so the processor can
 * pick them up. Called by:
 *  - `PaymentSubscriptionMutationService` after creating a subscription
 *  - `SubscriptionMutationsService.grantTrial()`
 *  - A scheduled cron that sweeps for stuck PENDING jobs
 */
@Injectable()
export class ProfileSyncQueueService {
  private readonly logger = new Logger(ProfileSyncQueueService.name);

  public constructor(
    private readonly prismaService: PrismaService,
    @InjectQueue(PROFILE_SYNC_QUEUE)
    private readonly queue: Queue,
  ) {}

  /**
   * Enqueues a single sync job by id. Idempotent — BullMQ deduplicates by
   * jobId so the same row won't be processed twice concurrently.
   *
   * `force` removes any prior BullMQ job carrying the same `jobId` first.
   * This is required when re-driving a row that previously COMPLETED or
   * FAILED: because we keep finished jobs around (`removeOnComplete/Fail`),
   * a plain re-`add` with the same `jobId` is silently ignored by BullMQ.
   */
  public async enqueue(syncJobId: string, force = false): Promise<void> {
    const jobId = `sync_${syncJobId}`;
    if (force) {
      // Remove any retained finished/failed job with this id so the
      // re-add is not deduplicated away.
      await this.queue.remove(jobId).catch(() => undefined);
    }
    await this.queue.add(
      PROFILE_SYNC_JOB,
      { syncJobId },
      {
        jobId,
        attempts: PROFILE_SYNC_MAX_ATTEMPTS,
        backoff: { type: 'exponential', delay: PROFILE_SYNC_BACKOFF_MS },
        removeOnComplete: 200,
        removeOnFail: 200,
      },
    );
    this.logger.debug(`Enqueued profile sync job ${syncJobId}`);
  }

  /**
   * Sweeps for PENDING sync jobs that haven't been picked up yet and
   * enqueues them. Designed to be called from a cron interval.
   */
  public async sweepPending(): Promise<number> {
    const pendingJobs = await this.prismaService.profileSyncJob.findMany({
      where: { status: 'PENDING' },
      select: { id: true },
      take: 100,
      orderBy: { createdAt: 'asc' },
    });
    for (const job of pendingJobs) {
      await this.enqueue(job.id);
    }
    return pendingJobs.length;
  }

  /**
   * Self-healing sweep (runs in the worker process only).
   *
   * Two recovery passes guard against subscriptions that never get a
   * Remnawave profile because of a transient panel outage:
   *
   *  1. **PENDING** rows that were created but never enqueued (e.g. by code
   *     paths that only `profileSyncJob.create()` without calling `enqueue`,
   *     or after a producer crash between the two) are pushed to BullMQ.
   *  2. **FAILED CREATE** rows whose subscription still has no `remnawaveId`
   *     are reset to PENDING (attempts cleared) and re-enqueued, so once the
   *     panel comes back the profile is provisioned automatically without an
   *     operator manually clicking "Sync". UPDATE/DELETE failures are left
   *     alone — they are non-fatal and re-driven by the next real mutation.
   *
   * BullMQ deduplicates by `jobId` so re-enqueuing an in-flight row is safe.
   */
  @Cron(CronExpression.EVERY_5_MINUTES, { name: 'profile-sync-sweep' })
  public async sweepAndRecover(): Promise<void> {
    if (!shouldRunSchedules()) return;

    try {
      const swept = await this.sweepPending();

      const stuckCreates = await this.prismaService.profileSyncJob.findMany({
        where: {
          status: SyncJobStatus.FAILED,
          action: SyncAction.CREATE,
          subscription: { remnawaveId: null },
        },
        select: { id: true },
        take: FAILED_RECOVERY_MAX,
        orderBy: { createdAt: 'asc' },
      });

      for (const job of stuckCreates) {
        await this.prismaService.profileSyncJob.update({
          where: { id: job.id },
          data: { status: SyncJobStatus.PENDING, attempts: 0, lastError: null },
        });
        await this.enqueue(job.id, /* force */ true);
      }

      if (swept > 0 || stuckCreates.length > 0) {
        this.logger.log(
          `Profile-sync sweep: re-enqueued ${swept} pending + recovered ${stuckCreates.length} failed CREATE job(s)`,
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Profile-sync sweep failed: ${message}`);
    }
  }
}

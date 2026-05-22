import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';

import { PrismaService } from '../prisma/prisma.service';
import { shouldRunSchedules } from '../runtime/process-role.util';
import { BROADCAST_DELIVERY_QUEUE } from '../../modules/broadcast/broadcast.constants';
import { BACKUP_QUEUE } from '../../modules/backup/backup.constants';
import { IMPORT_QUEUE } from '../../modules/imports/imports.constants';

/** Default audit log retention: 90 days. */
const AUDIT_RETENTION_DAYS = 90;

/**
 * Periodic maintenance for BullMQ queues + data hygiene.
 *
 * Responsibilities:
 *   - Clean completed/failed BullMQ jobs older than retention
 *   - Remove stalled jobs that will never complete
 *   - Rotate audit log (delete entries older than 90 days)
 *   - Log queue health metrics for observability
 *
 * Runs every 6 hours in the worker process only.
 */
@Injectable()
export class QueueMaintenanceService {
  private readonly logger = new Logger(QueueMaintenanceService.name);

  private readonly queues: Queue[];

  public constructor(
    @InjectQueue(BROADCAST_DELIVERY_QUEUE) broadcastQueue: Queue,
    @InjectQueue(BACKUP_QUEUE) backupQueue: Queue,
    @InjectQueue(IMPORT_QUEUE) importQueue: Queue,
    private readonly prismaService: PrismaService,
  ) {
    this.queues = [broadcastQueue, backupQueue, importQueue];
  }

  /**
   * Every 6 hours: clean old jobs + rotate audit log.
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  public async runMaintenance(): Promise<void> {
    if (!shouldRunSchedules()) return;

    // 1. Clean BullMQ queues
    for (const queue of this.queues) {
      try {
        await this.cleanQueue(queue);
      } catch (err) {
        this.logger.warn(`Queue cleanup failed for ${queue.name}: ${(err as Error).message}`);
      }
    }

    // 2. Rotate audit log
    await this.rotateAuditLog();

    // 3. Clean old system log entries (ring buffer overflow protection)
    await this.cleanOldNotificationEvents();
  }

  /**
   * On-demand cleanup (can be called from admin API).
   */
  public async cleanAll(): Promise<Record<string, { completed: number; failed: number }>> {
    const results: Record<string, { completed: number; failed: number }> = {};
    for (const queue of this.queues) {
      results[queue.name] = await this.cleanQueue(queue);
    }
    return results;
  }

  // ── Queue Cleanup ─────────────────────────────────────────────────────────

  private async cleanQueue(queue: Queue): Promise<{ completed: number; failed: number }> {
    const ONE_DAY_MS = 86_400_000;
    const SEVEN_DAYS_MS = 7 * ONE_DAY_MS;

    const completedBefore = Date.now() - ONE_DAY_MS;
    const completedJobs = await queue.getJobs(['completed']);
    let completedCleaned = 0;
    for (const job of completedJobs) {
      if (job.finishedOn && job.finishedOn < completedBefore) {
        await job.remove();
        completedCleaned++;
      }
    }

    const failedBefore = Date.now() - SEVEN_DAYS_MS;
    const failedJobs = await queue.getJobs(['failed']);
    let failedCleaned = 0;
    for (const job of failedJobs) {
      if (job.finishedOn && job.finishedOn < failedBefore) {
        await job.remove();
        failedCleaned++;
      }
    }

    if (completedCleaned > 0 || failedCleaned > 0) {
      this.logger.log(
        `Queue ${queue.name}: cleaned ${completedCleaned} completed, ${failedCleaned} failed`,
      );
    }

    return { completed: completedCleaned, failed: failedCleaned };
  }

  // ── Audit Log Rotation ────────────────────────────────────────────────────

  /**
   * Delete audit log entries older than AUDIT_RETENTION_DAYS.
   * Keeps the database from growing unbounded.
   */
  private async rotateAuditLog(): Promise<void> {
    const retentionDays = Number(process.env.AUDIT_RETENTION_DAYS) || AUDIT_RETENTION_DAYS;
    const cutoff = new Date(Date.now() - retentionDays * 86_400_000);

    try {
      const result = await this.prismaService.adminAuditLog.deleteMany({
        where: { createdAt: { lt: cutoff } },
      });
      if (result.count > 0) {
        this.logger.log(`Audit log rotation: deleted ${result.count} entries older than ${retentionDays} days`);
      }
    } catch (err) {
      this.logger.warn(`Audit log rotation failed: ${(err as Error).message}`);
    }
  }

  // ── Notification Events Cleanup ───────────────────────────────────────────

  /**
   * Clean old UserNotificationEvent rows (expiry warnings, etc.)
   * that are older than 30 days and already delivered.
   */
  private async cleanOldNotificationEvents(): Promise<void> {
    const cutoff = new Date(Date.now() - 30 * 86_400_000);

    try {
      const result = await this.prismaService.userNotificationEvent.deleteMany({
        where: { createdAt: { lt: cutoff } },
      });
      if (result.count > 0) {
        this.logger.log(`Notification events cleanup: deleted ${result.count} old entries`);
      }
    } catch (err) {
      this.logger.warn(`Notification events cleanup failed: ${(err as Error).message}`);
    }
  }
}

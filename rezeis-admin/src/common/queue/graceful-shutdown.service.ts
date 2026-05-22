import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import { BROADCAST_DELIVERY_QUEUE } from '../../modules/broadcast/broadcast.constants';
import { BACKUP_QUEUE } from '../../modules/backup/backup.constants';
import { IMPORT_QUEUE } from '../../modules/imports/imports.constants';

/**
 * Graceful shutdown handler for BullMQ queues.
 *
 * When the application receives SIGTERM/SIGINT:
 *   1. NestJS calls `onApplicationShutdown()` on all providers
 *   2. This service closes all queue connections cleanly
 *   3. Active workers finish their current job (BullMQ handles this internally)
 *   4. No new jobs are picked up after shutdown starts
 *
 * The 30s timeout in docker-compose `stop_grace_period` gives workers
 * time to finish. If a job takes longer, Docker sends SIGKILL and BullMQ
 * marks the job as stalled (auto-retried on next startup).
 */
@Injectable()
export class GracefulShutdownService implements OnApplicationShutdown {
  private readonly logger = new Logger(GracefulShutdownService.name);

  private readonly queues: Queue[];

  public constructor(
    @InjectQueue(BROADCAST_DELIVERY_QUEUE) broadcastQueue: Queue,
    @InjectQueue(BACKUP_QUEUE) backupQueue: Queue,
    @InjectQueue(IMPORT_QUEUE) importQueue: Queue,
  ) {
    this.queues = [broadcastQueue, backupQueue, importQueue];
  }

  public async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.log(`Shutdown signal received: ${signal ?? 'unknown'}. Closing queues...`);

    const closePromises = this.queues.map(async (queue) => {
      try {
        await queue.close();
        this.logger.debug(`Queue ${queue.name} closed`);
      } catch (err) {
        this.logger.warn(`Failed to close queue ${queue.name}: ${(err as Error).message}`);
      }
    });

    await Promise.allSettled(closePromises);
    this.logger.log('All queues closed. Shutdown complete.');
  }
}

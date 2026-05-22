import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { EMAIL_QUEUE, EMAIL_JOBS } from './email.constants';
import type { SendEmailPayload } from './interfaces/email.interface';
import { EmailDeliveryService } from './services/email-delivery.service';

/**
 * BullMQ processor for email delivery.
 *
 * Concurrency 3: emails are lightweight I/O (SMTP handshake + send),
 * so we can process multiple in parallel without issues.
 */
@Processor(EMAIL_QUEUE, { concurrency: 3 })
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  public constructor(
    private readonly emailDeliveryService: EmailDeliveryService,
  ) {
    super();
  }

  public async process(job: Job): Promise<unknown> {
    if (job.name !== EMAIL_JOBS.SEND && job.name !== EMAIL_JOBS.TEST) {
      this.logger.warn(`Unknown email job: ${job.name}`);
      return null;
    }

    const payload = job.data as SendEmailPayload;
    const result = await this.emailDeliveryService.sendImmediate(payload);

    if (!result.success) {
      throw new Error(result.error ?? 'Email delivery failed');
    }

    return result;
  }

  @OnWorkerEvent('completed')
  public onCompleted(job: Job): void {
    this.logger.debug(`Email job ${job.id} delivered to ${(job.data as SendEmailPayload).to}`);
  }

  @OnWorkerEvent('failed')
  public onFailed(job: Job, error: Error): void {
    this.logger.warn(
      `Email job ${job.id} failed (attempt ${job.attemptsMade}): ${error.message}`,
    );
  }
}

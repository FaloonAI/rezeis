import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { BROADCAST_DELIVERY_QUEUE } from '../broadcast/broadcast.constants';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

/**
 * Health check module — provides /api/health, /api/health/live, /api/health/ready.
 *
 * Injects a BullMQ queue to probe Redis connectivity without a separate
 * Redis client dependency.
 */
@Module({
  imports: [BullModule.registerQueue({ name: BROADCAST_DELIVERY_QUEUE })],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}

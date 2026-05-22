import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from '../auth/auth.module';
import { BROADCAST_DELIVERY_QUEUE } from './broadcast.constants';
import { BroadcastProcessor } from './broadcast.processor';
import { AdminBroadcastController } from './controllers/admin-broadcast.controller';
import { BroadcastDeliveryService } from './services/broadcast-delivery.service';
import { BroadcastMediaUploadService } from './services/broadcast-media-upload.service';
import { BroadcastQueueService } from './services/broadcast-queue.service';
import { BroadcastService } from './services/broadcast.service';

@Module({
  imports: [
    AuthModule,
    ConfigModule,
    BullModule.registerQueue({ name: BROADCAST_DELIVERY_QUEUE }),
  ],
  controllers: [AdminBroadcastController],
  providers: [
    BroadcastService,
    BroadcastDeliveryService,
    BroadcastMediaUploadService,
    BroadcastQueueService,
    BroadcastProcessor,
  ],
  exports: [BroadcastService, BroadcastDeliveryService, BroadcastQueueService],
})
export class BroadcastModule {}

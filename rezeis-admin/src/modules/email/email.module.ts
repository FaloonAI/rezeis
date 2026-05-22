// Re-export the common EmailModule for backward compatibility
// (internal-user module imports from this path)
export { EmailModule } from '../../common/email/email.module';

import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from '../auth/auth.module';
import { EMAIL_QUEUE } from './email.constants';
import { EmailProcessor } from './email.processor';
import { AdminEmailController } from './controllers/admin-email.controller';
import { EmailDeliveryService } from './services/email-delivery.service';
import { EmailEventBridgeService } from './services/email-event-bridge.service';
import { EmailTemplateRendererService } from './services/email-template-renderer.service';

/**
 * Email delivery module — SMTP delivery with branded templates.
 *
 * Separate from the common EmailModule (which provides the basic
 * EmailService for verification codes). This module adds:
 *   - Full SMTP delivery via nodemailer + BullMQ
 *   - Branded HTML templates
 *   - Event bridge (auto-send on system events)
 *   - Admin API for SMTP settings + test
 */
@Global()
@Module({
  imports: [
    AuthModule,
    ConfigModule,
    BullModule.registerQueue({ name: EMAIL_QUEUE }),
  ],
  controllers: [AdminEmailController],
  providers: [
    EmailDeliveryService,
    EmailTemplateRendererService,
    EmailEventBridgeService,
    EmailProcessor,
  ],
  exports: [EmailDeliveryService],
})
export class EmailDeliveryModule {}

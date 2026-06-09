import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { AdminPushController } from './admin-push.controller';
import { InternalPushController } from './internal-push.controller';
import { AdminNotificationDispatcher } from './services/admin-notification-dispatcher.service';
import { WebPushService } from './services/web-push.service';

/**
 * InternalPushModule
 * ──────────────────
 * Browser web-push subscription persistence + delivery.
 *
 * `WebPushService` owns the `WebPushSubscription` (user) and
 * `AdminWebPushSubscription` (operator) tables, talks to push services
 * (FCM / Mozilla / Apple) via the `web-push` library, and is consumed by
 * `UserNotificationsService` (user fan-out) and `AdminNotificationDispatcher`
 * (operator fan-out alongside Telegram). Controllers expose the SPA-facing
 * subscribe / unsubscribe endpoints + the VAPID public key for both audiences.
 *
 * `AdminNotificationDispatcher` subscribes to `SystemEventsService` (global)
 * and uses `RbacService` (global) to gate categories per role.
 *
 * Disabled out-of-the-box — operator must generate VAPID keys with
 * `npx web-push generate-vapid-keys` and set the env vars before
 * subscriptions can deliver.
 */
@Module({
  imports: [AuthModule],
  controllers: [InternalPushController, AdminPushController],
  providers: [WebPushService, AdminNotificationDispatcher],
  exports: [WebPushService],
})
export class InternalPushModule {}

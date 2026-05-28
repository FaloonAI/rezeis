import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { InternalPushController } from './internal-push.controller';

/**
 * InternalPushModule
 * ──────────────────
 * Stub implementation of the web-push subscription endpoints reiwa
 * already calls. Today the controller acknowledges every request and
 * persists nothing — it exists so reiwa can ship the SPA push-subscribe
 * flow without dangling 404s.
 *
 * When push delivery becomes a real product feature the controller
 * gains a `PushSubscription` Prisma model, an `Injectable` service that
 * stores endpoint+keys per user, and an outbound delivery worker. The
 * wire-level contract is fixed so reiwa won't need a follow-up rebuild.
 */
@Module({
  imports: [AuthModule],
  controllers: [InternalPushController],
})
export class InternalPushModule {}

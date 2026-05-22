import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

/**
 * Global rate limiting module.
 *
 * Default limits:
 *   - 60 requests per 60 seconds per IP (general API)
 *
 * Individual endpoints can override with @Throttle() decorator:
 *   - Login: 5 attempts per 60s
 *   - Payments: 10 per 60s
 *   - Imports: 3 per 60s
 *
 * The guard is registered globally via APP_GUARD. Endpoints that should
 * be exempt (health checks, webhooks) use @SkipThrottle().
 */
@Global()
@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 60,
      },
      {
        name: 'strict',
        ttl: 60_000,
        limit: 5,
      },
    ]),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class ThrottleModule {}

import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { InternalSystemEventsController } from './internal-system-events.controller';

/**
 * SystemEventsIngestModule
 * ────────────────────────
 * Hosts the reiwa-facing error ingest endpoint (`POST /api/internal/system/error`).
 * `SystemEventsService` is provided by the global `SystemEventsModule`, so this
 * module only needs `AuthModule` for the `InternalAdminAuthGuard`.
 */
@Module({
  imports: [AuthModule],
  controllers: [InternalSystemEventsController],
})
export class SystemEventsIngestModule {}

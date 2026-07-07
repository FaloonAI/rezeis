import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { BotConfigModule } from '../bot-config/bot-config.module';
import { AdminLandingConfigController } from './controllers/admin-landing-config.controller';
import { InternalLandingConfigController } from './controllers/internal-landing-config.controller';
import { LandingConfigService } from './services/landing-config.service';

/**
 * LandingConfigModule
 * ───────────────────
 * rezeis-admin owns the web landing-page config: a singleton draft the operator
 * edits and an append-only history of published revisions. The admin panel
 * writes via the REST controller; the reiwa BFF reads the effective published
 * config via the internal endpoint and renders it to unauthenticated web
 * visitors before sign-in.
 *
 * Imports `BotConfigModule` to inject `ReiwaCacheInvalidatorService`, which the
 * service calls (event `reiwa.landing.invalidate`) on publish/rollback so the
 * reiwa edge cache refreshes promptly. Ships disabled by default.
 */
@Module({
  imports: [AuthModule, BotConfigModule],
  controllers: [AdminLandingConfigController, InternalLandingConfigController],
  providers: [LandingConfigService],
  exports: [LandingConfigService],
})
export class LandingConfigModule {}

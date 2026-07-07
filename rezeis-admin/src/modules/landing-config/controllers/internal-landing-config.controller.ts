import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { InternalAdminAuthGuard } from '../../auth/guards/internal-admin-auth.guard';
import { LandingConfigService } from '../services/landing-config.service';
import type { EffectiveLandingPayload } from '../landing-config.schema';

/**
 * InternalLandingConfigController
 * ───────────────────────────────
 * Service-facing read endpoint consumed by the reiwa BFF. reiwa fetches the
 * effective PUBLISHED config here (or the `{ enabled: false }` sentinel), caches
 * it with a short TTL, and refreshes on the `reiwa.landing.invalidate` webhook.
 *
 * Auth: `InternalAdminAuthGuard` — the same Bearer api_token mechanism reiwa
 * uses for branding / platform-policy.
 */
@ApiTags('internal/landing-config')
@UseGuards(InternalAdminAuthGuard)
@Controller('internal/landing-config')
export class InternalLandingConfigController {
  public constructor(private readonly landingConfigService: LandingConfigService) {}

  @Get('effective')
  @ApiOperation({ summary: 'Effective published landing config consumed by reiwa' })
  public async getEffective(): Promise<EffectiveLandingPayload> {
    return this.landingConfigService.getEffectivePublished();
  }
}

import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { InternalAdminAuthGuard } from '../../auth/guards/internal-admin-auth.guard';
import { SubpageConfigService } from '../services/subpage-config.service';

/**
 * InternalSubpageConfigController
 * ───────────────────────────────
 * Service-facing read endpoint consumed by rezeis-subpage. The subpage fetches
 * the effective config here on boot, on its TTL refresh, and on invalidate.
 *
 * Auth: `InternalAdminAuthGuard` — the same Bearer api_token mechanism reiwa
 * uses. Operators mint a "Subpage" API token in "Settings → API tokens" and put
 * it in the subpage's `REZEIS_ADMIN_TOKEN`.
 */
@ApiTags('internal/subpage-config')
@UseGuards(InternalAdminAuthGuard)
@Controller('internal/subpage-config')
export class InternalSubpageConfigController {
  public constructor(private readonly subpageConfigService: SubpageConfigService) {}

  @Get('effective')
  @ApiOperation({ summary: 'Effective subscription-page config consumed by rezeis-subpage' })
  public async getEffective(): Promise<Record<string, unknown>> {
    return this.subpageConfigService.getEffectiveConfig();
  }
}

import { Body, Controller, Get, Put, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AdminJwtAuthGuard } from '../../auth/guards/admin-jwt-auth.guard';
import { RequirePermission } from '../../rbac/decorators/require-permission.decorator';
import { RbacGuard } from '../../rbac/guards/rbac.guard';
import { SubpageCacheInvalidateInterceptor } from '../interceptors/subpage-cache-invalidate.interceptor';
import { SubpageConfigService } from '../services/subpage-config.service';

/**
 * AdminSubpageConfigController
 * ────────────────────────────
 * Admin-panel CRUD over the subscription-page config (branding / app catalog /
 * baseSettings / translations) consumed by rezeis-subpage. Single global config
 * stored as one JSON blob. Any successful save pushes an invalidate to the
 * subpage (SubpageCacheInvalidateInterceptor).
 *
 * The frontend feature `web/src/features/subpage-config` is the consumer.
 */
@ApiTags('admin/subpage-config')
@ApiBearerAuth('JWT')
@UseGuards(AdminJwtAuthGuard, RbacGuard)
@RequirePermission('subpage_config', 'view')
@UseInterceptors(SubpageCacheInvalidateInterceptor)
@Controller('admin/subpage-config')
export class AdminSubpageConfigController {
  public constructor(private readonly subpageConfigService: SubpageConfigService) {}

  @Get()
  @ApiOperation({ summary: 'Read the current subscription-page config' })
  public async get(): Promise<{
    config: Record<string, unknown>;
    stored: boolean;
  }> {
    const [config, stored] = await Promise.all([
      this.subpageConfigService.getEffectiveConfig(),
      this.subpageConfigService.hasStoredConfig(),
    ]);
    return { config, stored };
  }

  @Put()
  @RequirePermission('subpage_config', 'edit')
  @ApiOperation({ summary: 'Replace the subscription-page config' })
  public async replace(@Body() body: unknown): Promise<{ config: Record<string, unknown> }> {
    const payload =
      body && typeof body === 'object' && 'config' in body
        ? (body as { config: unknown }).config
        : body;
    const config = await this.subpageConfigService.replaceConfig(payload);
    return { config };
  }
}

import { BadRequestException, Body, Controller, Get, Param, Put, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ExternalAuthProvider, Prisma } from '@prisma/client';
import { Request } from 'express';

import { PrismaService } from '../../../common/prisma/prisma.service';
import { CurrentAdmin } from '../../auth/decorators/current-admin.decorator';
import { AdminJwtAuthGuard } from '../../auth/guards/admin-jwt-auth.guard';
import { CurrentAdminInterface } from '../../auth/interfaces/current-admin.interface';
import { extractRequestMetadata } from '../../auth/utils/request-metadata.util';
import { RequirePermission } from '../../rbac/decorators/require-permission.decorator';
import { RbacGuard } from '../../rbac/guards/rbac.guard';
import { UpdateDisposablePolicyDto, UpdateExternalProviderDto } from '../dto/external-auth-admin.dto';
import {
  ExternalAuthPolicy,
  ExternalProviderConfigView,
} from '../interfaces/external-auth.interface';
import { ExternalProviderConfigService } from '../services/external-provider-config.service';

const SUPPORTED_PROVIDERS = new Set<string>(Object.values(ExternalAuthProvider));

/**
 * Operator configuration for end-user external sign-in (web cabinet):
 * per-provider enable + credentials and the disposable-email policy.
 */
@ApiTags('admin/external-auth')
@Controller('admin/external-auth')
@UseGuards(AdminJwtAuthGuard, RbacGuard)
export class AdminExternalAuthController {
  public constructor(
    private readonly configService: ExternalProviderConfigService,
    private readonly prismaService: PrismaService,
  ) {}

  @Get('providers')
  @RequirePermission('external_auth', 'view')
  @ApiOperation({ summary: 'List all end-user external-auth provider configs' })
  public async listProviders(): Promise<ExternalProviderConfigView[]> {
    return this.configService.getAllConfigs();
  }

  @Put('providers/:provider')
  @RequirePermission('external_auth', 'edit')
  @ApiOperation({ summary: 'Update one external-auth provider config' })
  public async updateProvider(
    @Param('provider') provider: string,
    @Body() body: UpdateExternalProviderDto,
    @CurrentAdmin() admin: CurrentAdminInterface,
    @Req() req: Request,
  ): Promise<ExternalProviderConfigView> {
    const typed = assertProvider(provider);
    const view = await this.configService.updateConfig(typed, body);
    await this.audit(admin, req, 'external_auth.provider_updated', {
      provider: typed,
      isEnabled: view.isEnabled,
    });
    return view;
  }

  @Get('policy')
  @RequirePermission('external_auth', 'view')
  @ApiOperation({ summary: 'Read the disposable-email / external-auth policy' })
  public async getPolicy(): Promise<ExternalAuthPolicy> {
    return this.configService.getPolicy();
  }

  @Put('policy')
  @RequirePermission('external_auth', 'edit')
  @ApiOperation({ summary: 'Update the disposable-email / external-auth policy' })
  public async updatePolicy(
    @Body() body: UpdateDisposablePolicyDto,
    @CurrentAdmin() admin: CurrentAdminInterface,
    @Req() req: Request,
  ): Promise<ExternalAuthPolicy> {
    const policy = await this.configService.updatePolicy(body);
    await this.audit(admin, req, 'external_auth.policy_updated', { mode: policy.mode });
    return policy;
  }

  private async audit(
    admin: CurrentAdminInterface,
    req: Request,
    action: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    const rm = extractRequestMetadata(req);
    await this.prismaService.adminAuditLog.create({
      data: {
        action,
        ipAddress: rm.remoteAddress,
        userAgent: rm.userAgent,
        metadata: { requestId: rm.requestId, ...metadata } as Prisma.InputJsonObject,
        adminUser: { connect: { id: admin.id } },
      },
    });
  }
}

function assertProvider(provider: string): ExternalAuthProvider {
  if (!SUPPORTED_PROVIDERS.has(provider)) {
    throw new BadRequestException(`Unsupported external-auth provider: ${provider}`);
  }
  return provider as ExternalAuthProvider;
}
